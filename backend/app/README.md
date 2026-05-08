# Portal de Recrutamento com Fase 1 Local e Análise Oficial via Gemini

Projeto de portal de candidatura com upload de currículo, extração de texto, matching local por regras e análise oficial com Gemini.

## Como ficou o fluxo

### Fase 1 local
- salva o currículo em `backend/storage/curriculos/candidatura_X`
- extrai o texto do arquivo
- roda o matching local por regras
- gera `resumo.txt`

### Fase 2 oficial com Gemini
- lê o currículo extraído
- lê o `resumo.txt`
- lê a vaga escolhida com título, área, nível e descrição
- compara também com as vagas abertas do portal
- gera a análise oficial
- grava o resultado no banco em `analise_ia_candidatura`
- salva logs locais:
  - `gemini_request.txt`
  - `gemini_response.json`
  - `resumo_ia.txt`
  - `gemini_error.txt` se houver falha

## O que vai para o banco
A tabela usada é `analise_ia_candidatura`.

Campos principais:
- `id_candidatura`
- `score_aderencia`
- `parecer_ia`
- `resumo_ia`
- `data_analise`

## Estrutura dos arquivos da candidatura
Dentro de `backend/storage/curriculos/candidatura_X` você terá:
- currículo original
- `resumo.txt`
- `gemini_request.txt`
- `gemini_response.json`
- `resumo_ia.txt`
- `gemini_error.txt` se a IA falhar

## Como configurar o Gemini

1. Crie uma chave no Google AI Studio.
2. No diretório `backend`, copie `.env.example` para `.env`.
3. Preencha:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL`
   - `GEMINI_ENABLED=true`

## Como instalar e rodar

No diretório `backend`:

```bash
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

## Migração SQL
Há um script em `database/migrations/2026_04_23_add_resumo_ia_and_support_cols.sql` para alinhar o banco com a versão atual.

## Observações
- `resumo.txt` é apenas o log local da fase 1.
- `parecer_ia` passa a receber o texto completo da IA.
- `resumo_ia` recebe um resumo curto de até 350 caracteres.
- o `app.log` registra melhor o ponto onde a etapa Gemini falhar.
