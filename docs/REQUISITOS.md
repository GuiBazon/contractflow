# ContractFlow — Requisitos e evidências do backend (Sprint 2)

> Requisitos, ordem e prioridades preservados da cópia versionada do Notion.
> O Notion atual não foi verificado: o endereço informado recebeu 403 no ambiente.
> Status desta branch: ✅ entregue/testado na API; 🕓 cobertura parcial ou validação
> pendente; ⏳ responsabilidade de interface ainda sem validação integrada.
> **API entregue não significa requisito demonstrado nas telas Web/Mobile.**
> Contratos de integração: [API da Sprint 2](API_SPRINT_2.md).
> Evidências e dependências: [Entrega do backend](ENTREGA_SPRINT_2.md).

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
parcelas, vencimentos, pagamentos e situação financeira. O diferencial implementado no backend é o
OCR (upload de PDF/imagem com extração e conferência antes da criação definitiva),
além de dashboard, calendário e controle de recebíveis.

**Escopo implementado na Sprint 2:** núcleo financeiro, documentos, OCR com
revisão/confirmação, recebíveis, despesas, dashboard, calendário, alertas em tela,
relatórios CSV/XLSX, gestão de usuários, calculadora e renovação. Interfaces e
validação do produto completo continuam sob responsabilidade conjunta da equipe.

---

## 2. Requisitos funcionais (RF)

