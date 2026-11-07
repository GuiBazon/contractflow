# Integração de relatórios

A API usa o JWT obtido no login (`Authorization: Bearer <token>`). Os dados são
sempre do usuário autenticado. Para consultar, use `GET /api/relatorios/:tipo`;
sem `formato`, a resposta é JSON paginado. Para baixar, use o mesmo endpoint com
`formato=csv`, `xlsx` ou `pdf` (sem distinção entre maiúsculas e minúsculas).

| Tipo | Período `de`/`ate` (inclusivo) | Outros filtros aplicados |
| --- | --- | --- |
| `financeiro` | pagamentos, despesas e vencimentos | nenhum |
| `recebiveis` | vencimento da parcela | `cliente`, `contrato`, `situacao` |
| `receitas` | data do pagamento | `cliente`, `contrato` |
| `despesas` | data da despesa | `status`, `categoria`, `q` |
| `contratos` | data de início | `cliente`, `contrato`, `status` |

Datas são `AAAA-MM-DD`; IDs são inteiros positivos. O resumo financeiro contém
indicadores, não uma listagem de lançamentos. Para os outros tipos a exportação
inclui todos os resultados filtrados, independentemente da página mostrada. Se
ultrapassar 10.000 registros, retorna `413` em JSON e é necessário refinar os
filtros; o arquivo não é truncado. Filtros inválidos retornam `400`, e token
inválido ou ausente retorna `401`.

O PDF verifica os caracteres antes de iniciar o download. Se algum não puder
ser representado pela fonte incorporada, ou estiver fora do plano básico Unicode
(por exemplo, muitos emojis), retorna
`422` em JSON; ofereça CSV ou XLSX como alternativa. O arquivo PDF apresenta
os registros em blocos identificados pelos nomes dos campos.

Exemplo de download PDF:

```sh
curl -f -G 'http://localhost:8080/api/relatorios/despesas' \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode 'formato=pdf' --data-urlencode 'de=2026-01-01' \
  --data-urlencode 'ate=2026-12-31' --data-urlencode 'status=PAGA' \
  -o despesas.pdf
```

A resposta de sucesso é binária, com `Content-Type: application/pdf` e
`Content-Disposition: attachment; filename="contractflow-despesas.pdf"`. CSV usa
`text/csv` com BOM UTF-8 e separador `;`; XLSX usa
`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. Seus nomes
seguem o mesmo padrão de arquivo. Leia erros como JSON, não como arquivo de
sucesso. Por exemplo, no navegador:

```js
async function baixarRelatorio(token, tipo, filtros, formato) {
  const query = new URLSearchParams({ ...filtros, formato });
  const response = await fetch(`/api/relatorios/${tipo}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const erro = await response.json().catch(() => ({}));
    throw new Error(erro.message || `Falha na exportação (${response.status})`);
  }
  const url = URL.createObjectURL(await response.blob());
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = `contractflow-${tipo}.${formato}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
```
