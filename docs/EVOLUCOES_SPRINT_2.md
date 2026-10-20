# Evoluções adicionais do backend — Sprint 2

Estas entregas complementam o backend já desenvolvido e mantêm suas rotas compatíveis. Cada funcionalidade inclui migração aditiva quando necessária e cenários automatizados próprios.

## Pagamentos sem duplicidade em reenvios

Envie `Idempotency-Key` nas rotas de registro de pagamento, com uma chave aleatória por operação (por exemplo, um UUID). Reutilize a chave quando reenviar a mesma operação após perda de conexão. Operações diferentes recebem chaves diferentes, mesmo se os valores forem iguais.

- Um reenvio recebe o mesmo status 201 e corpo da primeira resposta, com `Idempotency-Replayed: true`.
- A mesma chave com outro conteúdo retorna 409.
- A chave pertence ao usuário e vale também entre as rotas compatíveis de pagamentos.
- A reserva da chave e o pagamento compartilham a mesma transação. Falhas desfazem ambos.
- O header é opcional para manter os clientes atuais compatíveis. Web e Mobile devem enviá-lo para habilitar a proteção de reenvio.
- A tabela `chaves_idempotencia` é criada pela migração `002-payment-idempotency.js`. Chaves financeiras não expiram automaticamente.

Validação: `npm run test:mysql -- --runTestsByPath tests/mysql/idempotency.test.js` cobre repetição, oito reenvios concorrentes, conflito, rollback e isolamento.

## Limites de autenticação

O login aceita até cinco falhas por conta e trinta por IP em quinze minutos. Logins bem-sucedidos não consomem esses limites. Cadastro aceita vinte solicitações por IP; recuperação aceita três por conta e vinte por IP; redefinição aceita vinte por IP, no mesmo intervalo. O bloqueio responde 429, `Retry-After` e `RateLimit`.

E-mails são normalizados e convertidos em hash para a chave do limitador. Os contadores são locais a cada processo Node. Uma implantação com várias instâncias precisa de armazenamento compartilhado para manter um limite global. `TRUSTED_PROXIES` aceita os IPs/CIDRs reais do proxy; não configure confiança irrestrita em cabeçalhos enviados pelo cliente.

Validação: `tests/integration/authRateLimit.test.js` verifica bloqueio por conta e por IP, normalização, login bem-sucedido, isolamento entre contas e disponibilidade do health.

## Recuperação de senha por e-mail (RF04)

- `POST /api/auth/forgot-password`: `{ "email": "usuario@example.com" }`. Contas conhecidas, desconhecidas e desativadas recebem a mesma mensagem. Falhas de envio são registradas sem dados sensíveis, e o token não entregue é invalidado.
- `POST /api/auth/reset-password`: `{ "token": "valor-do-link", "nova_senha": "nova-senha" }`. Não exige login. Links inválidos, expirados ou usados recebem 400.
- O banco armazena apenas o SHA-256 de um token aleatório de 256 bits. Cada link expira em trinta minutos por padrão, vale uma única vez e é substituído por uma nova solicitação.
- A redefinição troca a senha com bcrypt e incrementa `token_version`, encerrando as sessões anteriores na mesma transação. Dois usos simultâneos permitem uma única alteração.
- Trocar a senha autenticada ou alterar e-mail, perfil ou estado ativo da conta também invalida os links pendentes na mesma transação. Reativar a conta não restaura esses links. As operações bloqueiam o usuário antes dos tokens, na mesma ordem da emissão/redefinição.
- `PASSWORD_RESET_URL` define a tela do Web que receberá `?token=...`. O endereço vem da configuração do servidor, nunca do Host ou de um redirecionamento recebido do cliente. A equipe deve conectar a tela a `POST /auth/reset-password`.
- Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `SMTP_SECURE` e, quando necessário, `SMTP_USER`/`SMTP_PASSWORD`. SMTP remoto usa TLS; não imprimir senhas ou links nos logs.
- Para desenvolvimento/testes, `docker compose -f compose.test.yaml up -d --wait` inicia MySQL e Mailpit, que captura mensagens localmente. A suíte usa SMTP real e consulta a caixa de teste para obter o link; não envia e-mail externo.
- A migração `003-password-recovery.js` adiciona `recuperacoes_senha` preservando usuários e contratos.

Validação: `tests/mysql/passwordRecovery.test.js` cobre envio SMTP, hash, uso único e concorrente, expiração, revogação, mudanças de credenciais/permissões, falha do provedor e manipulação do endereço do link. O workflow Backend inclui o servidor SMTP de teste.

## Notificações com leitura persistente (RF39)

