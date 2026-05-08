import logging
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, Query, UploadFile
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.schemas.candidatura import CandidaturaCreateResponse
from app.schemas.common import MessageResponse
from app.schemas.skill import SkillResponse
from app.schemas.vaga import VagaResponse
from app.services.external_jobs_service import ExternalJobsService
from app.services.location_service import LocationService
from app.services.recruitment_service import RecruitmentService

logger = logging.getLogger(__name__)
router = APIRouter()
DbSession = Annotated[Session, Depends(get_db)]

TRUE_VALUES = {'true', '1', 'on', 'yes', 'sim'}


def parse_form_bool(value: str | bool | None) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    return value.strip().lower() in TRUE_VALUES


@router.get('/health', response_model=MessageResponse)
def healthcheck() -> MessageResponse:
    return MessageResponse(message='API online')


@router.get('/debug/db-check')
def debug_db_check(db: DbSession):
    service = RecruitmentService(db)
    return service.debug_db_check()


@router.get('/vagas', response_model=list[VagaResponse])
def list_vagas(db: DbSession) -> list[VagaResponse]:
    service = RecruitmentService(db)
    return [VagaResponse(**vaga) for vaga in service.list_vagas()]


def _refresh_external_jobs_in_background() -> None:
    """Roda em BackgroundTasks com sessao isolada (a do request ja fechou)."""
    db = SessionLocal()
    try:
        service = ExternalJobsService(db)
        service.refresh_cache()
    except Exception:
        logger.exception('Background refresh de vagas externas falhou')
    finally:
        db.close()


@router.get('/vagas-externas')
def list_external_jobs(
    db: DbSession,
    background_tasks: BackgroundTasks,
) -> list[dict]:
    """Lista vagas externas (Adzuna, etc.) do cache.

    - Se cache vazio: faz fetch sincrono e retorna.
    - Se cache existe mas expirou: retorna o cache antigo e dispara refresh em background.
    """
    service = ExternalJobsService(db)
    jobs = service.list_external_jobs()

    if service.cache_is_stale():
        background_tasks.add_task(_refresh_external_jobs_in_background)

    return jobs


@router.post('/vagas-externas/sync')
def sync_external_jobs(db: DbSession) -> dict:
    """Forca refresh do cache de vagas externas. Util para cron jobs."""
    service = ExternalJobsService(db)
    upserted = service.refresh_cache()
    return {'message': 'Cache atualizado.', 'vagas_processadas': upserted}


@router.get('/vagas-externas/debug')
def debug_external_jobs(db: DbSession) -> dict:
    """Endpoint de diagnostico: testa cada fonte isoladamente e retorna info estruturada."""
    from app.core.config import settings
    from app.services.external_jobs_service import ExternalJobsService

    service = ExternalJobsService(db)
    result: dict = {
        'config': {
            'adzuna_app_id_set': bool(settings.adzuna_app_id),
            'adzuna_app_key_set': bool(settings.adzuna_app_key),
            'adzuna_country': settings.adzuna_country,
            'adzuna_max_pages': settings.adzuna_max_pages,
            'adzuna_results_per_page': settings.adzuna_results_per_page,
            'remotive_enabled': settings.remotive_enabled,
            'arbeitnow_enabled': getattr(settings, 'arbeitnow_enabled', False),
        },
        'cache_atual': {},
        'remotive_test': {},
        'arbeitnow_test': {},
    }

    # Conta o que tem no cache hoje
    try:
        rows = db.execute(
            __import__('sqlalchemy').text(
                'SELECT fonte, COUNT(*) AS total FROM cache_vagas_externas GROUP BY fonte'
            )
        ).mappings().all()
        result['cache_atual'] = {row['fonte']: row['total'] for row in rows}
    except Exception as exc:
        result['cache_atual'] = {'error': str(exc)}

    # Testa fetch direto da Remotive SEM o try/except do service (pra ver o erro real)
    import httpx
    remotive_results = []
    for category in ['software-dev', 'data', 'devops']:
        try:
            with httpx.Client(timeout=20.0, follow_redirects=True) as client:
                response = client.get(
                    'https://remotive.com/api/remote-jobs',
                    params={'category': category},
                    headers={'User-Agent': 'Portal-Recrutamento/1.0', 'Accept': 'application/json'},
                )
                response.raise_for_status()
                payload = response.json()
                jobs = payload.get('jobs', [])
                remotive_results.append({
                    'category': category,
                    'status_code': response.status_code,
                    'total_jobs': len(jobs),
                    'sample_titles': [j.get('title') for j in jobs[:3]],
                })
        except Exception as exc:
            remotive_results.append({
                'category': category,
                'erro': str(exc),
                'tipo_erro': type(exc).__name__,
            })

    result['remotive_test'] = {'por_categoria': remotive_results}

    # Testa Arbeitnow direto
    try:
        with httpx.Client(timeout=20.0, follow_redirects=True) as client:
            resp = client.get(
                'https://www.arbeitnow.com/api/job-board-api',
                headers={'User-Agent': 'Portal-Recrutamento/1.0', 'Accept': 'application/json'},
            )
            resp.raise_for_status()
            payload = resp.json()
            jobs = payload.get('data', [])
            result['arbeitnow_test'] = {
                'status_code': resp.status_code,
                'total_jobs': len(jobs),
                'sample_titles': [j.get('title') for j in jobs[:3]],
                'sample_keys': list(jobs[0].keys()) if jobs else None,
            }
    except Exception as exc:
        result['arbeitnow_test'] = {'erro': str(exc), 'tipo_erro': type(exc).__name__}

    return result


