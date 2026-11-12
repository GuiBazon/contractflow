# Adaptações para integrar o front principal

Esta lista compara a `main` do front (ca92f0a) com o backend da branch
`feature/sprint-2-backend`. O `front-teste` é outra implementação; não presumir
que as alterações dele já estejam na `main`.

## Prioridade antes da entrega

1. **Importação OCR:** em `web/src/pages/contratos/importar_contrato.jsx`, a falha
   da extração ainda avança para a revisão; sem `extracao_id`, há fallback que
   cadastra cliente e contrato, com valores padrão como 36.000 e 12 parcelas.
   Isso pode gravar dados não confirmados e sem documento original. Bloqueie a
   confirmação após falha e exija extração válida e revisão explícita. Monte
   `cliente_id` ou `cliente_novo`, envie novamente `dados` completos à confirmação
   e não envie uma lista de um único vencimento para várias parcelas. Se usar
   `data_inicio`, a API pode gerar os vencimentos; não envie `valor_parcela`
   arredondado quando sua soma não fechar o total. Veja [OCR](INTEGRACAO_OCR.md).
2. **Perfil/foto e senha:** a main usa `/usuarios/:id`, restrito a ADMIN, e os
   botões de foto são placeholders. Use `/perfil` e `/perfil/foto`; baixe a foto
   com Bearer como blob. Para senha, use `PATCH /auth/password` com
   `senha_atual` e `nova_senha`, e peça novo login após sucesso. O contrato e os
   exemplos estão em [perfil](INTEGRACAO_PERFIL.md).
3. **Relatórios e consultas financeiras:** a exportação local da main não é um
   XLSX real e usa apenas parte dos registros. Integre `/relatorios/:tipo` com
   `formato=csv|xlsx|pdf` e os filtros desejados, tratando 413 e 422. Dashboard,
   financeiro e calendário também devem consumir `/dashboard`, `/recebiveis`,
   `/receitas`, `/despesas` e `/calendario`, respeitando os filtros e a
   paginação, em vez de calcular indicadores a partir das primeiras páginas.
   Veja [relatórios](INTEGRACAO_RELATORIOS.md).
4. **Calculadora:** utilize `/calculadora/parcelas`, `/calculadora/saldo` e
   `/calculadora/projecao` para manter as regras do servidor. A API não fornece
   `/calculadora/historico`; a tela não deve apresentar histórico persistido como
   se já existisse.

## Dependências e escopo ainda pendente

- As notificações persistem o estado de leitura de alertas derivados; preferências
  por canal e envio automático de e-mail/push ainda não existem no backend.
- A recuperação de senha existe na API, mas exige SMTP e `PASSWORD_RESET_URL`
  configurados; a tela principal ainda precisa integrá-la.
- Despesa paga protege valor, data, situação e exclusão. Não há estorno de
  despesa; a regra de negócio precisa ser definida antes de oferecer a operação.
- Documentos, extrações e fotos usam arquivos em disco; a implantação precisa
  preservar o volume, mantê-lo em backup e compartilhá-lo entre instâncias.
  Não foi feita uma avaliação de carga ou de implantação distribuída.
