# Relatório Sprint 2 — Front-end (Eduardo Augusto Tognati)

**Data da execução:** 29/10/2026
**Branch:** `eduardo-tela-calendario`
**Repositório:** https://github.com/GuiBazon/contractflow
**Cartão Trello:** https://trello.com/c/R2CgW3vm/12-front-end-eduardo-sprint-2

## 1. Objetivo

Evoluir a tela de calendário do front-end web da Sprint 2, transformando o rascunho
existente em um **calendário financeiro** que mostra os vencimentos das parcelas dos
contratos do usuário, além dos compromissos locais já previstos na tela.

O cartão do Trello não pôde ser lido nesta execução (a página retornou erro de
carregamento/bloqueio de recursos). Por isso, o escopo foi definido a partir do código
existente e dos requisitos versionados em `docs/REQUISITOS.md`, em especial:

- **RF29 — Calendário financeiro (prioridade ALTA, pendente):** "Derivável de parcelas; falta endpoint".
- **RN15 — Vencimentos alimentam o calendário:** "Derivado de `parcelas.data_vencimento`".
- **RNF07 — Responsividade** e **RNF20 — Acessibilidade**.

Nenhum requisito foi inventado a partir do cartão inacessível.

## 2. Problemas identificados

1. A rota `/calendar` e o botão de acesso na Home existiam apenas como rascunho local
   (não commitado) e o calendário não tinha relação com os contratos: só gravava
   compromissos pessoais em `localStorage`.
2. O formulário de compromisso tinha um **bug real**: o botão "Cancelar" não possuía
   `type="button"` e, dentro do `<form>`, disparava o `submit`. Com um título preenchido,
   cancelar salvava o evento mesmo assim.
3. A constante `hoje` era criada no escopo do módulo, ficando desatualizada se a página
   permanecesse aberta por muito tempo.
4. A grade do mês exibia apenas espaços vazios antes do dia 1, sem os dias dos meses
   vizinhos, dificultando a leitura das semanas.
5. Não havia estados de carregamento, erro ou ausência de dados para a API, nem
   tratamento de falha parcial (um contrato com erro não deveria esconder os demais).
6. O cliente HTTP não possuía função para consultar as parcelas (`GET /api/parcelas/:contratoId/parcelas`).
7. Questões de acessibilidade: os botões dos dias não tinham rótulo acessível, o alvo de
   toque era pequeno e os campos de data/hora não tinham o rótulo ajustado.
8. O repositório continha um clone aninhado acidental na raiz (`contractflow/`) que havia
   sido adicionado ao índice como *gitlink*, além de um `package-lock.json` vazio na raiz.
   Esses arquivos não fazem parte do projeto e foram removidos do índice (o clone foi
   preservado no disco e passou a ser ignorado).
9. `web/src/pages/login/login.jsx` tinha uma alteração preparada apenas de indentação,
   sem efeito funcional; ela foi descartada para não poluir o histórico.

## 3. Funcionalidades e correções implementadas

### Calendário financeiro (RF29 / RN15)

- Consulta os contratos do usuário (`GET /api/contratos?limit=100`) e, em paralelo, as
  parcelas de cada contrato (`GET /api/parcelas/:contratoId/parcelas`).
- Usa `Promise.allSettled` para que a falha de um contrato não impeça a exibição dos
  demais; exibe aviso quando há falha parcial ou total da API.
- Converte cada parcela em um evento de vencimento com número da parcela, número do
  contrato, cliente, valor e situação (`PAGA`, `PENDENTE`, `VENCIDA`, `CANCELADA`).
- Mostra marcadores coloridos por situação no dia e legenda de cores.
- Exibe resumo financeiro do conjunto: **A vencer**, **Vencido** e **Pago**.
- Permite ligar/desligar a exibição dos vencimentos, mantendo os compromissos locais.
- Pesquisa por título, cliente ou contrato e filtro por tipo/categoria.

### Correções e usabilidade

