# Roteiro das evoluções adicionais — backend da Sprint 2

Responsável pelo backend: Guilherme Bazon. Implementação preparada com assistência
do Codex; revisar os arquivos e executar os cenários antes da apresentação.
Estas entregas acrescentam comportamento ao backend já desenvolvido nesta sprint.

## Localização de cada entrega

| Entrega | Código principal | Evidência automatizada | Commit da funcionalidade |
| --- | --- | --- | --- |
| Pagamentos idempotentes | [idempotencyService](../api/src/services/idempotencyService.js), [paymentController](../api/src/controllers/paymentController.js) | [6 cenários](../api/tests/mysql/idempotency.test.js) | [01b5e4d](https://github.com/GuiBazon/contractflow/commit/01b5e4d8076b525daf00f02aab92a25de6135b14) |
| Proteção do login | [authRateLimit](../api/src/middlewares/authRateLimit.js), [rotas de autenticação](../api/src/routes/authRoutes.js) | [5 cenários](../api/tests/integration/authRateLimit.test.js) | [a2ba18f](https://github.com/GuiBazon/contractflow/commit/a2ba18fd628fa3e8e2607279a31933546dc5f493) |
| Recuperação por e-mail | [passwordRecoveryService](../api/src/services/passwordRecoveryService.js), [mailService](../api/src/services/mailService.js) | [13 cenários SMTP/MySQL](../api/tests/mysql/passwordRecovery.test.js) | [912cbfc](https://github.com/GuiBazon/contractflow/commit/912cbfcede07b9614712366ba1cd21abd797b583) |
| Leitura de notificações | [notificationService](../api/src/services/notificationService.js), [notificationRoutes](../api/src/routes/notificationRoutes.js) | [6 cenários](../api/tests/mysql/notifications.test.js) | [2a21aa7](https://github.com/GuiBazon/contractflow/commit/2a21aa7b35197b95d23ec8534a93f8f68879f0ca) |
| Swagger/OpenAPI | [especificação](../api/src/docs/openapi.js), [registro no Express](../api/src/app.js) | [documento/HTML](../api/tests/integration/openapi.test.js), [20 contratos reais](../api/tests/mysql/openapiContracts.test.js) | [513883a](https://github.com/GuiBazon/contractflow/commit/513883a1ffbea974b4d06698eefe04f569f703a4) |
| Estorno auditável | [paymentReversalService](../api/src/services/paymentReversalService.js), [consultas financeiras](../api/src/services/financeiroService.js) | [7 cenários](../api/tests/mysql/paymentReversals.test.js), [filtros do calendário](../api/tests/mysql/calendarTypes.test.js) | [4f67324](https://github.com/GuiBazon/contractflow/commit/4f67324) |

As migrações estão em [database/migrations](../api/database/migrations); o
[DER](DER.md) mostra somente as mudanças de estrutura efetivamente implementadas.

Estas evoluções acrescentam 64 testes aos 117 já existentes nesta sprint:
oito rápidos e 56 com MySQL/SMTP. A validação final tem 181 testes aprovados,
com 93,65% de cobertura combinada das linhas medidas. A documentação e os
testes de contrato/horários possuem commits próprios após os seis acima.

## Critérios de aceite para o card

| Entrega | Comportamento para conferir antes de concluir o item |
| --- | --- |
| Idempotência | Reenviar a mesma chave mantém o ID e o saldo; mudar o conteúdo retorna 409. |
| Limites de autenticação | Cinco falhas por conta bloqueiam a tentativa seguinte com 429 e `Retry-After`. |
| Recuperação | O SMTP recebe o link; redefinir revoga o JWT antigo e um segundo uso do link falha. |
| Notificações | Ler persiste após nova consulta; filtros e contador respeitam o usuário e o período. |
| Swagger | A documentação abre; login fornece o JWT e uma rota protegida pode ser executada após autorizar. |
| Estorno | Autor, data e motivo ficam registrados; saldo e relatórios mudam, e o pagamento original permanece. |

## Demonstração financeira

1. Entrar no sistema e abrir `/api/docs/`. Autorizar o JWT recebido no login.
2. Criar cliente e contrato com uma parcela de R$ 100.
3. Registrar R$ 30 enviando `Idempotency-Key` com um UUID. Reenviar exatamente
   a mesma operação com a mesma chave: conferir mesmo ID, recebido de R$ 30
   e resposta com `Idempotency-Replayed: true`.
4. Reutilizar a chave com outro valor: demonstrar o conflito 409.
5. Estornar o lançamento com um motivo. Consultar o pagamento com
   `status=ESTORNADO`, o histórico e o resumo: recebido volta a zero e o saldo
   pendente volta a R$ 100. O lançamento original continua registrado.
6. Se a parcela estiver vencida/próxima, marcar sua notificação como lida e
   conferir o contador. Pagar e estornar novamente demonstra o alerta reaberto.
7. Conferir que relatórios, calendário e dashboard acompanham o mesmo saldo.

Fluxo a explicar: interface → rota autenticada → validação → transação e bloqueios
do contrato/parcela → gravação e histórico → commit → resposta → atualização da tela.
Uma chave pertence ao usuário e à operação; pagamentos independentes recebem
chaves diferentes. Os clientes atuais precisam enviar o header para habilitar
a proteção contra reenvios.

## Demonstração de recuperação de senha

1. Solicitar recuperação pelo e-mail de uma conta de demonstração.
2. Conferir a mensagem capturada no Mailpit local e a validade do link.
3. Redefinir a senha usando o token em `/auth/reset-password`.
4. Demonstrar que o JWT anterior foi revogado e que o link não pode ser reutilizado.
5. Explicar que o token é aleatório, só seu hash fica no banco e a senha usa bcrypt.

A tela Web deve ler o token do link e chamar a rota de redefinição. O remetente,
servidor e credenciais SMTP reais são configurações de implantação. O teste local
usa um servidor SMTP capturado, sem enviar mensagens externas.

## Decisões técnicas para revisar

- **Transação da idempotência:** reserva da chave e pagamento confirmam juntos.
  Falha desfaz os dois; reenvio concorrente aguarda a primeira confirmação.
- **Resposta repetida:** representa a operação original. Para mostrar o saldo ou
  status atuais após outras operações, consultar novamente o recurso.
- **Estorno:** registra autor, data e motivo, sem apagar o lançamento. Os cálculos
  somam apenas pagamentos confirmados; o histórico conserva os dois eventos.
- **Notificação:** o evento vem das parcelas/contratos; apenas sua leitura é
  persistida. Isso evita um contador desatualizado quando a dívida é quitada.
- **Recuperação:** respostas genéricas evitam revelar contas; emissão e uso
  obedecem à mesma ordem de bloqueio. A troca incrementa a versão da sessão.
  Alterar senha, e-mail, perfil ou estado ativo também invalida links anteriores.
- **Limites:** falhas de login são limitadas por IP e por conta normalizada.
  O contador é por processo Node; várias instâncias exigem armazenamento compartilhado.
- **Contrato da API:** OpenAPI define os formatos, e AJV compara esses schemas
  com respostas reais do Express/MySQL, incluindo campos nulos e decimais.
- **Horários da auditoria:** leitura e estorno usam UTC com `Z` na resposta.
  [Dois cenários](../api/tests/mysql/auditTimestamps.test.js) verificam o instante
  com o driver MySQL no fuso brasileiro, sem alterar as datas civis dos vencimentos.

## Registro no card de backend

Adicionar estes seis itens ao checklist de evoluções da Sprint 2:

```text
Evitar pagamentos duplicados em reenvios com chave de idempotência.
Limitar tentativas de autenticação por conta e IP.
Recuperar senha por e-mail com token temporário e de uso único.
Persistir leitura e contador de notificações por usuário.
Disponibilizar e validar documentação interativa OpenAPI/Swagger.
Estornar pagamentos com justificativa, histórico e recálculo financeiro.
```

Para cada atualização, vincular commit, arquivo e teste. Os commits da etapa podem
ser consultados com `git log --oneline 50b693c..feature/sprint-2-backend`.
Nos critérios de aceite da API, usar os cenários acima e os resultados dos testes.
A integração nas telas Web/Mobile e a execução remota do Actions devem ter evidência
própria antes de marcar a entrega integrada como concluída.
