# ContractFlow — Endpoints da API

> Status: rotas registradas e verificadas por testes de integração (supertest + db simulado).

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
| `PUT` | `/api/contratos/:id` | Atualiza dados básicos. Bloqueia alteração de `numero`/`valor_total` se já existir pagamento. Registra histórico. | `{ descricao, data_inicio, data_fim, forma_pagamento, juros_percentual, multa_percentual, observacoes, numero?, valor_total? }` |
| `DELETE` | `/api/contratos/:id` | Remove contrato **só se não tiver parcelas**. Senão retorna 409 orientando usar cancelamento (RN11). | — |
| `PATCH` | `/api/contratos/:id/status` | Altera status. Registra no histórico. | `{ status: "ATIVO" \| "PENDENTE" \| "ENCERRADO" \| "CANCELADO" \| "EM_RENOVACAO" }` |
| `POST` | `/api/contratos/:id/parcelas` | Gera parcelas extras. Bloqueado se contrato ENCERRADO ou CANCELADO (RN12). | `{ quantidade_parcelas, vencimentos?: [], valor_parcela }` |
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
| `GET` | `/api/receitas` | Todos os pagamentos do usuário (cross-contratos). Para RF26 (receitas) e RF24 (recebíveis). | `?page=1&limit=50&de=…&ate=…&cliente=1` |

---

## Documentos

| Método | Rota | Descrição | Body / Query |
|--------|------|-----------|--------------|
| `POST` | `/api/contratos/:contratoId/documentos` | Upload multipart (`arquivo`). Tipo `ORIGINAL` ou `ANEXO`. Valida MIME/tamanho. Armazena com UUID no nome, gera hash SHA-256. | multipart: `arquivo` + `{ tipo, descricao }` |
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
| `PATCH` | `/api/ocr/:id` | Revisa/corrige os dados extraídos (RF12). | `{ dados_json }` |
| `POST` | `/api/ocr/:id/confirmar` | Confirma e cria o contrato (RF13/RN17). | — |
| `DELETE` | `/api/ocr/:id` | Cancela a extração. | — |

---

## Health Check

| Método | Rota | Autenticação | Descrição |
|--------|------|-------------|-----------|
| `GET` | `/api/health` | ❌ pública | `{ status: "ok", message: "ContractFlow API funcionando" }`. |

---

## Controllers ainda NÃO implementados

| Módulo | Módulo final | Requisito |
|--------|-------------|-----------|
| `dashboardController.js` | Indicadores gerais do sistema | RF32, RN14 |
| `expenseController.js` | CRUD de despesas (aluguel, fornecedores, etc.) | RF25 |
| `reportController.js` | Exportação CSV de contratos/recebíveis/pagamentos | RF37, RF38 |
| `userController.js` | Gerenciamento de usuários (listar, promover, desativar) | RF03, RNF04 |

> O núcleo já implementado inclui `ocrController` (`/api/ocr`: extract → revisão → confirmar/cancelar). Serviços auxiliares: `contratoService`, `financeiroService`, `ocrService`, `historicoService`.

---

## Notas gerais

- **Isolamento de dados (RNF04)**: todas as rotas protegidas filtram por `usuario_id`. Um usuário nunca acessa dados de outro.
- **Senhas**: nunca em texto puro (bcrypt, custo 10).
- **Token JWT**: expira em 8 horas, header `Authorization: Bearer <token>`.
- **Uploads**: máx 10MB; formatos PDF, JPEG, PNG, WebP; nomes sanitizados com UUID.
- **Situação de parcela**: calculada em runtime — CANCELADA > PAGA (soma pagamentos ≥ valor) > VENCIDA (vencimento < hoje e não pago) > PENDENTE.
- **Saldo do contrato**: sempre derivado de `parcelas − pagamentos`. Nenhum campo `saldo` desnormalizado.
