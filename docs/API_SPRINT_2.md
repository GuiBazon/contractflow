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

## Dashboard e projeção — RF27/32

`GET /api/dashboard?de=2026-10-01&ate=2026-10-31`

Resposta: `periodo`, `clientes`, `contratos_ativos`, `recebido`, `pendente`,
`atrasado`, `despesas_pagas`, `despesas_pendentes`, `saldo_realizado`,
`saldo_projetado`, `fluxo_mensal: [{ mes, receitas, despesas, saldo }]` e até 10
`proximos_vencimentos` ainda não vencidos. Indicadores consideram todos os registros.
Clientes/contratos ativos são contagens atuais independentes do intervalo.

Sem `de/ate`, indicadores financeiros consideram todo o histórico. Com filtro,
receitas usam data de pagamento, recebíveis usam vencimento, despesas usam data
do lançamento. `saldo_realizado = recebido − despesas_pagas`;
`saldo_projetado = saldo_realizado + pendente − despesas_pendentes`.
São saldos dos registros da aplicação, sem saldo bancário inicial. Despesas
canceladas e principal de parcelas canceladas ficam fora da projeção.

## Calendário — RF29 / RN15

`GET /api/calendario?de=2026-10-01&ate=2026-10-31`

Intervalo obrigatório, máximo 366 dias. `tipo` opcional:
`VENCIMENTO|PAGAMENTO|DESPESA|RENOVACAO`. Paginação `page` e `limit` (padrão
1000, máximo 5000) permite percorrer todos os eventos sem perda silenciosa.

Cada item contém `id` estável (ex.: `parcela-1`), `tipo`, `data`, `titulo`, `valor`,
`situacao`, `contrato_id`, `contrato_numero`, `cliente_nome`, `parcela_id`.
Campos de contrato são nulos para despesas. Vencimento representa saldo em
aberto; pagamento representa a movimentação realizada. Quitadas/canceladas não
geram vencimento aberto. RENOVACAO identifica término de contrato ativo/em renovação.

## Alertas em tela — RF30/31/39/42

`GET /api/alertas?dias=7&page=1&limit=20` (`dias`: 1–90).
`/api/notificacoes` é alias da mesma consulta.

Retorna parcelas com saldo vencido (`ATRASO`), próximas do vencimento
(`VENCIMENTO`) e contratos próximos do término (`RENOVACAO`), com paginação.
Dados são derivados no momento da consulta; não há envio de push/e-mail,
marcação de leitura ou agendamento externo. Renovação efetiva pode ser registrada
por novo contrato e histórico/status do contrato anterior, conforme fluxo da equipe.

## Relatórios — RF37/38

`GET /api/relatorios/:tipo?de=2026-10-01&ate=2026-10-31&formato=json`

Tipos: `financeiro`, `recebiveis`, `receitas`, `despesas`, `contratos`.
Formatos: `json` (padrão), `csv`, `xlsx`. JSON é paginado; financeiro retorna
o resumo agregado. Exportações incluem **todos** os resultados filtrados, até
10000 registros; acima disso retornam 413 pedindo filtros mais restritos.

Recebíveis usam os mesmos filtros e resumo de `/recebiveis`; receitas aceitam
cliente/contrato e período do pagamento; despesas aceitam categoria/status/busca
e período do lançamento; contratos aceitam cliente/contrato/status e período do início.
Financeiro utiliza as mesmas regras de `/dashboard`.

CSV usa UTF-8 com BOM, separador `;`, campos escapados e neutralização de fórmulas.
XLSX preserva números e textos em células próprias. Resposta de exportação é
binária/texto com `Content-Disposition: attachment`; o cliente deve solicitar
`responseType: 'blob'` no Web e usar download/compartilhamento apropriado no Mobile.

## Importação de documentos — RF08–13 / RN09/10/17/18

1. `POST /api/ocr/extract`: multipart `arquivo`, PDF/JPEG/PNG/WebP, até 10 MB.
   Retorna 201 com `extracao_id`, `dados`, `campos`, `confianca` e `aviso`.
2. `GET /api/ocr/:id`: consulta própria extração e seu status.
3. `PATCH /api/ocr/:id`: `{ "dados": { ...campos revisados... } }`.
   `dados_json` é aceito como alias para compatibilidade com a documentação antiga.
4. `POST /api/ocr/:id/confirmar`: `{ "dados": { ...campos revisados... } }`.
5. `DELETE /api/ocr/:id`: cancela uma extração pendente.

Confirmação aceita `cliente_id` próprio ou
`cliente_novo: { nome_razao_social, cpf_cnpj }` com CPF/CNPJ válido. Se esse
CPF/CNPJ já existe para a conta, reutiliza o cliente. Obrigatórios financeiros:
valor total, quantidade (1–120) ou lista de vencimentos, data de início se não
houver lista. Taxas entre 0 e 100, com até duas casas decimais. `numero` omitido
vira `OCR-<id>`; preferir revisar explicitamente. Valores fixos de parcela devem
somar o total do contrato. Centavos remanescentes ficam na última parcela.

PDF textual usa extração direta; PDF escaneado usa Poppler + Tesseract em
português, até 10 páginas. O modelo de idioma é instalado pelo npm, sem download
durante a extração. Instalação local de Poppler: `apt-get install poppler-utils`
em Debian/Ubuntu; Docker e GitHub Actions já incluem esse passo.

Revisão não cria contrato. Confirmação bloqueia a extração e cria cliente,
contrato, parcelas, documento ORIGINAL e histórico em uma única transação.
Arquivo é copiado antes do commit; em erro, a cópia é removida e o banco revertido.
Repetição/concorrência recebe 409; recursos de outra conta recebem 404.
Interrupção abrupta do processo pode deixar cópia sem referência no disco;
compensação automática cobre falhas retornadas pela operação, não falhas do host.

`confianca` é um indicador heurístico de campos encontrados, não garantia de
precisão. Conferência humana permanece obrigatória. Servidor limita a dois
processamentos simultâneos (429 se ocupado), conversão e OCR têm limites de tempo.
Arquivos inválidos recebem 400; documento muito grande/páginas demais recebe 413.
Para PDFs escaneados grandes, o cliente precisa de timeout compatível com o
processamento; as amostras de apresentação são de uma página.
