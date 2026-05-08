from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field(default="Portal de Recrutamento API", alias="APP_NAME")
    app_env: str = Field(default="development", alias="APP_ENV")
    app_debug: bool = Field(default=True, alias="APP_DEBUG")

    database_url: str = Field(..., alias="DATABASE_URL")
    frontend_origin: str = Field(default="http://localhost:3000", alias="FRONTEND_ORIGIN")

    banco_talentos_titulo: str = Field(default="Banco de Talentos", alias="BANCO_TALENTOS_TITULO")
    candidatura_status_inicial: str = Field(default="EM_ANALISE", alias="CANDIDATURA_STATUS_INICIAL")

    gemini_api_key: str = Field(default="", alias="GEMINI_API_KEY")
    gemini_model: str = Field(default="gemini-2.5-flash", alias="GEMINI_MODEL")
    gemini_enabled: bool = Field(default=False, alias="GEMINI_ENABLED")

    db_schema: str = Field(default="public", alias="DB_SCHEMA")
    db_table_vaga: str = Field(default="vaga", alias="DB_TABLE_VAGA")
    db_table_skill: str = Field(default="skill", alias="DB_TABLE_SKILL")
    db_table_candidatura: str = Field(default="candidatura", alias="DB_TABLE_CANDIDATURA")
    db_table_candidato: str = Field(default="candidato", alias="DB_TABLE_CANDIDATO")
    db_table_candidato_email: str = Field(default="candidato_email", alias="DB_TABLE_CANDIDATO_EMAIL")
    db_table_candidato_telefone: str = Field(default="candidato_telefone", alias="DB_TABLE_CANDIDATO_TELEFONE")
    db_table_curriculo_arquivo: str = Field(default="curriculo_arquivo", alias="DB_TABLE_CURRICULO_ARQUIVO")
    db_table_curriculo_texto_extraido: str = Field(default="curriculo_texto_extraido", alias="DB_TABLE_CURRICULO_TEXTO_EXTRAIDO")
    db_table_analise_ia_candidatura: str = Field(default="analise_ia_candidatura", alias="DB_TABLE_ANALISE_IA_CANDIDATURA")
    db_table_candidatura_skill: str = Field(default="candidatura_skill", alias="DB_TABLE_CANDIDATURA_SKILL")
    db_table_log_envio_email: str = Field(default="log_envio_email", alias="DB_TABLE_LOG_ENVIO_EMAIL")

    email_enabled: bool = Field(default=False, alias="EMAIL_ENABLED")
    email_host: str = Field(default="smtp.gmail.com", alias="EMAIL_HOST")
    email_port: int = Field(default=465, alias="EMAIL_PORT")
    email_user: str = Field(default="", alias="EMAIL_USER")
    email_password: str = Field(default="", alias="EMAIL_PASSWORD")
    email_from: str = Field(default="", alias="EMAIL_FROM")
    email_from_name: str = Field(default="Ponte Talentos", alias="EMAIL_FROM_NAME")
    email_use_ssl: bool = Field(default=True, alias="EMAIL_USE_SSL")
    email_use_tls: bool = Field(default=False, alias="EMAIL_USE_TLS")
    email_timeout_seconds: int = Field(default=30, alias="EMAIL_TIMEOUT_SECONDS")

    # Adzuna - agregador de vagas externas
    adzuna_app_id: str = Field(default="", alias="ADZUNA_APP_ID")
    adzuna_app_key: str = Field(default="", alias="ADZUNA_APP_KEY")
    adzuna_country: str = Field(default="br", alias="ADZUNA_COUNTRY")
    adzuna_cache_ttl_hours: int = Field(default=24, alias="ADZUNA_CACHE_TTL_HOURS")
    adzuna_results_per_page: int = Field(default=50, alias="ADZUNA_RESULTS_PER_PAGE")
    adzuna_max_pages: int = Field(default=20, alias="ADZUNA_MAX_PAGES")
    db_table_cache_vagas_externas: str = Field(default="cache_vagas_externas", alias="DB_TABLE_CACHE_VAGAS_EXTERNAS")

    # Remotive - vagas remote tech (gratuito, sem cadastro)
    # Obs: API publica limitada a ~21 vagas (filtros nao funcionam mais)
    remotive_enabled: bool = Field(default=True, alias="REMOTIVE_ENABLED")

    # Arbeitnow - vagas tech europeu+remote (gratuito, sem cadastro)
    arbeitnow_enabled: bool = Field(default=True, alias="ARBEITNOW_ENABLED")

    # JWT - autenticacao do portal RH (empresas)
    jwt_secret: str = Field(..., alias="JWT_SECRET")
    jwt_expire_hours: int = Field(default=8, alias="JWT_EXPIRE_HOURS")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )


settings = Settings()