| ID | Requisito | Prioridade | Status | Onde está |
|----|-----------|------------|--------|-----------|
| RF01 | Cadastro de usuários (nome, e-mail, senha; 1º vira ADMIN) | ALTA | ✅ | `authController.register`; bootstrap concorrente verificado em `tests/mysql/auth.test.js` |
| RF02 | Login com e-mail e senha (JWT 8h; 403 se desativado) | ALTA | ✅ | `authController.login` + JWT/estado atual da sessão; `tests/mysql/auth.test.js` |
| RF03 | Controle de acesso por permissões | ALTA | ✅ | `requireAdmin`, `userController`, revogação de sessão e proteção do último ADMIN |
| RF04 | Recuperação de senha | MÉDIA | 🕓 | Redefinição autenticada em `PATCH /auth/password`; recuperação sem login/e-mail não entregue (opcional) |
| RF05 | Cadastro de clientes (nome/razão, CPF/CNPJ, e-mail, telefone, endereço, obs.) | ALTA | ✅ | `clientController.createCliente`; CPF/CNPJ, e-mail e limites de campos |
| RF06 | Consulta de clientes (pesquisar, visualizar, editar) | ALTA | ✅ | CRUD/pesquisa de clientes; `tests/mysql/crud.test.js` |
| RF07 | Cadastro de contratos (cliente, número, tipo, valor, datas, pagamento, parcelas, vencimentos, obs.) | ALTA | ✅ | Criação/edição transacional; redistribuição antes de pagamentos; `crud.test.js` |
| RF08 | Upload de contratos (PDF e imagens) | ALTA | ✅ | `POST /ocr/extract`; PDF/JPEG/PNG/WebP até 10 MB; `ocr.test.js` |
| RF09 | Armazenamento do documento original associado ao contrato | ALTA | ✅ | Documento ORIGINAL e hash; confirmação do OCR/download; `ocr.test.js` e `crud.test.js` |
| RF10 | Leitura automática de documentos (OCR de texto) | ALTA | ✅ | PDF textual e OCR português de imagem/PDF escaneado; três fixtures reais em `ocr.test.js` |
| RF11 | Extração automática de informações (cliente, valor, datas, parcelas, vencimentos, pagamento) | ALTA | ✅ | `ocrService.extrairDados`; heurísticas de campos, sempre sujeitas a revisão |
| RF12 | Revisão dos dados extraídos (visualizar e corrigir) | ALTA | ✅ | `PATCH /ocr/:id` com `dados`; persiste revisão sem criar contrato |
| RF13 | Confirmação da importação antes da criação definitiva | ALTA | ✅ | Confirmação transacional, lock contra duplicação e compensação de arquivo; `ocr.test.js` |
| RF14 | Geração automática de parcelas | ALTA | ✅ | `contratoService.criarContratoComParcelas`; confirmação OCR e renovação reutilizam o serviço |
| RF15 | Geração de vencimentos (mensais; centavos na última) | ALTA | ✅ | Centavos na última parcela, mês curto/dia-base; `contratoService.test.js` e `extensions.test.js` |
| RF16 | Alteração de parcelas (com validações) | MÉDIA | ✅ | `updateParcela`: data, valor/saldo/total e status validado; `crud.test.js` |
| RF17 | Registro de pagamentos (data, valor, forma, parcela, obs.) | ALTA | ✅ | Pagamento com lock contrato → parcela; oito pedidos concorrentes sem ultrapassar saldo |
| RF18 | Atualização do saldo (recebido e restante) | ALTA | ✅ | Saldos derivados de pagamentos reais; `core.test.js`, `finance.test.js` |
| RF19 | Controle de parcelas em atraso | MÉDIA | ✅ | `GET /recebiveis?situacao=VENCIDA`; saldo líquido do pagamento parcial |
| RF20 | Controle de inadimplência | MÉDIA | ✅ | Resumo de atraso e listagem por cliente/contrato; `/recebiveis` e `/alertas` |
| RF21 | Histórico financeiro (vencimentos, juros, multas, pagamentos) | MÉDIA | ✅ | Pagamentos/parcelas/histórico; encargos estimados por consulta, sem cobrança automática |
| RF22 | Cálculo de juros | MÉDIA | ✅ | `calcJurosMulta` sobre principal pendente; estimativa em recebíveis/calculadora |
| RF23 | Cálculo de multas | MÉDIA | ✅ | Multa única estimada sobre saldo atrasado; taxas do contrato |
| RF24 | Controle de recebíveis (recebidos, pendentes, atrasados) | MÉDIA | ✅ | `GET /recebiveis`; filtros, paginação e totais sobre todo o conjunto |
| RF25 | Controle de despesas | MÉDIA | ✅ | CRUD `/despesas`; protege financeiro pago; `finance.test.js` |
| RF26 | Controle de receitas (pagamentos registrados) | MÉDIA | ✅ | `GET /receitas` e alias `/pagamentos`; filtros de data, cliente e contrato |
| RF27 | Saldo projetado | MÉDIA | ✅ | `calcularProjecao` usado pelo dashboard e simulador; sem saldo bancário inicial |
| RF28 | Calculadora financeira | MÉDIA | ✅ | `POST /calculadora/parcelas`, `/saldo`, `/projecao`; Mobile ainda precisa alinhar regras |
| RF29 | Calendário financeiro | ALTA | ✅ | `GET /calendario`; vencimentos abertos, pagamentos, despesas, término; `analytics.test.js` |
| RF30 | Alertas de vencimento | MÉDIA | ✅ | `GET /alertas`; próximos vencimentos; consumo nas telas pendente |
| RF31 | Alertas de atraso | MÉDIA | ✅ | `GET /alertas`; atraso sobre saldo em aberto, exclui quitadas/canceladas |
| RF32 | Dashboard (ativos, clientes, a receber, recebido, atraso, vencimentos, receitas, despesas, projeção) | ALTA | ✅ | `GET /dashboard`; agregação real, teste com 125 pagamentos e saldo parcial |
| RF33 | Pesquisa (contratos, clientes, documentos) | MÉDIA | ✅ | Busca `q` em clientes, contratos e documentos; `/documentos` paginado |
| RF34 | Filtros (período, cliente, contrato, status, situação) | MÉDIA | ✅ | Filtros/paginação validados em listagens, recebíveis, calendário e relatórios |
| RF35 | Visualização do contrato + documento original | ALTA | ✅ | Detalhe financeiro e download validado por dono e contrato; `crud.test.js` |
| RF36 | Histórico do contrato | MÉDIA | ✅ | `GET /contratos/:id/historico`; eventos de criação, edição, pagamento, documentos e renovação |
| RF37 | Relatórios | MÉDIA | ✅ | `GET /relatorios/:tipo`; financeiro, recebíveis, receitas, despesas e contratos |
| RF38 | Exportação (XLSX e CSV) | MÉDIA | ✅ | CSV/XLSX com todos os resultados filtrados até 10000; round-trip XLSX e proteção de fórmulas |
| RF39 | Notificações | MÉDIA | ✅ | `/notificacoes` alias de alertas derivados; sem push/e-mail/estado de leitura |
| RF40 | Status de contrato (Ativo, Encerrado, Cancelado, Pendente, Em Renovação) | ALTA | ✅ | Status validado e histórico atômico; `updateContratoStatus` |
| RF41 | Anexos ao contrato | MÉDIA | ✅ | Upload/busca/download/exclusão de anexos; conteúdo/10 MB/vínculo testados |
| RF42 | Renovação de contrato (alerta + registro) | BAIXA | ✅ | Alerta de término + `POST /contratos/:id/renovar`; registro atômico e históricos relacionados |

