# Integração de importação por OCR

Este guia descreve a API da branch de backend da Sprint 2. A base dos exemplos é `http://localhost:8080/api`; ajuste-a para o ambiente. Todas as rotas abaixo exigem `Authorization: Bearer <token>` obtido no login. A referência interativa completa está em `/api/docs` e o documento OpenAPI em `/api/openapi.json`.

## 1. Enviar e obter sugestões

Envie um único arquivo no campo **`arquivo`** de um formulário multipart. São aceitos PDF (`.pdf`), JPEG (`.jpg` ou `.jpeg`), PNG (`.png`) e WebP (`.webp`), com MIME e extensão correspondentes, até 10 MiB. PDFs aceitam no máximo 10 páginas. O servidor confere também a assinatura do arquivo. O processamento é síncrono: aguarde a resposta antes de avançar.

```bash
curl -X POST 'http://localhost:8080/api/ocr/extract' \
  -H 'Authorization: Bearer <token>' \
  -F 'arquivo=@contrato.pdf;type=application/pdf'
```

Exemplo de resposta `201 Created` (os campos reconhecidos dependem do documento):

```json
{
  "extracao_id": 42,
  "dados": {
    "cliente_nome": "Empresa Exemplo",
    "cpf_cnpj": "11.222.333/0001-81",
    "numero": "OCR-DEMO-001",
    "valor_total": 1000,
    "quantidade_parcelas": 2,
    "vencimentos": ["2027-01-10", "2027-02-10"],
    "data_inicio": "2027-01-10",
    "data_fim": "2027-02-10"
  },
  "campos": ["cliente_nome", "cpf_cnpj", "numero", "valor_total", "quantidade_parcelas", "vencimentos", "data_inicio", "data_fim"],
  "confianca": 95,
  "aviso": null
}
```

`dados` contém apenas sugestões identificadas, podendo estar vazio ou incompleto. `campos` indica o que foi identificado; `confianca` é uma pontuação heurística baseada na quantidade de campos, **não** uma probabilidade de acerto. Exiba também `aviso` quando não for nulo. Guarde `extracao_id` e apresente todos os dados para conferência humana: nenhuma extração, por si só, cria cliente, contrato ou parcelas.

Por padrão o OCR roda localmente. Opcionalmente, o servidor pode encaminhar o
arquivo a um serviço Python configurado por `PYTHON_OCR_ENABLED=true` e
`PYTHON_OCR_URL` (padrão `http://127.0.0.1:8000`). O timeout de comunicação é
`PYTHON_OCR_TIMEOUT_MS`, em milissegundos, com padrão de 120000. A API valida
tipo, tamanho e limite de páginas antes do envio; se o serviço estiver
indisponível, exceder o timeout ou devolver resposta inválida, usa o OCR local.
O serviço configurado recebe o conteúdo integral do documento; use um endereço
confiável e preserve seu acesso. Não há mudança no contrato da interface.

No navegador, deixe o próprio `fetch` definir o `Content-Type` multipart e seu boundary:

```js
const form = new FormData();
form.append('arquivo', arquivoSelecionado);
const response = await fetch(`${apiBase}/ocr/extract`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});
const resultado = await response.json();
if (!response.ok) throw new Error(resultado.message || 'Falha na importação');
// Guardar resultado.extracao_id e abrir formulário de revisão com resultado.dados.
```

## 2. Consultar e revisar

`GET /ocr/{id}` retorna uma extração pertencente ao usuário autenticado. Exemplo `200`:

```json
{
  "extracao_id": 42,
  "nome_original": "contrato.pdf",
  "tipo_arquivo": "application/pdf",
  "status": "PENDENTE",
  "confianca": 95,
  "dados": { "numero": "OCR-DEMO-001", "valor_total": 1000 }
}
```

Os estados são `PENDENTE`, `CONFIRMADA` e `CANCELADA`. A consulta não retorna o texto reconhecido, `campos` ou `aviso`; preserve-os no front enquanto necessário. Não há endpoint para listar extrações; guarde o identificador para retomada.

Para salvar uma revisão ainda pendente, use `PATCH /ocr/{id}` com o **objeto completo** revisado em `dados`. A operação substitui o objeto salvo, não faz mesclagem parcial. É opcional antes da confirmação e não cria o contrato.

```bash
curl -X PATCH 'http://localhost:8080/api/ocr/42' \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{"dados":{"cliente_id":1,"numero":"IMPORTADO-001","valor_total":1000,"quantidade_parcelas":2,"data_inicio":"2027-01-10"}}'
```

Resposta `200`:

```json
{"message":"Dados revisados com sucesso","extracao_id":42,"dados":{"cliente_id":1,"numero":"IMPORTADO-001","valor_total":1000,"quantidade_parcelas":2,"data_inicio":"2027-01-10"}}
```

A revisão aceita `cliente_id`, `cliente_novo`, `cliente_nome`, `cpf_cnpj`, `numero`, `tipo`, `descricao`, `valor_total`, `valor_parcela`, `quantidade_parcelas`, `data_inicio`, `data_fim`, `vencimentos`, `forma_pagamento`, `juros_percentual`, `multa_percentual` e `observacoes`; campos adicionais retornam `400`. Datas usam `AAAA-MM-DD`. O PATCH valida a estrutura e os nomes dos campos, mas as regras de criação são verificadas na confirmação.

