ALTER TABLE public.analise_ia_candidatura
ADD COLUMN IF NOT EXISTS resumo_ia varchar(350);

ALTER TABLE public.curriculo_arquivo
ADD COLUMN IF NOT EXISTS nome_arquivo_armazenado varchar(255),
ADD COLUMN IF NOT EXISTS caminho_armazenamento varchar(500),
ADD COLUMN IF NOT EXISTS hash_arquivo varchar(128),
ADD COLUMN IF NOT EXISTS status_processamento varchar(30),
ADD COLUMN IF NOT EXISTS extensao_arquivo varchar(10),
ADD COLUMN IF NOT EXISTS mime_type varchar(100);

ALTER TABLE public.candidatura_skill
ADD COLUMN IF NOT EXISTS origem_skill varchar(30);