@router.get('/skills', response_model=list[SkillResponse])
def list_skills(db: DbSession) -> list[SkillResponse]:
    service = RecruitmentService(db)
    return [SkillResponse(**skill) for skill in service.list_skills()]


@router.get('/ufs')
def list_ufs() -> list[dict[str, str]]:
    return LocationService.list_ufs()


@router.get('/municipios')
def list_municipios(
    uf: str = Query(..., min_length=2, max_length=2),
    query: str = Query(..., min_length=1, max_length=100),
) -> list[dict[str, str]]:
    return LocationService.search_municipios(uf=uf, query=query)


@router.post('/candidaturas', response_model=CandidaturaCreateResponse)
async def create_candidatura(
    db: DbSession,
    background_tasks: BackgroundTasks,
    nome_completo: str = Form(...),
    data_nascimento: str | None = Form(None),
    cidade: str = Form(...),
    estado: str = Form(...),
    email: str = Form(...),
    email_principal: str | bool | None = Form(False),
    ddd: str = Form(...),
    numero: str = Form(...),
    telefone_principal: str | bool | None = Form(False),
    banco_talentos: str | bool | None = Form(False),
    nivel: str = Form(...),
    aceite_termos: str | bool | None = Form(False),
    curriculo: UploadFile = File(...),
    pretensao_salarial: str | None = Form(None),
    about_me: str | None = Form(None),
    id_vaga: int | None = Form(None),
    skill_ids: list[int] = Form(...),
) -> CandidaturaCreateResponse:
    email_principal_flag = parse_form_bool(email_principal)
    telefone_principal_flag = parse_form_bool(telefone_principal)
    banco_talentos_flag = parse_form_bool(banco_talentos)
    aceite_termos_flag = parse_form_bool(aceite_termos)

    logger.info(
        'Recebendo candidatura | nome=%s | cidade=%s | estado=%s | vaga=%s | banco_talentos=%s | email_principal=%s | telefone_principal=%s | skills=%s | nivel=%s | aceite=%s | arquivo=%s',
        nome_completo,
        cidade,
        estado,
        id_vaga,
        banco_talentos_flag,
        email_principal_flag,
        telefone_principal_flag,
        skill_ids,
        nivel,
        aceite_termos_flag,
        getattr(curriculo, 'filename', None),
    )

    service = RecruitmentService(db)
    payload = await service.create_candidatura(
        nome_completo=nome_completo,
        data_nascimento=data_nascimento,
        cidade=cidade,
        estado=estado,
        pretensao_salarial=pretensao_salarial,
        about_me=about_me,
        email=email,
        email_principal=email_principal_flag,
        ddd=ddd,
        numero=numero,
        telefone_principal=telefone_principal_flag,
        banco_talentos=banco_talentos_flag,
        id_vaga=id_vaga,
        nivel=nivel,
        skill_ids=skill_ids,
        aceite_termos=aceite_termos_flag,
        curriculo=curriculo,
        background_tasks=background_tasks,
    )
    return CandidaturaCreateResponse(**payload)