# Testes de API com MySQL real

Execute a partir de `api/`, com Node 24 e Poppler disponível:

```bash
docker compose -f compose.test.yaml up -d --wait
npm run test:mysql
# Cobertura das duas suítes e relatório combinado:
npm run test:coverage
```

O servidor está em `127.0.0.1:3307`, banco `contractflow_test`. Credenciais do
Compose são exclusivas do banco descartável e não são credenciais da aplicação.
A configuração ignora o `.env` de produção, recusa nomes fora do prefixo de teste,
aplica o schema e as migrações, limpa dados antes de cada caso e remove uploads
temporários ao finalizar. Os testes rodam em série para compartilhar o banco;
a concorrência HTTP é criada somente dentro dos cenários que a avaliam.

| Suíte | Casos | O que verifica |
| --- | ---: | --- |
| `core.test.js` | 4 | Fluxo financeiro completo, ownership, constraints e autenticação |
| `finance.test.js` | 3 | Oito pagamentos concorrentes, saldo parcial/cancelamento, CRUD de despesas |
| `analytics.test.js` | 4 | Dashboard com 125 pagamentos, calendário, CSV/XLSX e alertas |
| `ocr.test.js` | 6 | PDF textual, PNG, PDF escaneado, revisão/confirmação concorrente, rollback de arquivo e isolamento |
| `auth.test.js` | 5 | Bootstrap ADMIN concorrente, permissões atuais, revogação, último ADMIN e migração sem perder dados |
| `crud.test.js` | 7 | Clientes, replanejamento, parcela, extras concorrentes, pagamento/edição sem deadlock, documentos e uploads inválidos |
| `extensions.test.js` | 4 | Calculadora alinhada ao contrato/dashboard, encargos sobre saldo e renovação com concorrência/rollback |
| `idempotency.test.js` | 6 | Reenvios, oito pedidos simultâneos, conflito, rollback e isolamento |
| `passwordRecovery.test.js` | 13 | SMTP capturado no Mailpit, hash, expiração, uso único, revogação, mudanças de credenciais/permissões e falhas |
| `notifications.test.js` | 6 | Leitura persistida, contadores, isolamento, pagamento e mudança do vencimento |
| `paymentReversals.test.js` | 7 | Auditoria, reflexos financeiros, exportações, concorrência, rollback e migração |
| `calendarTypes.test.js` | 2 | Os quatro filtros de evento, com registros e listas vazias |
| `openapiContracts.test.js` | 20 | Respostas reais validadas por AJV contra os schemas OpenAPI publicados |
| `auditTimestamps.test.js` | 2 | Instantes UTC corretos de leitura e estorno com driver no fuso brasileiro |
| **Total** | **89** | Casos reais com Express/Supertest + MySQL 8 e SMTP local |

A suíte rápida tem 92 testes em `tests/unit` e `tests/integration`; os testes de
API dessa suíte simulam o DB. Ela complementa os cenários acima, sem substituí-los.

Relatórios locais: `coverage/unit`, `coverage/mysql` e
`coverage/combined/index.html`. O workflow Backend repete os comandos e publica
artifacts separados e combinados. A cobertura combinada mede somente
controllers/services/utils/middlewares; não mede interfaces, carga ou implantação.
Na validação local desta entrega: linhas 93,65%, instruções 88,60%, ramificações
74,88%, funções 94,79%. Resultados remotos devem ser conferidos no run do GitHub.

Os arquivos em `../fixtures` são sintéticos, destinados ao OCR da demonstração.
Não colocar contratos reais ou dados pessoais nos testes/commits. A suíte não
faz pedidos a Notion, Trello, provedores de e-mail ou serviços OCR externos.

O Compose inicia também o Mailpit (SMTP 1025, HTTP 8025). Configure portas diferentes
com `CF_TEST_SMTP_PORT`/`CF_TEST_MAILPIT_PORT` e informe a URL HTTP à suíte com
`CF_TEST_MAILPIT_URL` se necessário. As mensagens são sintéticas e permanecem na
caixa local. Não reutilizar credenciais do ambiente de produção nesses testes.

Para encerrar o banco de teste preservando seu volume:

```bash
docker compose -f compose.test.yaml down
```