## 3. Confirmar ou cancelar

`POST /ocr/{id}/confirmar` exige reenviar o objeto **completo** em `dados`, mesmo depois de um PATCH. Selecione um cliente existente da conta com `cliente_id`, ou informe `cliente_novo` com nome e CPF/CNPJ válido. As sugestões `cliente_nome` e `cpf_cnpj` isoladas **não** criam nem selecionam cliente automaticamente; o front deve montar `cliente_novo` ou solicitar a seleção. Se já existir cliente com o mesmo CPF/CNPJ nessa conta, ele será reutilizado.

```bash
curl -X POST 'http://localhost:8080/api/ocr/42/confirmar' \
  -H 'Authorization: Bearer <token>' -H 'Content-Type: application/json' \
  -d '{"dados":{"cliente_novo":{"nome_razao_social":"Empresa Exemplo","cpf_cnpj":"11222333000181"},"numero":"IMPORTADO-001","valor_total":1000,"quantidade_parcelas":2,"data_inicio":"2027-01-10"}}'
```

Resposta `201`:

```json
{"message":"Contrato confirmado e criado com sucesso","contrato_id":123,"numero":"IMPORTADO-001"}
```

A confirmação usa as regras de criação de contrato: valor total válido, de 1 a 120 parcelas e datas válidas. Informe `data_inicio` para gerar vencimentos mensais ou uma lista `vencimentos`; caso forneça ambos `quantidade_parcelas` e `vencimentos`, as quantidades devem coincidir. Quando `valor_parcela` for informado, sua soma deve corresponder ao valor total. Se o número não for informado, a API usa `OCR-{id}`. Se `valor_total` faltar, a API tenta calculá-lo por `valor_parcela × quantidade_parcelas`; envie ambos para usar esse cálculo. Revise sempre as datas e os valores antes de confirmar.

Cliente, contrato, parcelas, vínculo do documento original e histórico são criados na mesma operação. Em falha, a transação é revertida. Uma confirmação concorrente ou repetida recebe `409`, portanto, após interrupção ou dúvida, consulte `GET /ocr/{id}` antes de tentar novamente. A consulta não retorna o ID do contrato criado; se a resposta de confirmação foi perdida, procure o contrato pelo número revisado. O original confirmado pode ser obtido pelas rotas de documentos do contrato; sua exclusão é protegida.

Para descartar uma extração pendente, use `DELETE /ocr/{id}`. A resposta `200` é `{"message":"Extração cancelada"}`. A operação remove o arquivo pendente e mantém o registro com status `CANCELADA`; não é possível confirmar, alterar ou cancelar novamente uma extração que não esteja pendente.

## Erros e estados para a interface

O corpo de erro geralmente tem a forma `{"message":"..."}`. Apresente a mensagem quando disponível e mantenha o formulário para correção.

| HTTP | Exemplos e ação sugerida |
| --- | --- |
| 400 | Arquivo ausente/inválido, campo desconhecido ou dados inválidos na confirmação; permita corrigir e reenviar. |
| 401 | Token ausente, inválido ou revogado; solicite autenticação. |
| 403 | Conta sem permissão ou desativada. |
| 404 | Extração inexistente ou de outro usuário; não exponha dados de outra conta. |
| 408 | OCR excedeu o tempo por página; tente arquivo menor. |
| 409 | Extração já finalizada, número duplicado ou original ausente; consulte o estado e trate a mensagem. |
| 413 | Arquivo acima de 10 MiB ou PDF acima de 10 páginas. |
| 429 | OCR ocupado (limite de duas leituras simultâneas por processo); permita nova tentativa após aguardar. |
| 500/503 | Falha interna ou conversor de PDF indisponível; informe indisponibilidade e permita tentar mais tarde. O tratamento geral pode substituir a mensagem técnica por uma mensagem genérica. |

## Limitações atuais a considerar no front

- A extração usa expressões heurísticas em português. Campos e datas podem estar errados, ausentes ou incompletos; qualquer linha com data pode ser interpretada como vencimento. A pontuação não garante qualidade. Permita editar e excluir sugestões, inclusive a lista de vencimentos.
- No processamento local, PDF com pelo menos 20 caracteres de texto extraído usa esse texto sem executar OCR nas páginas digitalizadas. Assim, um PDF misto pode ter conteúdo de páginas em imagem omitido. Uma extração vazia ou de baixa qualidade não significa que o documento esteja vazio.
- O OCR de PDF digitalizado depende de `pdftoppm` no servidor, além dos dados de idioma português do Tesseract. Pode ser demorado; apresente estado de carregamento e trate timeout e indisponibilidade. A concorrência limitada é por processo, não uma fila distribuída.
- A API não devolve o texto bruto nem oferece listagem de extrações; o front precisa preservar o identificador. Uma confirmação não é idempotente em sua resposta: repetir retorna conflito, embora a transação impeça criar dois contratos.
- A cobertura de integração em `api/tests/mysql/ocr.test.js` exercita PDF textual, PNG e PDF escaneado, confirmação concorrente, rollback e isolamento entre usuários. Ela não garante qualidade para todos os layouts ou para PDFs mistos.
