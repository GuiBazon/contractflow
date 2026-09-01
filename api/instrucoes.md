# INSTRUÇÕES — ESTADO ATUAL DO PROJETO (PAUSA DE TRABALHO)

> **Este arquivo é o "relatório de parada"**: contém todo o contexto da auditoria
> do ContractFlow, o que já foi feito, o que falta e decisões técnicas a respeitar.
> Leia antes de continuar o trabalho.

---

## 1. CONTEXTO DA TAREFA

Estávamos executando o **MASTER PROMPT de auditoria e correção completa do ContractFlow**.
O objetivo: auditar criticamente o projeto contra os requisitos oficiais (RF01–RF42,
RNF01–RNF20, RN01–RN18), corrigir a base, deixar o sistema sólido para a equipe
(Backend = Bazon; Web = Renan e João; Mobile = Ulisses e Eduardo).

**Prioridade de implementação definida:**

- **P1 — FUNDAMENTAÇÃO**: banco, modelagem, autenticação, autorização, clientes,
  contratos, parcelas, pagamentos, integridade financeira.
- **P2 — FUNCIONALIDADES PRINCIPAIS**: upload, OCR, importação, dashboard,
  calendário, recebíveis, histórico.
- **P3 — FUNCIONALIDADES SECUNDÁRIAS**: alertas, relatórios, exportação, calculadora,
  despesas, projeções, notificações, renovação.

---

## 2. ESTRUTURA DO REPOSITÓRIO

```
contractflow/
├── api/      → BACKEND Node.js + Express + MySQL  (a pasta real é "api", não "backend")
├── web/      → FRONTEND React (ainda SÓ tem README.md)
├── mobile/   → MOBILE React Native/Expo (ainda SÓ tem README.md)
└── README.md
```

- ⚠️ O MASTER PROMPT descreve a arquitetura como `backend/ front/ mobile/`, mas o
  repositório usa `api/ web/ mobile/`. **Decisão: manter `api/web/mobile`** (renomear
  quebraria o workflow da equipe — apenas documentar a divergência como BAIXA).
- `web/` e `mobile/` estão **vazios** (só README com responsáveis). Não foi feita
  implementação de frontend até aqui.

---

## 3. AUDITORIA INICIAL — PROBLEMAS ENCONTRADOS (antes das correções)

### Estado original do código (commit `092998d` + trabalho da sessão)

O backend (`api/`) era só a base: Express + mysql2 + bcryptjs + JWT, com:
- `usuarios`, `clientes`, `contratos`, `parcelas`, `pagamentos`, `documentos`,
  `historico_contratos`, `despesas` no banco.
- Rotas apenas de **auth** (register/login) e **clientes** (CRUD).
- **Nenhum módulo de contratos/parcelas/pagamentos/upload/OCR/dashboard existia.**

### Problemas críticos identificados na auditoria

| # | Problema | Gravidade | Requisito |
|---|----------|-----------|-----------|
| 1 | **NENHUM isolamento de dados por usuário** — todo usuário via TODOS os clientes e podia editar/excluir qualquer um | CRÍTICO | RNF04, RNF01 |
| 2 | **`register` aceitava `perfil` do corpo da requisição** → qualquer um se cadastrava como ADMIN | CRÍTICO | RF03, RNF04 |
| 3 | **Zero implementação de Contratos, Parcelas, Pagamentos** (o núcleo do sistema) | CRÍTICO | RF07–RF18 |
| 4 | **Upload/OCR/Importação totalmente ausentes** (não havia multer, tesseract, pdf-parse) | CRÍTICO | RF08–RF13, RN09 |
| 5 | **`clientes.cpf_cnpj` sem UNIQUE** → duplicidade de clientes | ALTO | RF05/RF06 |
| 6 | **Sem validação de email, senha, CPF/CNPJ, datas, valores** | ALTO | RNF15 |
| 7 | **JWT_SECRET sem fail-fast** (default `secret` no .env.example) | ALTO | RNF01/RNF03 |
| 8 | **Error handler vazava `err.message` ao client** (info interna) | MÉDIO | RNF14 |
| 9 | **DELETE de cliente com contrato virava 500** (sem tratar FK) | MÉDIO | RNF14 |
| 10 | **Sem paginação/filtros nos list()** e sem `requireAdmin` | MÉDIO | RF33/RF34/RF03 |
| 11 | **Documentação da API** era só placeholder `[A definir]` | MÉDIO | §19 do prompt |
| 12 | **Testes: inexistentes** | MÉDIO | §17 do prompt |
| 13 | CORS totalmente aberto sem config | BAIXO | RNF01 |
| 14 | Nome das pastas `api/web/mobile` ≠ `backend/front/mobile` | BAIXO | §2 do prompt |

