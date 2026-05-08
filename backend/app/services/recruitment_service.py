from __future__ import annotations

import logging
import os
import re
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.gemini_analysis_service import GeminiAnalysisService
from app.services.email_service import EmailService
from app.services.resume_processing_service import ResumeProcessingService

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024
NAME_PATTERN = re.compile(r"^[A-Za-zÀ-ÿ' -]+$")
CITY_PATTERN = re.compile(r"^[A-Za-zÀ-ÿ' -]+$")
EMAIL_PATTERN = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')

# Assinaturas (magic bytes) para validar que o conteudo do arquivo bate com a extensao
PDF_SIGNATURE = b'%PDF-'
DOCX_SIGNATURE = b'PK\x03\x04'

logger = logging.getLogger(__name__)


def _validate_file_signature(extension: str, contents: bytes) -> None:
    """Valida que o conteudo real do arquivo bate com a extensao informada.

    Evita que alguem renomeie virus.exe para curriculo.pdf e suba.
    """
    if not contents:
        return

    if extension == '.pdf':
        if not contents.startswith(PDF_SIGNATURE):
            raise HTTPException(status_code=422, detail='O arquivo nao parece ser um PDF valido.')
    elif extension == '.docx':
        # DOCX e tecnicamente um arquivo ZIP
        if not contents.startswith(DOCX_SIGNATURE):
            raise HTTPException(status_code=422, detail='O arquivo nao parece ser um DOCX valido.')
    elif extension == '.txt':
        # Texto plano nao deve conter null bytes nos primeiros KB
        if b'\x00' in contents[:8192]:
            raise HTTPException(status_code=422, detail='O arquivo TXT contem dados binarios.')


