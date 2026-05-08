"""Service de agregacao de vagas externas (Adzuna + Remotive).

Estrategia:
- Vagas externas NUNCA misturam com a tabela `vaga` interna.
- Cache em tabela dedicada `cache_vagas_externas` com TTL configuravel.
- Adzuna: paginacao em category=it-jobs (sem keyword) -> max 1000 vagas/refresh.
- Remotive: 1 call por categoria configurada -> ~200-500 vagas/refresh.
- Commit por batch (a cada 50 inserts) para evitar transacao longa no Supabase pooler.
- Padronizacao: ambas as fontes geram vagas com os mesmos campos
  (titulo, empresa, area, descricao curta, localidade, modelo_trabalho).
"""
from __future__ import annotations

import hashlib
import logging
import re
from datetime import datetime, timedelta
from typing import Any

import httpx
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)

ADZUNA_BASE_URL = 'https://api.adzuna.com/v1/api/jobs'
REMOTIVE_BASE_URL = 'https://remotive.com/api/remote-jobs'
ARBEITNOW_BASE_URL = 'https://www.arbeitnow.com/api/job-board-api'

CREATE_TABLE_DDL = """
CREATE TABLE IF NOT EXISTS cache_vagas_externas (
    id SERIAL PRIMARY KEY,
    fonte VARCHAR(50) NOT NULL,
    id_externo VARCHAR(255) NOT NULL,
    titulo TEXT NOT NULL,
    empresa TEXT,
    area TEXT,
    descricao TEXT,
    localidade TEXT,
    modelo_trabalho TEXT,
    salario_min NUMERIC,
    salario_max NUMERIC,
    moeda VARCHAR(10),
    url_origem TEXT NOT NULL,
    data_publicacao TIMESTAMP,
    hash_dedup VARCHAR(64) NOT NULL,
    fetched_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT cache_vagas_externas_fonte_id_uk UNIQUE (fonte, id_externo)
);
CREATE INDEX IF NOT EXISTS idx_cache_vagas_externas_expires
    ON cache_vagas_externas(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_vagas_externas_hash
    ON cache_vagas_externas(hash_dedup);
"""

# Limites de tamanho para nao estourar buffer do PgBouncer (Supabase pooler)
MAX_DESCRIPTION_CHARS = 3000
MAX_TITLE_CHARS = 500
MAX_TEXT_CHARS = 500
COMMIT_EVERY_N = 50

# Regex para limpar tags HTML que vem na descricao do Remotive
HTML_TAG_REGEX = re.compile(r'<[^>]+>')
WHITESPACE_REGEX = re.compile(r'\s+')


