-- =====================================================
-- Adiciona em public.vaga:
--   - tipo_contrato       (CLT, PJ, ESTAGIO, JOVEM_APRENDIZ, CORPORATE)
--   - modelo_trabalho     (PRESENCIAL, HIBRIDO, ONLINE)
--   - localidade_cidade   (texto livre)
--   - localidade_estado   (UF de 2 letras)
-- Idempotente.
-- =====================================================

ALTER TABLE public.vaga
    ADD COLUMN IF NOT EXISTS tipo_contrato      VARCHAR(30),
    ADD COLUMN IF NOT EXISTS modelo_trabalho    VARCHAR(20),
    ADD COLUMN IF NOT EXISTS localidade_cidade  VARCHAR(120),
    ADD COLUMN IF NOT EXISTS localidade_estado  VARCHAR(2);

-- Constraints de dominio
ALTER TABLE public.vaga
    DROP CONSTRAINT IF EXISTS vaga_tipo_contrato_check;
ALTER TABLE public.vaga
    ADD CONSTRAINT vaga_tipo_contrato_check
    CHECK (
        tipo_contrato IS NULL
        OR tipo_contrato IN ('CLT', 'PJ', 'ESTAGIO', 'JOVEM_APRENDIZ', 'CORPORATE')
    );

ALTER TABLE public.vaga
    DROP CONSTRAINT IF EXISTS vaga_modelo_trabalho_check;
ALTER TABLE public.vaga
    ADD CONSTRAINT vaga_modelo_trabalho_check
    CHECK (
        modelo_trabalho IS NULL
        OR modelo_trabalho IN ('PRESENCIAL', 'HIBRIDO', 'ONLINE')
    );

-- Se for presencial ou hibrido, deve ter pelo menos cidade ou estado.
-- Se for online, ambos podem ser NULL. Se modelo_trabalho for NULL (vagas legadas), tudo passa.
ALTER TABLE public.vaga
    DROP CONSTRAINT IF EXISTS vaga_localidade_obrigatoria_check;
ALTER TABLE public.vaga
    ADD CONSTRAINT vaga_localidade_obrigatoria_check
    CHECK (
        modelo_trabalho IS NULL
        OR modelo_trabalho = 'ONLINE'
        OR localidade_cidade IS NOT NULL
        OR localidade_estado IS NOT NULL
    );
