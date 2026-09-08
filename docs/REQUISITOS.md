# ContractFlow — Requisitos do Projeto (Sprint 1)

> Espelho versionado do documento oficial da equipe no Notion (mesmos requisitos,
> mesma ordem, mesmas prioridades). Acrescenta apenas as colunas **Status** e
> **Onde está** para rastreabilidade ao código.
> Status: ✅ implementado · 🕓 parcial · ⏳ fora do escopo da Sprint 1 (pendência assumida, não fingida).

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

O contrato é o elemento central: a partir dele se organizam cliente, valores,
parcelas, vencimentos, pagamentos e situação financeira. O diferencial planejado é o
OCR (upload de PDF/imagem com extração e conferência antes da criação definitiva),
além de dashboard, calendário e controle de recebíveis.

**Escopo do backend na Sprint 1 (10/09):** núcleo demonstrável acima + documentos e
histórico. OCR completo, dashboard, despesas (controller), relatórios, gestão de
usuários, calendário e alertas ficam como pendências explícitas (seção 5).

---

## 2. Requisitos funcionais (RF)

| ID | Requisito | Prioridade | Status | Onde está |
|----|-----------|------------|--------|-----------|
| RF01 | Cadastro de usuários (nome, e-mail, senha; 1º vira ADMIN) | ALTA | ✅ | `authController.register` |
| RF02 | Login com e-mail e senha (JWT 8h; 403 se desativado) | ALTA | ✅ | `authController.login`, `authMiddleware` |
| RF03 | Controle de acesso por permissões | ALTA | 🕓 | `requireAdmin` pronto; falta `userController` |
| RF04 | Recuperação de senha | MÉDIA | ⏳ | Opcional ("poderá") — fora da Sprint 1 |
| RF05 | Cadastro de clientes (nome/razão, CPF/CNPJ, e-mail, telefone, endereço, obs.) | ALTA | ✅ | `clientController.create` + `validators` |
| RF06 | Consulta de clientes (pesquisar, visualizar, editar) | ALTA | ✅ | `listClientes`, `getClienteById`, `updateCliente`, `removeCliente` |
| RF07 | Cadastro de contratos (cliente, número, tipo, valor, datas, pagamento, parcelas, vencimentos, obs.) | ALTA | ✅ | `contractController.createContrato` (RN02) |
| RF08 | Upload de contratos (PDF e imagens) | ALTA | 🕓 | multer pronto (`config/uploads`); falta rota+fluxo OCR |
| RF09 | Armazenamento do documento original associado ao contrato | ALTA | ✅ | `documentController.uploadDocumento` (tipo ORIGINAL) |
| RF10 | Leitura automática de documentos (OCR de texto) | ALTA | 🕓 | `ocrService` pronto; falta controller/rota |
| RF11 | Extração automática de informações (cliente, valor, datas, parcelas, vencimentos, pagamento) | ALTA | 🕓 | `ocrService` pronto; falta controller/rota |
| RF12 | Revisão dos dados extraídos (visualizar e corrigir) | ALTA | ⏳ | Falta rota de revisão do OCR |
| RF13 | Confirmação da importação antes da criação definitiva | ALTA | ⏳ | Nada é criado antes da confirmação (RN09/RN17) |
| RF14 | Geração automática de parcelas | ALTA | ✅ | `contratoService.criarContratoComParcelas` (transação) |
| RF15 | Geração de vencimentos (mensais; centavos na última) | ALTA | ✅ | `contratoService.calcularVencimentos` |
| RF16 | Alteração de parcelas (com validações) | MÉDIA | ✅ | `parcelaController.updateParcela` |
| RF17 | Registro de pagamentos (data, valor, forma, parcela, obs.) | ALTA | ✅ | `paymentController.createPagamento` |
| RF18 | Atualização do saldo (recebido e restante) | ALTA | ✅ | `financeiroService.getResumoContrato` |
| RF19 | Controle de parcelas em atraso | MÉDIA | 🕓 | Lógica pronta (`getParcelasEmAtraso`); falta endpoint |
| RF20 | Controle de inadimplência | MÉDIA | 🕓 | Idem RF19 |
| RF21 | Histórico financeiro (vencimentos, juros, multas, pagamentos) | MÉDIA | ✅ | `listPagamentos` + `listParcelas` |
| RF22 | Cálculo de juros | MÉDIA | 🕓 | `financeiroService` pronto; falta expor em endpoint |
| RF23 | Cálculo de multas | MÉDIA | 🕓 | Idem RF22 |
| RF24 | Controle de recebíveis (recebidos, pendentes, atrasados) | MÉDIA | ⏳ | Falta endpoint dedicado |
| RF25 | Controle de despesas | MÉDIA | ⏳ | Tabela `despesas` existe; falta controller |
| RF26 | Controle de receitas (pagamentos registrados) | MÉDIA | ✅ | `GET /api/pagamentos` (`paymentAllRoutes`) |
| RF27 | Saldo projetado | MÉDIA | ⏳ | Fora da Sprint 1 |
| RF28 | Calculadora financeira | MÉDIA | ⏳ | Frontend |
| RF29 | Calendário financeiro | ALTA | ⏳ | Derivável de parcelas; falta endpoint |
| RF30 | Alertas de vencimento | MÉDIA | ⏳ | Fora da Sprint 1 |
| RF31 | Alertas de atraso | MÉDIA | ⏳ | Fora da Sprint 1 |
| RF32 | Dashboard (ativos, clientes, a receber, recebido, atraso, vencimentos, receitas, despesas, projeção) | ALTA | ⏳ | Falta `dashboardController` (RN14) |
| RF33 | Pesquisa (contratos, clientes, documentos) | MÉDIA | ✅ | `?q=` em clientes/contratos |
| RF34 | Filtros (período, cliente, contrato, status, situação) | MÉDIA | ✅ | `listContratos`, `listPagamentos`, `?filtro=` em parcelas |
| RF35 | Visualização do contrato + documento original | ALTA | ✅ | `getContratoById`, `downloadDocumento` |
| RF36 | Histórico do contrato | MÉDIA | ✅ | `historicoService` + `GET /:id/historico` |
| RF37 | Relatórios | MÉDIA | ⏳ | Falta `reportController` |
| RF38 | Exportação (XLSX e CSV) | MÉDIA | ⏳ | Fora da Sprint 1 |
| RF39 | Notificações | MÉDIA | ⏳ | Opcional — fora da Sprint 1 |
| RF40 | Status de contrato (Ativo, Encerrado, Cancelado, Pendente, Em Renovação) | ALTA | ✅ | `PATCH /:id/status` |
| RF41 | Anexos ao contrato | MÉDIA | ✅ | `documentController` (ANEXO; ORIGINAL protegido) |
| RF42 | Renovação de contrato (alerta + registro) | BAIXA | ⏳ | Status `EM_RENOVACAO` existe; falta alerta (RN16) |

