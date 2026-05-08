from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class VagaResponse(BaseModel):
    id: int
    titulo: str
    area: Optional[str] = None
    nivel: Optional[str] = None
    descricao: Optional[str] = None
    status_vaga: Optional[str] = None
    empresa: Optional[str] = None
    tipo_contrato: Optional[str] = None
    modelo_trabalho: Optional[str] = None
    localidade_cidade: Optional[str] = None
    localidade_estado: Optional[str] = None
    salario: Optional[Decimal] = None
    salario_periodicidade: Optional[str] = None
    moeda: Optional[str] = None
