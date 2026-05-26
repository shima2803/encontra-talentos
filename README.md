# Encontra Talentos — Portal de 

> Plataforma completa de recrutamento que conecta candidatos a empresas, com agregação de vagas externas e análise automática de aderência via IA.

![Home](png/01-home-hero.png)

---

## Sumário

1. [Sobre o projeto](#1-sobre-o-projeto)
2. [Objetivo](#2-objetivo)
3. [Stack tecnológica](#3-stack-tecnológica)
4. [Arquitetura](#4-arquitetura)
5. [Banco de dados](#5-banco-de-dados)
6. [APIs externas integradas](#6-apis-externas-integradas)
7. [IA — Análise inteligente de currículo (Gemini)](#7-ia--análise-inteligente-de-currículo-gemini)
8. [Portal do candidato](#8-portal-do-candidato)
9. [Portal RH (área das empresas)](#9-portal-rh-área-das-empresas)
10. [Dashboard de métricas e gráficos](#10-dashboard-de-métricas-e-gráficos)
11. [Regras de negócio](#11-regras-de-negócio)
12. [Segurança e LGPD](#12-segurança-e-lgpd)
13. [E-mails transacionais](#13-e-mails-transacionais)
14. [Como rodar localmente](#14-como-rodar-localmente)
15. [Variáveis de ambiente](#15-variáveis-de-ambiente)
16. [Estrutura do projeto](#16-estrutura-do-projeto)
17. [Próximos passos](#17-próximos-passos)

---

## 1. Sobre o projeto

O **Encontra Talentos** é um portal de recrutamento full-stack desenvolvido como projeto de portfólio, com escopo de produto real: cadastro e candidatura de profissionais, gestão de vagas pelas empresas, integração com agregadores de vagas (Adzuna, Remotive, Arbeitnow) e análise automática de aderência candidato↔vaga via IA generativa (Google Gemini).

A plataforma trata dois públicos:

- **Candidatos** — exploram vagas (das empresas parceiras + agregadores), enviam currículo e candidatam-se em poucos cliques.
- **Empresas (RH)** — fazem login na área restrita, publicam novas vagas, acompanham inscritos com score de aderência calculado pela IA e visualizam métricas consolidadas.

---

## 2. Objetivo

- Mostrar domínio de stack moderna (Next.js 14, FastAPI, PostgreSQL, IA generativa, integração com APIs públicas) em um produto único, coerente e funcional.
- Resolver dores reais de quem busca emprego (vagas concentradas em um só lugar, processo simples) e de quem recruta (IA pré-classifica candidatos por aderência).
- Servir como vitrine técnica para LinkedIn / GitHub.

---

## 3. Stack tecnológica

### Frontend
- **Next.js 14** (App Router, Server Components)
- **TypeScript 5**
- **Tailwind CSS** (design system custom com tons `brand-*`)
- **React Hook Form + Zod** (validação)
- **Recharts** (gráficos do dashboard)
- **Lucide React** (ícones)

### Backend
- **FastAPI 0.115** + **Uvicorn**
- **Python 3.12**
- **SQLAlchemy 2** (queries SQL puras com `text()` — sem ORM pesado)
- **Pydantic v2** (validação de schema)
- **psycopg 3** (driver PostgreSQL)
- **bcrypt** (hash de senhas das empresas)
- **PyJWT** (tokens de autenticação RH)
- **httpx** (chamadas às APIs externas)
- **google-genai** (SDK oficial do Gemini)
- **pypdf + python-docx** (extração de texto de currículos)

### Banco de dados
- **PostgreSQL** (Supabase pooler em produção/desenvolvimento)

### Infraestrutura
- **Gmail SMTP** (envio de e-mails transacionais)
- **Google Gemini 2.5 Flash** (análise de aderência)
- Quotas free das APIs externas (Adzuna 1k req/mês, Remotive/Arbeitnow ilimitado)

---

## 4. Arquitetura

```
┌─────────────────────┐       ┌──────────────────────────┐
│  Frontend Next.js   │ HTTP  │  Backend FastAPI         │
│  (porta 3000)       │──────▶│  (porta 8000)            │
│                     │       │                          │
│  - SSR / RSC        │       │  - Rotas /vagas, /skills │
│  - Proxy /api/rh    │       │  - Rotas /rh/* (JWT)     │
│  - JobCard, forms   │       │  - Services + Schemas    │
└─────────────────────┘       └────────────┬─────────────┘
                                           │
                  ┌────────────────────────┼────────────────────────┐
                  │                        │                        │
                  ▼                        ▼                        ▼
          ┌──────────────┐        ┌─────────────────┐      ┌──────────────────┐
          │  PostgreSQL  │        │  APIs externas  │      │  Google Gemini   │
          │  (Supabase)  │        │  (Adzuna/etc.)  │      │  (análise IA)    │
          └──────────────┘        └─────────────────┘      └──────────────────┘
```

- **Token JWT** das empresas é guardado em **cookie httpOnly** no Next.js — o JS do cliente nunca vê o token; um proxy interno (`/api/rh/[...path]`) injeta o `Authorization: Bearer ...` ao chamar o FastAPI.
- O cache de vagas externas vive em uma tabela dedicada (`cache_vagas_externas`), com TTL de 24h e refresh em background.

---

## 5. Banco de dados

Todas as tabelas vivem no schema `public` do PostgreSQL. Migrations idempotentes em [`database/migrations/`](database/migrations).

### 5.1 Modelo de dados (resumo)

| Tabela | PK | Descrição |
|---|---|---|
| `empresa` | `id_empresa` (SERIAL) | Empresas que publicam vagas. `nome_login` é UNIQUE; senha em `senha_hash` (bcrypt). |
| `vaga` | `id_vaga` (SERIAL) | Vagas publicadas. FK opcional `id_empresa` → `empresa`. |
| `vaga_skill` | `(id_vaga, id_skill)` composta | Skills exigidas pela vaga (N:N). |
| `skill` | `id_skill` (SERIAL) | Catálogo de habilidades técnicas. |
| `candidato` | `id_candidato` (SERIAL) | Pessoa cadastrada. |
| `candidato_email` | `id_candidato_email` (SERIAL) | E-mails do candidato (1:N) — flag `is_principal`. |
| `candidato_telefone` | `id_candidato_telefone` (SERIAL) | Telefones do candidato (1:N). |
| `candidatura` | `id_candidatura` (SERIAL) | Junção candidato↔vaga + status (`EM_ANALISE`, etc.). |
| `candidatura_skill` | `(id_candidatura, id_skill)` composta | Skills declaradas pelo candidato na candidatura. |
| `curriculo_arquivo` | `id_curriculo_arquivo` (SERIAL) | Upload do currículo (PDF/DOCX/TXT) + caminho + hash. |
| `curriculo_texto_extraido` | `id_curriculo_texto` (SERIAL) | Texto extraído do currículo (entrada da IA). |
| `analise_ia_candidatura` | `id_analise_ia` (SERIAL) | Resultado da IA: `score_aderencia`, `resumo_ia`, `parecer_ia`. 1:1 com candidatura. |
| `cache_vagas_externas` | `id` (SERIAL) | Cache de vagas vindas das APIs externas. UNIQUE em `(fonte, id_externo)`. |
| `log_envio_email` | `id_log` (SERIAL) | Auditoria de e-mails enviados (status, destinatário, mensagem). |

### 5.2 Decisões importantes

- **Soft delete**: ao "inativar" uma vaga, o backend faz `UPDATE vaga SET status_vaga = 'INATIVA'`. Não removemos nada — preserva histórico de candidaturas e métricas.
- **Filtro do portal público**: a query de listagem só retorna `WHERE status_vaga = 'ABERTA'`. Vagas inativadas somem do portal automaticamente.
- **PKs SERIAL**: optei por `INT` com sequência (SERIAL) em vez de UUID por simplicidade e legibilidade no debug. Em produção real, considere UUID para evitar enumeração.
- **CHECK constraints** em campos enum-like (`status_vaga`, `tipo_contrato`, `modelo_trabalho`, `salario_periodicidade`) garantem domínio válido a nível de banco.
- **Localidade obrigatória**: constraint `vaga_localidade_obrigatoria_check` garante que vagas Presencial/Híbrido têm cidade ou estado preenchido.

---

## 6. APIs externas integradas

Para enriquecer o catálogo de vagas, o portal agrega ofertas de **3 fontes públicas**, mantidas em cache local com TTL de 24h:

| API | Custo | Volume típico | Fonte |
|---|---|---|---|
| **[Adzuna](https://developer.adzuna.com)** | Gratuito (1.000 req/mês) | até 1.000 vagas BR de TI | Categoria `it-jobs` |
| **[Remotive](https://remotive.com/api/remote-jobs)** | Gratuito, sem cadastro | ~21 vagas remote tech | API pública |
| **[Arbeitnow](https://www.arbeitnow.com/api/job-board-api)** | Gratuito, sem cadastro | ~100 vagas tech europeu/remote | API pública |

### Estratégia anti-falha
- **Lazy refresh**: cache vazio dispara fetch síncrono; cache stale dispara em background (usuário não espera).
- **Commit por batch** de 50 inserts — evita transações longas que o pooler do Supabase mata.
- **UPSERT idempotente** via `ON CONFLICT (fonte, id_externo) DO UPDATE`.
- **Deduplicação** por hash SHA-256 de `(titulo + empresa + url)`.
- **Tolerância a falhas**: cada fonte tem `try/except` próprio — se Adzuna cair, Remotive e Arbeitnow continuam.
- **Limpeza automática** de registros com `fetched_at > 15 dias`.

### Endpoints
| Endpoint | Método | Descrição |
|---|---|---|
| `/vagas-externas` | GET | Lista do cache (lazy refresh em background se stale) |
| `/vagas-externas/sync` | POST | Força refresh imediato (útil para cron) |
| `/vagas-externas/debug` | GET | Diagnóstico: config + amostras de cada fonte |

![Vagas externas + internas](png/04-todas-vagas.png)

---

## 7. IA — Análise inteligente de currículo (Gemini)

Quando um candidato envia o currículo (PDF/DOCX/TXT), o backend:

1. **Valida magic bytes** do arquivo (`%PDF-`, `PK\x03\x04` para DOCX) — bloqueia executáveis renomeados.
2. **Extrai texto** com `pypdf` (PDF) ou `python-docx` (DOCX) ou leitura direta (TXT).
3. **Envia para o Gemini 2.5 Flash** o texto extraído + dados da vaga + skills exigidas.
4. **Recebe um JSON estruturado** com:
   - `score_aderencia` (0-100): quão aderente o candidato é
   - `resumo_ia`: parágrafo curto descrevendo o perfil
   - `parecer_ia`: análise mais longa com pontos fortes / lacunas
5. **Persiste** em `analise_ia_candidatura` (1:1 com a candidatura).

Esse score alimenta:
- O **dashboard de métricas** ("Score médio", "Candidatos alto score >=80")
- O **funil de aderência** (faixas: 0-59, 60-79, 80-100)
- O **ranking de top candidatos** por vaga
- O **gráfico Score × Pretensão salarial**

### Resiliência
- Se o Gemini falhar (cota, timeout, parsing), a candidatura é registrada normalmente — apenas sem score. O candidato não é prejudicado.
- Endpoint de diagnóstico: queries SQL prontas em `database/` para auditar análises faltantes.

---

## 8. Portal do candidato

### 8.1 Home
A página inicial mostra hero com call-to-action e **vagas em destaque** das empresas parceiras (até 4 vagas internas, sempre prioridade visual sobre as externas):

![Vagas em destaque + sidebar Acesso rápido](png/02-vagas-destaque.png)

A sidebar **"Acesso rápido"** funciona como porta de entrada para os dois públicos:
- Botão verde sólido **"Enviar candidatura"** → leva para o formulário (`/candidatura`)
- Botão verde outline **"Publicar vaga"** → leva para o login da empresa (`/rh/login`)

Mais abaixo, um banner **"Sua empresa aqui!"** convida novas empresas:

![Banner Sua empresa aqui](png/03-empresas-cta.png)

### 8.2 Lista completa de vagas
Em `/vagas`, todas as vagas (internas + externas) aparecem juntas, com filtros por cargo, local, modelo de trabalho, área e fonte. **Vagas internas (das empresas parceiras) sempre aparecem primeiro.**

Cada card mostra: título, empresa, área, localidade, modelo de trabalho, salário (quando informado), tipo de contrato, nível, e a ação correspondente:
- Vaga interna → botão azul "**Candidatar-se**" (formulário próprio)
- Vaga externa → botão "**Ver no site**" (redirect com `target=_blank, rel=noopener nofollow`)

> **LGPD**: vagas externas só fazem redirect — nenhum dado do candidato é compartilhado com Adzuna/Remotive/Arbeitnow.

### 8.3 Formulário de candidatura
Formulário robusto com persistência local (rascunho em `localStorage`), validação dupla (Zod no front + Pydantic no back) e blocos:

![Tela de candidatura](png/05-candidatura.png)

- **Dados pessoais**: nome, data de nascimento, cidade/estado (autocomplete via API IBGE local)
- **Contato**: e-mail principal, telefone com DDD
- **Currículo**: upload de arquivo (PDF/DOCX/TXT) com validação de magic bytes
- **Skills**: até 24 habilidades selecionáveis (alimenta a análise IA)
- **Termos**: aceite explícito da política LGPD

Acessibilidade aplicada: `aria-invalid`, `aria-describedby`, `role="alert"`, IDs únicos por campo.

---

## 9. Portal RH (área das empresas)

Login em `/rh/login` com nome de login + senha (bcrypt). JWT de 8h em cookie httpOnly.

Após autenticação, a empresa acessa três abas:

### 9.1 Métricas
Dashboard com KPIs e gráficos (detalhe na seção 10).

### 9.2 Minhas vagas
Lista de todas as vagas que a empresa publicou — ativas e inativas:

![Minhas vagas](png/08-rh-minhas-vagas.png)

Cada card mostra:
- **Status badge**: Ativa (verde) / Inativa (cinza)
- **Tipo de contrato**: CLT, PJ, Estágio, Jovem Aprendiz ou Corporate
- **Modelo de trabalho**: Presencial, Híbrido ou Online (com cores distintas)
- **Localidade** (se Presencial/Híbrido)
- **Salário** (se informado)
- **Total de candidatos inscritos**
- **Data de publicação**
- Botão **Inativar** (rosa) ou **Reativar** (verde) — soft delete via `DELETE /rh/vagas/{id}`

> Inativar uma vaga remove ela imediatamente do portal público; reativar a traz de volta. Histórico de candidaturas é preservado.

### 9.3 Criar vaga
Formulário em blocos com cards radio para os campos enum-like:

![Criar vaga](png/09-rh-criar-vaga.png)

- **Identificação**: título, área, nível, descrição
- **Tipo de contrato** *(obrigatório)*: CLT / PJ / Estágio / Jovem Aprendiz / Corporate
- **Modelo de trabalho** *(obrigatório)*: Presencial / Híbrido / Online
  - Se Presencial ou Híbrido → **cidade + estado obrigatórios**
- **Salário** *(opcional, atrás de toggle)*: valor + periodicidade + moeda
  - Se não preencher → vaga aparece sem salário no portal público
- **Skills exigidas**: catálogo de skills com busca

---

## 10. Dashboard de métricas e gráficos

Todos os dados são **filtrados por `id_empresa`** (cada empresa só vê os seus). Implementado em `dashboard_rh_service.py`.

![Dashboard RH](png/07-rh-painel-metricas.png)

### KPIs principais
- **Total de candidaturas**
- **Vagas abertas**
- **Score médio** das análises IA
- **Candidatos alto score** (`score_aderencia >= 80`)
- **Média salarial total** (pretensão dos candidatos)
- **Candidatos abaixo da média**

### Gráficos
- **Funil de aderência** — distribuição em 3 faixas (0-59, 60-79, 80-100)
- **Média salarial por vaga** — barras com pretensão média dos candidatos
- **Score × Pretensão salarial** — scatter plot (insight: aderência alta + pretensão razoável = lead quente)
- **Top candidatos por score** — tabela ordenada

![Gráficos do dashboard RH](png/07b-rh-painel-graficos.png)

---

## 11. Regras de negócio

### 11.1 Vagas internas em destaque
- Na **home**, a seção "Vagas em destaque" mostra **até 4 vagas internas** (das empresas parceiras). Vagas externas **não aparecem** lá.
- Em **`/vagas` (lista completa)**, internas e externas convivem, mas as **internas sempre vêm primeiro** (priorizamos as parcerias).
- Visualmente, vagas internas em destaque ganham **borda verde mais grossa** + gradiente sutil; o badge "Empresas parceiras" diferencia a seção.

### 11.2 Status da vaga
- Toda nova vaga nasce com `status_vaga = 'ABERTA'`.
- "Inativar" muda para `'INATIVA'` → some do portal público (filtro `WHERE status_vaga = 'ABERTA'`).
- "Reativar" volta para `'ABERTA'`.
- Status `'PAUSADA'` e `'FECHADA'` existem no domínio mas não são expostos na UI atual.

### 11.3 Tipos de contrato
Domínio fechado (CHECK no banco): `CLT`, `PJ`, `ESTAGIO`, `JOVEM_APRENDIZ`, `CORPORATE`. **Obrigatório** ao criar vaga.

### 11.4 Modelos de trabalho
Domínio fechado: `PRESENCIAL`, `HIBRIDO`, `ONLINE`. **Obrigatório** ao criar vaga.
- `PRESENCIAL` ou `HIBRIDO` → exigem cidade ou estado (CHECK constraint no banco).
- `ONLINE` → localidade pode ficar vazia.

### 11.5 Salário
- Campo único e **opcional**. Se a empresa não informar, o portal público mostra a vaga **sem o campo de salário**.
- Periodicidade: `MENSAL`, `HORA` ou `ANUAL`.
- Moeda: `BRL`, `USD` ou `EUR`.

### 11.6 Score de aderência
- 0-100, calculado pelo Gemini.
- Se a IA falhar, a candidatura é salva sem score — não bloqueia o fluxo.

### 11.7 Banco de talentos
- Existe uma "vaga" especial chamada **Banco de Talentos** (sem `id_empresa`).
- Candidatos sem vaga selecionada são vinculados a ela.
- Empresas podem buscar talentos lá independente de vaga aberta.

### 11.8 Status da candidatura
Padrão `EM_ANALISE`. Domínio aberto para evolução (entrevista, contratado, recusado).

---

## 12. Segurança e LGPD

### 12.1 Senhas das empresas (hash bcrypt)
Senhas **nunca são armazenadas em texto puro**. O fluxo:

```python
import bcrypt

# Cadastro
senha_hash = bcrypt.hashpw(senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Login
bcrypt.checkpw(senha_digitada.encode('utf-8'), senha_hash.encode('utf-8'))
```

`bcrypt.gensalt()` gera salt aleatório por hash, e o trabalho do algoritmo é configurável (default `2^12` rounds). Na tabela `empresa.senha_hash` aparece algo como `$2b$12$BsuI...` — formato padrão bcrypt.

Scripts utilitários:
- `backend/scripts/criar_empresa.py` — cria empresa com senha hasheada
- `backend/scripts/resetar_senha_empresa.py` — reset de senha (esqueceu? roda esse)

### 12.2 JWT
- Assinado com `JWT_SECRET` (>= 64 chars aleatórios).
- Expiração 8h.
- Guardado em **cookie httpOnly** no Next.js — JS do cliente não acessa o token.
- Proxy interno `/api/rh/[...path]` injeta o `Authorization: Bearer <token>` ao chamar o FastAPI.

### 12.3 Upload de currículo
Validação de **magic bytes** real do arquivo (não confia em extensão):
```python
if extension == '.pdf' and not contents.startswith(b'%PDF-'):
    raise HTTPException(422, '...')
elif extension == '.docx' and not contents.startswith(b'PK\x03\x04'):
    raise HTTPException(422, '...')
elif extension == '.txt' and b'\x00' in contents[:8192]:
    raise HTTPException(422, '...')
```

Isso bloqueia `virus.exe` renomeado para `cv.pdf`.

### 12.4 LGPD
- Banner de consentimento de cookies na primeira visita (`localStorage`).
- Aceite explícito de termos no formulário de candidatura.
- Vagas externas só redirecionam — não compartilhamos dados do candidato com Adzuna/Remotive/Arbeitnow.
- Páginas dedicadas: `/lgpd`, `/politica-de-privacidade`, `/termos-de-uso`.

### 12.5 Outros
- Variáveis sensíveis em `.env` (gitignored).
- `pool_pre_ping=True` e `pool_recycle=1800` no SQLAlchemy para resiliência ao pooler do Supabase.
- CORS restrito a `FRONTEND_ORIGIN`.

---

## 13. E-mails transacionais

Após uma candidatura bem-sucedida, o portal envia automaticamente um **e-mail de confirmação** para o candidato (via Gmail SMTP).

### Detalhes técnicos
- Implementado em `backend/app/services/email_service.py`.
- Envio via `smtplib.SMTP_SSL` (porta 465) ou `SMTP` (porta 587 com STARTTLS).
- E-mail multipart: versão texto + versão HTML com GIF embutido (CID inline).
- Cabeçalhos `From`, `Reply-To`, `Message-ID` formatados com `email.utils`.
- **Toda tentativa de envio fica logada** na tabela `log_envio_email` (status, destinatário, mensagem de erro se houver).
- Falha no envio **não bloqueia** a candidatura — o registro é salvo, e o erro é logado para retry manual.

### Conteúdo
- Confirma o recebimento da candidatura
- Menciona o nome da vaga
- Explica os próximos passos (análise → retorno em até 7 dias úteis)
- Inclui links institucionais (LGPD, política de privacidade)

---

## 14. Como rodar localmente

### Pré-requisitos
- Python 3.12+
- Node.js 18+
- PostgreSQL acessível (Supabase ou local)

### Backend (terminal 1)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
# crie o arquivo .env baseado em .env.example e preencha
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
API em http://localhost:8000

### Frontend (terminal 2)
```powershell
cd frontend
npm install
# crie .env.local com NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```
Site em http://localhost:3000

### Aplicar migrations no banco
Cole o conteúdo dos arquivos `database/migrations/*.sql` no SQL Editor do Supabase (ou rode via `psql`). São idempotentes — pode rodar várias vezes.

### Sincronizar vagas externas (primeira vez)
```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:8000/vagas-externas/sync -TimeoutSec 600
```

### Criar uma empresa de teste
```powershell
cd backend
python scripts/criar_empresa.py --nome "Empresa Teste" --login teste --senha minhaSenha123
```

---

## 15. Variáveis de ambiente

Toda configuração sensível fica em `backend/.env` (NÃO commitado). Use `backend/.env.example` como referência.

Principais:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | String de conexão PostgreSQL (`postgresql+psycopg://user:pass@host:port/db`) |
| `JWT_SECRET` | String aleatória longa para assinar JWTs (gere com `secrets.token_urlsafe(64)`) |
| `GEMINI_API_KEY` | Chave do Google Gemini (https://aistudio.google.com) |
| `GEMINI_ENABLED` | `true` para ativar análise IA, `false` para desligar |
| `EMAIL_*` | Configurações SMTP (host, porta, user, password app, etc.) |
| `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` | Credenciais Adzuna (https://developer.adzuna.com) |
| `REMOTIVE_ENABLED` / `ARBEITNOW_ENABLED` | `true`/`false` para ligar/desligar essas fontes |
| `FRONTEND_ORIGIN` | Origem do frontend (CORS) |

Frontend (`frontend/.env.local`):
| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL do backend (ex: `http://localhost:8000`) |

---

## 16. Estrutura do projeto

```
.
├── backend/                  # API FastAPI
│   ├── app/
│   │   ├── api/              # rotas (rh_routes, routes públicos)
│   │   ├── core/             # config, logging
│   │   ├── db/               # session SQLAlchemy
│   │   ├── data/             # JSONs de UFs e municípios
│   │   ├── schemas/          # modelos Pydantic
│   │   ├── services/         # lógica de negócio
│   │   │   ├── auth_service.py
│   │   │   ├── dashboard_rh_service.py
│   │   │   ├── email_service.py
│   │   │   ├── external_jobs_service.py     # agregador Adzuna/Remotive/Arbeitnow
│   │   │   ├── gemini_analysis_service.py   # IA
│   │   │   ├── recruitment_service.py       # candidaturas, currículos
│   │   │   ├── resume_processing_service.py # extração de texto
│   │   │   └── vaga_rh_service.py
│   │   ├── static/           # GIF do e-mail
│   │   └── main.py           # bootstrap FastAPI
│   ├── scripts/              # CLIs auxiliares (criar_empresa, resetar_senha)
│   ├── .env.example
│   └── requirements.txt
├── frontend/                 # Next.js 14
│   ├── app/                  # App Router
│   │   ├── candidatura/      # form de candidatura
│   │   ├── rh/               # área das empresas (login, painel, vagas, vagas/nova)
│   │   ├── vagas/            # lista pública
│   │   └── api/rh/           # proxies para o FastAPI (cookie httpOnly → Bearer)
│   ├── components/
│   │   ├── candidatura/
│   │   ├── home/
│   │   ├── layout/           # Header, Footer, Logo, CookieBanner
│   │   ├── rh/               # RhTopNav, MinhasVagasList, DashboardCharts
│   │   └── ui/               # Button, JobCard
│   ├── lib/                  # auth helpers, mocks
│   ├── services/api.ts       # client do backend
│   ├── types/                # TypeScript types
│   └── package.json
├── database/
│   └── migrations/           # SQL idempotente
├── docs/
│   ├── PORTAL_RH.md
│   └── observacoes.md
├── png/                      # screenshots usados no README
└── README.md
```

---

## 17. Próximos passos

### Curto prazo
- Cron job real (APScheduler) para refresh automático das vagas externas
- Página de detalhes da vaga (hoje vai direto pro form)
- Filtros mais ricos em `/vagas` (faixa salarial, tipo de contrato, etc.)
- Login do candidato + histórico de candidaturas

### Médio prazo
- Testes automatizados (pytest no backend, Vitest no frontend)
- CI/CD no GitHub Actions
- Logging estruturado + Sentry
- Dockerfile + docker-compose
- Rate limiting nos endpoints públicos
- Multi-step form na candidatura (em vez de scroll longo)

### Longo prazo
- Painel comercial de empresas anunciantes (planos pagos)
- Notificações por e-mail para candidatos sobre status
- LGPD completa: endpoints de export/forget, audit log
- Internacionalização (PT/EN)
- App mobile (React Native)

---

## Licença

Projeto pessoal de portfólio.

## Autor

Lucas Shimazaki Batistti — desenvolvedor full-stack apaixonado por produto e IA aplicada.
