# ContractFlow — Requisitos do Projeto (Sprint 1)

> Documento formal de requisitos funcionais (RF), não funcionais (RNF) e regras de
> negócio (RN). Fonte da verdade para o código: cada item cita onde está implementado.
> Status possíveis: ✅ implementado · 🕓 parcial · ⏳ fora do escopo da Sprint 1 (registrado como pendência, não fingido).

---

## 1. Problema e solução

Pequenas e médias empresas controlam contratos, parcelas e recebimentos em planilhas
e controles manuais, sem visão confiável do que foi recebido, do que está pendente e
do que está em atraso.

O **ContractFlow** centraliza esse ciclo em uma plataforma única:

```text
cliente → contrato → parcelas automáticas → pagamentos → saldo/situação → histórico
```

com autenticação, isolamento de dados por usuário e regras financeiras auditáveis
(saldo sempre derivado de `parcelas − pagamentos`, nunca armazenado).

**Escopo do backend na Sprint 1 (10/09):** núcleo demonstrável acima + documentos e
histórico. OCR, dashboard, despesas, relatórios e gestão de usuários ficam como
pendências explícitas (seção 5).

---

## 2. Requisitos funcionais (RF)

| ID | Requisito | Status | Onde está |
|----|-----------|--------|-----------|
| RF01 | Cadastro de usuários (1º vira ADMIN) | ✅ | `authController.register` |
| RF02 | Login com JWT (8h) e bloqueio de desativado (403) | ✅ | `authController.login`, `authMiddleware` |
| RF03 | Controle de acesso por perfil (ADMIN/USUARIO) | 🕓 | `requireAdmin` pronto; falta `userController` |
| RF04 | Recuperação de senha | ⏳ | Opcional ("poderá") — fora da Sprint 1 |
| RF05 | Cadastro de clientes (CPF/CNPJ e email validados) | ✅ | `clientController.create` + `validators` |
| RF06 | Edição/exclusão de clientes (409 se tem contrato) | ✅ | `clientController.update/remove` (RN11) |
| RF07 | Cadastro de contratos vinculado a cliente existente | ✅ | `contractController.createContrato` (RN02) |
| RF08 | Upload de documento para OCR | 🕓 | multer pronto (`config/uploads`); falta rota+fluxo OCR |
| RF09 | Armazenamento de documento original do contrato | ✅ | `documentController.uploadDocumento` (tipo ORIGINAL) |
| RF10 | Extração de dados de PDF | 🕓 | `ocrService` pronto; falta controller/rota |
| RF11 | Extração de dados de imagem | 🕓 | `ocrService` pronto; falta controller/rota |
| RF12 | Revisão/correção dos dados extraídos | ⏳ | Falta rota de revisão do OCR |
| RF13 | Confirmação e criação do contrato via OCR | ⏳ | Nada é criado antes da confirmação (RN09/RN17) |
| RF14 | Geração automática de parcelas na criação do contrato | ✅ | `contratoService.criarContratoComParcelas` (transação) |
| RF15 | Cálculo de vencimentos mensais e valores (centavos na última) | ✅ | `contratoService.calcularVencimentos` |
| RF16 | Alteração de parcelas (data/valor/status com validações) | ✅ | `parcelaController.updateParcela` |
| RF17 | Registro de pagamentos (transação + recálculo + histórico) | ✅ | `paymentController.createPagamento` |
| RF18 | Saldo: valor total, recebido e pendente do contrato | ✅ | `financeiroService.getResumoContrato` |
| RF19 | Identificação de parcelas em atraso | 🕓 | Lógica pronta (`getParcelasEmAtraso`); falta endpoint |
| RF20 | Visão de inadimplência | 🕓 | Idem RF19 |
| RF21 | Histórico financeiro (pagamentos + parcelas) | ✅ | `listPagamentos` + `listParcelas` |
| RF22 | Cálculo de juros de parcela vencida | 🕓 | `financeiroService` pronto; falta expor em endpoint |
| RF23 | Cálculo de multa de parcela vencida | 🕓 | Idem RF22 |
| RF24 | Recebíveis (a receber) | ⏳ | Falta endpoint dedicado |
| RF25 | Despesas (CRUD) | ⏳ | Tabela `despesas` existe; falta controller |
| RF26 | Receitas (todos os pagamentos do usuário) | ✅ | `GET /api/pagamentos` (`paymentAllRoutes`) |
| RF27 | Saldo projetado | ⏳ | Fora da Sprint 1 |
| RF28 | Calculadora financeira | ⏳ | Frontend |
| RF29 | Calendário de vencimentos | ⏳ | Derivável de parcelas; falta endpoint |
| RF30 | Alertas de vencimento | ⏳ | Fora da Sprint 1 |
| RF31 | Alertas de atraso | ⏳ | Fora da Sprint 1 |
| RF32 | Dashboard de indicadores | ⏳ | Falta `dashboardController` (RN14) |
| RF33 | Pesquisa textual (clientes/contratos) | ✅ | `?q=` em `listClientes`/`listContratos` |
| RF34 | Filtros (status, cliente, período) | ✅ | `listContratos`, `listPagamentos`, `?filtro=` em parcelas |
| RF35 | Visualização de detalhes + download de documento | ✅ | `getContratoById`, `downloadDocumento` |
| RF36 | Histórico de eventos do contrato | ✅ | `historicoService` + `GET /:id/historico` |
| RF37 | Relatórios | ⏳ | Falta `reportController` |
| RF38 | Exportação (CSV; XLSX como melhoria futura) | ⏳ | Fora da Sprint 1 |
| RF39 | Notificações | ⏳ | Opcional — fora da Sprint 1 |
| RF40 | Alteração de status do contrato | ✅ | `PATCH /:id/status` |
| RF41 | Anexos ao contrato | ✅ | `documentController` (tipo ANEXO, ORIGINAL protegido) |
| RF42 | Renovação de contratos | ⏳ | Status `EM_RENOVACAO` existe; falta alerta de término (RN16) |

