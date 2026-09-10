# ContractFlow — Backend (API)

Backend Node.js + Express + MySQL do ContractFlow.

## Requisitos

- Node.js 20+
- MySQL 8+ (local) **ou** Docker + Docker Compose

## Configuração local

1. Instale as dependências:

```bash
npm install
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

4. Pare com `Ctrl+C`; para remover os volumes (apagar dados):

```bash
docker compose down -v
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