---

## 4. O QUE JÁ FOI FEITO NESTA SESSÃO

### 4.1 Dependências instaladas (`api/package.json`)

```
multer@^2.3.0        → upload de arquivos (validação MIME/tamanho/nome seguro)
tesseract.js@^5.1.1  → OCR de imagens (português)
pdf-parse@^1.1.4     → extração de texto de PDFs
```
*(já instaladas via `npm install`; `node_modules` atualizado)*

### 4.2 Arquivos criados/alterados

| Arquivo | O que é |
|---|---|
| `api/database/schema.sql` | **Reescrito**: isolamento por usuário, UNIQUEs, CHECKs, índices, `extracao_ocr`, anexos |
| `api/.env.example` | Atualizado (JWT_SECRET aviso, CORS_ORIGINS, UPLOAD_DIR) |
| `.gitignore` | Adicionado `api/uploads/` |
| `api/src/config/uploads.js` | Multer: MIME/ext/tamanho (10MB), nomes com UUID, pastas `uploads/ocr` e `uploads/docs` |
| `api/src/middlewares/authMiddleware.js` | Exige esquema `Bearer `, valida `decoded.id` |
| `api/src/middlewares/requireAdmin.js` | **Novo** — bloqueia rotas para não-ADMIN |
| `api/src/utils/validators.js` | **Novo** — email, CPF/CNPJ (dígitos verificadores), data, decimal, UF |
| `api/src/services/financeiroService.js` | **Novo** — `SITUACAO_SQL`, resumo do contrato (saldo), recalcular situação da parcela, juros/multa, parcelas em atraso |
| `api/src/services/historicoService.js` | **Novo** — registra eventos do contrato (RF36) |
| `api/src/services/contratoService.js` | **Novo** — validação, cálculo de vencimentos/valores, criação transacional de contrato+parcelas (RF14/RF15/RN12) |
| `api/src/services/ocrService.js` | **Novo** — extração de texto (PDF/image) + heurísticas de campos (RF10/RF11/RNF17) |
| `api/src/controllers/authController.js` | Registro não aceita `perfil` (1º usuário vira ADMIN), valida email/senha |
| `api/src/controllers/clientController.js` | CRUD **esbarrado por `usuario_id`**, paginação, busca, CPF/CNPJ válido, conflito 409, FK → 409 |
| `api/src/controllers/contractController.js` | CRUD de contratos, status, histórico, gerar parcelas extras |
| `api/src/controllers/parcelaController.js` | Lista parcelas (com `situacao` calculada), edita parcela (RF16) |
| `api/src/controllers/paymentController.js` | Registrar pagamento + recalcular saldo/parcela (RF17/RF18), listar pagamentos |
| `api/src/controllers/documentController.js` | Upload de original/anexo (RF09/RF41), listar, download protegido, remover anexo |

### 4.3 Correções do banco (schema final resumido)

Cadeia de propriedade (RNF04): **usuarios → clientes → contratos → parcelas → pagamentos/documentos**.

```
usuarios  (perfil ADMIN/USUARIO, ativo)
  ├── clientes      (usuario_id FK, UNIQUE(usuario_id, cpf_cnpj))
  │     └── contratos (usuario_id + cliente_id FK, UNIQUE(usuario_id, numero),
  │                    status enum, juros_percentual, multa_percentual, CHECK valor>=0)
  │           ├── parcelas (data_vencimento NOT NULL, UNIQUE(contrato_id, numero))
  │           │     └── pagamentos (valor CHECK>=0, data_pagamento)
  │           ├── documentos (tipo ORIGINAL/ANEXO, hash SHA-256)
  │           └── historico_contratos (auditoria de eventos)
  ├── extracao_ocr  (JSON dos dados extraídos, status PENDENTE/CONFIRMADA/CANCELADA — RNF18/RN09)
  └── despesas      (CRUD financeiro RF25)
```

