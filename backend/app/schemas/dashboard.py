from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class DashboardKpis(BaseModel):
    total_candidaturas: int
    total_vagas_abertas: int
    score_medio: Optional[Decimal] = None
    candidatos_alto_score: int
    media_salarial_total: Optional[Decimal] = None
    candidatos_abaixo_media_salarial: int


class FunilFaixa(BaseModel):
    faixa: str
    total: int


class MediaSalarialPorVaga(BaseModel):
    id_vaga: int
    titulo_vaga: str
    media_salarial: Optional[Decimal] = None
    total_candidaturas: int


class CandidatoTopScore(BaseModel):
    id_candidatura: int
    nome_completo: str
    titulo_vaga: str
    score_aderencia: Optional[Decimal] = None


class ScoreVsPretensaoPonto(BaseModel):
    titulo_vaga: str
    pretensao_salarial: Optional[Decimal] = None
    score_aderencia: Optional[Decimal] = None


class DashboardStats(BaseModel):
    kpis: DashboardKpis
    funil_aderencia: list[FunilFaixa]
    media_salarial_por_vaga: list[MediaSalarialPorVaga]
    top_candidatos: list[CandidatoTopScore]
    score_vs_pretensao: list[ScoreVsPretensaoPonto]
