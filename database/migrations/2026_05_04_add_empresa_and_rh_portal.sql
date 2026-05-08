-- =====================================================
-- Migration: Portal RH - empresas, vinculo vaga<->empresa,
--            skills da vaga e campos de salario
-- Data: 2026-05-04
-- =====================================================
-- IDEMPOTENTE: pode rodar mais de uma vez sem quebrar.
-- Roda no Supabase via SQL Editor (schema public).

-- =====================================================
-- 1. Tabela empresa
-- =====================================================
CREATE TABLE IF NOT EXISTS public.empresa (
    id_empresa     SERIAL PRIMARY KEY,
    nome           VARCHAR(150) NOT NULL,
    nome_login     VARCHAR(60)  NOT NULL,
    senha_hash     VARCHAR(255) NOT NULL,
    cnpj           VARCHAR(20),
    bio            TEXT,
    logo_url       VARCHAR(500),
    site           VARCHAR(255),
    email_contato  VARCHAR(150),
    status         VARCHAR(20) NOT NULL DEFAULT 'ATIVA',
    criado_em      TIMESTAMP   NOT NULL DEFAULT now(),
    atualizado_em  TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT empresa_nome_login_unique UNIQUE (nome_login),
    CONSTRAINT empresa_status_check CHECK (status IN ('ATIVA', 'INATIVA', 'SUSPENSA'))
);

CREATE INDEX IF NOT EXISTS idx_empresa_status ON public.empresa(status);

-- =====================================================
-- 2. Vaga: vincular a empresa + campos de salario
-- =====================================================
ALTER TABLE public.vaga
    ADD COLUMN IF NOT EXISTS id_empresa             INT REFERENCES public.empresa(id_empresa),
    ADD COLUMN IF NOT EXISTS salario_min            NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS salario_max            NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS salario_periodicidade  VARCHAR(20) DEFAULT 'MENSAL',
    ADD COLUMN IF NOT EXISTS moeda                  VARCHAR(3)  DEFAULT 'BRL';

-- Garantir que salario_max >= salario_min quando ambos preenchidos
ALTER TABLE public.vaga
    DROP CONSTRAINT IF EXISTS vaga_salario_range_check;
ALTER TABLE public.vaga
    ADD CONSTRAINT vaga_salario_range_check
    CHECK (salario_min IS NULL OR salario_max IS NULL OR salario_max >= salario_min);

-- Validar periodicidade
ALTER TABLE public.vaga
    DROP CONSTRAINT IF EXISTS vaga_salario_periodicidade_check;
ALTER TABLE public.vaga
    ADD CONSTRAINT vaga_salario_periodicidade_check
    CHECK (salario_periodicidade IS NULL OR salario_periodicidade IN ('MENSAL', 'HORA', 'ANUAL'));

CREATE INDEX IF NOT EXISTS idx_vaga_id_empresa ON public.vaga(id_empresa);

-- =====================================================
-- 3. Tabela vaga_skill (skills exigidas pela vaga)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.vaga_skill (
    id_vaga    INT NOT NULL,
    id_skill   INT NOT NULL,
    PRIMARY KEY (id_vaga, id_skill),
    FOREIGN KEY (id_vaga)  REFERENCES public.vaga(id_vaga)   ON DELETE CASCADE,
    FOREIGN KEY (id_skill) REFERENCES public.skill(id_skill) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_vaga_skill_id_skill ON public.vaga_skill(id_skill);

-- =====================================================
-- 4. Soft-delete das 3 vagas antigas (Analista de Dados,
--    Dev Python, Analista de BI). Mantemos historico de
--    candidaturas/BI intacto, so escondemos do portal.
-- =====================================================
-- ATENCAO: rode isso APENAS UMA VEZ. Se ja rodou antes
-- e quer reverter, troque INATIVA por ATIVA.
UPDATE public.vaga
   SET status_vaga = 'INATIVA'
 WHERE status_vaga = 'ATIVA'
   AND id_empresa IS NULL;
