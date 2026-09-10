# CONTRACTFLOW ÔÇö INSTRU├ç├òES / RELAT├ôRIO DE ESTADO (para retomar em casa)

> Este arquivo cont├®m o prompt/escopo da miss├úo (Sprint 1) e o relat├│rio fiel do que
> j├í foi feito e do que falta, para voc├¬ retomar rapidamente sem re-auditar tudo.

---

# PARTE A ÔÇö PROMPT DA MISS├âO (escopo Sprint 1)

# CONTRACTFLOW ÔÇö PREPARA├ç├âO REAL PARA SPRINT 1 / AUDITORIA + IMPLEMENTA├ç├âO + EVID├èNCIAS

Voc├¬ est├í entrando em um projeto j├í em desenvolvimento e precisa trabalhar diretamente no c├│digo atual.

O projeto ├® o **ContractFlow**, um sistema de gest├úo de contratos para pequenas e m├®dias empresas.

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
- Bazon ÔÇö Backend
- Renan + Jo├úo ÔÇö Web
- Ulisses + Eduardo ÔÇö Mobile

GitHub: https://github.com/GuiBazon/contractflow

NESTE REPO a estrutura real ├® `api/`, `web/`, `mobile/` (n├úo `backend/front/mobile`).
N├úo renomear ÔÇö decis├úo de equipe.

## Contexto cr├¡tico: Sprint 1 (entrega 10/09)

A rubrica avalia: Documenta├º├úo (5), Figma (5), Banco de Dados (5), Trello (5),
Sistema funcionando (25), Conhecimento t├®cnico individual (25), Evid├¬ncias de
participa├º├úo (15), Integra├º├úo Web/Mobile Ôåö API Ôåö Regra de neg├│cio Ôåö Banco (15).

Prioridade do Bazon (backend): deixar um n├║cleo demonstr├ível e explic├ível:

```text
Autentica├º├úo ÔåÆ Cliente ÔåÆ Contrato ÔåÆ Parcelas ÔåÆ Pagamento ÔåÆ Saldo/Situa├º├úo ÔåÆ Hist├│rico
```

Regras que precisam ser respeitadas (resumo):
- cliente: v├írios contratos; contrato precisa de cliente; CPF/CNPJ e email validados;
  isolamento por usu├írio; cliente com contrato n├úo ├® exclu├¡do.
- contrato: pertence a cliente; parcelas geradas automaticamente; vencimentos coerentes;
  altera├º├Áes sens├¡veis respeitam pagamentos existentes. Status: ATIVO/PENDENTE/ENCERRADO/CANCELADO/EM_RENOVACAO.
- parcela: situa├º├Áes PENDENTE/PAGA/VENCIDA/CANCELADA; prioridade CANCELADA > PAGA > VENCIDA > PENDENTE.
- pagamento: pertence a parcela v├ílida; parcela cancelada n├úo recebe pagamento;
  n├úo ultrapassa o valor; atualiza situa├º├úo; reflete em recebido/saldo.
- documento: tipos/tamanhos permitidos; associa├º├úo ao contrato; ownership; ORIGINAL n├úo ├® exclu├¡do.
- N├âO inventar regras novas (ex.: pagamento parcial como regra oficial, m├│dulo de auditoria).

Testes: Jest + Supertest; testes devem EXPOR bugs (n├úo maquiar) e n├úo fingir funcionalidade inexistente.

Docker: s├│ depois do backend essencial funcionando. Estabilidade > arquitetura.

Git: commits reais e separados logicamente, sem inflar quantidade.

# PARTE B ÔÇö RELAT├ôRIO DE ESTADO ATUAL (fiel ao c├│digo)

## O que foi feito (sess├Áes anteriores + esta)

1. **Auditoria real** ÔÇö s├│ `auth` e `clientes` estavam registrados em `routes/index.js`;
   `contratos/parcelas/pagamentos/documentos` tinham controllers prontos mas N├âO estavam
   nas rotas. **Confirmado e corrigido.**
2. **Base path padr├úo** ÔÇö `app.js` mount em `/api` (CORS configur├ível, `express.json({limit:'1mb'})`,
   404 handler, error handler que N├âO vaza `err.message`).
3. **`server.js` fail-fast** ÔÇö exige DB_*/JWT_SECRET, rejeita segredos fracos, porta default 8080.
4. **Rotas criadas/registradas**:
   - `api/src/routes/contractRoutes.js` (contratos + parcelas + pagamentos + documentos aninhados)
   - `api/src/routes/paymentAllRoutes.js` (`GET /api/pagamentos`)
   - `api/src/routes/index.js` monta `/auth`, `/clientes`, `/contratos`, `/pagamentos`
5. **Bugs corrigidos**:
   - `contractController.updateContrato`: `contrato.parcelas_pagas` era `undefined` (n├úo vinha de
     `obterContratoDono`) ÔåÆ trocado por `hasPayments()` no guard "n├úo alterar numero ap├│s pagamentos".
   - `contractController.generateParcelas`: `valor_parcela` agora ├® obrigat├│rio (>0), em vez de zerado.
   - removido import n├úo usado `validarDados`.
