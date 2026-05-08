-- =====================================================
-- FIX: Completa migration anterior (2026_05_04_add_empresa_and_rh_portal.sql)
-- Adiciona colunas que nao foram criadas e corrige o status
-- das vagas antigas (era 'ABERTA', nao 'ATIVA').
-- Idempotente.
-- =====================================================

-- 1. empresa.atualizado_em
ALTER TABLE public.empresa
    ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP NOT NULL DEFAULT now();

-- 2. vaga: colunas de salario que faltaram
ALTER TABLE public.vaga
    ADD COLUMN IF NOT EXISTS salario_min            NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS salario_max            NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS salario_periodicidade  VARCHAR(20) DEFAULT 'MENSAL',
    ADD COLUMN IF NOT EXISTS moeda                  VARCHAR(3)  DEFAULT 'BRL';

-- 3. Constraints de salario (precisam das colunas existindo)
ALTER TABLE public.vaga
    DROP CONSTRAINT IF EXISTS vaga_salario_range_check;
ALTER TABLE public.vaga
    ADD CONSTRAINT vaga_salario_range_check
    CHECK (salario_min IS NULL OR salario_max IS NULL OR salario_max >= salario_min);

ALTER TABLE public.vaga
    DROP CONSTRAINT IF EXISTS vaga_salario_periodicidade_check;
ALTER TABLE public.vaga
    ADD CONSTRAINT vaga_salario_periodicidade_check
    CHECK (salario_periodicidade IS NULL OR salario_periodicidade IN ('MENSAL', 'HORA', 'ANUAL'));

-- 4. Soft-delete corrigido: status real era 'ABERTA' (nao 'ATIVA').
--    Marcamos todas como INATIVA para sumirem do portal publico
--    (filtro do portal e WHERE status_vaga = 'ABERTA').
--    'Banco de Talentos' continua funcionando porque o lookup
--    interno e por titulo_vaga, nao por status.
UPDATE public.vaga
   SET status_vaga = 'INATIVA'
 WHERE status_vaga = 'ABERTA'
   AND id_empresa IS NULL;