---

## 3. Requisitos não funcionais (RNF)

| ID | Requisito | Prioridade | Status | Onde está |
|----|-----------|------------|--------|-----------|
| RNF01 | Segurança (proteção contra acessos não autorizados) | ALTA | ✅ | `authMiddleware`, CORS, fail-fast, isolamento |
| RNF02 | Senhas (hash, nunca texto puro) | ALTA | ✅ | bcrypt (custo 10) |
| RNF03 | Autenticação (tokens e sessão) | ALTA | ✅ | JWT 8h + fail-fast de `JWT_SECRET` |
| RNF04 | Controle de permissões | ALTA | ✅* | `requireAdmin` + 1º usuário ADMIN; *falta `userController` p/ gestão |
| RNF05 | Privacidade (isolamento por usuário, ownership) | ALTA | ✅ | Todas as queries filtram `usuario_id`; coberto por testes |
| RNF06 | Usabilidade (interface intuitiva) | ALTA | ⏳ | Frontend (fora do backend) |
| RNF07 | Responsividade (web em várias telas) | ALTA | ⏳ | Frontend |
| RNF08 | Compatibilidade mobile | MÉDIA | ⏳ | App (fora do backend) |
| RNF09 | Desempenho (consultas eficientes) | ALTA | ✅ | Índices `idx_*`; sem N+1 no núcleo |
| RNF10 | Disponibilidade | MÉDIA | 🕓 | Compose com `restart` + healthcheck; sem SLA definido |
| RNF11 | Manutenibilidade (código organizado) | MÉDIA | ✅ | Camadas routes/controllers/services/utils |
| RNF12 | Modularidade (usuários, clientes, contratos, financeiro, OCR) | MÉDIA | ✅ | Serviços com responsabilidades definidas |
| RNF13 | Integridade dos dados | ALTA | ✅ | FKs `ON DELETE RESTRICT`, CHECKs, transações |
| RNF14 | Tratamento de erros (mensagens claras) | ALTA | ✅ | `{ message }` + status; 500 sem vazar detalhes |
| RNF15 | Validação (e-mail, CPF/CNPJ, valores, datas) | ALTA | ✅ | `utils/validators` |
| RNF16 | Controle de arquivos (formatos e tamanhos) | ALTA | ✅ | multer (MIME/ext/10MB/UUID) + SHA-256 |
| RNF17 | OCR (informar quando não identificar / baixa confiança) | ALTA | 🕓 | `ocrService` retorna confiança; falta expor em endpoint |
| RNF18 | Transparência da automação (revisão antes da confirmação) | ALTA | 🕓 | Tabela `extracao_ocr`; fluxo de confirmação pendente |
| RNF19 | Consistência visual | MÉDIA | ⏳ | Frontend |
| RNF20 | Acessibilidade | MÉDIA | ⏳ | Frontend |

