# ContractFlow — Backend (API)

Backend Node.js + Express + MySQL do ContractFlow.

## Requisitos

- Node.js 24
- MySQL 8+ (local) **ou** Docker + Docker Compose
- Poppler (`pdftoppm`) para OCR de PDF escaneado; incluído no Docker.

## Configuração local

1. Instale as dependências:

```bash
npm ci
```

2. Crie o arquivo `.env` a partir do exemplo e preencha com os dados do seu MySQL:

```bash
cp .env.example .env
```

Campos obrigatórios: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`.

3. Crie o schema do banco:

```bash
mysql -u <user> -p < database/schema.sql
```

4. (Opcional, para demonstração) Carregue o seed com dados demo:

```bash
mysql -u <user> -p contractflow < database/seed.sql
```

Isso cria os logins `demo@contractflow.com` e `usuario@contractflow.com` (senha dos dois:
`demo123`), 1 cliente, 1 contrato `DEMO-001` com 4 parcelas (1 PAGA, 1 VENCIDA,
2 PENDENTES), 1 pagamento e histórico. No Docker, o seed é aplicado
automaticamente no primeiro boot (junto com o schema).

5. Suba a API:

```bash
npm run dev        # desenvolvimento (watch)
# ou
npm start          # produção
```

Health check: `GET http://localhost:8080/api/health`

`npm start` e `npm run dev` aplicam migrações aditivas antes de iniciar o servidor.
Em banco existente, **preserve os dados**; use `npm run db:migrate` para atualizar
o schema. O bootstrap `database/schema.sql` é apenas para banco novo.
Rotas/formatos novos e regras financeiras: [API da Sprint 2](../docs/API_SPRINT_2.md).

## Docker (reproduzível)

O diretório `api/` possui `Dockerfile`, `compose.yaml` e `.dockerignore`.
O compose sobe **MySQL 8** + **API**, aplica o schema automaticamente no primeiro
boot e persiste os dados em volumes.

1. Defina as variáveis (criando um `.env` na pasta `api/` ou exportando no shell):

```bash
# api/.env (exemplo — gere um segredo real, não copie o abaixo)
DB_USER=contractflow_user
DB_PASSWORD=contractflow_pass
DB_ROOT_PASSWORD=root_local_only
JWT_SECRET=<saida-do-comando-abaixo>
API_PORT=8080
CORS_ORIGINS=
```

Gere o segredo com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> `JWT_SECRET` é **obrigatório** e não pode ser um dos placeholders. O container
> recusa subir com segredo fraco (fail-fast no `server.js`).

2. Suba tudo:

```bash
cd api
docker compose up --build
```

3. Acesse:
- API: `http://localhost:8080/api/health`
- MySQL: `localhost:3306` (usuário conforme `DB_USER`)

4. Pare com `Ctrl+C` ou encerre preservando os dados:

```bash
docker compose down
```

> Os arquivos de upload persistem no volume `uploads_data`; o banco em `db_data`.

## Testes

```bash
npm test            # todos (unit + integração da API)
npm run test:unit   # apenas unitários
npm run test:api    # apenas integração/API
```

- Os testes unitários cobrem validadores, cálculo de parcelas/vencimentos, juros/multas
  e situação de parcela.
- Os testes de integração exercitam as rotas e controllers reais (via supertest) com um
  `db` simulado — cobrem autenticação, isolamento por usuário e regras de negócio.

### Testes com MySQL real (Sprint 2)

Além dos 84 testes rápidos, 33 cenários de API são executados contra MySQL 8:
financeiro, isolamento, concorrência, CRUDs, dashboard, calendário, relatórios,
OCR de PDF/imagem/scan, permissões, migrações e renovação.

```bash
# A partir de api/. Banco separado, porta 3307; não usa o .env da aplicação.
docker compose -f compose.test.yaml up -d --wait
npm run test:mysql
docker compose -f compose.test.yaml down
```

Os testes apagam exclusivamente dados do banco `contractflow_test` antes de cada
cenário. Nunca aponte essa suíte para dados que deseja preservar. Para um servidor
de teste existente, configure `CF_TEST_DB_HOST`, `CF_TEST_DB_PORT`,
`CF_TEST_DB_USER`, `CF_TEST_DB_PASSWORD` e `CF_TEST_DB_NAME`. O nome só aceita
`contractflow_test` ou `contractflow_test_<sufixo>`; uploads são temporários.

Para produzir também a cobertura combinada:

```bash
npm run test:coverage
```

Relatório em `coverage/combined/index.html`; organização dos casos em
[tests/mysql/README.md](tests/mysql/README.md). Cobertura local: 91,09% das linhas
de controllers/services/utils/middlewares, sem medir telas ou implantação.

O workflow `.github/workflows/backend.yml` executa as suítes rápida e MySQL em
jobs separados e combina a cobertura em um terceiro job, em push/PR da API.
Resultados locais e execução do GitHub Actions são evidências distintas.

### Dependências de produção

O lockfile usa Express 4.22.3 e Multer 2.4.0. Os overrides de `qs` (6.16.0)
e `uuid` (11.1.1, com suporte CommonJS) corrigem dependências transitivas de
body-parser/ExcelJS. A exportação XLSX foi revalidada com essas versões.
Na revalidação de 08/10/2026, `proxy-addr` foi atualizado para 2.0.8 para
corrigir o alerta GHSA-jqcg-44mw-7w3h, mantendo a API compatível.
`npm audit --omit=dev` retornou zero vulnerabilidades na validação da Sprint 2;
reavaliar o audit ao atualizar dependências, sem usar downgrade forçado do ExcelJS.
