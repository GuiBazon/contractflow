# CONTRACTFLOW — INSTRUÇÕES / RELATÓRIO DE ESTADO (para retomar em casa)

> Este arquivo contém o prompt/escopo da missão (Sprint 1) e o relatório fiel do que
> já foi feito e do que falta, para você retomar rapidamente sem re-auditar tudo.

---

# PARTE A — PROMPT DA MISSÃO (escopo Sprint 1)

# CONTRACTFLOW — PREPARAÇÃO REAL PARA SPRINT 1 / AUDITORIA + IMPLEMENTAÇÃO + EVIDÊNCIAS

Você está entrando em um projeto já em desenvolvimento e precisa trabalhar diretamente no código atual.

O projeto é o **ContractFlow**, um sistema de gestão de contratos para pequenas e médias empresas.

## STACK

- Backend: Node.js + Express
- Banco: MySQL
- Web: React
- Mobile: React Native + Expo

Estrutura:

```text
/backend
/front
/mobile
```

Equipe:
- Bazon — Backend
- Renan + João — Web
- Ulisses + Eduardo — Mobile

GitHub: https://github.com/GuiBazon/contractflow

NESTE REPO a estrutura real é `api/`, `web/`, `mobile/` (não `backend/front/mobile`).
Não renomear — decisão de equipe.

## Contexto crítico: Sprint 1 (entrega 10/09)

A rubrica avalia: Documentação (5), Figma (5), Banco de Dados (5), Trello (5),
Sistema funcionando (25), Conhecimento técnico individual (25), Evidências de
participação (15), Integração Web/Mobile ↔ API ↔ Regra de negócio ↔ Banco (15).

Prioridade do Bazon (backend): deixar um núcleo demonstrável e explicável:

```text
Autenticação → Cliente → Contrato → Parcelas → Pagamento → Saldo/Situação → Histórico
```

Regras que precisam ser respeitadas (resumo):
- cliente: vários contratos; contrato precisa de cliente; CPF/CNPJ e email validados;
  isolamento por usuário; cliente com contrato não é excluído.
- contrato: pertence a cliente; parcelas geradas automaticamente; vencimentos coerentes;
  alterações sensíveis respeitam pagamentos existentes. Status: ATIVO/PENDENTE/ENCERRADO/CANCELADO/EM_RENOVACAO.
- parcela: situações PENDENTE/PAGA/VENCIDA/CANCELADA; prioridade CANCELADA > PAGA > VENCIDA > PENDENTE.
- pagamento: pertence a parcela válida; parcela cancelada não recebe pagamento;
  não ultrapassa o valor; atualiza situação; reflete em recebido/saldo.
- documento: tipos/tamanhos permitidos; associação ao contrato; ownership; ORIGINAL não é excluído.
- NÃO inventar regras novas (ex.: pagamento parcial como regra oficial, módulo de auditoria).

Testes: Jest + Supertest; testes devem EXPOR bugs (não maquiar) e não fingir funcionalidade inexistente.

Docker: só depois do backend essencial funcionando. Estabilidade > arquitetura.

Git: commits reais e separados logicamente, sem inflar quantidade.

# PARTE B — RELATÓRIO DE ESTADO ATUAL (fiel ao código)

## O que foi feito (sessões anteriores + esta)

1. **Auditoria real** — só `auth` e `clientes` estavam registrados em `routes/index.js`;
   `contratos/parcelas/pagamentos/documentos` tinham controllers prontos mas NÃO estavam
   nas rotas. **Confirmado e corrigido.**
2. **Base path padrão** — `app.js` mount em `/api` (CORS configurável, `express.json({limit:'1mb'})`,
   404 handler, error handler que NÃO vaza `err.message`).
3. **`server.js` fail-fast** — exige DB_*/JWT_SECRET, rejeita segredos fracos, porta default 8080.
4. **Rotas criadas/registradas**:
   - `api/src/routes/contractRoutes.js` (contratos + parcelas + pagamentos + documentos aninhados)
   - `api/src/routes/paymentAllRoutes.js` (`GET /api/pagamentos`)
   - `api/src/routes/index.js` monta `/auth`, `/clientes`, `/contratos`, `/pagamentos`