- Corrigido o botão "Cancelar" para não enviar o formulário (`type="button"`).
- `hoje` passou a ser calculado na renderização, evitando data congelada.
- Grade do mês agora inclui os dias dos meses vizinhos (esmaecidos) e sempre completa
  semanas de domingo a sábado; clicar em um dia vizinho navega para o mês correto.
- Estados de carregamento (`CircularProgress`), erro (`Alert`) e vazio contextual.
- Botões de dia com `aria-label` completo e `aria-pressed`, alvo de toque de 52 px.
- Campos `type="date"`/`type="time"` com rótulo sempre visível e limites de caracteres
  no título.
- Contagem de itens no mês no cabeçalho.

### Infraestrutura de testes

- Adicionado **Vitest** com ambiente `jsdom`, `@testing-library/react`,
  `@testing-library/jest-dom` e `@testing-library/user-event`.
- Scripts `npm test` e `npm run test:watch`.
- Testes unitários das regras de data, eventos e vencimentos.
- Testes de componente cobrindo a renderização dos vencimentos e a regressão do
  botão "Cancelar".

## 4. Arquivos modificados e motivo

| Arquivo | Alteração |
|---------|-----------|
| `web/src/utils/calendar.js` | **Novo.** Regras puras de data, grade do mês, leitura/normalização de eventos, extração de vencimentos, filtros, agrupamento, resumo e cores. |
| `web/src/pages/home/calendar.jsx` | **Novo (rascunho evoluído).** Tela de calendário integrada aos vencimentos, com correções de cancelamento, navegação, estados de API e acessibilidade. |
| `web/src/App.jsx` | Rota protegida `/calendar` para a tela. |
| `web/src/pages/home/home.jsx` | Botão de acesso ao calendário ao lado de "Sair". |
| `web/src/axios/axios.js` | `getContratos` aceita parâmetros de consulta; novo `getParcelas(contratoId)`. |
| `web/vite.config.js` | Configuração do Vitest (`jsdom` + setup). |
| `web/package.json` | Scripts de teste e dependências de desenvolvimento. |
| `web/package-lock.json` | Atualizado pelas dependências de teste. |
| `web/src/utils/calendar.test.js` | **Novo.** 37 testes unitários das regras do calendário. |
| `web/src/pages/home/calendar.test.jsx` | **Novo.** 3 testes de componente (vencimentos, cancelar e salvar). |
| `web/src/test/setup.js` | **Novo.** Setup do Testing Library e limpeza entre testes. |
| `.gitignore` | Ignora o clone aninhado acidental `/contractflow/`. |
| `docs/relatorio-sprint-2-eduardo.md` | **Novo.** Este relatório. |

## 5. Testes e validações executados

Comandos executados em `web/`:

| Comando | Resultado |
|---------|-----------|
| `npm test` | **40 testes aprovados** em 2 arquivos (37 unitários + 3 de componente). |
| `npm run lint` | **Sem erros** (ESLint). |
| `npm run build` | **Build concluído com sucesso** (Vite). Aviso apenas informativo de *chunk* acima de 500 kB, já existente no projeto. |
| `git diff --check` | **Sem erros** de espaços em branco ou conflitos. |

## 6. Observações

- A API não foi alterada; o front-end consome os endpoints já documentados em
  `docs/ENDPOINTS.md`.
- Como não existe endpoint agregado de parcelas por usuário, a tela faz uma requisição
  de parcelas por contrato (limitada aos 100 contratos mais recentes retornados pela
  listagem). Caso o backend exponha um endpoint agregado no futuro, a consulta pode ser
  simplificada sem mudar a interface.
- O cartão do Trello não estava acessível durante a execução; o escopo foi baseado no
  código e nos requisitos versionados, conforme registrado na seção 1.
- **Transparência:** esta contribuição foi implementada com apoio de ferramentas de IA
  (agente de codificação), com revisão, execução de testes, lint e build antes dos commits.
