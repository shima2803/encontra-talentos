
from __future__ import annotations

import json
import logging
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any

from google import genai

from app.core.config import settings

logger = logging.getLogger(__name__)


class GeminiAnalysisService:
    def __init__(self) -> None:
        self.enabled = bool(settings.gemini_enabled and settings.gemini_api_key)
        self.model = settings.gemini_model or "gemini-2.5-flash"
        self.client = genai.Client(api_key=settings.gemini_api_key) if self.enabled else None

    def analyze(
        self,
        *,
        candidatura_id: int,
        vaga_atual: dict[str, Any],
        vagas_abertas: list[dict[str, Any]],
        resume_text: str,
        local_summary_text: str,
        target_directory: str,
    ) -> dict[str, Any]:
        target_dir = Path(target_directory)
        if not self.enabled or self.client is None:
            raise RuntimeError("Gemini nao configurado. Defina GEMINI_API_KEY e GEMINI_ENABLED=true no .env.")

        try:
            logger.info("Gemini | iniciando analise oficial | candidatura=%s | modelo=%s", candidatura_id, self.model)

            request_payload = self._build_request_payload(
                vaga_atual=vaga_atual,
                vagas_abertas=vagas_abertas,
                resume_text=resume_text,
                local_summary_text=local_summary_text,
            )

            prompt = self._build_prompt(request_payload)
            self._write_text(target_dir / "gemini_request.txt", prompt)

            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config={
                    "response_mime_type": "application/json",
                    "response_json_schema": self._response_schema(),
                },
            )

            raw_text = response.text or "{}"
            self._write_text(target_dir / "gemini_response.json", raw_text)

            parsed = json.loads(raw_text)
            normalized = self._normalize_result(parsed, candidatura_id)
            self._write_text(target_dir / "resumo_ia.txt", normalized["resumo_ia_txt"])

            logger.info(
                "Gemini | analise concluida | candidatura=%s | score=%s | resumo_chars=%s",
                candidatura_id,
                normalized["score_aderencia"],
                len(normalized.get("resumo_ia", "") or ""),
            )
            return normalized
        except Exception as exc:
            error_text = "\n".join(
                [
                    f"Candidatura: {candidatura_id}",
                    f"Modelo: {self.model}",
                    f"Data: {datetime.utcnow().isoformat()}",
                    f"Erro: {exc}",
                    "",
                    "Traceback:",
                    traceback.format_exc(),
                ]
            )
            self._write_text(target_dir / "gemini_error.txt", error_text)
            logger.exception("Gemini | falha na analise oficial | candidatura=%s", candidatura_id)
            raise

    def _build_request_payload(
        self,
        *,
        vaga_atual: dict[str, Any],
        vagas_abertas: list[dict[str, Any]],
        resume_text: str,
        local_summary_text: str,
    ) -> dict[str, Any]:
        return {
            "vaga_atual": {
                "id_vaga": vaga_atual.get("id_vaga"),
                "titulo_vaga": vaga_atual.get("titulo_vaga"),
                "area": vaga_atual.get("area"),
                "nivel": vaga_atual.get("nivel"),
                "descricao": vaga_atual.get("descricao"),
                "status_vaga": vaga_atual.get("status_vaga"),
            },
            "vagas_abertas": [
                {
                    "id_vaga": vaga.get("id"),
                    "titulo_vaga": vaga.get("titulo"),
                    "area": vaga.get("area"),
                    "nivel": vaga.get("nivel"),
                    "descricao": vaga.get("descricao"),
                }
                for vaga in vagas_abertas
            ],
            "resumo_local_fase_1": local_summary_text,
            "curriculo_extraido": resume_text,
        }

    def _build_prompt(self, payload: dict[str, Any]) -> str:
        return (
            "Voce e um assistente de triagem de curriculos para recrutamento.\n"
            "Sua resposta sera a analise OFICIAL gravada no banco.\n\n"
            "Tarefas:\n"
            "1. Analise a vaga atual, o nivel da vaga, o curriculo extraido e o resumo local da fase 1.\n"
            "2. Seja mais tolerante para vagas Junior.\n"
            "3. Seja mais exigente para vagas Pleno.\n"
            "4. Seja ainda mais rigoroso para vagas Senior.\n"
            "5. Diga se vale a pena seguir com a candidatura para a vaga atual.\n"
            "6. Diga qual vaga aberta do portal combina melhor com o perfil.\n"
            "7. Se nenhuma vaga combinar bem, informe isso claramente.\n"
            "8. Nao invente experiencias ou tecnologias que nao estejam no curriculo.\n"
            "9. Gere um parecer_final completo, detalhado e explicativo. Esse texto sera salvo na coluna parecer_ia do banco.\n"
            "10. Gere tambem um resumo_final menor, objetivo, com no maximo 350 caracteres. Esse texto sera salvo na coluna resumo_ia do banco.\n"
            "11. O score_final deve ser uma nota numerica de 0 a 100. Esse valor sera salvo na coluna score_aderencia.\n"
            "12. Retorne apenas JSON no schema solicitado.\n\n"
            f"DADOS:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
        )

    def _response_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "score_final": {"type": "number"},
                "classificacao_final": {"type": "string", "enum": ["ALTA", "MEDIA", "BAIXA"]},
                "parecer_final": {"type": "string"},
                "resumo_final": {"type": "string"},
                "pontos_fortes": {"type": "array", "items": {"type": "string"}},
                "gaps": {"type": "array", "items": {"type": "string"}},
                "vaga_mais_aderente": {"type": ["string", "null"]},
                "recomendado_para_vaga_atual": {"type": "boolean"},
                "vale_a_pena_seguir": {"type": "boolean"},
                "motivo_final": {"type": "string"},
            },
            "required": [
                "score_final",
                "classificacao_final",
                "parecer_final",
                "resumo_final",
                "pontos_fortes",
                "gaps",
                "vaga_mais_aderente",
                "recomendado_para_vaga_atual",
                "vale_a_pena_seguir",
                "motivo_final",
            ],
        }

    def _normalize_result(self, data: dict[str, Any], candidatura_id: int) -> dict[str, Any]:
        score = round(float(data.get("score_final", 0) or 0), 2)
        classificacao = str(data.get("classificacao_final", "BAIXA") or "BAIXA").upper()
        parecer_final = str(data.get("parecer_final", "") or "").strip()
        resumo_final = self._limit_summary(str(data.get("resumo_final", "") or "").strip(), parecer_final)
        pontos_fortes = data.get("pontos_fortes") or []
        gaps = data.get("gaps") or []
        vaga_mais_aderente = data.get("vaga_mais_aderente")
        recomendado = bool(data.get("recomendado_para_vaga_atual", False))
        vale_a_pena = bool(data.get("vale_a_pena_seguir", False))
        motivo_final = str(data.get("motivo_final", "") or "").strip()

        parecer_banco = "\n".join(
            [
                f"Classificacao geral: {classificacao}",
                "",
                "Parecer geral da IA:",
                parecer_final or "A IA nao retornou um parecer detalhado.",
                "",
                "Resumo curto:",
                resumo_final,
                "",
                "Pontos fortes:",
                ", ".join(pontos_fortes) if pontos_fortes else "Nenhum ponto forte relevante identificado.",
                "",
                "Gaps identificados:",
                ", ".join(gaps) if gaps else "Nenhum gap relevante informado pela IA.",
                "",
                "Vaga mais aderente:",
                str(vaga_mais_aderente or "Nenhuma vaga indicada no momento"),
                "",
                "Recomendado para vaga atual:",
                "Sim" if recomendado else "Nao",
                "",
                "Vale a pena seguir:",
                "Sim" if vale_a_pena else "Nao",
                "",
                "Motivo final:",
                motivo_final or "Nenhum motivo final informado pela IA.",
            ]
        )

        resumo_txt = "\n".join(
            [
                f"Candidatura: {candidatura_id}",
                f"Score final IA: {score}",
                f"Classificacao final: {classificacao}",
                "",
                "Resumo final:",
                resumo_final,
                "",
                "Parecer final:",
                parecer_final,
                "",
                "Pontos fortes:",
                ", ".join(pontos_fortes) if pontos_fortes else "Nenhum ponto forte relevante identificado.",
                "",
                "Gaps:",
                ", ".join(gaps) if gaps else "Nenhum gap relevante informado pela IA.",
                "",
                "Vaga mais aderente:",
                str(vaga_mais_aderente or "Nenhuma vaga indicada no momento"),
                "",
                "Recomendado para vaga atual:",
                "Sim" if recomendado else "Nao",
                "",
                "Vale a pena seguir:",
                "Sim" if vale_a_pena else "Nao",
                "",
                "Motivo final:",
                motivo_final,
                "",
                f"Modelo IA: {self.model}",
                f"Data analise: {datetime.utcnow().isoformat()}",
            ]
        )

        return {
            "score_aderencia": score,
            "classificacao_aderencia": classificacao,
            "parecer_ia": parecer_banco,
            "resumo_ia": resumo_final,
            "pontos_fortes": ", ".join(pontos_fortes) if pontos_fortes else "",
            "gaps_identificados": ", ".join(gaps) if gaps else "",
            "recomendado_para_vaga_atual": recomendado,
            "motivo_recomendacao": motivo_final,
            "modelo_ia_utilizado": self.model,
            "versao_prompt": "gemini-fase2-v2-resumo",
            "status_analise": "CONCLUIDA",
            "tempo_processamento_ms": None,
            "resumo_ia_txt": resumo_txt,
        }

    def _limit_summary(self, summary: str, fallback_text: str) -> str:
        base = summary or fallback_text or "Analise concluida pela IA."
        base = " ".join(base.split()).strip()
        if len(base) <= 350:
            return base
        return base[:347].rstrip() + "..."

    def _write_text(self, path: Path, content: str) -> None:
        path.write_text(content, encoding="utf-8")
