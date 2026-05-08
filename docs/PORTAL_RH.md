# Portal RH — Documentação

Documentação do portal exclusivo de empresas (RH) que permite a uma empresa contratante criar vagas, acompanhar candidatos e visualizar métricas em tempo real.

---

## 📋 Sumário

1. [Visão geral do projeto](#-1-visão-geral-do-projeto)
2. [O que é o Portal RH](#-2-o-que-é-o-portal-rh)
3. [Arquitetura](#-3-arquitetura)
4. [Banco de dados](#-4-banco-de-dados)
5. [Backend — estrutura e endpoints](#-5-backend--estrutura-e-endpoints)
6. [Frontend — estrutura e telas](#-6-frontend--estrutura-e-telas)
7. [Fluxo de autenticação](#-7-fluxo-de-autenticação)
8. [Como rodar e testar](#-8-como-rodar-e-testar)
9. [Onboarding de uma nova empresa](#-9-onboarding-de-uma-nova-empresa)
10. [Estado atual vs pendente](#-10-estado-atual-vs-pendente)
11. [Considerações de segurança e LGPD](#-11-considerações-de-segurança-e-lgpd)

---

## 🌐 1. Visão geral do projeto

O **Encontra Talentos** é um portal de recrutamento que combina:

- **Vagas internas** — armazenadas no banco PostgreSQL (Supabase)
- **Vagas externas** — agregadas das APIs Adzuna, Remotive e Arbeitnow (~1100 vagas)
- **IA de aderência** — Gemini 2.5 Flash analisa currículo vs requisitos da vaga e gera score 0-100
- **E-mail automático** — confirmação de candidatura via Gmail SMTP
- **Portal RH** — acesso exclusivo para empresas contratantes (este documento)

### Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind, React Hook Form, recharts |
| Backend | FastAPI, Python 3.12, SQLAlchemy 2 |
| Banco | PostgreSQL (Supabase pooler) |
| IA | Google Gemini 2.5 Flash |
| Auth RH | JWT (PyJWT) + bcrypt |

---

## 🏢 2. O que é o Portal RH

Antes do RH, o portal era 100% público — qualquer pessoa via vagas e candidatos não tinham relacionamento com empresas no sistema. Agora cada vaga **pertence a uma empresa** (ou é interna da casa, sem empresa associada), e a empresa tem um painel próprio.

### O que uma empresa logada pode fazer

1. **Publicar vaga** — título, área, nível, descrição (bio), faixa salarial, skills exigidas. A vaga aparece automaticamente no portal público (`/vagas`) e recebe candidaturas.
2. **Ver métricas** — replica do BI: KPIs (total candidaturas, vagas abertas, score médio, alto score, média salarial), funil de aderência, média salarial por vaga, scatter score×pretensão, top candidatos por score.
3. **Listar candidatos** (via API por enquanto, UI dedicada vem depois) — vê nome, email, telefone, score IA, parecer, pretensão salarial.
4. **Editar/desativar vaga** (via API, UI vem depois) — soft delete preserva histórico do BI.

### O que uma empresa **não** pode fazer

- Ver vagas/candidatos de outras empresas (isolamento por `id_empresa` em todas as queries).
- Auto-cadastrar — o admin (vocês da Ponte Talentos) cria a conta manualmente via script CLI.
- Recuperar senha sozinha — admin gera nova e envia (futuro: link de reset por email).

---

## 🏗️ 3. Arquitetura

```
                     ┌─────────────────────────────────┐
                     │        Browser (Empresa)        │
                     └────────────┬────────────────────┘
                                  │ HTTPS (cookie httpOnly)
                                  ▼
              ┌───────────────────────────────────────┐
              │          Next.js (porta 3000)         │
              │                                       │
              │  ┌────────────────────────────────┐   │
              │  │ middleware.ts                  │   │
              │  │ • protege /rh/* (exceto login) │   │
              │  │ • valida exp do JWT            │   │
              │  │ • injeta x-pathname em RSC     │   │
              │  └────────────────────────────────┘   │
              │                                       │
              │  /rh/login (público)                  │
              │  /rh/painel — dashboard              │
              │  /rh/vagas/nova — form de criar      │
              │                                       │
              │  /api/rh/login → set httpOnly cookie  │
              │  /api/rh/logout → clear cookie        │
              │  /api/rh/[...path] → proxy genérico   │
              │     (lê cookie, injeta Bearer,       │
              │      reencaminha pro FastAPI)         │
              └────────────┬──────────────────────────┘
                           │ Bearer JWT (server-side)
                           ▼
              ┌───────────────────────────────────────┐
              │        FastAPI (porta 8000)           │
              │                                       │
              │  /rh/auth/login → emite JWT           │
              │  /rh/me                                │
              │  /rh/vagas (CRUD)                      │
              │  /rh/vagas/{id}/candidatos             │
              │  /rh/dashboard/stats                   │
              │                                       │
              │  Dependency: get_current_empresa()    │
              │   → valida JWT, busca empresa,        │
              │     bloqueia se status != ATIVA       │
              └────────────┬──────────────────────────┘
                           │ SQL (sempre filtra por id_empresa)
                           ▼
              ┌───────────────────────────────────────┐
              │      PostgreSQL (Supabase)            │
              │  empresa, vaga, vaga_skill, ...       │
              └───────────────────────────────────────┘
```

### Decisões importantes

- **Token em cookie httpOnly** — JS do cliente não acessa, então XSS não rouba.
- **Proxy genérico no Next.js** — toda chamada autenticada passa por `/api/rh/[...path]`, que lê o cookie e injeta `Authorization: Bearer <token>` ao falar com o FastAPI. O JWT nunca é exposto ao client-side JavaScript.
- **Validação dupla** — middleware do Next.js só checa `exp` (sem assinatura, porque o `JWT_SECRET` fica no backend); o FastAPI valida assinatura + busca a empresa em todo request autenticado.
- **Filtro por `id_empresa`** — toda query de vagas/candidatos no backend força `WHERE id_empresa = :empresa_atual`. Não confiamos em IDs vindos do cliente.

---

## 🗄️ 4. Banco de dados

### Tabelas novas

#### `empresa`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id_empresa` | SERIAL PK | |
| `nome` | VARCHAR(150) | Nome de exibição (ex: "Acme S.A.") |
| `nome_login` | VARCHAR(60) UNIQUE | Login (ex: "acme") — case-insensitive |
| `senha_hash` | VARCHAR(255) | Hash bcrypt — **nunca** texto puro |
| `cnpj`, `bio`, `logo_url`, `site`, `email_contato` | | Dados da empresa |
| `status` | VARCHAR(20) | `ATIVA` / `INATIVA` / `SUSPENSA` |
| `criado_em`, `atualizado_em` | TIMESTAMP | |

#### `vaga_skill`

Junction many-to-many entre `vaga` e `skill`. Skills exigidas pela vaga (usadas pela IA pra calcular aderência).

### Alterações em `vaga`

- `id_empresa` (INT FK → empresa) — nullable; vagas legadas têm NULL
- `salario_min`, `salario_max` (NUMERIC(12,2)) — opcionais
- `salario_periodicidade` (`MENSAL` / `HORA` / `ANUAL`)
- `moeda` (default `BRL`)

Constraint: `salario_max >= salario_min` quando ambos preenchidos.

### Migrations rodadas

1. `database/migrations/2026_05_04_add_empresa_and_rh_portal.sql` — schema + soft-delete inicial
2. `database/migrations/2026_05_04_fix_rh_portal_missing_cols.sql` — completa colunas que faltaram (parsing parcial do SQL Editor)

Ambas são **idempotentes** (`IF NOT EXISTS` em tudo).

### Soft delete das 6 vagas antigas

As vagas pré-existentes (Analista de Dados, Dev Python, Analista de BI, Dev Front-end, Analista de Suporte, Banco de Talentos) foram marcadas `status_vaga = 'INATIVA'`. Não foram apagadas — preservam o histórico de candidaturas e dados do BI. O portal público filtra `status_vaga = 'ABERTA'`, então elas não aparecem mais. A vaga "Banco de Talentos" continua funcional como fallback (lookup por `titulo_vaga`, não por status).

---

## ⚙️ 5. Backend — estrutura e endpoints

### Arquivos novos

```
backend/
├── app/
│   ├── api/
│   │   ├── dependencies.py       # get_current_empresa() — injetado em rotas /rh
│   │   └── rh_routes.py          # todas as rotas /rh/*
│   ├── schemas/
│   │   ├── empresa.py            # LoginRequest, LoginResponse, EmpresaResponse
│   │   ├── vaga_rh.py            # VagaRhCreateRequest, VagaRhUpdateRequest, etc.
│   │   └── dashboard.py          # DashboardStats, KPIs, FunilFaixa, etc.
│   └── services/
│       ├── auth_service.py       # bcrypt hash/verify + JWT encode/decode
│       ├── vaga_rh_service.py    # CRUD de vagas + candidatos (filtrado por empresa)
│       └── dashboard_rh_service.py  # queries de métricas
└── scripts/
    └── criar_empresa.py          # CLI para criar empresa com senha hasheada
```

### Endpoints `/rh/*`

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/rh/auth/login` | Recebe `nome_login` + `senha`, retorna JWT | público |
| GET | `/rh/me` | Dados da empresa logada | JWT |
| GET | `/rh/vagas` | Lista vagas DA empresa logada | JWT |
| POST | `/rh/vagas` | Cria vaga (vincula `id_empresa` automático) | JWT |
| GET | `/rh/vagas/{id}` | Detalhe de uma vaga (sua) | JWT |
| PATCH | `/rh/vagas/{id}` | Edita vaga sua | JWT |
| DELETE | `/rh/vagas/{id}` | Soft delete (`status='INATIVA'`) | JWT |
| GET | `/rh/vagas/{id}/candidatos` | Candidatos da vaga (com email, telefone, score IA) | JWT |
| GET | `/rh/dashboard/stats` | Métricas consolidadas pra o painel | JWT |

### Variáveis de ambiente novas (`backend/.env`)

```
JWT_SECRET=<string aleatória ≥64 chars>
JWT_EXPIRE_HOURS=8
```

Gere o secret com `python -c "import secrets; print(secrets.token_urlsafe(64))"`.

### Dependências adicionadas (`backend/requirements.txt`)

- `bcrypt==4.2.1`
- `PyJWT==2.10.1`

---

## 🎨 6. Frontend — estrutura e telas

### Arquivos novos

```
frontend/
├── middleware.ts                          # protege /rh/* e injeta x-pathname
├── types/rh.ts                            # types TS (Empresa, VagaRh, etc.)
├── lib/rh/auth.ts                         # decodeJwtPayload, getCurrentEmpresa()
├── components/
│   ├── layout/ConditionalChrome.tsx       # esconde Header/Footer público em /rh
│   └── rh/
│       ├── RhTopNav.tsx                   # nav de 2 abas (Métricas | Criar vaga)
│       ├── LogoutButton.tsx               # botão Sair
│       └── DashboardCharts.tsx            # Funil, Média Salarial, Scatter (recharts)
└── app/
    ├── api/rh/
    │   ├── login/route.ts                 # POST: login + set httpOnly cookie
    │   ├── logout/route.ts                # POST: clear cookie
    │   └── [...path]/route.ts             # catch-all proxy para FastAPI
    └── rh/
        ├── layout.tsx                     # wrapper c/ top nav (sem nav no login)
        ├── login/page.tsx                 # tela de login
        ├── painel/page.tsx                # dashboard com KPIs + 4 gráficos + tabela
        └── vagas/nova/
            ├── page.tsx                   # server: busca skills, renderiza form
            └── NovaVagaForm.tsx           # client: formulário completo
```

### Telas

#### `/rh/login`
Card centralizado com usuário/senha. Sem `Header` público. Redireciona para `?next=` se vier de uma rota protegida.

#### `/rh/painel` (Métricas)
- 6 KPIs: total candidaturas, vagas abertas, score médio, alto score, média salarial total, abaixo da média
- Gráfico de barras horizontal: Funil de aderência (≥80, 60-79, <60)
- Gráfico de barras vertical: Média salarial por vaga
- Scatter plot: Score × Pretensão salarial (uma cor por vaga)
- Tabela: Top 15 candidatos por score (Nome, Vaga, Score)

#### `/rh/vagas/nova` (Criar vaga)
Formulário em 3 blocos:
1. **Identificação** — título (obrigatório), área, nível (Estágio/Junior/Pleno/Senior/Especialista), descrição/bio (até 5000 chars)
2. **Faixa salarial** — min/max, periodicidade (Mensal/Hora/Anual), moeda
3. **Skills exigidas** — busca + multi-select com tags removíveis

Após "Publicar vaga": feedback verde, redirect pro painel, vaga aparece no portal público.

### Variáveis de ambiente (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Dependências adicionadas

```
npm install recharts
```

---

## 🔐 7. Fluxo de autenticação

```
1. Empresa abre /rh/painel sem cookie
   ↓
2. middleware.ts vê que não tem rh_token → redirect /rh/login?next=/rh/painel
   ↓
3. Empresa preenche usuário/senha, submit
   ↓
4. Frontend chama POST /api/rh/login (Next.js route handler)
   ↓
5. Route handler chama POST /rh/auth/login no FastAPI
   ↓
6. FastAPI valida bcrypt(senha) == empresa.senha_hash, status='ATIVA'
   ↓
7. FastAPI emite JWT { sub: id_empresa, exp: now+8h, type: 'empresa' }
   ↓
8. Route handler do Next.js seta cookie httpOnly:
      rh_token=<jwt>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800
   ↓
9. Frontend redireciona pra ?next ou /rh/painel
   ↓
10. Próximas chamadas vão por /api/rh/[...path] → proxy lê o cookie,
    injeta Authorization: Bearer <jwt>, FastAPI valida e processa
```

### Em código

| Onde | O quê |
|---|---|
| `middleware.ts` | Decode payload (sem verificar assinatura), checa `exp` |
| `app/api/rh/login/route.ts` | POST login + `response.cookies.set({httpOnly: true, ...})` |
| `app/api/rh/[...path]/route.ts` | `cookies().get('rh_token')` + `Authorization: Bearer ${token}` |
| `lib/rh/auth.ts` | `getCurrentEmpresa()` — usado em Server Components |
| `backend/app/api/dependencies.py` | `get_current_empresa()` — valida JWT, busca empresa, bloqueia se INATIVA |

### Logout

`POST /api/rh/logout` apenas limpa o cookie (Max-Age=0). O JWT continua **tecnicamente válido** até `exp`, mas como o cookie sumiu, o cliente não tem mais como mandar. Logout instantâneo (revogação) exigiria blocklist no backend — não foi implementado por simplicidade.

---

## 🚀 8. Como rodar e testar

### Pré-requisitos

- Python 3.12+
- Node.js 18+
- Acesso ao Supabase configurado

### Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API em `http://localhost:8000`. Swagger em `http://localhost:8000/docs`.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Site em `http://localhost:3000`. Portal RH em `http://localhost:3000/rh/login`.

### Smoke test do RH (PowerShell)

```powershell
# Login
$resp = Invoke-RestMethod -Method POST -Uri http://localhost:8000/rh/auth/login `
  -ContentType 'application/json' `
  -Body '{"nome_login":"teste","senha":"senha1234"}'
$headers = @{ Authorization = "Bearer $($resp.access_token)" }

# Listar minhas vagas
Invoke-RestMethod -Uri http://localhost:8000/rh/vagas -Headers $headers

# Métricas do dashboard
Invoke-RestMethod -Uri http://localhost:8000/rh/dashboard/stats -Headers $headers
```

---

## 👤 9. Onboarding de uma nova empresa

Self-service não existe — você (admin) cria a conta manualmente via CLI:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python scripts/criar_empresa.py `
  --nome "Acme S.A." `
  --login acme `
  --senha SenhaForteAleatoria123 `
  --bio "Tecnologia e inovação desde 2010" `
  --email contato@acme.com.br `
  --site https://acme.com.br `
  --cnpj "12.345.678/0001-90"
```

A senha em texto puro **nunca** é gravada no banco — só o hash bcrypt. Depois passe `acme` / `SenhaForteAleatoria123` pra empresa por canal seguro (e instrua a trocar a senha — funcionalidade ainda não implementada, ver pendentes).

---

## 🗺️ 10. Estado atual vs pendente

### ✅ Implementado (até hoje)

- Migrations no banco (empresa, vaga_skill, salário em vaga, soft delete)
- Backend: auth JWT, CRUD de vagas, listagem de candidatos, dashboard stats
- Frontend: middleware, login, painel completo (KPIs + 4 gráficos + tabela), criar vaga
- Onboarding manual via CLI script
- Top nav RH (2 abas) substitui o cabeçalho público nas rotas `/rh/*`
- Vagas criadas via portal RH aparecem no `/vagas` público

### ⏳ Pendente (próximas etapas)

#### Curto prazo (UX completa do RH)

- [ ] **Tela de listagem de minhas vagas** (`/rh/vagas`) — atualmente só dá pra criar; precisa listar/editar/desativar via UI
- [ ] **Tela de candidatos da vaga** (`/rh/vagas/{id}/candidatos`) — endpoint pronto, falta UI dedicada (tabela com nome, email, telefone, score IA, parecer, link pro currículo)
- [ ] **Tela de perfil da empresa** (`/rh/perfil`) — editar bio, logo_url, site, email_contato
- [ ] **Trocar senha** (`/rh/conta/senha`) — crítico pra autonomia da empresa
- [ ] **Download de currículo** — endpoint backend + botão no frontend

#### Médio prazo (integração pública)

- [ ] **Card da vaga pública mostrar empresa** — atualizar `GET /vagas` pra fazer JOIN com `empresa` e retornar `nome`, `logo_url`, `bio`. Atualmente a vaga aparece sem identificação da empresa.
- [ ] **LGPD na candidatura** — quando candidato se inscreve em vaga com `id_empresa`, mostrar aviso explícito: "ao se candidatar, seus dados (nome, email, telefone, currículo, score IA) serão compartilhados com {empresa.nome}". Aceite separado dos termos gerais.
- [ ] **Atualizar `politica-de-privacidade` e `lgpd`** — cláusula sobre compartilhamento com empresa contratante

#### Longo prazo

- [ ] **Reset de senha** por email
- [ ] **Filtros e ordenação** na lista de candidatos
- [ ] **Notificação por email** pra empresa quando recebe nova candidatura
- [ ] **Exportar candidatos pra CSV** (pra empresa rodar análise externa)
- [ ] **Multi-usuário por empresa** (hoje uma empresa = um login; pode evoluir pra equipe com roles)
- [ ] **Logout instantâneo (revogação de JWT)** via blocklist
- [ ] **Logs estruturados** (Sentry, etc.) — útil pra debugar quando a base cresce
- [ ] **Tests automatizados** (pytest, Vitest)

---

## 🔒 11. Considerações de segurança e LGPD

### Segurança

- **Senhas com bcrypt** — nunca texto puro. Mesmo se o banco vazar, senhas são irreversíveis (custo computacional alto pra brute-force).
- **JWT em httpOnly cookie** — XSS não consegue ler, e `SameSite=Lax` mitiga CSRF na maioria dos casos.
- **Proxy genérico Next→FastAPI** — JS do cliente nunca vê o token; só o cookie, que ele não consegue ler.
- **Mensagens genéricas** — login errado retorna "Credenciais inválidas" (sem dizer se foi usuário ou senha). 404 em vaga de outra empresa (sem revelar existência).
- **Filtro por `id_empresa`** em **todas** as queries — uma empresa não consegue ler nem mexer em recursos de outra mesmo manipulando IDs na URL.

### Pendências de segurança

- **Reset de senha** — hoje só admin troca via SQL ou CLI. Empresa não tem autonomia.
- **Rate limiting** no `/rh/auth/login` — não tem; um atacante pode tentar brute-force.
- **CSP / headers de segurança** — Next.js usa default; vale revisar antes de produção.
- **HTTPS** — em produção, garantir que `secure: process.env.NODE_ENV === 'production'` no cookie efetivamente cobre o ambiente real.

### LGPD

- O candidato hoje aceita os termos do **portal**, não da empresa contratante específica. Quando a primeira empresa real entrar, é **obrigatório** atualizar o termo de candidatura informando que os dados serão compartilhados com a empresa X (nome explícito), e ter aceite dedicado no formulário (separado do "li e aceito os termos gerais"). Sem isso, o compartilhamento é frágil legalmente.
- Texto sugerido (a aplicar no `TermsBlock.tsx`):
  > Ao se candidatar à vaga **{vaga.titulo}** da empresa **{empresa.nome}**, você concorda em compartilhar com essa empresa: nome completo, e-mail, telefone, currículo, pretensão salarial, localidade e a análise de aderência (score) gerada por IA. Esses dados serão usados exclusivamente no processo seletivo desta vaga.
- O backend já tem `aceite_termos` na `candidato`. Quando implementar a cláusula específica de empresa, vale adicionar uma coluna `aceite_compartilhamento_empresa` em `candidatura` (ou estender o aceite atual com timestamp + texto versionado).

---

**Última atualização:** 2026-05-04 — implementação inicial do Portal RH (etapas 1 a 5).
