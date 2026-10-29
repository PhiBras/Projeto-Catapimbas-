# Avaliação de Startups — plataforma multi-institucional

Node.js + Express (API) · PostgreSQL no Supabase (banco) · React (interface).

```
backend/    API: src/routes, src/services, src/middlewares, src/config, banco/schema.sql, scripts/, tests/
frontend/   Interface React (Vite): src/componentes
docs/       DER e matriz de permissões
```

## 1. Criar o banco no Supabase
1. Em supabase.com, crie uma conta e um **New project** (escolha um nome, uma região próxima e uma **senha do banco** — guarde-a).
2. Com o projeto pronto, clique em **Connect** (topo do painel) e copie a URL de **Session pooler**
   (formato `postgres://postgres.SEUPROJETO:[YOUR-PASSWORD]@aws-0-REGIAO.pooler.supabase.com:5432/postgres`).
   Troque `[YOUR-PASSWORD]` pela senha do banco. Use o Session pooler porque funciona em redes só com IPv4 e serve para servidores que ficam ligados.
3. Em **Project Settings > Data API**, desative a **Data API** (o sistema usa o Express, não a API do Supabase).

## 2. Rodar no computador (Node.js 20+)
```
cd backend
cp .env.example .env        # cole a URL do Supabase em DATABASE_URL
npm install
npm run migrar              # cria as tabelas (já com RLS ativado)
npm run seed                # dados de demonstração (senha das contas: Senha@123)
npm run dev                 # API em http://localhost:3000
```
Em outro terminal:
```
cd frontend
npm install
npm run dev                 # abra http://localhost:5173
```
Contas de demonstração: `super@demo.com`, `admin.a@demo.com`, `coord.a@demo.com`, `orient.a@demo.com`, `aluno.a@demo.com`,
`andre@demo.com` / `celso@demo.com` / `laura@demo.com` (avaliadores), `admin.b@demo.com`, `pendente.a@demo.com`.

> **Cuidado:** `npm run seed` e `npm test` APAGAM todos os dados do banco apontado. Use-os só em banco de demonstração/teste.
> Para uso real, crie o superadministrador com `npm run super` (dados no `.env`) e cadastre as instituições pela tela.

## 3. Testes
Use um banco separado: outro projeto Supabase ou um PostgreSQL local. Rode `npm run migrar` com `DATABASE_URL` apontando para ele
(ou execute `banco/schema.sql` no SQL Editor), preencha `DATABASE_URL_TESTE` no `.env` e rode `npm test` em `backend/`.

## 4. Colocar no ar
O Supabase hospeda só o **banco**. O servidor Node precisa rodar em algum lugar (Render, Railway, VPS...).

### Frontend na Vercel e API no Render
Configure as variáveis de ambiente:

- **Render (API):** `DATABASE_URL` com a URL do Supabase, `NODE_ENV=production` e `FRONTEND_URL` com a origem exata do site na Vercel (por exemplo, `https://seu-projeto.vercel.app`, sem `/` no final).
- **Vercel (frontend):** `VITE_API_URL` com a URL pública da API no Render (por exemplo, `https://seu-backend.onrender.com`, sem `/` no final). Gere um novo deploy da Vercel após alterar essa variável.
- **E-mail e recuperação de senha:** configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` (`true` ou `false`), `SMTP_USER`, `SMTP_PASS` e `SMTP_FROM` no ambiente da API. Novos cadastros precisam confirmar o e-mail; o link expira em 24 horas. O link de redefinição de senha expira em uma hora. Sem SMTP configurado, a API informa que o envio está indisponível. Cadastros já existentes permanecem confirmados durante a migração.

O frontend e a API usam cookies de sessão; por isso a API precisa liberar a origem correta via `FRONTEND_URL` e o navegador precisa aceitar cookies de terceiros. Se o navegador bloquear esses cookies por causa das origens diferentes, use um domínio próprio com frontend e API em subdomínios e configure a política de cookies para esse cenário.

Para criar o primeiro acesso em produção, não use as contas `@demo.com`: elas só existem após executar o seed, que é bloqueado em produção e apaga todos os dados quando executado em um banco de demonstração. Crie o superadministrador pelo script `npm run super`, definindo `SUPER_EMAIL`, `SUPER_NOME` e `SUPER_SENHA` (mínimo 12 caracteres) no ambiente do backend; então entre com essas credenciais e cadastre a instituição. O `npm run seed` deve ser usado apenas em banco descartável de desenvolvimento/testes.

### Site e API juntos no mesmo servidor
Também é possível hospedar tudo no Render, Railway ou VPS:
```
cd frontend && npm install && npm run build      # gera frontend/dist
cd ../backend && npm install --omit=dev
NODE_ENV=production TRUST_PROXY=1 npm start       # o Express entrega a API e o site
```
Configure `DATABASE_URL` como variável de ambiente na hospedagem (nunca envie o `.env` para o Git). O Supabase faz backups automáticos conforme o plano.

## Segurança
Senhas com bcrypt · sessão em cookie HttpOnly/SameSite=Strict (Secure em produção), expira em 8 h · papéis conferidos no servidor a cada requisição ·
toda consulta é limitada à instituição da sessão · limite de tentativas de login · verificação de origem · cabeçalhos de segurança ·
consultas SQL parametrizadas · RLS ativado em todas as tabelas · Excel protegido contra fórmulas · auditoria de operações importantes.

## Regras de cálculo
Pontuação do avaliador = soma(nota × peso) ÷ soma(pesos). Pontuação do projeto = média dos avaliadores com avaliação completa, em 2 casas.
Empate: mesma pontuação = mesma posição, sem deixar posições vazias (1, 2, 2, 3). Ranking, pódio e Excel usam a mesma função (`backend/src/services/ranking.js`).
