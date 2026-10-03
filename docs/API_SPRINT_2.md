# ContractFlow — Contratos de integração da Sprint 2

Base: `/api`. Rotas abaixo exigem `Authorization: Bearer <token>`.
Erros retornam `{ "message": "..." }`. Datas civis são strings `AAAA-MM-DD`;
valores monetários das novas rotas são números em reais com até duas casas decimais.
Listagens paginadas retornam `data` e `paginacao: { page, limit, total, totalPages }`.
Limite padrão 20, máximo 100; valores inválidos recebem 400.
Dados financeiros sempre pertencem ao usuário autenticado, inclusive ADMIN.

## Recebíveis — RF19/20/22/23/24

`GET /api/recebiveis?page=1&limit=20&de=2026-10-01&ate=2026-10-31`

Filtros opcionais: `de/ate` pelo vencimento, `cliente`, `contrato`,
`situacao=PENDENTE|PAGA|VENCIDA|CANCELADA`. Datas inválidas/invertidas recebem 400.

```json
{
  "data": [{
    "id": 1, "numero": 1, "contrato_id": 1,
    "contrato_numero": "CT-001", "cliente_id": 1, "cliente_nome": "Cliente",
    "valor": 500, "pago": 100, "pendente": 400,
    "data_vencimento": "2026-09-01", "situacao": "VENCIDA",
    "dias_atraso": 30, "juros_percentual": "2.00", "multa_percentual": "2.00",
    "juros": 8, "multa": 8, "total_atualizado": 416
  }],
  "resumo": { "total": 1, "recebido": 100, "pendente": 400, "atrasado": 400 },
  "paginacao": { "page": 1, "limit": 20, "total": 1, "totalPages": 1 }
}
```

Resumo considera **todos** os resultados dos filtros, não somente a página.
Saldo principal = valor da parcela − pagamentos. Parcela cancelada tem pendente
zero; vencida só quando vence antes de hoje e ainda possui saldo. Juros/multa são
estimativas sobre saldo em aberto: multa única e juros mensais proporcionais a
30 dias. Não são adicionados automaticamente ao registro do pagamento, que
continua limitado ao principal; cobrança efetiva de encargos exige regra própria.

Pagamento e alteração de parcela usam lock na mesma linha dentro da transação.
Oito requisições concorrentes de R$ 70 para uma parcela de R$ 100 permitem
somente uma e rejeitam as demais com 400. Alterar/cancelar parcela com pagamentos
continua bloqueado conforme a operação; não é possível marcar como paga sem pagar.

## Despesas — RF25 / RN11

| Método | URL | Comportamento |
| --- | --- | --- |
| GET | `/api/despesas` | Lista com paginação, `q`, `categoria`, `status`, `de/ate` |
| POST | `/api/despesas` | Cria; retorna 201 e `{ message, despesa }` |
| GET | `/api/despesas/:id` | Retorna despesa do usuário; 404 se inexistente/alheia |
| PUT ou PATCH | `/api/despesas/:id` | Atualiza campos fornecidos; `{ message, despesa }` |
| DELETE | `/api/despesas/:id` | Remove registro ainda não pago; 409 se pago |

```json
{ "descricao": "Aluguel", "categoria": "FIXAS", "valor": 450.50,
  "data": "2026-10-01", "status": "PENDENTE", "observacoes": "Sala comercial" }
```

Obrigatórios na criação: descrição (1–200 caracteres), valor positivo, data válida.
Categoria até 100 caracteres; status `PENDENTE` (padrão), `PAGA`, `CANCELADA`.
Data representa vencimento de pendentes ou lançamento do desembolso quando pago.
Despesa paga preserva valor, data e status e só permite ajuste descritivo; não há
estorno financeiro nesta entrega. Campos financeiros recebem 409 ao tentar alterá-los.

## Compatibilidade do núcleo

Parcelas, pagamentos e documentos têm caminhos canônicos sob
`/api/contratos/:contratoId/...` e mantêm os caminhos planos do Mobile.
`GET /api/pagamentos` é alias compatível de `GET /api/receitas`; novas integrações
devem utilizar `/receitas`. A configuração da URL da API continua sendo tarefa
dos clientes; um IP privado gravado no código não serve a todas as redes.