Decisões de modelagem tomadas (respeitar):
- **Receitas derivam dos pagamentos** — NÃO criar tabela `receitas`.
- **Calendário deriva de `parcelas.data_vencimento` + `pagamentos.data_pagamento`** — NÃO criar tabela.
- **Situação da parcela é CALCULADA** (`SITUACAO_SQL`): CANCELADA > PAGA (soma pagtos >= valor) > VENCIDA (vencimento < hoje) > PENDENTE. O status armazenado é atualizado no registro de pagamento.
- **Saldo é sempre derivado** (somatório de parcelas não canceladas − pagamentos). Nada de campo `saldo` desnormalizado.
- **Documento original não pode ser excluído** (RN10/RN11); anexo pode.
- **Juros/multa**: `multa = valor × multa% / 100` (única vez); `juros = valor × juros% / 100 / 30 × diasAtrado` (mensal proporcional ao dia). Documentado no `financeiroService`.

---

## 5. O QUE FALTA FAZER (ordem sugerida)

### 5.1 Finalizar aplicação das rotas (P1/P2) — NÃO FOI FEITO AINDA

Os controllers já existem, mas **as rotas novas ainda não foram criadas/cadastradas**.
Precisamos de:

1. **`api/src/routes/contractRoutes.js`** (novo):
   ```
   GET    /                         → listContratos (filtros: q, status, cliente, inicio, fim, page, limit)
   GET    /:id                      → getContratoById (inclui financeiro)
   POST   /                         → createContrato (gera parcelas)
   PUT    /:id                      → updateContrato
   DELETE /:id                      → deleteContrato (só sem parcelas)
   PATCH  /:id/status               → updateContratoStatus
   POST   /:id/parcelas             → generateParcelas (RN12)
   GET    /:id/historico            → getHistorico (RF36)
   ```
   (todas com `authMiddleware`)

2. **`api/src/routes/parcelaRoutes.js`** (novo):
   ```
   GET    /:contratoId/parcelas          → listParcelas (filtro situacao)
   PATCH  /:contratoId/parcelas/:parcelaId → updateParcela (RF16)
   ```

3. **`api/src/routes/paymentRoutes.js`** (novo):
   ```
   GET    /:contratoId/pagamentos        → listPagamentos (filtro período)
   POST   /:contratoId/pagamentos        → createPagamento (RF17/RF18)
   ```

4. **`api/src/routes/documentRoutes.js`** (novo):
   ```
   GET    /:contratoId/documentos        → listDocumentos
   POST   /:contratoId/documentos        → uploadDocumento (tipo ORIGINAL|ANEXO)
   GET    /:contratoId/documentos/:documentoId/arquivo → downloadDocumento (protegido)
   DELETE /:contratoId/documentos/:documentoId        → deleteDocumento (só anexo)
   ```

5. **`api/src/routes/index.js`** (ALTERAR): montar o roteador completo. Modelo:
   ```js
   router.use('/auth', authRoutes);
   router.use('/clientes', clientRoutes);
   router.use('/contratos', contractRoutes);
   router.use('/pagamentos', paymentAllRoutes);        // para listAllPagamentos (receitas)
   router.use('/despesas', expenseRoutes);
   router.use('/dashboard', dashboardRoutes);
   router.use('/relatorios', reportRoutes);
   router.use('/ocr', ocrRoutes);
   router.use('/usuarios', userRoutes);                // admin
   ```

### 5.2 Controllers que ainda NÃO existem (criar)

6. **`api/src/controllers/ocrController.js`** (P2 — fluxo crítico RF08–RF13/RN09/RN17/RN18):
   ```
   POST  /api/ocr/extract      (multipart 'arquivo')
        → multer OCR dir; chama ocrService.extrairTextoDeArquivo + extrairDados;
          grava tabela extracao_ocr (status PENDENTE); retorna { extracao_id, dados, campos, confianca, aviso }
   GET   /api/ocr/:id          (listar extração pendente do usuário)
   PATCH /api/ocr/:id          (revisão/correção: atualiza dados_json; RF12)
   POST  /api/ocr/:id/confirmar
        → exige `dados` revisados (ex.: numero, cliente_id ou nova_cliente, valor_total,
          quantidade_parcelas, vencimentos, forma_pagamento, data_inicio/fim, juros, multa);
          valida; cria cliente (se novo) e contrato+parcelas (reusar criarContratoComParcelas);
          muda status para CONFIRMADA; move arquivo de uploads/ocr para uploads/docs;
          associa documento tipo ORIGINAL; registra histórico.
        → NUNCA cria contrato direto sem confirmação (RN09/RN17).
   DELETE /api/ocr/:id         (cancelar extração + apagar arquivo)
   ```
   Observações:
   - Cliente pode vir como `cliente_id` (existente do usuário) ou `cliente_novo` (nome + cpf/cnpj).
   - Se OCR não encontrou campo, o usuário preenche manualmente (RN18).
   - Campos OCR podem conter erro → usuário corrige antes de confirmar (RF12/RF13).

