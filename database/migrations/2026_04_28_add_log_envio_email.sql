-- Cria/ajusta a tabela de log de envio de e-mail de confirmacao de candidatura.
-- Rode este script no mesmo banco usado pelo backend.

CREATE TABLE IF NOT EXISTS log_envio_email (
    id_log_email BIGSERIAL PRIMARY KEY,
    id_candidatura BIGINT NOT NULL,
    destinatario VARCHAR(255) NOT NULL,
    status_envio VARCHAR(30) NOT NULL,
    data_tentativa TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    mensagem_erro TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_log_envio_email_id_candidatura
    ON log_envio_email (id_candidatura);

CREATE INDEX IF NOT EXISTS idx_log_envio_email_status_envio
    ON log_envio_email (status_envio);

ALTER TABLE log_envio_email
    ADD COLUMN IF NOT EXISTS mensagem_erro TEXT NULL;
