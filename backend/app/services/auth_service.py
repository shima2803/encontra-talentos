"""Autenticacao de empresas: hash bcrypt, JWT e lookups na tabela empresa."""
from __future__ import annotations

import datetime as dt
from typing import Optional

import bcrypt
import jwt
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except (ValueError, TypeError):
        return False


def create_access_token(empresa_id: int, expires_in_hours: Optional[int] = None) -> str:
    hours = expires_in_hours or settings.jwt_expire_hours
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        'sub': str(empresa_id),
        'iat': int(now.timestamp()),
        'exp': int((now + dt.timedelta(hours=hours)).timestamp()),
        'type': 'empresa',
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm='HS256')


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=['HS256'])


def get_empresa_by_login(db: Session, nome_login: str) -> Optional[dict]:
    row = db.execute(
        text(
            'SELECT id_empresa, nome, nome_login, senha_hash, status '
            'FROM public.empresa WHERE LOWER(nome_login) = LOWER(:login) LIMIT 1'
        ),
        {'login': nome_login},
    ).mappings().first()
    return dict(row) if row else None


def get_empresa_by_id(db: Session, id_empresa: int) -> Optional[dict]:
    row = db.execute(
        text(
            'SELECT id_empresa, nome, nome_login, cnpj, bio, logo_url, site, '
            '       email_contato, status, criado_em '
            'FROM public.empresa WHERE id_empresa = :id LIMIT 1'
        ),
        {'id': id_empresa},
    ).mappings().first()
    return dict(row) if row else None
