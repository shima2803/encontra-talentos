"""Rotas /rh/* - portal das empresas. Requer JWT (exceto /rh/auth/login)."""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import CurrentEmpresa
from app.core.config import settings
from app.db.session import get_db
from app.schemas.dashboard import DashboardStats
from app.schemas.empresa import EmpresaResponse, LoginRequest, LoginResponse
from app.schemas.vaga_rh import (
    CandidatoRhResponse,
    VagaRhCreateRequest,
    VagaRhResponse,
    VagaRhUpdateRequest,
)
from app.services import dashboard_rh_service, vaga_rh_service
from app.services.auth_service import (
    create_access_token,
    get_empresa_by_id,
    get_empresa_by_login,
    verify_password,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/rh', tags=['rh'])
DbSession = Annotated[Session, Depends(get_db)]


# =====================================================
# Auth
# =====================================================
@router.post('/auth/login', response_model=LoginResponse)
def login(payload: LoginRequest, db: DbSession) -> LoginResponse:
    empresa = get_empresa_by_login(db, payload.nome_login)
    if not empresa or not verify_password(payload.senha, empresa['senha_hash']):
        logger.info('Login falhou | nome_login=%s', payload.nome_login)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Credenciais invalidas',
        )
    if empresa.get('status') != 'ATIVA':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Empresa inativa ou suspensa. Contate o administrador.',
        )

    token = create_access_token(int(empresa['id_empresa']))
    logger.info('Login OK | empresa_id=%s', empresa['id_empresa'])

    empresa_full = get_empresa_by_id(db, int(empresa['id_empresa']))
    return LoginResponse(
        access_token=token,
        expires_in_hours=settings.jwt_expire_hours,
        empresa=EmpresaResponse(**empresa_full),
    )


@router.get('/me', response_model=EmpresaResponse)
def me(empresa: CurrentEmpresa) -> EmpresaResponse:
    return EmpresaResponse(**empresa)


# =====================================================
# Vagas (CRUD)
# =====================================================
@router.get('/vagas', response_model=list[VagaRhResponse])
def list_my_vagas(empresa: CurrentEmpresa, db: DbSession) -> list[VagaRhResponse]:
    rows = vaga_rh_service.list_vagas_by_empresa(db, int(empresa['id_empresa']))
    return [VagaRhResponse(**r) for r in rows]


@router.post('/vagas', response_model=VagaRhResponse, status_code=status.HTTP_201_CREATED)
def create_vaga(
    payload: VagaRhCreateRequest,
    empresa: CurrentEmpresa,
    db: DbSession,
) -> VagaRhResponse:
    data = vaga_rh_service.create_vaga(
        db, int(empresa['id_empresa']), payload.model_dump()
    )
    logger.info('Vaga criada | empresa=%s | vaga=%s', empresa['id_empresa'], data['id_vaga'])
    return VagaRhResponse(**data)


@router.get('/vagas/{id_vaga}', response_model=VagaRhResponse)
def get_my_vaga(id_vaga: int, empresa: CurrentEmpresa, db: DbSession) -> VagaRhResponse:
    data = vaga_rh_service.get_vaga_full(db, id_vaga, int(empresa['id_empresa']))
    return VagaRhResponse(**data)


@router.patch('/vagas/{id_vaga}', response_model=VagaRhResponse)
def update_vaga(
    id_vaga: int,
    payload: VagaRhUpdateRequest,
    empresa: CurrentEmpresa,
    db: DbSession,
) -> VagaRhResponse:
    data = vaga_rh_service.update_vaga(
        db, id_vaga, int(empresa['id_empresa']),
        payload.model_dump(exclude_unset=True),
    )
    logger.info('Vaga atualizada | empresa=%s | vaga=%s', empresa['id_empresa'], id_vaga)
    return VagaRhResponse(**data)


@router.delete('/vagas/{id_vaga}')
def delete_vaga(id_vaga: int, empresa: CurrentEmpresa, db: DbSession) -> Response:
    vaga_rh_service.soft_delete_vaga(db, id_vaga, int(empresa['id_empresa']))
    logger.info('Vaga inativada | empresa=%s | vaga=%s', empresa['id_empresa'], id_vaga)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# =====================================================
# Candidatos da vaga
# =====================================================
@router.get('/vagas/{id_vaga}/candidatos', response_model=list[CandidatoRhResponse])
def list_candidatos_da_vaga(
    id_vaga: int,
    empresa: CurrentEmpresa,
    db: DbSession,
) -> list[CandidatoRhResponse]:
    rows = vaga_rh_service.list_candidatos_da_vaga(db, id_vaga, int(empresa['id_empresa']))
    return [CandidatoRhResponse(**r) for r in rows]


# =====================================================
# Dashboard - metricas consolidadas (filtradas por empresa)
# =====================================================
@router.get('/dashboard/stats', response_model=DashboardStats)
def dashboard_stats(empresa: CurrentEmpresa, db: DbSession) -> DashboardStats:
    data = dashboard_rh_service.get_full_dashboard(db, int(empresa['id_empresa']))
    return DashboardStats(**data)
