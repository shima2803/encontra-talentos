from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, model_validator


VALID_TIPO_CONTRATO = {'CLT', 'PJ', 'ESTAGIO', 'JOVEM_APRENDIZ', 'CORPORATE'}
VALID_MODELO_TRABALHO = {'PRESENCIAL', 'HIBRIDO', 'ONLINE'}


class SkillBrief(BaseModel):
    id_skill: int
    nome_skill: str


class VagaRhCreateRequest(BaseModel):
    titulo_vaga: str = Field(min_length=2, max_length=200)
    area: Optional[str] = Field(default=None, max_length=120)
    nivel: Optional[str] = Field(default=None, max_length=60)
    descricao: Optional[str] = Field(default=None, max_length=5000)
    tipo_contrato: str = Field(min_length=1, max_length=30)
    modelo_trabalho: str = Field(min_length=1, max_length=20)
    localidade_cidade: Optional[str] = Field(default=None, max_length=120)
    localidade_estado: Optional[str] = Field(default=None, max_length=2)
    salario: Optional[Decimal] = Field(default=None, ge=0, le=9999999)
    salario_periodicidade: Optional[str] = Field(default='MENSAL')
    moeda: Optional[str] = Field(default='BRL', max_length=3)
    skill_ids: list[int] = Field(default_factory=list)

    @model_validator(mode='after')
    def _validate_dominios_e_localidade(self) -> 'VagaRhCreateRequest':
        if self.tipo_contrato not in VALID_TIPO_CONTRATO:
            raise ValueError(
                f'tipo_contrato invalido. Valores permitidos: {sorted(VALID_TIPO_CONTRATO)}'
            )
        if self.modelo_trabalho not in VALID_MODELO_TRABALHO:
            raise ValueError(
                f'modelo_trabalho invalido. Valores permitidos: {sorted(VALID_MODELO_TRABALHO)}'
            )
        if self.modelo_trabalho in ('PRESENCIAL', 'HIBRIDO'):
            if not self.localidade_cidade and not self.localidade_estado:
                raise ValueError(
                    'Vagas presenciais ou hibridas exigem cidade ou estado.'
                )
        if self.localidade_estado:
            self.localidade_estado = self.localidade_estado.upper()
        return self


class VagaRhUpdateRequest(BaseModel):
    titulo_vaga: Optional[str] = Field(default=None, min_length=2, max_length=200)
    area: Optional[str] = Field(default=None, max_length=120)
    nivel: Optional[str] = Field(default=None, max_length=60)
    descricao: Optional[str] = Field(default=None, max_length=5000)
    status_vaga: Optional[str] = Field(default=None)
    tipo_contrato: Optional[str] = Field(default=None, max_length=30)
    modelo_trabalho: Optional[str] = Field(default=None, max_length=20)
    localidade_cidade: Optional[str] = Field(default=None, max_length=120)
    localidade_estado: Optional[str] = Field(default=None, max_length=2)
    salario: Optional[Decimal] = Field(default=None, ge=0, le=9999999)
    salario_periodicidade: Optional[str] = None
    moeda: Optional[str] = Field(default=None, max_length=3)
    skill_ids: Optional[list[int]] = None

    @model_validator(mode='after')
    def _validate_dominios(self) -> 'VagaRhUpdateRequest':
        if self.tipo_contrato is not None and self.tipo_contrato not in VALID_TIPO_CONTRATO:
            raise ValueError(
                f'tipo_contrato invalido. Valores permitidos: {sorted(VALID_TIPO_CONTRATO)}'
            )
        if self.modelo_trabalho is not None and self.modelo_trabalho not in VALID_MODELO_TRABALHO:
            raise ValueError(
                f'modelo_trabalho invalido. Valores permitidos: {sorted(VALID_MODELO_TRABALHO)}'
            )
        if self.localidade_estado:
            self.localidade_estado = self.localidade_estado.upper()
        return self


class VagaRhResponse(BaseModel):
    id_vaga: int
    titulo_vaga: str
    area: Optional[str] = None
    nivel: Optional[str] = None
    descricao: Optional[str] = None
    status_vaga: str
    data_publicacao: Optional[datetime] = None
    tipo_contrato: Optional[str] = None
    modelo_trabalho: Optional[str] = None
    localidade_cidade: Optional[str] = None
    localidade_estado: Optional[str] = None
    salario: Optional[Decimal] = None
    salario_periodicidade: Optional[str] = None
    moeda: Optional[str] = None
    skills: list[SkillBrief] = Field(default_factory=list)
    total_candidaturas: int = 0


class CandidatoRhResponse(BaseModel):
    id_candidatura: int
    id_candidato: int
    nome_completo: str
    data_nascimento: Optional[date] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    pretensao_salarial: Optional[Decimal] = None
    email: Optional[str] = None
    ddd: Optional[str] = None
    telefone: Optional[str] = None
    score_aderencia: Optional[Decimal] = None
    resumo_ia: Optional[str] = None
    parecer_ia: Optional[str] = None
    status_candidatura: Optional[str] = None
    data_candidatura: Optional[datetime] = None
