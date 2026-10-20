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
| **Total** | **33** | Casos reais com Express/Supertest + MySQL 8 |

A suíte rápida tem 84 testes em `tests/unit` e `tests/integration`; os testes de
API dessa suíte simulam o DB. Ela complementa os cenários acima, sem substituí-los.

Relatórios locais: `coverage/unit`, `coverage/mysql` e
`coverage/combined/index.html`. O workflow Backend repete os comandos e publica
artifacts separados e combinados. A cobertura combinada mede somente
controllers/services/utils/middlewares; não mede interfaces, carga ou implantação.
Na validação local desta entrega: linhas 91,09%, instruções 85,68%, ramificações
71,13%, funções 92,90%. Resultados remotos devem ser conferidos no run do GitHub.

Os arquivos em `../fixtures` são sintéticos, destinados ao OCR da demonstração.
Não colocar contratos reais ou dados pessoais nos testes/commits. A suíte não
faz pedidos a Notion, Trello, provedores de e-mail ou serviços OCR externos.

Para encerrar o banco de teste preservando seu volume:

```bash
docker compose -f compose.test.yaml down
```
