from collections.abc import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from app.core.config import settings

# pool_recycle=1800: recicla conexoes antes de 30min para evitar fechamento
#   abrupto pelo pooler do Supabase (PgBouncer fecha conexoes idle longas).
# pool_pre_ping=True: testa antes de usar - evita usar conexao morta.
engine = create_engine(
    settings.database_url,
    future=True,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args={'connect_timeout': 10},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
