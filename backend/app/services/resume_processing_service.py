from __future__ import annotations

import hashlib
import logging
import re
import unicodedata
from pathlib import Path
from typing import Any

from docx import Document
from pypdf import PdfReader

logger = logging.getLogger(__name__)


class ResumeProcessingService:
    def __init__(self, backend_root: Path) -> None:
        self.storage_root = (backend_root / 'storage' / 'curriculos').resolve()
        self.storage_root.mkdir(parents=True, exist_ok=True)

        self.skill_aliases = {
            'sql': ['sql', 'postgresql', 'mysql', 'query', 'queries', 'consulta sql', 'consultas sql', 'banco de dados'],
            'python': ['python', 'fastapi', 'pandas', 'selenium', 'tkinter', 'pyautogui', 'automacao com python'],
            'power bi': ['power bi', 'pbi', 'dashboard', 'dashboards', 'relatorio', 'relatorios', 'visualizacao de dados', 'storytelling com dados'],
            'excel': ['excel', 'planilha', 'planilhas', 'vba'],
            'javascript': ['javascript', 'js', 'typescript'],
            'react': ['react', 'next.js', 'nextjs', 'front-end', 'frontend'],
        }

        self.role_profiles = {
            'analista de dados': {
                'area': 'Dados',
                'weights': {
                    'sql': 22,
                    'power bi': 20,
                    'python': 15,
                    'excel': 12,
                    'dashboard': 10,
                    'dashboards': 10,
                    'indicador': 10,
                    'indicadores': 10,
                    'analise de dados': 9,
                    'analise exploratoria': 9,
                    'visualizacao de dados': 8,
                    'bi': 8,
                    'etl': 7,
                    'automacao': 6,
                    'kpi': 6,
                    'kpis': 6,
                },
            },
            'analista de bi': {
                'area': 'Dados',
                'weights': {
                    'power bi': 22,
                    'sql': 18,
                    'excel': 12,
                    'dashboard': 12,
                    'dashboards': 12,
                    'indicador': 10,
                    'indicadores': 10,
                    'bi': 10,
                    'visualizacao de dados': 8,
                    'storytelling': 7,
                    'etl': 7,
                    'python': 6,
                },
            },
            'desenvolvedor python': {
                'area': 'TI',
                'weights': {
                    'python': 24,
                    'fastapi': 14,
                    'api': 12,
                    'backend': 12,
                    'sql': 8,
                    'django': 8,
                    'flask': 8,
                    'git': 5,
                    'automacao': 5,
                },
            },
            'desenvolvedor front-end': {
                'area': 'TI',
                'weights': {
                    'javascript': 18,
                    'react': 18,
                    'typescript': 12,
                    'front-end': 10,
                    'frontend': 10,
                    'html': 9,
                    'css': 9,
                    'interface': 8,
                    'interfaces': 8,
                    'next.js': 7,
                },
            },
            'analista de suporte': {
                'area': 'TI',
                'weights': {
                    'suporte': 20,
                    'atendimento': 16,
                    'usuarios': 12,
                    'usuários': 12,
                    'help desk': 10,
                    'service desk': 10,
                    'chamado': 8,
                    'chamados': 8,
                    'sistema': 6,
                    'sistemas': 6,
                },
            },
        }

    def save_file(self, candidatura_id: int, original_name: str, content: bytes) -> dict[str, Any]:
        target_dir = self.storage_root / f'candidatura_{candidatura_id}'
        target_dir.mkdir(parents=True, exist_ok=True)

        safe_name = self._sanitize_filename(original_name)
        target_file = target_dir / safe_name
        target_file.write_bytes(content)

        return {
            'directory': str(target_dir),
            'path': str(target_file),
            'stored_name': target_file.name,
            'extension': target_file.suffix.lower().replace('.', ''),
            'sha256': hashlib.sha256(content).hexdigest(),
        }

    def extract_text(self, path: str) -> dict[str, Any]:
        file_path = Path(path)
        ext = file_path.suffix.lower()

        if ext == '.txt':
            text = file_path.read_text(encoding='utf-8', errors='ignore')
            return self._build_result(text, metodo='txt', qtd_paginas=None)

        if ext == '.docx':
            document = Document(str(file_path))
            text = '\n'.join(p.text for p in document.paragraphs if p.text is not None)
            return self._build_result(text, metodo='docx', qtd_paginas=None)

        if ext == '.pdf':
            reader = PdfReader(str(file_path))
            parts: list[str] = []
            for page in reader.pages:
                try:
                    parts.append(page.extract_text() or '')
                except Exception:
                    parts.append('')
            text = '\n'.join(parts)
            return self._build_result(text, metodo='pdf', qtd_paginas=len(reader.pages))

        raise ValueError(f'Formato nao suportado para extracao: {ext}')

    def analyze_resume_phase1(self, vaga: dict[str, Any] | None, skills: list[str], resume_text: str) -> dict[str, Any]:
        vaga = vaga or {}
        titulo = str(vaga.get('titulo_vaga', '') or '')
        area = str(vaga.get('area', '') or '')
        nivel = str(vaga.get('nivel', '') or '')
        descricao = str(vaga.get('descricao', '') or '')

        resume_norm = self._normalize(resume_text)
        job_norm = self._normalize(f'{titulo} {area} {nivel} {descricao}')
        role_key = self._resolve_role_key(titulo, area, descricao)

        detected_skills = self._detect_registered_skills(skills, resume_norm)
        profile = self.role_profiles.get(role_key, self._generic_profile(area, titulo, descricao))
        profile_matches, profile_missing = self._evaluate_profile(profile['weights'], resume_norm)

        detected_weight = sum(item['weight'] for item in detected_skills)
        matched_weight = sum(item['weight'] for item in profile_matches)
        total_profile_weight = max(1, sum(profile['weights'].values()))
        coverage_ratio = matched_weight / total_profile_weight

        seniority = self._resolve_seniority(nivel, titulo, descricao)
        seniority_rules = self._get_seniority_rules(seniority)

        score = seniority_rules['base_score']
        score += min(seniority_rules['detected_cap'], detected_weight * seniority_rules['detected_multiplier'])
        score += min(seniority_rules['coverage_cap'], coverage_ratio * seniority_rules['coverage_multiplier'])

        # bonus por alinhamento claro entre vaga e currículo
        bonus = 0.0
        if self._normalize(area) and self._normalize(area) in resume_norm:
            bonus += seniority_rules['area_bonus']
        if self._normalize(titulo) and any(term in resume_norm for term in self._title_bonus_terms(titulo)):
            bonus += seniority_rules['title_bonus']
        if any(term in resume_norm for term in self._important_terms_from_job(job_norm)):
            bonus += seniority_rules['job_terms_bonus']

        # bônus adicional por quantidade de evidências fortes, sem saturar
        strong_signals = min(6, len(profile_matches))
        bonus += strong_signals * seniority_rules['signal_bonus_per_match']

        # senioridade mais alta exige maior cobertura real
        coverage_penalty = 0.0
        if seniority == 'pleno':
            if coverage_ratio < 0.55:
                coverage_penalty += 8.0
            if coverage_ratio < 0.70:
                coverage_penalty += 6.0
        elif seniority == 'senior':
            if coverage_ratio < 0.60:
                coverage_penalty += 12.0
            if coverage_ratio < 0.75:
                coverage_penalty += 8.0
            if len(profile_matches) < 4:
                coverage_penalty += 5.0

        # penalização leve para itens fortes esperados e ausentes
        penalty = min(seniority_rules['penalty_cap'], sum(item['penalty'] for item in profile_missing[:seniority_rules['missing_window']]))
        score = score + bonus - penalty - coverage_penalty

        # calibragem para evitar 100 muito fácil
        if score > 90:
            score = 90 + ((score - 90) * seniority_rules['high_score_compression'])

        # teto por senioridade
        if coverage_ratio < seniority_rules['cap_threshold_low']:
            score = min(score, seniority_rules['cap_low'])
        elif coverage_ratio < seniority_rules['cap_threshold_mid']:
            score = min(score, seniority_rules['cap_mid'])
        else:
            score = min(score, seniority_rules['cap_high'])

        score = max(0.0, min(seniority_rules['absolute_cap'], score))

        if score >= seniority_rules['high_cutoff']:
            classificacao = 'ALTA'
        elif score >= seniority_rules['medium_cutoff']:
            classificacao = 'MEDIA'
        else:
            classificacao = 'BAIXA'

        strengths = self._unique_labels(
            [item['label'] for item in detected_skills] +
            [item['label'] for item in profile_matches]
        )[:8]

        gaps = self._unique_labels([item['label'] for item in profile_missing])[:5]
        area_recomendada = profile.get('area') or area or self._infer_area(resume_norm)
        recomendado_para_vaga_atual = score >= 55

        parecer = self._build_parecer(
            titulo=titulo,
            area=area,
            nivel=nivel,
            score=score,
            matched=strengths,
            gaps=gaps,
            area_recomendada=area_recomendada,
        )

        return {
            'score_aderencia': round(float(score), 2),
            'classificacao_aderencia': classificacao,
            'parecer_ia': parecer,
            'pontos_fortes': ', '.join(strengths) if strengths else 'Curriculo com aderencia inicial limitada nas skills selecionadas.',
            'gaps_identificados': ', '.join(gaps) if gaps else 'Nenhum gap principal identificado na fase 1.',
            'recomendado_para_vaga_atual': recomendado_para_vaga_atual,
            'motivo_recomendacao': f'Area com melhor aderencia identificada: {area_recomendada or area or titulo or "Geral"}.',
            'modelo_ia_utilizado': 'fase_1_regras_locais',
            'versao_prompt': 'fase1-v3-calibrado',
            'status_analise': 'CONCLUIDA',
            'tempo_processamento_ms': None,
        }

    def write_local_summary_file(self, candidatura_id: int, directory: str, analysis: dict[str, Any]) -> str:
        target = Path(directory) / 'resumo.txt'
        lines = [
            f'Candidatura: {candidatura_id}',
            f"Score de aderencia: {analysis.get('score_aderencia', '')}",
            f"Classificacao: {analysis.get('classificacao_aderencia', '')}",
            '',
            'Parecer:',
            str(analysis.get('parecer_ia', '') or ''),
            '',
            'Pontos fortes:',
            str(analysis.get('pontos_fortes', '') or ''),
            '',
            'Gaps identificados:',
            str(analysis.get('gaps_identificados', '') or ''),
            '',
            'Motivo recomendacao:',
            str(analysis.get('motivo_recomendacao', '') or ''),
        ]
        target.write_text('\n'.join(lines), encoding='utf-8')
        logger.info('Resumo local salvo | candidatura=%s | arquivo=%s', candidatura_id, target)
        return str(target)

    def _detect_registered_skills(self, skills: list[str], resume_norm: str) -> list[dict[str, Any]]:
        detected: list[dict[str, Any]] = []
        seen: set[str] = set()

        for skill in skills:
            original = str(skill).strip()
            if not original:
                continue

            key = self._normalize(original)
            aliases = self.skill_aliases.get(key, [key])
            match_count = sum(1 for alias in aliases if self._contains_term(resume_norm, alias))
            if match_count > 0 and key not in seen:
                base_weight = 10
                bonus = min(5, (match_count - 1) * 2)
                detected.append({'label': original, 'weight': base_weight + bonus})
                seen.add(key)

        return detected

    def _evaluate_profile(self, weights: dict[str, int], resume_norm: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        matches: list[dict[str, Any]] = []
        missing: list[dict[str, Any]] = []

        for term, weight in weights.items():
            if self._contains_term(resume_norm, term):
                matches.append({'label': self._pretty_label(term), 'weight': weight})
            elif weight >= 10:
                missing.append({'label': self._pretty_label(term), 'penalty': 4 if weight >= 16 else 2})

        matches.sort(key=lambda x: x['weight'], reverse=True)
        missing.sort(key=lambda x: x['penalty'], reverse=True)
        return matches, missing


    def _resolve_seniority(self, nivel: str, titulo: str, descricao: str) -> str:
        text = self._normalize(f'{nivel} {titulo} {descricao}')
        if any(token in text for token in ['senior', 'sênior', 'sr', 'especialista', 'especialista senior', 'coordenador', 'lider', 'líder']):
            return 'senior'
        if any(token in text for token in ['pleno', 'mid-level', 'intermediario', 'intermediário']):
            return 'pleno'
        return 'junior'

    def _get_seniority_rules(self, seniority: str) -> dict[str, float | int]:
        if seniority == 'senior':
            return {
                'base_score': 16.0,
                'detected_cap': 20.0,
                'detected_multiplier': 0.65,
                'coverage_cap': 42.0,
                'coverage_multiplier': 56.0,
                'area_bonus': 3.0,
                'title_bonus': 4.0,
                'job_terms_bonus': 3.0,
                'signal_bonus_per_match': 1.1,
                'penalty_cap': 20.0,
                'missing_window': 5,
                'high_score_compression': 0.18,
                'cap_threshold_low': 0.72,
                'cap_threshold_mid': 0.88,
                'cap_low': 80.0,
                'cap_mid': 90.0,
                'cap_high': 95.0,
                'absolute_cap': 95.0,
                'high_cutoff': 82.0,
                'medium_cutoff': 60.0,
            }
        if seniority == 'pleno':
            return {
                'base_score': 18.0,
                'detected_cap': 22.0,
                'detected_multiplier': 0.75,
                'coverage_cap': 40.0,
                'coverage_multiplier': 54.0,
                'area_bonus': 3.5,
                'title_bonus': 5.0,
                'job_terms_bonus': 3.5,
                'signal_bonus_per_match': 1.3,
                'penalty_cap': 17.0,
                'missing_window': 4,
                'high_score_compression': 0.22,
                'cap_threshold_low': 0.68,
                'cap_threshold_mid': 0.84,
                'cap_low': 85.0,
                'cap_mid': 92.0,
                'cap_high': 96.0,
                'absolute_cap': 96.0,
                'high_cutoff': 80.0,
                'medium_cutoff': 58.0,
            }
        return {
            'base_score': 22.0,
            'detected_cap': 24.0,
            'detected_multiplier': 0.90,
            'coverage_cap': 38.0,
            'coverage_multiplier': 52.0,
            'area_bonus': 4.0,
            'title_bonus': 6.0,
            'job_terms_bonus': 4.0,
            'signal_bonus_per_match': 1.5,
            'penalty_cap': 14.0,
            'missing_window': 4,
            'high_score_compression': 0.25,
            'cap_threshold_low': 0.60,
            'cap_threshold_mid': 0.82,
            'cap_low': 91.0,
            'cap_mid': 95.0,
            'cap_high': 97.0,
            'absolute_cap': 97.0,
            'high_cutoff': 78.0,
            'medium_cutoff': 55.0,
        }

    def _resolve_role_key(self, titulo: str, area: str, descricao: str) -> str:
        text = self._normalize(f'{titulo} {area} {descricao}')
        if 'analista de dados' in text:
            return 'analista de dados'
        if 'analista de bi' in text:
            return 'analista de bi'
        if 'desenvolvedor python' in text or ('python' in text and 'api' in text):
            return 'desenvolvedor python'
        if 'front-end' in text or 'frontend' in text or 'react' in text or 'javascript' in text:
            return 'desenvolvedor front-end'
        if 'suporte' in text or 'atendimento tecnico' in text:
            return 'analista de suporte'
        if 'dados' in text:
            return 'analista de dados'
        if 'ti' in text and 'python' in text:
            return 'desenvolvedor python'
        return self._normalize(titulo)

    def _generic_profile(self, area: str, titulo: str, descricao: str) -> dict[str, Any]:
        text = self._normalize(f'{area} {titulo} {descricao}')
        if 'dados' in text or 'bi' in text:
            return self.role_profiles['analista de dados']
        if 'suporte' in text:
            return self.role_profiles['analista de suporte']
        return {
            'area': area or self._infer_area(text),
            'weights': {
                'excel': 8,
                'sql': 8,
                'python': 8,
                'atendimento': 8,
                'dashboard': 8,
            },
        }

    def _title_bonus_terms(self, titulo: str) -> list[str]:
        title_norm = self._normalize(titulo)
        if 'analista de dados' in title_norm:
            return ['sql', 'power bi', 'dashboard', 'dashboards', 'indicadores', 'analise de dados']
        if 'analista de bi' in title_norm:
            return ['power bi', 'dashboard', 'dashboards', 'sql', 'bi']
        if 'desenvolvedor python' in title_norm:
            return ['python', 'fastapi', 'api', 'backend']
        if 'front-end' in title_norm or 'frontend' in title_norm:
            return ['react', 'javascript', 'typescript', 'html', 'css']
        if 'suporte' in title_norm:
            return ['suporte', 'atendimento', 'usuarios']
        return []

    def _important_terms_from_job(self, job_norm: str) -> list[str]:
        terms = []
        for term in ['sql', 'power bi', 'python', 'excel', 'fastapi', 'react', 'javascript', 'indicadores', 'dashboard', 'suporte', 'atendimento']:
            if term in job_norm:
                terms.append(term)
        return terms[:5]

    def _contains_term(self, normalized_text: str, term: str) -> bool:
        normalized_term = self._normalize(term)
        if not normalized_term:
            return False
        return normalized_term in normalized_text

    def _unique_labels(self, values: list[str]) -> list[str]:
        result: list[str] = []
        seen: set[str] = set()
        for value in values:
            key = self._normalize(value)
            if value and key not in seen:
                seen.add(key)
                result.append(value)
        return result

    def _pretty_label(self, term: str) -> str:
        mapping = {
            'sql': 'SQL',
            'python': 'Python',
            'power bi': 'Power BI',
            'excel': 'Excel',
            'javascript': 'JavaScript',
            'react': 'React',
            'dashboard': 'Dashboards',
            'dashboards': 'Dashboards',
            'indicador': 'Indicadores',
            'indicadores': 'Indicadores',
            'analise de dados': 'Análise de dados',
            'analise exploratoria': 'Análise exploratória',
            'visualizacao de dados': 'Visualização de dados',
            'automacao': 'Automação',
            'bi': 'BI',
            'etl': 'ETL',
            'kpi': 'KPIs',
            'kpis': 'KPIs',
            'api': 'APIs',
            'backend': 'Back-end',
            'front-end': 'Front-end',
            'frontend': 'Front-end',
            'html': 'HTML',
            'css': 'CSS',
            'interface': 'Interfaces',
            'interfaces': 'Interfaces',
            'suporte': 'Suporte',
            'atendimento': 'Atendimento',
            'usuarios': 'Usuários',
            'usuários': 'Usuários',
            'help desk': 'Help desk',
            'service desk': 'Service desk',
            'chamado': 'Chamados',
            'chamados': 'Chamados',
            'sistema': 'Sistemas',
            'sistemas': 'Sistemas',
            'fastapi': 'FastAPI',
            'django': 'Django',
            'flask': 'Flask',
            'git': 'Git',
            'storytelling': 'Storytelling',
            'next.js': 'Next.js',
            'typescript': 'TypeScript',
        }
        return mapping.get(term, term.title())

    def _build_result(self, text: str, *, metodo: str, qtd_paginas: int | None) -> dict[str, Any]:
        clean = text.strip()
        return {
            'texto_extraido': clean,
            'qtd_paginas': qtd_paginas,
            'qtd_caracteres': len(clean),
            'lingua_detectada': 'pt-BR',
            'metodo_extracao': metodo,
            'status_extracao': 'SUCESSO' if clean else 'VAZIO',
            'mensagem_erro': None if clean else 'Nao foi possivel extrair conteudo textual relevante.',
        }

    def _build_parecer(
        self,
        *,
        titulo: str,
        area: str,
        nivel: str,
        score: float,
        matched: list[str],
        gaps: list[str],
        area_recomendada: str,
    ) -> str:
        parts: list[str] = []
        if titulo:
            parts.append(f'O curriculo apresenta aderencia inicial a vaga de {titulo}')
        else:
            parts.append('O curriculo foi analisado na fase 1')
        parts.append(f'com score {score:.1f}.')
        if matched:
            parts.append(f'Pontos de aderencia identificados: {", ".join(matched[:5])}.')
        if gaps:
            parts.append(f'Competencias que podem fortalecer a candidatura: {", ".join(gaps[:3])}.')
        if area_recomendada:
            parts.append(f'Area com melhor encaixe: {area_recomendada}.')
        if nivel:
            parts.append(f'Nivel da vaga: {nivel}.')
        if area:
            parts.append(f'Area da vaga: {area}.')
        return ' '.join(parts).strip()

    def _infer_area(self, resume_norm: str) -> str:
        if any(token in resume_norm for token in ['sql', 'power bi', 'excel', 'dashboard', 'indicadores', 'analise de dados']):
            return 'Dados'
        if any(token in resume_norm for token in ['python', 'api', 'fastapi', 'react', 'javascript', 'suporte']):
            return 'TI'
        return 'Geral'

    def _sanitize_filename(self, name: str) -> str:
        base = Path(name).name or 'curriculo'
        base = re.sub(r'[^A-Za-z0-9._-]+', '_', base)
        return base[:180] or 'curriculo'

    def _normalize(self, value: str) -> str:
        text = ''.join(ch for ch in unicodedata.normalize('NFD', value.lower()) if unicodedata.category(ch) != 'Mn')
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
