# Backend FastAPI

## Rodando

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

## Arquivos importantes

- `.env`: configuracao da conexao
- `logs/app.log`: log da API
- `/debug/db-check`: mostra banco atual e tabelas visiveis pela conexao

## Observacao importante

Se `/vagas` ou `/skills` falharem, acesse `http://localhost:8000/debug/db-check`.
Essa rota mostra quais tabelas a conexao realmente enxerga. Se `vaga` e `skill` nao aparecerem, o problema esta no schema, permissao ou banco apontado pela `DATABASE_URL`.
