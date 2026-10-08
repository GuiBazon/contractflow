# ContractFlow — Endpoints da API

> Sprint 2: rotas registradas e verificadas com Supertest, incluindo MySQL real.
> Novos formatos, regras e exemplos: [API da Sprint 2](API_SPRINT_2.md).
> Como repetir/evidências: [Entrega do backend](ENTREGA_SPRINT_2.md).

Base path: `/api` · Formato de erro: `{ "message": "..." }`

---

## Autenticação

| Método | Rota | Autenticação | Descrição | Body / Params |
|--------|------|-------------|-----------|---------------|
| `POST` | `/api/auth/register` | ❌ pública | Cadastro. O primeiro usuário vira `ADMIN`; os demais ficam `USUARIO`. Valida nome (≥2), email, senha (≥6). | `{ nome, email, senha }` |
| `POST` | `/api/auth/login` | ❌ pública | Login. Retorna JWT (validade 8h) + dados do usuário. Retorna 403 se desativado. | `{ email, senha }` |

---

## Clientes

Todas as rotas de clientes exigem autenticação via `Bearer` token. Dados sempre isolados por usuário (cada um vê apenas seus próprios clientes).

| Método | Rota | Descrição | Body / Query |
|--------|------|-----------|--------------|
| `GET` | `/api/clientes` | Lista clientes com paginação e busca. Retorna contagem de contratos por cliente. | `?page=1&limit=20&q=texto` |
| `GET` | `/api/clientes/:id` | Detalhe de um cliente específico. | — |
| `POST` | `/api/clientes` | Cria cliente. Valida CPF/CNPJ (dígitos verificadores), email e UF. | `{ nome_razao_social, cpf_cnpj, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, estado, observacoes }` |
| `PUT` | `/api/clientes/:id` | Atualiza campos permitidos. Retorna 409 se CPF/CNPJ já existe em outro. | Campos a alterar |
| `DELETE` | `/api/clientes/:id` | Remove cliente. Retorna 409 se possui contratos vinculados (RN11). | — |

---

## Contratos

| Método | Rota | Descrição | Body / Query |
|--------|------|-----------|--------------|
| `GET` | `/api/contratos` | Lista contratos com filtros e paginação. Retorna recebido/pendente por contrato. | `?page=1&limit=20&q=…&status=ATIVO&cliente=1&inicio=…&fim=…` |
| `GET` | `/api/contratos/:id` | Detalhe do contrato + resumo financeiro (valor_total, recebido, pendente). | — |
| `POST` | `/api/contratos` | Cria contrato **com parcelas geradas automaticamente** em transação (RF14/15). Gera vencimentos mensais a partir de `data_inicio` ou aceita lista de vencimentos. Última parcela absorve centavos. | `{ cliente_id, numero, tipo, descricao, valor_total, data_inicio, data_fim, forma_pagamento, quantidade_parcelas, juros_percentual, multa_percentual, observacoes, vencimentos?: [] }` |
| `PUT` | `/api/contratos/:id` | Edita/replaneja antes de pagamentos; preserva datas quando só muda o valor. Número/valor/parcelamento protegidos após pagamento. | Campos permitidos, `quantidade_parcelas`, `vencimentos`; ver regras detalhadas |
| `DELETE` | `/api/contratos/:id` | Remove contrato **só se não tiver parcelas**. Senão retorna 409 orientando usar cancelamento (RN11). | — |
| `PATCH` | `/api/contratos/:id/status` | Altera status. Registra no histórico. | `{ status: "ATIVO" \| "PENDENTE" \| "ENCERRADO" \| "CANCELADO" \| "EM_RENOVACAO" }` |
| `POST` | `/api/contratos/:id/parcelas` | Acrescenta parcelas e amplia o total; até 120 parcelas no contrato. Bloqueia ENCERRADO/CANCELADO (RN12). | `{ quantidade_parcelas, vencimentos?: [], valor_parcela }` |
| `GET` | `/api/contratos/:id/historico` | Lista eventos registrados (criação, alterações, pagamentos, status) (RF36). | — |

