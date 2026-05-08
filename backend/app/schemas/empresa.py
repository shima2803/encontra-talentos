from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    nome_login: str = Field(min_length=2, max_length=60)
    senha: str = Field(min_length=1, max_length=200)


class EmpresaResponse(BaseModel):
    id_empresa: int
    nome: str
    nome_login: str
    cnpj: Optional[str] = None
    bio: Optional[str] = None
    logo_url: Optional[str] = None
    site: Optional[str] = None
    email_contato: Optional[str] = None
    status: str
    criado_em: Optional[datetime] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    expires_in_hours: int
    empresa: EmpresaResponse
