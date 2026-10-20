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