class RecruitmentService:
    def __init__(self, db: Session):
        self.db = db
        self.schema = (settings.db_schema or '').strip()
        self.table_names = {
            'vaga': settings.db_table_vaga,
            'skill': settings.db_table_skill,
            'candidato': settings.db_table_candidato,
            'candidato_email': settings.db_table_candidato_email,
            'candidato_telefone': settings.db_table_candidato_telefone,
            'candidatura': settings.db_table_candidatura,
            'candidatura_skill': settings.db_table_candidatura_skill,
            'curriculo_arquivo': settings.db_table_curriculo_arquivo,
            'curriculo_texto_extraido': settings.db_table_curriculo_texto_extraido,
            'analise_ia_candidatura': settings.db_table_analise_ia_candidatura,
            'log_envio_email': settings.db_table_log_envio_email,
        }
        self._resolved_tables: dict[str, str] = {}
        self._table_columns_cache: dict[str, set[str]] = {}
        self.backend_root = Path(__file__).resolve().parents[2]
        self.resume_processor = ResumeProcessingService(self.backend_root)
        self.gemini_service = GeminiAnalysisService()
        self.email_service = EmailService()

    def _scalar(self, query: str, params: dict[str, Any] | None = None) -> Any:
        return self.db.execute(text(query), params or {}).scalar_one_or_none()

    def _rows(self, query: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        return [dict(row) for row in self.db.execute(text(query), params or {}).mappings().all()]

    def _qualify(self, schema: str | None, table: str) -> str:
        return f'{schema}.{table}' if schema else table

    def _table_columns(self, qualified_table: str) -> set[str]:
        if qualified_table in self._table_columns_cache:
            return self._table_columns_cache[qualified_table]

        if '.' in qualified_table:
            schema, table = qualified_table.split('.', 1)
        else:
            schema, table = None, qualified_table

        if schema:
            rows = self.db.execute(
                text(
                    '''
                    select column_name
                    from information_schema.columns
                    where table_schema = :schema and table_name = :table
                    order by ordinal_position
                    '''
                ),
                {'schema': schema, 'table': table},
            ).mappings().all()
        else:
            rows = self.db.execute(
                text(
                    '''
                    select column_name
                    from information_schema.columns
                    where table_name = :table
                    order by ordinal_position
                    '''
                ),
                {'table': table},
            ).mappings().all()

        columns = {row['column_name'] for row in rows}
        self._table_columns_cache[qualified_table] = columns
        return columns

    def _find_table(self, logical_name: str) -> str:
        if logical_name in self._resolved_tables:
            return self._resolved_tables[logical_name]

        table = self.table_names[logical_name]
        if self.schema:
            row = self.db.execute(
                text(
                    '''
                    select table_schema, table_name
                    from information_schema.tables
                    where table_schema = :schema and table_name = :table
                    limit 1
                    '''
                ),
                {'schema': self.schema, 'table': table},
            ).mappings().first()
            if row:
                qualified = self._qualify(row['table_schema'], row['table_name'])
                self._resolved_tables[logical_name] = qualified
                return qualified

        row = self.db.execute(
            text(
                '''
                select table_schema, table_name
                from information_schema.tables
                where table_name = :table
                order by case when table_schema = 'public' then 0 else 1 end, table_schema
                limit 1
                '''
            ),
            {'table': table},
        ).mappings().first()
        if row:
            qualified = self._qualify(row['table_schema'], row['table_name'])
            self._resolved_tables[logical_name] = qualified
            return qualified

        raise HTTPException(status_code=500, detail=f'Tabela {table} nao encontrada para a conexao atual.')

    def _find_optional_table(self, table_name: str) -> str | None:
        if self.schema:
            row = self.db.execute(
                text(
                    '''
                    select table_schema, table_name
                    from information_schema.tables
                    where table_schema = :schema and table_name = :table
                    limit 1
                    '''
                ),
                {'schema': self.schema, 'table': table_name},
            ).mappings().first()
            if row:
                return self._qualify(row['table_schema'], row['table_name'])

        row = self.db.execute(
            text(
                '''
                select table_schema, table_name
                from information_schema.tables
                where table_name = :table
                order by case when table_schema = 'public' then 0 else 1 end, table_schema
                limit 1
                '''
            ),
            {'table': table_name},
        ).mappings().first()
        return self._qualify(row['table_schema'], row['table_name']) if row else None

    def debug_db_check(self) -> dict[str, Any]:
        current = self.db.execute(text('select current_database() as db, current_schema() as schema')).mappings().first()
        tables = self.db.execute(text("""
            select table_schema, table_name
            from information_schema.tables
            where table_name in (:vaga,:skill,:candidato,:candidatura,:curriculo)
            order by table_schema, table_name
        """), {
            'vaga': self.table_names['vaga'],
            'skill': self.table_names['skill'],
            'candidato': self.table_names['candidato'],
            'candidatura': self.table_names['candidatura'],
            'curriculo': self.table_names['curriculo_arquivo'],
        }).mappings().all()
        result = {
            'database': dict(current) if current else None,
            'configured_schema': self.schema or '(vazio)',
            'configured_tables': self.table_names,
            'visible_tables': [dict(r) for r in tables],
        }
        logger.info('DB CHECK | %s', result)
        return result

    def list_vagas(self) -> list[dict[str, Any]]:
        vaga_table = self._find_table('vaga')
        query = f'''
            SELECT v.id_vaga AS id,
                   v.titulo_vaga AS titulo,
                   v.area, v.nivel, v.descricao, v.status_vaga,
                   v.tipo_contrato, v.modelo_trabalho,
                   v.localidade_cidade, v.localidade_estado,
                   v.salario_min AS salario, v.salario_periodicidade, v.moeda,
                   e.nome AS empresa
            FROM {vaga_table} v
            LEFT JOIN public.empresa e ON e.id_empresa = v.id_empresa
            WHERE v.status_vaga = 'ABERTA'
            ORDER BY v.data_publicacao DESC NULLS LAST, v.id_vaga DESC
        '''
        try:
            rows = self._rows(query)
            logger.info('Vagas carregadas: %s | tabela=%s', len(rows), vaga_table)
            return rows
        except Exception as exc:
            logger.exception('Erro ao listar vagas | table=%s', vaga_table)
            raise HTTPException(status_code=500, detail=f'Erro ao listar vagas. Verifique backend/logs/app.log | {exc}') from exc

    def list_skills(self) -> list[dict[str, Any]]:
        skill_table = self._find_table('skill')
        query = f'''
            SELECT id_skill AS id, nome_skill AS nome
            FROM {skill_table}
            ORDER BY id_skill
        '''
        try:
            rows = self._rows(query)
            logger.info('Skills carregadas: %s | tabela=%s', len(rows), skill_table)
            return rows
        except Exception as exc:
            logger.exception('Erro ao listar skills | table=%s', skill_table)
            raise HTTPException(status_code=500, detail=f'Erro ao listar skills. Verifique backend/logs/app.log | {exc}') from exc

    async def create_candidatura(
        self,
        *,
        nome_completo: str,
        data_nascimento: str | None,
        cidade: str,
        estado: str,
        pretensao_salarial: str | None,
        about_me: str | None,
        email: str,
        email_principal: bool,
        ddd: str,
        numero: str,
        telefone_principal: bool,
        banco_talentos: bool,
        id_vaga: int | None,
        nivel: str,
        skill_ids: list[int],
        aceite_termos: bool,
        curriculo: UploadFile,
        background_tasks: BackgroundTasks | None = None,
    ) -> dict[str, Any]:
        logger.info('Iniciando create_candidatura | nome=%s | vaga=%s | banco_talentos=%s | nivel=%s', nome_completo, id_vaga, banco_talentos, nivel)

        if not aceite_termos:
            raise HTTPException(status_code=422, detail='Voce precisa aceitar os termos para continuar.')
        if not skill_ids:
            raise HTTPException(status_code=422, detail='Selecione pelo menos uma skill.')

        nome_completo = self._validate_nome(nome_completo)
        cidade = self._validate_cidade(cidade)
        estado = self._validate_estado(estado)
        email = self._validate_email(email)
        ddd, numero = self._validate_phone(ddd, numero)
        about_me = self._normalize_optional_text(about_me, max_length=1000)

        vaga_id = self._resolve_vaga_id(id_vaga=id_vaga, banco_talentos=banco_talentos)
        self._validate_skills(skill_ids)
        file_meta = await self._extract_file_metadata(curriculo)
        salary_value = self._parse_salary(pretensao_salarial)
        now = datetime.utcnow()

        try:
            candidato_id = self._insert_candidato(
                nome_completo=nome_completo,
                data_nascimento=data_nascimento,
                cidade=cidade,
                estado=estado,
                pretensao_salarial=salary_value,
                about_me=about_me,
                aceite_termos=aceite_termos,
                data_cadastro=now,
            )
            self._insert_email(candidato_id, email, bool(email_principal), now)
            self._insert_telefone(candidato_id, ddd, numero, bool(telefone_principal), now)
            candidatura_id = self._insert_candidatura(candidato_id, vaga_id, now)
            self._insert_candidatura_skills(candidatura_id, skill_ids)
            curriculo_arquivo_id = self._insert_curriculo_arquivo(candidatura_id, file_meta, now)
            self.db.commit()
            logger.info('Candidatura salva com sucesso | candidato=%s | candidatura=%s | curriculo_arquivo=%s', candidato_id, candidatura_id, curriculo_arquivo_id)
        except HTTPException:
            self.db.rollback()
            raise
        except Exception as exc:
            self.db.rollback()
            logger.exception('Erro ao salvar candidatura')
            raise HTTPException(status_code=500, detail=f'Erro ao salvar candidatura. Verifique backend/logs/app.log | {exc}') from exc

        # Tarefas pesadas (email + processamento + Gemini) rodam em background:
        # o front recebe a resposta IMEDIATAMENTE apos o commit do banco.
        if background_tasks is not None:
            background_tasks.add_task(
                _bg_send_confirmation_email,
                candidatura_id=candidatura_id,
                destinatario=email,
                nome=nome_completo,
                vaga_id=vaga_id,
            )
            background_tasks.add_task(
                _bg_process_resume_phase1,
                candidatura_id=candidatura_id,
                curriculo_arquivo_id=curriculo_arquivo_id,
                vaga_id=vaga_id,
                skill_ids=list(skill_ids),
                file_meta=file_meta,
                now_iso=now.isoformat(),
            )
            logger.info('Tarefas pesadas agendadas em background | candidatura=%s', candidatura_id)
        else:
            # Fallback sincrono (compatibilidade caso BackgroundTasks nao seja injetado)
            self._send_confirmation_email_and_log(
                candidatura_id=candidatura_id,
                destinatario=email,
                nome=nome_completo,
                vaga_id=vaga_id,
            )
            self._process_resume_phase1(
                candidatura_id=candidatura_id,
                curriculo_arquivo_id=curriculo_arquivo_id,
                vaga_id=vaga_id,
                skill_ids=skill_ids,
                file_meta=file_meta,
                now=now,
            )

        return {
            'id_candidato': candidato_id,
            'id_candidatura': candidatura_id,
            'message': 'Candidatura enviada com sucesso.',
        }

    def _normalize_text(self, value: str) -> str:
        return ' '.join(value.split()).strip()

    def _normalize_optional_text(self, value: str | None, *, max_length: int | None = None) -> str | None:
        if value is None:
            return None
        normalized = self._normalize_text(value)
        if not normalized:
            return None
        if max_length is not None and len(normalized) > max_length:
            raise HTTPException(status_code=422, detail=f'O texto informado excede o limite de {max_length} caracteres.')
        return normalized

    def _validate_nome(self, value: str) -> str:
        normalized = self._normalize_text(value)
        if len(normalized) < 3:
            raise HTTPException(status_code=422, detail='Informe seu nome completo.')
        if not NAME_PATTERN.fullmatch(normalized):
            raise HTTPException(status_code=422, detail='O nome deve conter apenas letras.')
        return normalized

    def _validate_cidade(self, value: str) -> str:
        normalized = self._normalize_text(value)
        if len(normalized) < 2:
            raise HTTPException(status_code=422, detail='Informe sua cidade.')
        if not CITY_PATTERN.fullmatch(normalized):
            raise HTTPException(status_code=422, detail='A cidade deve conter apenas letras.')
        return normalized

    def _validate_estado(self, value: str) -> str:
        normalized = self._normalize_text(value).upper()
        if not re.fullmatch(r'[A-Z]{2}', normalized):
            raise HTTPException(status_code=422, detail='Informe uma UF valida com 2 letras.')
        return normalized

    def _validate_email(self, value: str) -> str:
        normalized = value.strip().lower()
        if not EMAIL_PATTERN.fullmatch(normalized):
            raise HTTPException(status_code=422, detail='Informe um e-mail valido.')
        return normalized

    def _validate_phone(self, ddd: str, numero: str) -> tuple[str, str]:
        normalized_ddd = re.sub(r'\D', '', ddd or '')
        normalized_numero = re.sub(r'\D', '', numero or '')

        if len(normalized_ddd) != 2:
            raise HTTPException(status_code=422, detail='Informe um DDD valido com 2 numeros.')
        if len(normalized_numero) not in {8, 9}:
            raise HTTPException(status_code=422, detail='Informe um numero valido com 8 ou 9 numeros.')

        return normalized_ddd, normalized_numero

    def _resolve_vaga_id(self, *, id_vaga: int | None, banco_talentos: bool) -> int:
        vaga_table = self._find_table('vaga')
        if banco_talentos:
            row = self.db.execute(
                text(f'SELECT id_vaga FROM {vaga_table} WHERE titulo_vaga = :titulo LIMIT 1'),
                {'titulo': settings.banco_talentos_titulo},
            ).mappings().first()
            if row:
                return int(row['id_vaga'])

            created = self.db.execute(
                text(
                    f'''
                    INSERT INTO {vaga_table} (titulo_vaga, area, nivel, descricao, status_vaga, data_publicacao)
                    VALUES (:titulo_vaga, :area, :nivel, :descricao, :status_vaga, :data_publicacao)
                    RETURNING id_vaga
                    '''
                ),
                {
                    'titulo_vaga': settings.banco_talentos_titulo,
                    'area': 'Banco de Talentos',
                    'nivel': 'Geral',
                    'descricao': 'Candidatos sem selecao de vaga especifica.',
                    'status_vaga': 'ABERTA',
                    'data_publicacao': datetime.utcnow(),
                },
            ).scalar_one()
            return int(created)

        if not id_vaga:
            raise HTTPException(status_code=422, detail='Selecione uma vaga ou marque banco de talentos.')

        exists = self._scalar(f'SELECT id_vaga FROM {vaga_table} WHERE id_vaga = :id_vaga', {'id_vaga': id_vaga})
        if exists is None:
            raise HTTPException(status_code=404, detail='Vaga informada nao encontrada.')
        return int(exists)

    def _validate_skills(self, skill_ids: list[int]) -> None:
        skill_table = self._find_table('skill')
        placeholders = ','.join([f':s{i}' for i in range(len(skill_ids))])
        params = {f's{i}': int(v) for i, v in enumerate(skill_ids)}
        rows = self._rows(f'SELECT id_skill FROM {skill_table} WHERE id_skill IN ({placeholders})', params)
        existing = {int(row['id_skill']) for row in rows}
        missing = [skill_id for skill_id in skill_ids if int(skill_id) not in existing]
        if missing:
            raise HTTPException(status_code=404, detail=f'Skills nao encontradas: {missing}')

    async def _extract_file_metadata(self, curriculo: UploadFile) -> dict[str, Any]:
        extension = Path(curriculo.filename or '').suffix.lower()
        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(status_code=422, detail='Formato de curriculo invalido. Use PDF, DOCX ou TXT.')

        contents = await curriculo.read()
        size = len(contents)
        await curriculo.seek(0)

        if size == 0:
            raise HTTPException(status_code=422, detail='O arquivo do curriculo esta vazio.')
        if size > MAX_FILE_SIZE:
            raise HTTPException(status_code=422, detail='O arquivo deve ter no maximo 10 MB.')

        _validate_file_signature(extension, contents)

        return {
            'nome_arquivo_original': os.path.basename(curriculo.filename or 'curriculo'),
            'tamanho_bytes': size,
            'conteudo_bytes': contents,
            'extensao_arquivo': extension.replace('.', ''),
        }

    def _parse_salary(self, value: str | None) -> Decimal | None:
        if value is None or value == '':
            return None

        normalized = value.replace('R$', '').replace(' ', '')
        normalized = re.sub(r'[^0-9,.-]', '', normalized)

        if ',' in normalized:
            normalized = normalized.replace('.', '').replace(',', '.')

        try:
            parsed = Decimal(normalized)
        except InvalidOperation as exc:
            raise HTTPException(status_code=422, detail='Pretensao salarial invalida.') from exc

        if parsed < 0:
            raise HTTPException(status_code=422, detail='Pretensao salarial invalida.')

        return parsed

    def _insert_candidato(self, **kwargs: Any) -> int:
        table = self._find_table('candidato')
        columns = self._table_columns(table)

        candidates = {
            'nome_completo': kwargs.get('nome_completo'),
            'data_nascimento': kwargs.get('data_nascimento'),
            'cidade': kwargs.get('cidade'),
            'estado': kwargs.get('estado'),
            'pretensao_salarial': kwargs.get('pretensao_salarial'),
            'about_me': kwargs.get('about_me'),
            'data_cadastro': kwargs.get('data_cadastro'),
            'aceite_termos': kwargs.get('aceite_termos'),
        }

        payload = {key: value for key, value in candidates.items() if key in columns}
        placeholders = ', '.join(f':{key}' for key in payload)
        column_list = ', '.join(payload.keys())

        return int(
            self.db.execute(
                text(f'INSERT INTO {table} ({column_list}) VALUES ({placeholders}) RETURNING id_candidato'),
                payload,
            ).scalar_one()
        )

    def _insert_email(self, id_candidato: int, email: str, is_principal: bool, data_cadastro: datetime) -> None:
        table = self._find_table('candidato_email')
        self.db.execute(
            text(f'INSERT INTO {table} (id_candidato, email, is_principal, data_cadastro) VALUES (:id_candidato, :email, :is_principal, :data_cadastro)'),
            {
                'id_candidato': id_candidato,
                'email': email,
                'is_principal': is_principal,
                'data_cadastro': data_cadastro,
            },
        )

    def _insert_telefone(self, id_candidato: int, ddd: str, numero: str, is_principal: bool, data_cadastro: datetime) -> None:
        table = self._find_table('candidato_telefone')
        self.db.execute(
            text(f'INSERT INTO {table} (id_candidato, ddd, numero, is_principal, data_cadastro) VALUES (:id_candidato, :ddd, :numero, :is_principal, :data_cadastro)'),
            {
                'id_candidato': id_candidato,
                'ddd': ddd,
                'numero': numero,
                'is_principal': is_principal,
                'data_cadastro': data_cadastro,
            },
        )

    def _insert_candidatura(self, id_candidato: int, id_vaga: int, data_candidatura: datetime) -> int:
        table = self._find_table('candidatura')
        return int(
            self.db.execute(
                text(
                    f'''
                    INSERT INTO {table} (id_candidato, id_vaga, status_candidatura, data_candidatura)
                    VALUES (:id_candidato, :id_vaga, :status_candidatura, :data_candidatura)
                    RETURNING id_candidatura
                    '''
                ),
                {
                    'id_candidato': id_candidato,
                    'id_vaga': id_vaga,
                    'status_candidatura': settings.candidatura_status_inicial,
                    'data_candidatura': data_candidatura,
                },
            ).scalar_one()
        )

    def _insert_candidatura_skills(self, id_candidatura: int, skill_ids: list[int]) -> None:
        table = self._find_table('candidatura_skill')
        for skill_id in skill_ids:
            self.db.execute(
                text(
                    f'''
                    INSERT INTO {table} (id_candidatura, id_skill)
                    VALUES (:id_candidatura, :id_skill)
                    '''
                ),
                {
                    'id_candidatura': id_candidatura,
                    'id_skill': int(skill_id),
                },
            )

    def _insert_curriculo_arquivo(self, id_candidatura: int, file_meta: dict[str, Any], now: datetime) -> int | None:
        table = self._find_table('curriculo_arquivo')
        columns = self._table_columns(table)
        filename = file_meta['nome_arquivo_original']
        extension = file_meta.get('extensao_arquivo') or Path(filename).suffix.lower().replace('.', '')
        mime = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'txt': 'text/plain',
        }.get(extension, 'application/octet-stream')

        candidates = {
            'id_candidatura': id_candidatura,
            'nome_arquivo_original': filename,
            'nome_arquivo_armazenado': filename,
            'extensao_arquivo': extension,
            'mime_type': mime,
            'tamanho_bytes': file_meta['tamanho_bytes'],
            'data_upload': now,
            'status_processamento': 'PENDENTE',
            'caminho_armazenamento': None,
            'hash_arquivo': None,
        }
        payload = {key: value for key, value in candidates.items() if key in columns}

        cols_sql = ', '.join(payload.keys())
        vals_sql = ', '.join(f':{key}' for key in payload.keys())
        returning = ' RETURNING id_curriculo_arquivo' if 'id_curriculo_arquivo' in columns else ''
        result = self.db.execute(text(f'INSERT INTO {table} ({cols_sql}) VALUES ({vals_sql}){returning}'), payload)
        return int(result.scalar_one()) if returning else None

    def _send_confirmation_email_and_log(self, *, candidatura_id: int, destinatario: str, nome: str, vaga_id: int) -> None:
        """Envia o e-mail de confirmacao e grava o resultado em log_envio_email."""
        vaga = self._get_vaga_details(vaga_id) or {}
        vaga_titulo = str(vaga.get('titulo_vaga') or settings.banco_talentos_titulo or 'Banco de Talentos')

        try:
            result = self.email_service.send_candidatura_confirmation(
                destinatario=destinatario,
                nome=nome,
                vaga=vaga_titulo,
            )
        except Exception as exc:
            logger.exception('Falha inesperada no envio de e-mail | candidatura=%s', candidatura_id)
            result = type('EmailResult', (), {'status': 'ERRO', 'message': str(exc)})()

        try:
            self._insert_log_envio_email(
                id_candidatura=candidatura_id,
                destinatario=destinatario,
                status_envio=str(result.status),
                mensagem_erro=getattr(result, 'message', None),
            )
            self.db.commit()
        except Exception:
            self.db.rollback()
            logger.exception('Falha ao gravar log_envio_email | candidatura=%s | destinatario=%s', candidatura_id, destinatario)

    def _insert_log_envio_email(self, *, id_candidatura: int, destinatario: str, status_envio: str, mensagem_erro: str | None = None) -> None:
        table = self._find_optional_table(settings.db_table_log_envio_email)
        if not table:
            logger.warning('Tabela de log de e-mail nao encontrada: %s', settings.db_table_log_envio_email)
            return

        columns = self._table_columns(table)
        candidates = {
            'id_candidatura': id_candidatura,
            'destinatario': destinatario,
            'status_envio': status_envio,
            'data_tentativa': datetime.utcnow(),
            'mensagem_erro': mensagem_erro,
        }
        payload = {key: value for key, value in candidates.items() if key in columns}

        required = {'id_candidatura', 'destinatario', 'status_envio', 'data_tentativa'}
        if not required.issubset(payload.keys()):
            logger.warning('Tabela %s nao possui todas as colunas esperadas para log de e-mail. Colunas=%s', table, sorted(columns))
            return

        cols_sql = ', '.join(payload.keys())
        vals_sql = ', '.join(f':{key}' for key in payload.keys())
        self.db.execute(text(f'INSERT INTO {table} ({cols_sql}) VALUES ({vals_sql})'), payload)
        logger.info('Log de envio de e-mail gravado | candidatura=%s | destinatario=%s | status=%s', id_candidatura, destinatario, status_envio)

    def _process_resume_phase1(
        self,
        *,
        candidatura_id: int,
        curriculo_arquivo_id: int | None,
        vaga_id: int,
        skill_ids: list[int],
        file_meta: dict[str, Any],
        now: datetime,
    ) -> None:
        try:
            save_result = self.resume_processor.save_file(
                candidatura_id=candidatura_id,
                original_name=file_meta['nome_arquivo_original'],
                content=file_meta['conteudo_bytes'],
            )
            self._update_curriculo_arquivo(
                curriculo_arquivo_id,
                candidatura_id,
                caminho_armazenamento=save_result['path'],
                nome_arquivo_armazenado=save_result['stored_name'],
                hash_arquivo=save_result['sha256'],
                status_processamento='ARMAZENADO',
            )

            extraction = self.resume_processor.extract_text(save_result['path'])
            logger.info('Arquivo | texto extraido | candidatura=%s | caracteres=%s', candidatura_id, extraction.get('qtd_caracteres'))
            self._insert_curriculo_texto_extraido(curriculo_arquivo_id, extraction, now)
            logger.info('Banco | curriculo_texto_extraido gravado | candidatura=%s', candidatura_id)

            vaga = self._get_vaga_details(vaga_id) or {}
            skill_names = self._get_skill_names(skill_ids)
            local_analysis = self.resume_processor.analyze_resume_phase1(vaga, skill_names, extraction['texto_extraido'])
            local_summary_path = self.resume_processor.write_local_summary_file(
                candidatura_id,
                save_result['directory'],
                local_analysis,
            )
            local_summary_text = Path(local_summary_path).read_text(encoding='utf-8')
            logger.info('Arquivo | resumo local salvo | candidatura=%s | caminho=%s', candidatura_id, local_summary_path)

            gemini_ok = False
            if self.gemini_service.enabled:
                try:
                    vagas_abertas = self.list_vagas()
                    final_analysis = self.gemini_service.analyze(
                        candidatura_id=candidatura_id,
                        vaga_atual=vaga,
                        vagas_abertas=vagas_abertas,
                        resume_text=extraction['texto_extraido'],
                        local_summary_text=local_summary_text,
                        target_directory=save_result['directory'],
                    )
                    logger.info('Gemini | resposta normalizada | candidatura=%s | score=%s | resumo=%s', candidatura_id, final_analysis.get('score_aderencia'), final_analysis.get('resumo_ia'))
                    self._insert_analise_ia(candidatura_id, final_analysis, now)
                    logger.info('Analise oficial Gemini salva no banco | candidatura=%s', candidatura_id)
                    gemini_ok = True
                except Exception:
                    logger.exception('Gemini | falha sem impedir fase local | candidatura=%s', candidatura_id)
            else:
                logger.warning('Gemini desabilitado ou sem chave configurada | candidatura=%s', candidatura_id)

            self._update_curriculo_arquivo(
                curriculo_arquivo_id,
                candidatura_id,
                status_processamento='PROCESSADO_FASE_1' if gemini_ok else 'PROCESSADO_LOCAL',
            )
            self.db.commit()
            logger.info('Processamento concluido | candidatura=%s | nivel_vaga=%s | gemini_ok=%s', candidatura_id, vaga.get('nivel'), gemini_ok)
        except Exception:
            self.db.rollback()
            logger.exception('Falha no processamento do curriculo | candidatura=%s', candidatura_id)
            try:
                self._update_curriculo_arquivo(curriculo_arquivo_id, candidatura_id, status_processamento='ERRO_FASE_1')
                self.db.commit()
            except Exception:
                self.db.rollback()
                logger.exception('Falha ao atualizar status de erro | candidatura=%s', candidatura_id)

    def _update_curriculo_arquivo(self, curriculo_arquivo_id: int | None, candidatura_id: int, **kwargs: Any) -> None:
        table = self._find_table('curriculo_arquivo')
        columns = self._table_columns(table)
        payload = {key: value for key, value in kwargs.items() if key in columns}
        if not payload:
            return

        set_sql = ', '.join(f'{key} = :{key}' for key in payload.keys())
        if curriculo_arquivo_id is not None and 'id_curriculo_arquivo' in columns:
            payload['pk'] = curriculo_arquivo_id
            self.db.execute(text(f'UPDATE {table} SET {set_sql} WHERE id_curriculo_arquivo = :pk'), payload)
        else:
            payload['id_candidatura'] = candidatura_id
            self.db.execute(text(f'UPDATE {table} SET {set_sql} WHERE id_candidatura = :id_candidatura'), payload)

    def _insert_curriculo_texto_extraido(self, curriculo_arquivo_id: int | None, extraction: dict[str, Any], now: datetime) -> None:
        if curriculo_arquivo_id is None:
            return
        table = self._find_optional_table('curriculo_texto_extraido')
        if not table:
            return
        columns = self._table_columns(table)
        candidates = {
            'id_curriculo_arquivo': curriculo_arquivo_id,
            'texto_extraido': extraction.get('texto_extraido'),
            'qtd_paginas': extraction.get('qtd_paginas'),
            'qtd_caracteres': extraction.get('qtd_caracteres'),
            'lingua_detectada': extraction.get('lingua_detectada'),
            'data_extracao': now,
            'metodo_extracao': extraction.get('metodo_extracao'),
            'status_extracao': extraction.get('status_extracao'),
            'mensagem_erro': extraction.get('mensagem_erro'),
        }
        payload = {key: value for key, value in candidates.items() if key in columns}
        if 'id_curriculo_arquivo' not in payload or 'texto_extraido' not in payload:
            return
        cols_sql = ', '.join(payload.keys())
        vals_sql = ', '.join(f':{key}' for key in payload.keys())
        logger.info('Banco | inserindo curriculo_texto_extraido | id_curriculo_arquivo=%s | colunas=%s', curriculo_arquivo_id, ', '.join(payload.keys()))
        self.db.execute(text(f'INSERT INTO {table} ({cols_sql}) VALUES ({vals_sql})'), payload)

    def _get_vaga_details(self, id_vaga: int) -> dict[str, Any] | None:
        table = self._find_table('vaga')
        row = self.db.execute(
            text(
                f'''
                SELECT id_vaga, titulo_vaga, area, nivel, descricao, status_vaga, data_publicacao
                FROM {table}
                WHERE id_vaga = :id_vaga
                LIMIT 1
                '''
            ),
            {'id_vaga': id_vaga},
        ).mappings().first()

        return dict(row) if row else None

    def _get_skill_names(self, skill_ids: list[int]) -> list[str]:
        if not skill_ids:
            return []
        skill_table = self._find_table('skill')
        placeholders = ','.join([f':s{i}' for i in range(len(skill_ids))])
        params = {f's{i}': int(v) for i, v in enumerate(skill_ids)}
        rows = self._rows(f'SELECT nome_skill FROM {skill_table} WHERE id_skill IN ({placeholders}) ORDER BY id_skill', params)
        return [str(row['nome_skill']) for row in rows if row.get('nome_skill')]

    def _insert_analise_ia(self, candidatura_id: int, analysis: dict[str, Any], now: datetime) -> None:
        table = self._find_table('analise_ia_candidatura')

        payload = {
            'id_candidatura': candidatura_id,
            'score_aderencia': analysis.get('score_aderencia'),
            'parecer_ia': analysis.get('parecer_ia'),
            'resumo_ia': analysis.get('resumo_ia'),
            'data_analise': now,
        }

        logger.info(
            'Banco | inserindo analise_ia_candidatura | candidatura=%s | score=%s | tem_parecer=%s | tem_resumo=%s',
            candidatura_id,
            payload.get('score_aderencia'),
            bool(payload.get('parecer_ia')),
            bool(payload.get('resumo_ia')),
        )

        self.db.execute(
            text(f'''
                INSERT INTO {table}
                    (id_candidatura, score_aderencia, parecer_ia, resumo_ia, data_analise)
                VALUES
                    (:id_candidatura, :score_aderencia, :parecer_ia, :resumo_ia, :data_analise)
            '''),
            payload,
        )