5. **Bugs corrigidos**:
   - `contractController.updateContrato`: `contrato.parcelas_pagas` era `undefined` (não vinha de
     `obterContratoDono`) → trocado por `hasPayments()` no guard "não alterar numero após pagamentos".
   - `contractController.generateParcelas`: `valor_parcela` agora é obrigatório (>0), em vez de zerado.
   - removido import não usado `validarDados`.
6. **Testes (Jest + Supertest)** — **69/69 passando** (5 suites):
   - unit: `validators`, `contratoService`, `financeiroService`, `ocrService` (51 testes)
   - integração: `tests/integration/api.test.js` (18 testes) — rotas reais + DB simulado via
     `jest.mock('../../src/config/db')`. Cobre: health, 401 sem token, token sem Bearer 401 / com
     Bearer passa, 404, register validation, isolamento por usuário em clientes e contratos (404),
     financeiro, pagamento em parcela cancelada 400, pagamento que excede 400, pagamento válido 201
     (parcela quitada), gerar parcelas em contrato encerrado 400, gerar parcelas sem valor 400,
     alterar numero após pagamento 400, deletar documento ORIGINAL 400, status inválido 400.
7. **Docker** (criado; build OK, subida local bloqueada):
   - `api/Dockerfile` (node:20-alpine, npm ci --omit=dev, porta 8080)
   - `api/compose.yaml` (MySQL 8 + API, schema auto no 1º boot via `docker-entrypoint-initdb.d`,
     volumes `db_data` e `uploads_data`, healthcheck, `JWT_SECRET` obrigatório)
   - `api/.dockerignore`
   - **Build da imagem testado e OK** (`docker build` passou).
   - `docker compose up` **falhou ao expor porta 3306** — "bind: normalmente é permitida apenas uma
     utilização de cada endereço de soquete". **Causa provável: um MySQL local já está na 3306
     (no Windows existe MySQL Server 8.0 instalado).**
8. **Documentação**: `ENDPOINTS.md` atualizado (rotas agora registradas, sem avisos ⚠️ antigos);
   `api/README.md` criado (setup local + Docker + testes).

## O que ainda NÃO está implementado (registrar como pendência — não fingir)

- OCR (upload → extração → revisão → confirmação): `ocrController.js` não existe.
  `ocrService.js` tem só extração. Requisitos RF08–RF13, RN09, RN17, RN18.
- Dashboard: `dashboardController.js` não existe (RF32, RN14).
- Despesas: `expenseController.js` não existe (RF25).
- Relatórios/exportação CSV: `reportController.js` não existe (RF37, RF38).
- Gerenciamento de usuários (promover/desativar): `userController.js` não existe
  (`requireAdmin` middleware já está pronto; 1º usuário vira ADMIN no register).
- Endpoints de atraso/inadimplência, recebíveis, juros/multa expostos, renovação:
  lógica existe em serviços (`financeiroService`) mas falta expor em endpoint/relatório.

## Como retomar em casa (próximos passos sugeridos)

### 1. Validar o stack Docker de verdade (o bloqueio é a porta 3306)
- Opção A: encerrar/parar o MySQL local do Windows, ou
- Opção B: mudar a porta do MySQL do compose para `3307:3306` e apontar `DB_PORT=3307`.
- Subir com segredo real: `docker compose up --build` (definir `JWT_SECRET` via `.env` na pasta `api/`).
- Aplicar o fluxo real ponta a ponta com curl/httpie:
  register → login → criar cliente → criar contrato (gera parcelas) → listar parcelas →
  registrar pagamento → conferir situação da parcela → conferir financeiro do contrato (recebido/pendente).
- Testar isolamento: 2º usuário não acessa dados do 1º (esperar 401/403/404).

### 2. Rodar a suíte
```bash
cd api
npm test            # tudo (69 testes hoje)
npm run dev
```

### 3. Antes da apresentação
- Registrar em `ENDPOINTS.md` qualquer rota nova.
- Preencher/explicar o fluxo "entrada → processamento → saída" dos endpoints do núcleo
  (cada controller: o que é, onde está, o que recebe, o que faz, o que retorna, como toca o banco).
- Deixar claras as pendências (OCR, dashboard, despesas, relatórios, user management).