class ExternalJobsService:
    def __init__(self, db: Session):
        self.db = db

    # ----- API publica -----

    def list_external_jobs(self) -> list[dict[str, Any]]:
        """Retorna vagas externas do cache. Se cache vazio, faz fetch agora.

        Se cache expirou mas tem dados, retorna o antigo (UI nao fica vazia)
        e o caller deve agendar refresh em background.
        """
        self._ensure_table()

        rows = self.db.execute(
            text(
                """
                SELECT id, fonte, id_externo, titulo, empresa, area, descricao,
                       localidade, modelo_trabalho, salario_min, salario_max, moeda,
                       url_origem, data_publicacao, expires_at
                FROM cache_vagas_externas
                ORDER BY data_publicacao DESC NULLS LAST, id DESC
                """
            )
        ).mappings().all()

        if not rows:
            logger.info('Cache de vagas externas vazio - fazendo fetch sincrono.')
            self.refresh_cache()
            rows = self.db.execute(
                text(
                    """
                    SELECT id, fonte, id_externo, titulo, empresa, area, descricao,
                           localidade, modelo_trabalho, salario_min, salario_max, moeda,
                           url_origem, data_publicacao, expires_at
                    FROM cache_vagas_externas
                    ORDER BY data_publicacao DESC NULLS LAST, id DESC
                    """
                )
            ).mappings().all()

        return [self._row_to_dict(row) for row in rows]

    def cache_is_stale(self) -> bool:
        """True se nao ha cache ou se todos os registros expiraram."""
        self._ensure_table()
        row = self.db.execute(
            text('SELECT MAX(expires_at) AS max_exp FROM cache_vagas_externas')
        ).mappings().first()
        max_exp = row['max_exp'] if row else None
        return max_exp is None or max_exp < datetime.utcnow()

    def refresh_cache(self) -> int:
        """Busca vagas das fontes externas e faz upsert no cache.

        Retorna numero de vagas inseridas/atualizadas.
        """
        self._ensure_table()

        ttl = timedelta(hours=settings.adzuna_cache_ttl_hours)
        expires_at = datetime.utcnow() + ttl
        seen_hashes: set[str] = set()
        total_upserted = 0

        # ----- Fonte 1: Adzuna -----
        if settings.adzuna_app_id and settings.adzuna_app_key:
            try:
                adzuna_jobs = self._fetch_adzuna_all()
                normalized_adzuna = self._normalize_and_dedup(adzuna_jobs, self._normalize_adzuna_job, seen_hashes)
                inserted = self._upsert_jobs(normalized_adzuna, expires_at)
                total_upserted += inserted
                logger.info('Adzuna | normalizadas=%s | inseridas/atualizadas=%s', len(normalized_adzuna), inserted)
            except Exception:
                logger.exception('Adzuna | falha geral no fetch/upsert')
        else:
            logger.warning('Adzuna sem credenciais configuradas - pulando fetch.')

        # ----- Fonte 2: Remotive -----
        if settings.remotive_enabled:
            try:
                remotive_jobs = self._fetch_remotive_all()
                normalized_remotive = self._normalize_and_dedup(remotive_jobs, self._normalize_remotive_job, seen_hashes)
                inserted = self._upsert_jobs(normalized_remotive, expires_at)
                total_upserted += inserted
                logger.info('Remotive | normalizadas=%s | inseridas/atualizadas=%s', len(normalized_remotive), inserted)
            except Exception:
                logger.exception('Remotive | falha geral no fetch/upsert')
        else:
            logger.info('Remotive desabilitado - pulando fetch.')

        # ----- Fonte 3: Arbeitnow -----
        if settings.arbeitnow_enabled:
            try:
                arbeitnow_jobs = self._fetch_arbeitnow_all()
                normalized_arbeitnow = self._normalize_and_dedup(arbeitnow_jobs, self._normalize_arbeitnow_job, seen_hashes)
                inserted = self._upsert_jobs(normalized_arbeitnow, expires_at)
                total_upserted += inserted
                logger.info('Arbeitnow | normalizadas=%s | inseridas/atualizadas=%s', len(normalized_arbeitnow), inserted)
            except Exception:
                logger.exception('Arbeitnow | falha geral no fetch/upsert')
        else:
            logger.info('Arbeitnow desabilitado - pulando fetch.')

        # Limpa registros muito antigos (15 dias) - transacao separada
        try:
            self.db.execute(
                text(
                    """
                    DELETE FROM cache_vagas_externas
                    WHERE fetched_at < NOW() - INTERVAL '15 days'
                    """
                )
            )
            self.db.commit()
        except Exception:
            self.db.rollback()
            logger.exception('Falha ao limpar registros antigos')

        logger.info('Refresh concluido | total_upserted=%s | expires_at=%s', total_upserted, expires_at)
        return total_upserted

    # ----- Internos: orquestracao -----

    def _normalize_and_dedup(
        self,
        raw_jobs: list[dict[str, Any]],
        normalizer,
        seen_hashes: set[str],
    ) -> list[dict[str, Any]]:
        """Aplica normalizacao e remove duplicatas por hash."""
        normalized: list[dict[str, Any]] = []
        for job in raw_jobs:
            try:
                n = normalizer(job)
            except Exception:
                logger.exception('Falha ao normalizar vaga')
                continue
            if not n or n['hash_dedup'] in seen_hashes:
                continue
            seen_hashes.add(n['hash_dedup'])
            normalized.append(n)
        return normalized

    def _upsert_jobs(self, jobs: list[dict[str, Any]], expires_at: datetime) -> int:
        """Faz upsert em batches (commit a cada COMMIT_EVERY_N).

        Batches pequenos previnem o Supabase pooler de fechar a conexao em
        transacao longa. Se uma batch falha, tenta as outras.
        """
        if not jobs:
            return 0

        upserted = 0
        for i in range(0, len(jobs), COMMIT_EVERY_N):
            batch = jobs[i:i + COMMIT_EVERY_N]
            try:
                for job in batch:
                    self.db.execute(
                        text(
                            """
                            INSERT INTO cache_vagas_externas (
                                fonte, id_externo, titulo, empresa, area, descricao,
                                localidade, modelo_trabalho, salario_min, salario_max, moeda,
                                url_origem, data_publicacao, hash_dedup, fetched_at, expires_at
                            ) VALUES (
                                :fonte, :id_externo, :titulo, :empresa, :area, :descricao,
                                :localidade, :modelo_trabalho, :salario_min, :salario_max, :moeda,
                                :url_origem, :data_publicacao, :hash_dedup, NOW(), :expires_at
                            )
                            ON CONFLICT (fonte, id_externo) DO UPDATE SET
                                titulo = EXCLUDED.titulo,
                                empresa = EXCLUDED.empresa,
                                area = EXCLUDED.area,
                                descricao = EXCLUDED.descricao,
                                localidade = EXCLUDED.localidade,
                                modelo_trabalho = EXCLUDED.modelo_trabalho,
                                salario_min = EXCLUDED.salario_min,
                                salario_max = EXCLUDED.salario_max,
                                moeda = EXCLUDED.moeda,
                                url_origem = EXCLUDED.url_origem,
                                data_publicacao = EXCLUDED.data_publicacao,
                                hash_dedup = EXCLUDED.hash_dedup,
                                fetched_at = NOW(),
                                expires_at = EXCLUDED.expires_at
                            """
                        ),
                        {**job, 'expires_at': expires_at},
                    )
                self.db.commit()
                upserted += len(batch)
            except Exception:
                self.db.rollback()
                logger.exception('Falha em batch | offset=%s | tamanho=%s', i, len(batch))
        return upserted

    def _ensure_table(self) -> None:
        """Cria a tabela de cache se nao existir. Idempotente."""
        try:
            self.db.execute(text(CREATE_TABLE_DDL))
            self.db.commit()
        except Exception:
            self.db.rollback()
            logger.exception('Falha ao garantir tabela cache_vagas_externas')
            raise HTTPException(status_code=500, detail='Erro ao preparar cache de vagas externas.')

    # ----- Internos: Adzuna -----

    def _fetch_adzuna_all(self) -> list[dict[str, Any]]:
        """Busca todas as vagas tech BR via paginacao (category=it-jobs)."""
        results: list[dict[str, Any]] = []
        headers = {'User-Agent': 'Portal-Recrutamento/1.0', 'Accept': 'application/json'}

        with httpx.Client(timeout=20.0, headers=headers, follow_redirects=True) as client:
            for page in range(1, settings.adzuna_max_pages + 1):
                params = {
                    'app_id': settings.adzuna_app_id,
                    'app_key': settings.adzuna_app_key,
                    'results_per_page': settings.adzuna_results_per_page,
                    'category': 'it-jobs',
                    'content-type': 'application/json',
                }
                url = f'{ADZUNA_BASE_URL}/{settings.adzuna_country}/search/{page}'

                try:
                    response = client.get(url, params=params)
                    response.raise_for_status()
                    payload = response.json()
                except Exception as exc:
                    logger.warning('Adzuna fetch falhou | page=%s | erro=%s', page, exc)
                    break

                page_results = payload.get('results', [])
                if not page_results:
                    break

                results.extend(page_results)
                logger.info('Adzuna | page=%s | recebidas=%s | acumulado=%s', page, len(page_results), len(results))

                if len(page_results) < settings.adzuna_results_per_page:
                    break

        return results

    @staticmethod
    def _normalize_adzuna_job(job: dict[str, Any]) -> dict[str, Any] | None:
        titulo = (job.get('title') or '').strip()[:MAX_TITLE_CHARS]
        url_origem = (job.get('redirect_url') or '').strip()

        if not titulo or not url_origem:
            return None

        empresa = ((job.get('company') or {}).get('display_name') or '').strip()[:MAX_TEXT_CHARS] or None
        localidade = ((job.get('location') or {}).get('display_name') or '').strip()[:MAX_TEXT_CHARS] or None
        area = ((job.get('category') or {}).get('label') or '').strip()[:MAX_TEXT_CHARS] or None

        descricao_full = (job.get('description') or '').strip()
        descricao = descricao_full[:MAX_DESCRIPTION_CHARS] if descricao_full else None
        modelo_trabalho = ExternalJobsService._guess_modelo(titulo, descricao_full, localidade or '')

        try:
            data_pub = job.get('created')
            data_publicacao = datetime.fromisoformat(data_pub.replace('Z', '+00:00')) if data_pub else None
            if data_publicacao and data_publicacao.tzinfo is not None:
                data_publicacao = data_publicacao.replace(tzinfo=None)
        except (ValueError, AttributeError):
            data_publicacao = None

        salario_min = job.get('salary_min')
        salario_max = job.get('salary_max')
        moeda = 'BRL' if settings.adzuna_country == 'br' else None

        id_externo = str(job.get('id') or '').strip()
        if not id_externo:
            id_externo = hashlib.sha256(url_origem.encode('utf-8')).hexdigest()[:32]

        hash_dedup = ExternalJobsService._hash_dedup(titulo, empresa or '', url_origem)

        return {
            'fonte': 'adzuna',
            'id_externo': id_externo,
            'titulo': titulo,
            'empresa': empresa,
            'area': area,
            'descricao': descricao,
            'localidade': localidade,
            'modelo_trabalho': modelo_trabalho,
            'salario_min': salario_min,
            'salario_max': salario_max,
            'moeda': moeda,
            'url_origem': url_origem,
            'data_publicacao': data_publicacao,
            'hash_dedup': hash_dedup,
        }

    # ----- Internos: Remotive -----

    def _fetch_remotive_all(self) -> list[dict[str, Any]]:
        """Busca vagas remote tech do Remotive (1 call - filtros foram deprecados em 2025).

        A API publica retorna ~21 vagas atualmente (limite imposto pelo Remotive).
        """
        headers = {'User-Agent': 'Portal-Recrutamento/1.0', 'Accept': 'application/json'}

        try:
            with httpx.Client(timeout=20.0, headers=headers, follow_redirects=True) as client:
                response = client.get(REMOTIVE_BASE_URL)
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:
            logger.warning('Remotive fetch falhou | erro=%s', exc)
            return []

        jobs = payload.get('jobs', [])
        logger.info('Remotive | recebidas=%s', len(jobs))
        return jobs

    @staticmethod
    def _normalize_remotive_job(job: dict[str, Any]) -> dict[str, Any] | None:
        titulo = (job.get('title') or '').strip()[:MAX_TITLE_CHARS]
        url_origem = (job.get('url') or '').strip()

        if not titulo or not url_origem:
            return None

        empresa = (job.get('company_name') or '').strip()[:MAX_TEXT_CHARS] or None
        localidade = (job.get('candidate_required_location') or '').strip()[:MAX_TEXT_CHARS] or None
        area = (job.get('category') or '').strip()[:MAX_TEXT_CHARS] or None

        descricao_raw = (job.get('description') or '').strip()
        descricao_clean = ExternalJobsService._strip_html(descricao_raw)
        descricao = descricao_clean[:MAX_DESCRIPTION_CHARS] if descricao_clean else None

        # Remotive so tem vagas remotas
        modelo_trabalho = 'Remoto'

        try:
            data_pub = job.get('publication_date')
            data_publicacao = datetime.fromisoformat(data_pub.replace('Z', '+00:00')) if data_pub else None
            if data_publicacao and data_publicacao.tzinfo is not None:
                data_publicacao = data_publicacao.replace(tzinfo=None)
        except (ValueError, AttributeError):
            data_publicacao = None

        # Remotive tem `salary` como string formato livre - nao parseamos
        salario_min = None
        salario_max = None
        moeda = None

        id_externo = str(job.get('id') or '').strip()
        if not id_externo:
            id_externo = hashlib.sha256(url_origem.encode('utf-8')).hexdigest()[:32]

        hash_dedup = ExternalJobsService._hash_dedup(titulo, empresa or '', url_origem)

        return {
            'fonte': 'remotive',
            'id_externo': id_externo,
            'titulo': titulo,
            'empresa': empresa,
            'area': area,
            'descricao': descricao,
            'localidade': localidade,
            'modelo_trabalho': modelo_trabalho,
            'salario_min': salario_min,
            'salario_max': salario_max,
            'moeda': moeda,
            'url_origem': url_origem,
            'data_publicacao': data_publicacao,
            'hash_dedup': hash_dedup,
        }

    # ----- Internos: Arbeitnow -----

    def _fetch_arbeitnow_all(self) -> list[dict[str, Any]]:
        """Busca vagas do Arbeitnow (foco tech europeu + remoto).

        API publica e gratuita, sem cadastro. Retorna ~100-300 vagas.
        """
        headers = {'User-Agent': 'Portal-Recrutamento/1.0', 'Accept': 'application/json'}

        try:
            with httpx.Client(timeout=20.0, headers=headers, follow_redirects=True) as client:
                response = client.get(ARBEITNOW_BASE_URL)
                response.raise_for_status()
                payload = response.json()
        except Exception as exc:
            logger.warning('Arbeitnow fetch falhou | erro=%s', exc)
            return []

        jobs = payload.get('data', [])
        logger.info('Arbeitnow | recebidas=%s', len(jobs))
        return jobs

    @staticmethod
    def _normalize_arbeitnow_job(job: dict[str, Any]) -> dict[str, Any] | None:
        titulo = (job.get('title') or '').strip()[:MAX_TITLE_CHARS]
        url_origem = (job.get('url') or '').strip()

        if not titulo or not url_origem:
            return None

        empresa = (job.get('company_name') or '').strip()[:MAX_TEXT_CHARS] or None
        localidade = (job.get('location') or '').strip()[:MAX_TEXT_CHARS] or None

        # Arbeitnow usa "tags" (array de strings) - juntamos como area
        tags = job.get('tags') or []
        area = ', '.join(str(t) for t in tags[:5])[:MAX_TEXT_CHARS] or None

        descricao_raw = (job.get('description') or '').strip()
        descricao_clean = ExternalJobsService._strip_html(descricao_raw)
        descricao = descricao_clean[:MAX_DESCRIPTION_CHARS] if descricao_clean else None

        # Arbeitnow tem flag `remote` boolean
        is_remote = bool(job.get('remote'))
        modelo_trabalho = 'Remoto' if is_remote else (
            ExternalJobsService._guess_modelo(titulo, descricao_clean, localidade or '') or 'Presencial'
        )

        # `created_at` vem como Unix timestamp (segundos)
        try:
            ts = job.get('created_at')
            data_publicacao = datetime.utcfromtimestamp(int(ts)) if ts else None
        except (ValueError, TypeError, OSError):
            data_publicacao = None

        # Arbeitnow nao retorna salario formatado
        salario_min = None
        salario_max = None
        moeda = None

        # `slug` e o id estavel da vaga
        id_externo = (job.get('slug') or '').strip()
        if not id_externo:
            id_externo = hashlib.sha256(url_origem.encode('utf-8')).hexdigest()[:32]

        hash_dedup = ExternalJobsService._hash_dedup(titulo, empresa or '', url_origem)

        return {
            'fonte': 'arbeitnow',
            'id_externo': id_externo,
            'titulo': titulo,
            'empresa': empresa,
            'area': area,
            'descricao': descricao,
            'localidade': localidade,
            'modelo_trabalho': modelo_trabalho,
            'salario_min': salario_min,
            'salario_max': salario_max,
            'moeda': moeda,
            'url_origem': url_origem,
            'data_publicacao': data_publicacao,
            'hash_dedup': hash_dedup,
        }

    # ----- Helpers genericos -----

    @staticmethod
    def _hash_dedup(titulo: str, empresa: str, url: str) -> str:
        raw = f'{titulo.lower().strip()}|{empresa.lower().strip()}|{url.lower().strip()}'
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()

    @staticmethod
    def _guess_modelo(titulo: str, descricao: str, localidade: str) -> str | None:
        """Heuristica simples: detecta Remoto/Hibrido/Presencial a partir do texto."""
        haystack = f'{titulo} {descricao} {localidade}'.lower()
        if any(term in haystack for term in ['remoto', 'remote', 'home office', 'home-office']):
            return 'Remoto'
        if any(term in haystack for term in ['hibrido', 'híbrido', 'hybrid']):
            return 'Hibrido'
        if any(term in haystack for term in ['presencial', 'on-site', 'on site']):
            return 'Presencial'
        return None

    @staticmethod
    def _strip_html(value: str) -> str:
        """Remove tags HTML e normaliza espacos em branco."""
        if not value:
            return ''
        without_tags = HTML_TAG_REGEX.sub(' ', value)
        normalized = WHITESPACE_REGEX.sub(' ', without_tags)
        return normalized.strip()

    @staticmethod
    def _row_to_dict(row: Any) -> dict[str, Any]:
        return {
            'id': f"ext-{row['fonte']}-{row['id_externo']}",
            'titulo': row['titulo'],
            'empresa': row['empresa'],
            'area': row['area'],
            'descricao': row['descricao'],
            'localidade': row['localidade'],
            'modelo_trabalho': row['modelo_trabalho'],
            'salario_min': float(row['salario_min']) if row['salario_min'] is not None else None,
            'salario_max': float(row['salario_max']) if row['salario_max'] is not None else None,
            'moeda': row['moeda'],
            'url_origem': row['url_origem'],
            'data_publicacao': row['data_publicacao'].isoformat() if row['data_publicacao'] else None,
            'fonte': row['fonte'],
        }