`GET /api/notificacoes` mantém os alertas derivados de parcelas/renovações e acrescenta `lida`, `lida_em` e `resumo: { total, nao_lidas, lidas }`. Aceita `dias` (1–90), `lida=true|false` e paginação. O contador considera todo o período, sem depender do tamanho da página. `GET /api/notificacoes/resumo` retorna só os contadores.

- `PATCH /api/notificacoes/:id/leitura` marca como lida; repetir mantém a data de leitura original.
- `DELETE /api/notificacoes/:id/leitura` marca como não lida.
- `PATCH /api/notificacoes/ler-todas?dias=7` marca apenas os eventos atuais do intervalo informado.
- A chave de leitura combina origem, tipo e data do evento. Alterar o vencimento ou transformar um vencimento em atraso produz um evento novo. Parcelas pagas/canceladas deixam de aparecer e não inflam contadores.
- A migração `004-notification-reading.js` cria `notificacoes_leituras`, isolada por usuário. A consulta `/alertas` conserva seu formato anterior.

Validação: `tests/mysql/notifications.test.js` cobre persistência, repetição, filtros, isolamento, quitação, alteração do vencimento e leitura em lote por período.

## Documentação interativa OpenAPI

`GET /api/docs/` abre o Swagger UI e `GET /api/openapi.json` fornece a especificação OpenAPI 3.0.3. O documento usa `/api` no próprio servidor, sem IP fixo. Execute login e informe o JWT em **Authorize** para experimentar as operações protegidas.

Os grupos cobrem autenticação, usuários, clientes, contratos, parcelas, pagamentos, recebíveis, despesas, dashboard, calendário, notificações, documentos, OCR, calculadora e relatórios. Incluem corpos de requisição, filtros, upload multipart, exportação binária, erros, chave de idempotência e aliases antigos. Tokens digitados não são persistidos pelo Swagger entre sessões.

Validação: `tests/integration/openapi.test.js` valida o documento com Swagger Parser, referências e identificadores de operação, além de carregar HTML/JavaScript do Swagger e confirmar que as rotas de dados continuam exigindo autenticação.

## Estorno auditável de pagamentos

`POST /api/pagamentos/:pagamentoId/estorno` recebe `{ "motivo": "Pagamento lançado na parcela errada" }`, com 5–500 caracteres. Somente o dono do pagamento pode executar. O valor, data, forma e registro original são preservados; acrescentam-se `estornado_em`, `estornado_por`, `motivo_estorno` e o evento `ESTORNO` no histórico do contrato. Uma repetição retorna 409.

A operação usa os mesmos bloqueios de contrato/parcela dos pagamentos. Atualização do lançamento, recálculo da parcela, reabertura da notificação e histórico pertencem à mesma transação. Uma falha desfaz tudo. Contratos com histórico de pagamentos continuam protegidos contra replanejamento que removeria parcelas vinculadas.

Pagamentos estornados saem do saldo recebido, dashboard, calendário de pagamentos, recebíveis e relatórios JSON/CSV/XLSX. A listagem de pagamentos retorna `CONFIRMADO` por padrão; `?status=ESTORNADO` e `?status=TODOS` permitem auditoria. O saldo reaberto aceita um novo pagamento legítimo. Reenviar a chave do pagamento antigo devolve a resposta original sem recriá-lo; recarregue a consulta para obter seu estado atual.

A migração `005-payment-reversals.js` adiciona os três campos com FK do responsável e restrição de metadados completos, preservando pagamentos existentes. Durante a integração, os filtros de tipo do calendário também foram corrigidos para nomear todas as colunas mesmo quando há apenas um tipo de evento.

Validação: `tests/mysql/paymentReversals.test.js` cobre reflexos em todo o financeiro, exportações, concorrência, isolamento, rollback por falha de histórico e migração de uma tabela antiga. `calendarTypes.test.js` cobre os quatro filtros do calendário com dados e sem registros.

## Contratos de resposta verificados

`tests/mysql/openapiContracts.test.js` compara vinte respostas HTTP reais com os schemas publicados no OpenAPI, incluindo datas, campos opcionais nulos, valores decimais, histórico, documentos e cálculos. A validação usa AJV com formatos habilitados; as referências são resolvidas no próprio documento, sem acesso externo. Os schemas refletem o histórico como lista e os campos nulos/decimais efetivamente retornados pelo MySQL.

As datas de leitura e estorno são gravadas em UTC e retornadas como ISO 8601 com `Z`, sem depender do fuso do driver MySQL. `tests/mysql/auditTimestamps.test.js` executa as operações e suas listagens com o driver em `-03:00` e confere o instante real, evitando um desvio de três horas na auditoria.
