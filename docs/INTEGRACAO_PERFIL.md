# Integração de perfil e foto

Todos os endpoints abaixo usam `Authorization: Bearer <token>` e operam
exclusivamente sobre a conta autenticada. O perfil de acesso (`ADMIN` ou
`USUARIO`) e o estado da conta são gerenciados pelas rotas administrativas;
não podem ser alterados neste endpoint.

## Consultar e alterar o perfil

`GET /api/perfil` retorna `200`:

```json
{"usuario":{"id":1,"nome":"Ana Silva","email":"ana@example.com","perfil":"USUARIO","cargo":"Gerente","telefone":"11999999999","razao_social":"Empresa Exemplo","cnpj":"11222333000181","inscricao_estadual":null,"foto_url":"/api/perfil/foto"}}
```

`foto_url` é `null` quando não há foto. Campos opcionais não preenchidos são
`null`. Para alterar apenas alguns campos:

```sh
curl -X PATCH 'http://localhost:8080/api/perfil' \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nome":"Ana Silva","cargo":"Gerente","telefone":"11999999999"}'
```

Os campos editáveis são `nome`, `email`, `cargo`, `telefone`, `razao_social`,
`cnpj` e `inscricao_estadual`. Os campos opcionais aceitam `null` ou texto vazio
para limpeza. `nome` deve ter 2 a 150 caracteres; `cargo` e `razao_social`, até
150; `telefone` e `inscricao_estadual`, até 30. CNPJ, quando preenchido, deve
ser válido e é salvo com 14 dígitos. Campos desconhecidos ou privilegiados e
valores inválidos retornam `400`.

Para alterar `email`, envie também `senha_atual`. Um e-mail já cadastrado
retorna `409`. Uma troca bem-sucedida encerra todas as sessões, inclusive a
atual; o front deve limpar o token e solicitar novo login:

```json
{"email":"novo@example.com","senha_atual":"senha-atual"}
```

Resposta `200`:

```json
{"message":"Perfil atualizado; entre novamente","usuario":{"id":1,"nome":"Ana Silva","email":"novo@example.com","perfil":"USUARIO","cargo":null,"telefone":null,"razao_social":null,"cnpj":null,"inscricao_estadual":null,"foto_url":null},"sessao_encerrada":true}
```

Quando o e-mail não muda, `sessao_encerrada` é `false` e o token continua válido.
A troca de senha continua em `PATCH /api/auth/password`, com `senha_atual` e
`nova_senha`, e também encerra as sessões.

## Enviar, obter e remover a foto

`PUT /api/perfil/foto` recebe uma imagem no campo multipart **`foto`**:

```sh
curl -X PUT 'http://localhost:8080/api/perfil/foto' \
  -H "Authorization: Bearer $TOKEN" -F 'foto=@foto.png;type=image/png'
```

Resposta `200`: `{"message":"Foto atualizada","foto_url":"/api/perfil/foto"}`.
São aceitos PNG, JPEG e WebP com extensão e conteúdo compatíveis, até 2 MiB e
16 megapixels. A API decodifica e regrava a imagem no mesmo formato, aplica a
orientação e remove metadados. Imagem inválida retorna `400`; arquivo enviado ou
processado acima de 2 MiB retorna `413`. A imagem anterior permanece em caso de
falha. Uma nova foto substitui a anterior.

`GET /api/perfil/foto` retorna a imagem binária com seu `Content-Type`, ou `404`
quando não há foto. Como o endpoint exige Bearer, atribuir a URL diretamente a
`<img src>` não envia o token. Busque um blob autenticado e libere a URL ao
substituir ou desmontar o componente:

```js
const response = await fetch(`${apiBase}/perfil/foto`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!response.ok) throw new Error(`Foto indisponível (${response.status})`);
const fotoObjectUrl = URL.createObjectURL(await response.blob());
// Use fotoObjectUrl em <img src={fotoObjectUrl}> e, ao terminar:
// URL.revokeObjectURL(fotoObjectUrl);
```

`DELETE /api/perfil/foto` remove a foto e retorna `200` com
`{"message":"Foto removida","foto_url":null}`; repetir a remoção é seguro.
As fotos são armazenadas no diretório de uploads do servidor, que precisa de
volume persistente e backup em produção. Para múltiplas instâncias, use
armazenamento compartilhado. Uma leitura simultânea à substituição pode receber
`404` transitório; o front pode refazer a consulta. Interrupção abrupta pode
deixar arquivo órfão no volume; monitore o armazenamento. O processamento ainda
não possui um limite de concorrência específico por processo.
