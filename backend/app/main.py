import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.rh_routes import router as rh_router
from app.api.routes import router
from app.core.config import settings
from app.core.logging_config import setup_logging

log_file = setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name, debug=settings.app_debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.on_event('startup')
def on_startup() -> None:
    logger.info('API iniciada | env=%s | schema=%s | log_file=%s', settings.app_env, settings.db_schema, log_file)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception('Erro nao tratado | path=%s | method=%s | detail=%s', request.url.path, request.method, str(exc))
    return JSONResponse(
        status_code=500,
        content={
            'detail': 'Erro interno na API. Verifique backend/logs/app.log',
            'path': str(request.url.path),
            'exception_type': exc.__class__.__name__,
        },
    )

app.include_router(router)
app.include_router(rh_router)