---

## Parcelas

| Método | Rota | Descrição | Body / Query |
|--------|------|-----------|--------------|
| `GET` | `/api/contratos/:contratoId/parcelas` | Lista parcelas com situação calculada (PENDENTE/PAGA/VENCIDA/CANCELADA), valor pago, dias de atraso. | `?filtro=VENCIDA` |
| `PATCH` | `/api/contratos/:contratoId/parcelas/:parcelaId` | Altera data, valor ou status. Valida: valor só se não houver pagamentos; cancelar só se sem pagamentos. | `{ data_vencimento, valor, status }` |
| `GET` | `/api/parcelas/:contratoId/parcelas` | Mesmo que acima (formato plano p/ o mobile). | `?filtro=VENCIDA` |
| `PATCH` | `/api/parcelas/:contratoId/parcelas/:parcelaId` | Mesmo que acima (formato plano p/ o mobile). | `{ data_vencimento, valor, status }` |

---

## Pagamentos

| Método | Rota | Descrição | Body / Query |
|--------|------|-----------|--------------|
| `GET` | `/api/contratos/:contratoId/pagamentos` | Lista pagamentos de um contrato. Filtros por período. | `?page=1&limit=50&de=…&ate=…` |
| `POST` | `/api/contratos/:contratoId/pagamentos` | Registra pagamento. Valida que não excede valor da parcela e a parcela não está cancelada. Em transação insere → recalcula situação → registra histórico. | `{ parcela_id, valor, data_pagamento, forma_pagamento, observacoes }` |
| `GET` | `/api/pagamentos/:contratoId/pagamentos` | Mesmo que acima (formato plano p/ o mobile). | `?page=1&limit=50&de=…&ate=…` |
| `POST` | `/api/pagamentos/:contratoId/pagamentos` | Mesmo que acima (formato plano p/ o mobile). | `{ parcela_id, valor, data_pagamento, forma_pagamento, observacoes }` |
| `GET` | `/api/receitas` | Pagamentos registrados do usuário (RF26). Alias `/api/pagamentos` preservado. Saldo em aberto fica em `/recebiveis`. | `?page=1&limit=50&de=…&ate=…&cliente=1&contrato=1` |

---

## Documentos

| Método | Rota | Descrição | Body / Query |
|--------|------|-----------|--------------|
| `POST` | `/api/contratos/:contratoId/documentos` | Upload multipart (`arquivo`). Tipo `ORIGINAL` ou `ANEXO`. Valida MIME/extensão/conteúdo/tamanho. Armazena com UUID no nome, gera hash SHA-256. | multipart: `arquivo` + `{ tipo, descricao }` |
| `GET` | `/api/contratos/:contratoId/documentos` | Lista documentos do contrato. | — |
| `GET` | `/api/contratos/:contratoId/documentos/:documentoId/arquivo` | Serve o arquivo binário (Content-Type correto, disposition `inline`). Valida ownership. | — |
| `DELETE` | `/api/contratos/:contratoId/documentos/:documentoId` | Remove anexo do disco e banco. **Bloqueia** deletar documentos tipo ORIGINAL (RN10). | — |
| `GET` | `/api/documentos/:contratoId/documentos` | Mesmo que acima (formato plano p/ o mobile). | — |
| `POST` | `/api/documentos/:contratoId/documentos` | Mesmo que acima (formato plano p/ o mobile). | multipart: `arquivo` + `{ tipo, descricao }` |
| `GET` | `/api/documentos/:contratoId/documentos/:documentoId/arquivo` | Mesmo que acima (formato plano p/ o mobile). | — |
| `DELETE` | `/api/documentos/:contratoId/documentos/:documentoId` | Mesmo que acima (formato plano p/ o mobile). | — |

---

## OCR