# ---------------------------------------------------------------------------
# Background task wrappers
# ---------------------------------------------------------------------------
# As funcoes abaixo rodam APOS a resposta HTTP ser enviada ao cliente.
# Cada uma abre uma sessao SQLAlchemy propria (a do request ja foi fechada).

def _bg_send_confirmation_email(*, candidatura_id: int, destinatario: str, nome: str, vaga_id: int) -> None:
    """Envia email de confirmacao em background, com sessao SQLAlchemy isolada."""
    from app.db.session import SessionLocal  # import local para evitar ciclo
    db = SessionLocal()
    try:
        service = RecruitmentService(db)
        service._send_confirmation_email_and_log(
            candidatura_id=candidatura_id,
            destinatario=destinatario,
            nome=nome,
            vaga_id=vaga_id,
        )
    except Exception:
        logger.exception('Falha em background ao enviar email | candidatura=%s', candidatura_id)
    finally:
        db.close()


def _bg_process_resume_phase1(
    *,
    candidatura_id: int,
    curriculo_arquivo_id: int | None,
    vaga_id: int,
    skill_ids: list[int],
    file_meta: dict[str, Any],
    now_iso: str,
) -> None:
    """Processa curriculo + Gemini em background, com sessao SQLAlchemy isolada."""
    from app.db.session import SessionLocal
    db = SessionLocal()
    try:
        service = RecruitmentService(db)
        service._process_resume_phase1(
            candidatura_id=candidatura_id,
            curriculo_arquivo_id=curriculo_arquivo_id,
            vaga_id=vaga_id,
            skill_ids=skill_ids,
            file_meta=file_meta,
            now=datetime.fromisoformat(now_iso),
        )
    except Exception:
        logger.exception('Falha em background ao processar curriculo | candidatura=%s', candidatura_id)
    finally:
        db.close()