---

## 3. Requisitos não funcionais (RNF)

| ID | Requisito | Prioridade | Status | Onde está |
|----|-----------|------------|--------|-----------|
| RNF01 | Segurança (proteção contra acessos não autorizados) | ALTA | ✅ | Autenticação/permissões, consultas parametrizadas e isolamento; audit de produção com zero alertas |
| RNF02 | Senhas (hash, nunca texto puro) | ALTA | ✅ | bcrypt custo 10; nenhum hash em respostas de usuários |
| RNF03 | Autenticação (tokens e sessão) | ALTA | ✅ | JWT 8h, estado/versão da sessão verificados no banco e logout/troca de senha com revogação |
| RNF04 | Controle de permissões | ALTA | ✅ | ADMIN/USUARIO, último ADMIN protegido; permissões atuais prevalecem sobre o JWT |
| RNF05 | Privacidade (isolamento por usuário, ownership) | ALTA | ✅ | Financeiro e documentos isolados por proprietário, inclusive para ADMIN; cenários MySQL |
| RNF06 | Usabilidade (interface intuitiva) | ALTA | ⏳ | Interface; validar fluxos e mensagens com a equipe Web/Mobile |
| RNF07 | Responsividade (web em várias telas) | ALTA | ⏳ | Interface Web; testes de responsividade pendentes |
| RNF08 | Compatibilidade mobile | MÉDIA | 🕓 | Rotas/payloads compatíveis preservados; dispositivo físico e integração final não validados |
| RNF09 | Desempenho (consultas eficientes) | ALTA | 🕓 | Índices e agregações no SQL, totais além da primeira página testados; sem ensaio de carga/SLA |
| RNF10 | Disponibilidade | MÉDIA | 🕓 | Docker e setup cloud reproduzíveis; disponibilidade de implantação não avaliada |
| RNF11 | Manutenibilidade (código organizado) | MÉDIA | ✅ | Camadas e testes organizados; CI e documentação de contratos/evidências |
| RNF12 | Modularidade (usuários, clientes, contratos, financeiro, OCR) | MÉDIA | ✅ | Módulos routes/controllers/services/utils com reutilização das regras financeiras |
| RNF13 | Integridade dos dados | ALTA | ✅ | FKs/CHECKs, transações, locks ordenados, migração aditiva e compensação dos arquivos |
| RNF14 | Tratamento de erros (mensagens claras) | ALTA | ✅ | Erros 400/401/403/404/409/413/429; 500 sem detalhes internos; handlers assíncronos |
| RNF15 | Validação (e-mail, CPF/CNPJ, valores, datas) | ALTA | ✅ | CPF/CNPJ, e-mail, campos, dinheiro, IDs, datas reais, períodos e paginação |
| RNF16 | Controle de arquivos (formatos e tamanhos) | ALTA | ✅ | MIME/extensão/assinatura, 10 MB, UUID e hash; limpeza de uploads inválidos |
| RNF17 | OCR (informar quando não identificar / baixa confiança) | ALTA | ✅ | Avisos de texto insuficiente e confiança heurística; erros de arquivo e infraestrutura informados |
| RNF18 | Transparência da automação (revisão antes da confirmação) | ALTA | ✅ | Extração PENDENTE e confirmação explícita; nenhuma criação durante leitura/revisão |
| RNF19 | Consistência visual | MÉDIA | ⏳ | Interfaces; avaliar consistência Web/Mobile com o Figma |
| RNF20 | Acessibilidade | MÉDIA | ⏳ | Interfaces; validar acessibilidade do produto final |

---

## 4. Regras de negócio (RN)