---

## 3. Requisitos não funcionais (RNF)

| ID | Requisito | Status | Onde está |
|----|-----------|--------|-----------|
| RNF01 | Segurança da API (auth, JWT, CORS, fail-fast) | ✅ | `authMiddleware`, `server.js`, `app.js` |
| RNF02 | Cadastro e identificação de usuários | ✅ | Tabela `usuarios`, RF01/RF02 |
| RNF03 | Proteção de segredos e credenciais | ✅ | bcrypt (custo 10), `JWT_SECRET` obrigatório e validado |
| RNF04 | Autorização e isolamento de dados por usuário | ✅* | Todas as queries filtram `usuario_id`; *falta `userController` p/ gestão |
| RNF05 | Privacidade (usuário nunca acessa dados de outro) | ✅ | Escopo por dono + documentos com ownership; coberto por testes |
| RNF06–RNF08 | Usabilidade, responsividade e mobile | ⏳ | Frontend (fora do backend) |
| RNF09–RNF12 | Desempenho, manutenibilidade e modularidade | ✅ | Serviços separados; índices `idx_*` nas FKs e datas |
| RNF13 | Integridade referencial e transacional | ✅ | FKs `ON DELETE RESTRICT`, CHECKs, transações (contrato+parcelas, pagamento) |
| RNF14 | Tratamento e clareza de erros | ✅ | `{ message }` + status adequados; sem vazamento interno (500 genérico) |
| RNF15 | Validação de entradas | ✅ | `utils/validators` (CPF/CNPJ, email, UF, datas, decimais) |
| RNF16 | Gestão de arquivos e uploads | ✅ | multer (MIME/ext/tamanho/UUID) + hash SHA-256 |
| RNF17 | Transparência do OCR (nível de confiança) | 🕓 | `ocrService` retorna confiança; falta expor em endpoint |
| RNF18 | Rastreabilidade da extração | 🕓 | Tabela `extracao_ocr` (PENDENTE/CONFIRMADA/CANCELADA); falta endpoint |
| RNF19–RNF20 | Consistência e acessibilidade | ⏳ | Frontend (fora do backend) |

---

## 4. Regras de negócio (RN)

| ID | Regra | Status | Onde está |
|----|-------|--------|-----------|
| RN01 | Um cliente pode ter vários contratos | ✅ | `clientes 1—* contratos` (schema + código) |
| RN02 | Contrato exige cliente existente (do próprio usuário) | ✅ | Validação em `createContrato` |
| RN03 | Um contrato tem várias parcelas | ✅ | `contratos 1—* parcelas` |
| RN04 | `data_vencimento` da parcela é obrigatória | ✅ | `NOT NULL` no schema |
| RN05 | Situações da parcela: PENDENTE/PAGA/VENCIDA/CANCELADA | ✅ | ENUM + `SITUACAO_SQL` |
| RN06 | Saldo sempre derivado de parcelas − pagamentos | ✅ | `financeiroService`; nenhum campo `saldo` armazenado |
| RN07 | Vencida sem pagamento = atraso | ✅ | `data_vencimento < hoje AND pago < valor` |
| RN08 | Juros/multa seguem a configuração do contrato | ✅ | `multa = valor×% (única)`; `juros = valor×%/30×dias` |
| RN09 | OCR gera sugestão; usuário revisa e confirma | 🕓 | Garantido no `ocrService`; fluxo de confirmação pendente |
| RN10 | Documento ORIGINAL associado e protegido (não excluível) | ✅ | `deleteDocumento` bloqueia ORIGINAL (400) |
| RN11 | Não remover dado financeiro importante | ✅ | Contrato com parcelas → 409; cliente com contrato → 409 |
| RN12 | Contrato ENCERRADO/CANCELADO não recebe novas parcelas | ✅ | `generateParcelas` bloqueia (400) |
| RN13 | Recebido ≠ a receber; pendente = parcelas − recebido | ✅ | `getResumoContrato` |
| RN14 | Dashboard usa apenas dados reais | ⏳ | A aplicar no `dashboardController` |
| RN15 | Vencimentos alimentam o calendário | ✅ | Derivado de `parcelas.data_vencimento` |
| RN16 | Alerta de término = `data_fim` próxima | ⏳ | Falta query/endpoint |
| RN17 | Nunca criar contrato direto do OCR sem confirmação | 🕓 | Idem RN09 |
| RN18 | Campos ausentes/errados do OCR são preenchidos/corrigidos pelo usuário | 🕓 | Idem RN09 |

---

## 5. Pendências assumidas (não implementadas na Sprint 1)

OCR completo, dashboard, despesas (controller), relatórios/exportação, gestão de usuários,
recebíveis, calendário, alertas e renovação. Itens de cálculo já prontos em serviço
(RF19/RF20/RF22/RF23) aguardam apenas exposição em endpoint.

## 6. Rastreabilidade código ↔ banco ↔ teste

- Núcleo validado ponta a ponta contra MySQL 8.0 real em 08/09 (ver `api/instrucoes.md`).
- Suíte Jest + Supertest: 69 testes (unit + integração com `db` simulado).
- Endpoints documentados em `ENDPOINTS.md`; modelo em `docs/DER.md`; schema em `api/database/schema.sql`.
