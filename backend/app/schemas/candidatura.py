from typing import Optional
from pydantic import BaseModel


class CandidaturaCreateResponse(BaseModel):
    id_candidato: int
    id_candidatura: int
    message: str