| ID | Regra | Prioridade | Status | Onde está |
|----|-------|------------|--------|-----------|
| RN01 | Um cliente pode possuir vários contratos | ALTA | ✅ | FK cliente → contratos e renovação do mesmo cliente |
| RN02 | Todo contrato exige um cliente existente (do próprio usuário) | ALTA | ✅ | Cliente obrigatório e próprio, validado no serviço reutilizado pelo OCR/renovação |
| RN03 | Um contrato pode possuir várias parcelas | ALTA | ✅ | Contrato → parcelas; geração/replanejamento/extras controlados |
| RN04 | Toda parcela tem data de vencimento | ALTA | ✅ | Data NOT NULL e validação de datas reais na API |
| RN05 | Parcela: pendente, paga, vencida ou cancelada | ALTA | ✅ | Situação calculada: CANCELADA → PAGA → VENCIDA → PENDENTE |
| RN06 | Saldo considera os pagamentos registrados (derivado, nunca armazenado) | ALTA | ✅ | Saldo derivado de valores/pagamentos reais; locks impedem sobrepagamento concorrente |
| RN07 | Vencida e não paga = atraso | ALTA | ✅ | Vencimento anterior a hoje e saldo positivo; pagamento parcial descontado |
| RN08 | Juros e multas seguem as regras do contrato | MÉDIA | ✅ | Juros mensais proporcionais a 30 dias e multa única; estimativas sobre saldo aberto, sem cobrança automática |
| RN09 | Dados do OCR só viram contrato após conferência e confirmação | ALTA | ✅ | Revisão de dados e confirmação explícita; criação completa em uma transação |
| RN10 | Documento original permanece associado ao contrato | ALTA | ✅ | ORIGINAL associado ao contrato e exclusão bloqueada; teste de download íntegro |
| RN11 | Financeiro importante não é excluído sem controle | ALTA | ✅ | Vínculos financeiros protegidos; contas desativadas preservam dados; despesa paga não excluída |
| RN12 | Contrato encerrado não gera novas parcelas | ALTA | ✅ | Sem parcelas extras/replanejamento em encerrado/cancelado; renovação cria outro contrato |
| RN13 | Diferenciar recebidos e a receber | ALTA | ✅ | Receitas por pagamento e recebíveis por saldo; contrato/dashboard/relatórios usam a mesma base |
| RN14 | Dashboard usa dados registrados no sistema | ALTA | ✅ | Agregações dos dados reais; teste com mais de 100 registros, despesas e saldo parcial |
| RN15 | Vencimentos alimentam o calendário | ALTA | ✅ | Eventos derivados das parcelas, pagamentos, despesas e término |
| RN16 | Contratos próximos do término podem gerar alertas | MÉDIA | ✅ | Alertas RENOVACAO por término e registro explícito da renovação |
| RN17 | OCR não substitui a conferência (sugestões até confirmar) | ALTA | ✅ | Texto/sugestões não substituem revisão; confiança não garante precisão |
| RN18 | Campos não identificados ficam disponíveis p/ preenchimento manual | ALTA | ✅ | Campos ausentes podem ser enviados manualmente em `dados`; validação ocorre ao confirmar |

---

## 5. Dependências do produto final

- Web/Mobile precisam consumir as rotas novas e demonstrar os CRUDs; nenhuma
  validação completa nas telas/dispositivo físico foi realizada nesta entrega.
- Dashboard/Financeiro/Agenda do Mobile ainda derivam dados de páginas limitadas;
  devem passar a usar os endpoints agregados/paginados. Calculadora diverge em
  arredondamento e início do mês: usar a simulação da API ou alinhar as regras.
- Recuperação de senha sem login não foi implementada; existe troca autenticada.
  Push/e-mail e renovação automática não fazem parte das operações entregues.
- Juros/multas são estimativas; efetivação de encargos/estornos exige fluxo específico.
- Notion/Trello/Figma externos não foram alterados. Cards e evidências precisam ser
  vinculados pela equipe; [entrega](ENTREGA_SPRINT_2.md) contém os IDs locais e os commits.
- Execução local e resultado do GitHub Actions são distintos. Não declarar CI remoto
  aprovado sem abrir o run correspondente no GitHub.

## 6. Validação verificável

- **84 testes rápidos**, seis suítes: validadores/cálculos/parser OCR e API com DB simulado.
- **33 cenários MySQL**, sete suítes: schema, migrations, constraints, isolamento,
  concorrência, CRUDs, financeiro, analytics, PDF/imagem/scan, permissões e renovação.
- Cobertura combinada local (controllers/services/utils/middlewares): **91,09% das
  linhas**, 85,68% das instruções, 71,13% das ramificações e 92,90% das funções.
  Não inclui validação visual, testes de carga ou todas as falhas possíveis do host.
- Workflow [Backend](../.github/workflows/backend.yml): testes rápidos, MySQL real
  e combinação dos relatórios de cobertura em artifacts; aciona em push/PR da API.
- Como repetir: [API README](../api/README.md), [organização dos testes](../api/tests/mysql/README.md).
- Modelo [DER](DER.md), schema [SQL](../api/database/schema.sql), migrações em
  `api/database/migrations`. Não recriar o banco existente para atualizar.