| Método | Rota | Descrição | Body / Query |
|--------|------|-----------|--------------|
| `POST` | `/api/ocr/extract` | Extrai texto/sugestões de PDF ou imagem (RN09: só sugestão). | multipart: `arquivo` |
| `GET` | `/api/ocr/:id` | Detalha uma extração. | — |
| `PATCH` | `/api/ocr/:id` | Persiste dados revisados sem criar contrato. `dados_json` aceito como alias antigo. | `{ dados: { ...campos } }` |
| `POST` | `/api/ocr/:id/confirmar` | Confirma cliente/contrato/parcelas/original/histórico em transação; repetir recebe 409. | `{ dados: { ...campos revisados } }` |
| `DELETE` | `/api/ocr/:id` | Cancela a extração. | — |

---

## Health Check

| Método | Rota | Autenticação | Descrição |
|--------|------|-------------|-----------|
| `GET` | `/api/health` | ❌ pública | `{ status: "ok", message: "ContractFlow API funcionando" }`. |

---

## Módulos entregues na Sprint 2

Todas estas rotas exigem Bearer token; financeiro continua isolado por dono,
inclusive para ADMIN. Detalhes em [API_SPRINT_2.md](API_SPRINT_2.md).

| Método | Rota | Função |
| --- | --- | --- |
| GET / PATCH / POST | `/api/auth/me`, `/api/auth/password`, `/api/auth/logout` | Sessão atual, troca autenticada e revogação |
| GET / GET :id / PUT / PATCH / DELETE | `/api/usuarios` e `/api/usuarios/:id` | Gestão administrativa; desativação preserva dados; último ADMIN protegido |
| GET | `/api/recebiveis` | Saldo, atraso e encargos estimados; resumo de todo o conjunto filtrado |
| GET / POST / GET :id / PUT / PATCH / DELETE | `/api/despesas` e `/api/despesas/:id` | CRUD por dono; financeiro pago protegido |
| GET | `/api/dashboard` | Indicadores/projeção/fluxo mensal sem limite de primeira página |
| GET | `/api/calendario` | Eventos com `de/ate` obrigatório; intervalo até 366 dias |
| GET | `/api/alertas`, `/api/notificacoes` | Vencimento, atraso e término; derivados, sem envio externo |
| GET | `/api/relatorios/:tipo` | JSON, CSV ou XLSX; financeiro/recebíveis/receitas/despesas/contratos |
| GET | `/api/documentos` | Pesquisa `q`, contrato, tipo e data do upload, com paginação |
| POST | `/api/calculadora/parcelas`, `/saldo`, `/projecao` | Simulações com os serviços do contrato/dashboard, sem gravar |
| POST | `/api/contratos/:id/renovar` | Novo contrato/parcelas e históricos; anterior encerrado, financeiro preservado |

Não há recuperação de senha sem login, push/e-mail, estorno ou cobrança automática
dos juros estimados. Essas limitações e a integração das telas estão registradas
na matriz de requisitos e na entrega do backend.

---

## Notas gerais

- **Isolamento de dados (RNF04)**: todas as rotas protegidas filtram por `usuario_id`. Um usuário nunca acessa dados de outro.
- **Senhas**: nunca em texto puro (bcrypt, custo 10).
- **Token JWT**: expira em 8 horas; estado/perfil/versão da sessão lidos do banco a cada request; header `Authorization: Bearer <token>`.
- **Uploads**: máx 10MB; PDF/JPEG/PNG/WebP; extensão/MIME/conteúdo validados e UUID no nome. OCR: até 10 páginas; modelo português instalado pelo npm.
- **Situação de parcela**: calculada em runtime — CANCELADA > PAGA (soma pagamentos ≥ valor) > VENCIDA (vencimento < hoje e não pago) > PENDENTE.
- **Saldo do contrato**: sempre derivado de `parcelas − pagamentos`. Nenhum campo `saldo` desnormalizado.

Datas são civis `AAAA-MM-DD`; a data atual usada para atraso é `CURDATE()` do MySQL.
Defina o fuso do servidor de banco na implantação; os testes usam UTC.