7. **`api/src/controllers/dashboardController.js`** (P2 — RF32, RN14):
   ```
   GET /api/dashboard → { contratos_ativos, total_clientes, valores_a_receber (pendente),
                          valores_recebidos, valores_em_atraso, proximos_vencimentos,
                          receitas (pagamentos), despesas, saldo_projetado (a_receber - despesas) }
   ```
   Tudo calculado com dados reais do usuário (SQL com SUM/COUNT) — NUNCA usar valores fixos.

8. **`api/src/controllers/expenseController.js`** (P3 — RF25):
   ```
   GET/POST/PUT/DELETE /api/despesas (sempre por usuario_id; paginação/filtro mês)
   ```
   Sem excluir financeiro de forma irresponsável — liberar excluir apenas se não interfere em nada (aqui OK, é despesa própria).

9. **`api/src/controllers/reportController.js`** (P3 — RF37/RF38):
   ```
   GET /api/relatorios/contratos.csv   (exportar contratos do usuário)
   GET /api/relatorios/recebiveis.csv  (parcelas e situação)
   GET /api/relatorios/pagamentos.csv  (pagamentos por período)
   ```
   Gerar CSV manualmente (sem lib), com `Content-Disposition: attachment`, campo `data` no padrão br.
   (XLSX fica como melhoria futura — RF38 é "poderá".)

10. **`api/src/controllers/userController.js`** (P1 — RF03 gerência de permissões):
    ```
    GET    /api/usuarios            (ADMIN — listar usuários)
    PATCH  /api/usuarios/:id/perfil (ADMIN — promover/rebaixar ADMIN/USUARIO)
    PATCH  /api/usuarios/:id/ativo  (ADMIN — ativar/desativar)
    GET    /api/usuarios/me         (qualquer autenticado → dados do próprio perfil)
    ```
    (Ajuste de senha/recuperação RF04 é "poderá" — deixar para depois, não é prioridade.)

11. **`api/src/routes/...Routes.js`** correspondentes a 7–10 (ver 5.1 index).

### 5.3 Ajustes de infraestrutura (P1)

12. **`api/src/app.js`** (ALTERAR):
    - CORS configurável: `const origem = process.env.CORS_ORIGINS; app.use(cors(origem ? { origin: origem.split(',') } : {}));`
    - Ajustar handler de erro global: **não expor `err.message`** para o cliente (logar no console, devolver genérico). Tratar erros com `status` (ex.: `req.user` etc.).
    - Manter `/api/health`.
    - Avaliar limite de JSON body (ex.: `express.json({ limit: '1mb' })`).

13. **`api/src/server.js`** (ALTERAR): fail-fast de ambiente.
    ```js
    const required = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length) { console.error('Faltam variáveis de ambiente: ' + missing.join(', ')); process.exit(1); }
    if (process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET === 'troque-por-um-segredo-longo-e-aleatorio') {
      console.error('JWT_SECRET deve ser alterado para um valor seguro'); process.exit(1);
    }
    ```

14. **`api/src/config/uploads.js`** já existe e `ensureUploadDirs()` roda no require. OK.

### 5.4 Bugs conhecidos a corrigir (durante a finalização)

- **`contractController.updateContrato`**: usa `contrato.parcelas_pagas` que NÃO existe no retorno de `obterContratoDono` (só no `listContratos`). Corrigir consultando `SELECT COUNT(*) FROM parcelas WHERE contrato_id=? AND status='PAGA'` (função `hasPayments` já existe para valor; criar similar para parcelas pagas) — hoje sem isso o "numero não pode mudar após pagamento" fica furado.
- Revisar `generateParcelas`: `valor_parcela` é opcional; se ausente usa 0 — decidir regra (valor padrão = valor_total / quantidade_parcelas do resumo? evitar parcelas com valor 0).
- `documentController.uploadDocumento`: bloco `if (tipo === 'ORIGINAL' && !descricao) {}` está vazio/desnecessário — limpar.