---

## 4. Regras de negócio (RN)

| ID | Regra | Prioridade | Status | Onde está |
|----|-------|------------|--------|-----------|
| RN01 | Um cliente pode possuir vários contratos | ALTA | ✅ | `clientes 1—* contratos` |
| RN02 | Todo contrato exige um cliente existente (do próprio usuário) | ALTA | ✅ | Validação em `createContrato` |
| RN03 | Um contrato pode possuir várias parcelas | ALTA | ✅ | `contratos 1—* parcelas` |
| RN04 | Toda parcela tem data de vencimento | ALTA | ✅ | `NOT NULL` no schema |
| RN05 | Parcela: pendente, paga, vencida ou cancelada | ALTA | ✅ | ENUM + `SITUACAO_SQL` (CANCELADA > PAGA > VENCIDA > PENDENTE) |
| RN06 | Saldo considera os pagamentos registrados (derivado, nunca armazenado) | ALTA | ✅ | `financeiroService` |
| RN07 | Vencida e não paga = atraso | ALTA | ✅ | `data_vencimento < hoje AND pago < valor` |
| RN08 | Juros e multas seguem as regras do contrato | MÉDIA | ✅ | `multa = valor×% (única)`; `juros = valor×%/30×dias` |
| RN09 | Dados do OCR só viram contrato após conferência e confirmação | ALTA | 🕓 | Garantido no `ocrService`; fluxo pendente |
| RN10 | Documento original permanece associado ao contrato | ALTA | ✅ | Exclusão de ORIGINAL bloqueada (400) |
| RN11 | Financeiro importante não é excluído sem controle | ALTA | ✅ | Contrato com parcelas → 409; cliente com contrato → 409 |
| RN12 | Contrato encerrado não gera novas parcelas | ALTA | ✅ | `generateParcelas` bloqueia ENCERRADO/CANCELADO (400) |
| RN13 | Diferenciar recebidos e a receber | ALTA | ✅ | `getResumoContrato` |
| RN14 | Dashboard usa dados registrados no sistema | ALTA | ⏳ | A aplicar no `dashboardController` |
| RN15 | Vencimentos alimentam o calendário | ALTA | ✅ | Derivado de `parcelas.data_vencimento` |
| RN16 | Contratos próximos do término podem gerar alertas | MÉDIA | ⏳ | Falta query/endpoint |
| RN17 | OCR não substitui a conferência (sugestões até confirmar) | ALTA | 🕓 | Idem RN09 |
| RN18 | Campos não identificados ficam disponíveis p/ preenchimento manual | ALTA | 🕓 | Idem RN09 |

---

## 5. Pendências assumidas (não implementadas na Sprint 1)

OCR completo (RF08/10–13), calendário (RF29, ALTA), dashboard (RF32, ALTA),
despesas (controller), relatórios/exportação, gestão de usuários, recebíveis,
alertas e renovação. Cálculos prontos em serviço (RF19/20/22/23) aguardam só
exposição em endpoint. As pendências ALTA são declaradas como limitações na
apresentação (a rubrica avalia isso explicitamente).

## 6. Rastreabilidade código ↔ banco ↔ teste

- Núcleo validado ponta a ponta contra MySQL 8.0 real em 08/09 (ver `api/instrucoes.md`).
- Suíte Jest + Supertest: 69 testes (unit + integração com `db` simulado).
- Endpoints em `ENDPOINTS.md`; modelo em `docs/DER.md`; schema em `api/database/schema.sql`;
  seed demo em `api/database/seed.sql`.