6. **Testes (Jest + Supertest)** ÔÇö **69/69 passando** (5 suites):
   - unit: `validators`, `contratoService`, `financeiroService`, `ocrService` (51 testes)
   - integra├º├úo: `tests/integration/api.test.js` (18 testes) ÔÇö rotas reais + DB simulado via
     `jest.mock('../../src/config/db')`. Cobre: health, 401 sem token, token sem Bearer 401 / com
     Bearer passa, 404, register validation, isolamento por usu├írio em clientes e contratos (404),
     financeiro, pagamento em parcela cancelada 400, pagamento que excede 400, pagamento v├ílido 201
     (parcela quitada), gerar parcelas em contrato encerrado 400, gerar parcelas sem valor 400,
     alterar numero ap├│s pagamento 400, deletar documento ORIGINAL 400, status inv├ílido 400.
7. **Docker** (criado; build OK, subida local bloqueada):
   - `api/Dockerfile` (node:20-alpine, npm ci --omit=dev, porta 8080)
   - `api/compose.yaml` (MySQL 8 + API, schema auto no 1┬║ boot via `docker-entrypoint-initdb.d`,
     volumes `db_data` e `uploads_data`, healthcheck, `JWT_SECRET` obrigat├│rio)
   - `api/.dockerignore`
   - **Build da imagem testado e OK** (`docker build` passou).
   - `docker compose up` **falhou ao expor porta 3306** ÔÇö "bind: normalmente ├® permitida apenas uma
     utiliza├º├úo de cada endere├ºo de soquete". **Causa prov├ível: um MySQL local j├í est├í na 3306
     (no Windows existe MySQL Server 8.0 instalado).**
8. **Documenta├º├úo**: `docs/ENDPOINTS.md` atualizado (rotas agora registradas, sem avisos ÔÜá´©Å antigos);
   `api/README.md` criado (setup local + Docker + testes).

## O que ainda N├âO est├í implementado (registrar como pend├¬ncia ÔÇö n├úo fingir)

- OCR (upload ÔåÆ extra├º├úo ÔåÆ revis├úo ÔåÆ confirma├º├úo): `ocrController.js` n├úo existe.
  `ocrService.js` tem s├│ extra├º├úo. Requisitos RF08ÔÇôRF13, RN09, RN17, RN18.
- Dashboard: `dashboardController.js` n├úo existe (RF32, RN14).
- Despesas: `expenseController.js` n├úo existe (RF25).
- Relat├│rios/exporta├º├úo CSV: `reportController.js` n├úo existe (RF37, RF38).
- Gerenciamento de usu├írios (promover/desativar): `userController.js` n├úo existe
  (`requireAdmin` middleware j├í est├í pronto; 1┬║ usu├írio vira ADMIN no register).
- Endpoints de atraso/inadimpl├¬ncia, receb├¡veis, juros/multa expostos, renova├º├úo:
  l├│gica existe em servi├ºos (`financeiroService`) mas falta expor em endpoint/relat├│rio.

## Como retomar em casa (pr├│ximos passos sugeridos)

### 1. Valida├º├úo real contra MySQL (08/09 ÔÇö FEITA Ô£à, containers removidos ap├│s o teste)

- Subiu MySQL 8.0 + API em rede Docker isolada **sem portas no host** (o MySQL local ocupa a
  3306; containers `cf-db`/`cf-api` removidos depois, nada ficou no repo).
- Schema aplicado do zero via `database/schema.sql`: 9 tabelas OK.
- **Bug real encontrado e corrigido**: `SITUACAO_SQL` referenciava `pg_sum.valor` sem o JOIN
  existir no `listParcelas` ÔåÆ `Unknown column 'pg_sum.valor'` no banco real (o teste mockado
  n├úo pegava). Corrigido com subquery correlata autocontida em `financeiroService.js`.
- Fluxo E2E real **13/14 PASS** (o 1 "FAIL" era expectativa errada do script: parcelas com
  vencimento passado ficam VENCIDA por regra ÔÇö correto):
  register (1┬║=ADMIN) ÔåÆ login ÔåÆ 401 sem token ÔåÆ cliente ÔåÆ contrato (gera 2 parcelas) ÔåÆ
  pagamento integral ÔåÆ parcela PAGA ÔåÆ financeiro recebido=500/pendente=500 ÔåÆ hist├│rico (2 eventos) ÔåÆ
  pagamento excedente 400 ÔåÆ usu├írio B (USUARIO) n├úo v├¬ contrato de A (404) e lista 0 clientes.
- Extras reais: gerar parcela futura ÔåÆ PENDENTE; filtros `?filtro=VENCIDA/PENDENTE` OK;
  `GET /api/pagamentos` OK; upload ANEXO 201 ÔåÆ listar ÔåÆ excluir anexo 200; hash SHA-256 gravado.
- Su├¡te Jest ap├│s a corre├º├úo: **69/69 passando**.
- Nota de infra (n├úo ├® c├│digo): o `docker compose up` padr├úo conflita com o MySQL local na
  porta 3306 ÔåÆ para validar, mapear o host para outra porta (ex.: `3307:3306`) ou parar o
  MySQL local. A API dentro do compose continua usando `db:3306` (n├úo precisa mudar `DB_PORT`).

### 2. Rodar a su├¡te
```bash
cd api
npm test            # tudo (69 testes hoje)
npm run dev
```

### 3. Antes da apresenta├º├úo
- Registrar em `docs/ENDPOINTS.md` qualquer rota nova.
- Preencher/explicar o fluxo "entrada ÔåÆ processamento ÔåÆ sa├¡da" dos endpoints do n├║cleo
  (cada controller: o que ├®, onde est├í, o que recebe, o que faz, o que retorna, como toca o banco).
- Deixar claras as pend├¬ncias (OCR, dashboard, despesas, relat├│rios, user management).