### 5.5 Testes / verificação (fazer por último nesta rodada)

Ambiente: **MySQL 8.0 instalado e RODANDO na porta 3306** (serviço `MySQL80`), mas
`root` sem senha foi negado (ERROR 1045). Não temos credenciais do banco real.

**Plano para testes de verdade (instância MySQL isolada no temp):**
```powershell
# 1. criar datadir temporário (pre-aprovado)
$tmp = "C:\Users\465889~1\AppData\Local\Temp\opencode\mysql-contractflow"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

# 2. inicializar instância sem senha
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --initialize-insecure --datadir=$tmp

# 3. subir na porta 3307
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --no-defaults --datadir=$tmp --port=3307
#    (rodar em background/job; ou usar --console para debug)

# 4. criar banco + usuário de teste e aplicar schema
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -h 127.0.0.1 -P 3307 -u root < api/database/schema.sql
# criar usuário e dar acesso (ou usar root direto no .env de teste)

# 5. criar api/.env APENAS para teste (não commitar!):
#    PORT=8080 / DB_HOST=127.0.0.1 / DB_PORT=3307 / DB_USER=root / DB_PASSWORD= / DB_NAME=contractflow / JWT_SECRET=senha-de-teste-forte

# 6. subir API e rodar os fluxos via HTTP (Invoke-WebRequest / curl):
#    - cadastro (1º vira ADMIN) → login → token
#    - cliente A criar → consultar → editar → tentar listar e NÃO achar cliente do usuário B
#    - contrato criar com parcelas → listar parcelas → pagar 2 parcelas
#    - confirmar que resumo: valor_total, recebido, pendente conferem (RN06/RF18)
#    - criar parcela vencida e SE confirmar que aparece como VENCIDA e em atraso (RF19/RF20)
#    - upload de arquivo fake (gerar PNG 1x1 com conteúdo) → OCR extract → PATCH → confirmar → contrato criado + documento ORIGINAL
#    - segurança: usuário B acessando /api/contratos/:id do A → 404; sem token → 401; usuário normal em rota admin → 403
```

Dica caso queira reutilizar: existem bins em
`C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe` e `...\mysqld.exe`.

---

## 6. REGRAS DE NEGÓCIO QUE O CÓDIGO DEVE RESPEITAR (já implementadas ou a implementar)

- RN01/RN03: cliente tem vários contratos; contrato tem várias parcelas. ✔ schema
- RN02: contrato sempre ligado a cliente existente → validado no createContrato. ✔
- RN04: `data_vencimento NOT NULL`. ✔
- RN05: estados PENDENTE/PAGA/VENCIDA/CANCELADA (+ CROSS-situation calculada). ✔
- RN06/RN13/RF18: saldo SEMPRE derivado de parcelas−pagamentos; recebido ≠ a receber. ✔
- RN07/RF19/RF20: vencida sem pagamento = atraso (SQL `data_vencimento < CURDATE() AND pago < valor`). ✔
- RN08/RF22/RF23: juros/multa por configuração do contrato. ✔ (uma regra documentada)
- RN09/RF12/RF13/RN17/RN18: OCR gera sugestão; usuário revisa, corrige, confirma; nada é criado antes. ✔ (no controller de OCR a fazer)
- RN10/RF09: documento original associado e guardado. ✔
- RN11: não deletar financeiro importante (contrato com parcelas → 409; documento original → 400). ✔
- RN12: contrato ENCERRADO/CANCELADO não gera parcelas. ✔
- RN14: dashboard usa dados reais. (a implementar no dashboardController)
- RN15/RF29: vencimentos alimentam calendário (derivado). ✔
- RN16/RF42: alertas de término = contratos com data_fim próxima (a fazer: query `data_fim` <= hoje+30).

---

## 7. MATRIZ DE REQUISITOS — ESTADO APÓS ESTÁ SESSÃO

Legenda: ✔ implementado | 🕓 parcial | ✘ não implementado (a fazer)

