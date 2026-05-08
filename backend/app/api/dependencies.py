"""Dependencies de FastAPI: extrai empresa autenticada do JWT."""
from __future__ import annotations

from typing import Annotated, Optional

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.auth_service import decode_access_token, get_empresa_by_id


def get_current_empresa(
    authorization: Annotated[Optional[str], Header()] = None,
    db: Session = Depends(get_db),
) -> dict:
    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Credenciais ausentes ou invalidas',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    token = authorization.split(' ', 1)[1].strip()
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Sessao expirada. Faca login novamente.',
            headers={'WWW-Authenticate': 'Bearer'},
        )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Token invalido',
            headers={'WWW-Authenticate': 'Bearer'},
        )

    sub = payload.get('sub')
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Token sem sub')

    empresa = get_empresa_by_id(db, int(sub))
    if not empresa:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Empresa nao encontrada')
    if empresa.get('status') != 'ATIVA':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Empresa inativa ou suspensa')

    return empresa


CurrentEmpresa = Annotated[dict, Depends(get_current_empresa)]