### RF
- RF01 cadastro ✔ | RF02 login ✔ | RF03 controle de acesso 🕓 (requireAdmin pronto, falta userController) | RF04 recuperação de senha ✘ (opcional)
- RF05/06 clientes ✔ | RF07 cadastro contratos ✔ (manual) | RF08 upload 🕓 (multer pronto; falta rota+ocr) | RF09 armazenamento doc ✔ | RF10/11 OCR 🕓 (ocrService pronto; falta controller/rota) | RF12/13 revisão/confirmação ✘ (rota OCR falta) | RF14/15 parcelas/vencimentos ✔ | RF16 alteração parcelas ✔
- RF17 pagamento ✔ | RF18 saldo ✔ | RF19/20 atraso/inadimplência 🕓 (service pronto; falta endpoint) | RF21 histórico financeiro ✔ (pagamentos+parcelas) | RF22/23 juros/multa 🕓 (calc pronto; falta expor em endpoint/resumo) | RF24 recebíveis ✘ (falta endpoint) | RF25 despesas ✘ (falta controller) | RF26 receitas 🕓 (listAllPagamentos pronto; falta rota `/api/pagamentos`) | RF27 saldo projetado ✘ | RF28 calculadora ✘ (frontend)
- RF29 calendário ✘ (endpoint de vencimentos por período — derivar de parcelas) | RF30/31 alertas ✘ | RF32 dashboard ✘ | RF33 pesquisa ✔ (clientes/contratos q=) falta documentos | RF34 filtros ✔ (clientes/contratos) | RF35 visualização ✔ (getContrato + download doc) | RF36 histórico ✔ | RF37/38 relatórios/exportação ✘ (CSV falta) | RF39 notificações ✘ (opcional) | RF40 status ✔ | RF41 anexos ✔ | RF42 renovação ✘ (status EM_RENOVACAO já existe; alerta de término falta)

### RN (mapeiam-se nas seções acima; todas atendidas no código ou na lista de pendências)
#5 — pendências consolidadas na seção 5.

### RNF
- RNF01–04 segurança/permissoes: 🕓 (base corrigida; falta userController e testes de isolamento)
- RNF05 privacidade: tratado por escopo + documentos protegidos ✔
- RNF06/07/08 usabilidade/responsividade/mobile: front‑end (ainda não existe)
- RNF09–12 desempenho/manutenibilidade/modularidade: serviços separados (financeiro, contrato, ocr, historico) ✔
- RNF13 integridade: FKs RESTRICT + CHECKs + transações ✔
- RNF14 erros claros: ✔ (mensagens tratadas; falta melhorar handler em app.js)
- RNF15 validação: ✔ (validators em uso)
- RNF16 arquivos: ✔ (multer MIME/ext/tamanho/UUID, hash SHA-256)
- RNF17/18 OCR transparência: 🕓 (confiança + tabela extracao_ocr; falta expor em endpoint)
- RNF19/20 consistência/acessibilidade: front-end

---

## 8. COMO RODAR (existente)

```bash
cd api
cp .env.example .env      # preencher com credenciais reais
mysql -u <user> -p < contractflow < database/schema.sql
npm install
npm run dev               # ou: npm start
# health:  GET http://localhost:8080/api/health
```

---

## 9. PRÓXIMOS PASSOS (checklist p/ continuar)

1. ✅ (feito) Schema, auth, clientes, services, controllers (contrato/parcela/pagamento/documento), middlewares, validators, upload config.
2. ⬜ Criar as **rotas novas** (5.1) e atualizar `routes/index.js`.
3. ⬜ Criar **ocrController** (o fluxo mais importante que falta).
4. ⬜ Criar **dashboardController**, **expenseController**, **reportController (CSV)**, **userController**.
5. ⬜ Corrigir `app.js` (CORS config + error handler) e `server.js` (fail-fast env).
6. ⬜ Corrigir **bugs conhecidos** (5.4).
7. ⬜ Subir MySQL isolado (5.5) e **testar os fluxos críticos** (cadastro→login→cliente→contrato→parcelas→pagamento→saldo→atraso→OCR→confirmação→isolamento A/B, 401/403).
8. ⬜ Atualizar **documentação da API** (seção "Descritivo dos endpoints" — criar tabela real: método, rota, auth, body, resposta). Não documentar endpoints inexistentes.
9. ⬜ Gerar **matriz final de requisitos** e RESUMO no formato pedido pelo MASTER PROMPT (§15/§20).
10. ⬜ (Opcional) refletir mudanças de schema em leitura fácil para os colegas de front/mobile.

---
*Gerado em: 01/09/2026 — sessão de auditoria/correção do ContractFlow.*