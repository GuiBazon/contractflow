# ContractFlow — Plano de backend para a Sprint 2

Entrega informada: **03/11, às 23:59**. Plano preparado em 02/10/2026.
Referência técnica: checkout no commit `e753de5`, última entrega registrada em 10/09.
Este plano foi atualizado após a execução do backend. A seção 2 preserva o
diagnóstico inicial; o estado atual e os commits estão na seção 9 e em
[ENTREGA_SPRINT_2.md](ENTREGA_SPRINT_2.md).
Responsabilidade confirmada pelo usuário: todo o backend, incluindo OCR, financeiro
e testes. Execução autorizada ao assistente; a disponibilidade do usuário não
limita a implementação. Revisão e ensaio seguem necessários para a apresentação.

## 1. O que a avaliação exige

Na Sprint 1, os pontos informados somam 73,5/100. As maiores perdas foram:

- Demonstração do sistema: 5/25, perda de 20 pontos.
- Organização de tarefas e cenários de teste: 1/5, perda de 4 pontos.
- Compreensão da integração: 12,5/15, perda de 2,5 pontos.

Explicação técnica (25/25) e evidências individuais (15/15) foram pontos fortes.
A nota identifica critérios pouco evidenciados; não estabelece sozinha a causa
da dificuldade na apresentação.

| Critério da Sprint 2 | Pontos | Evidência a preparar |
| --- | ---: | --- |
| Requisitos, interfaces e CRUDs | 5 | Matriz requisito → operação → tela → teste |
| Testes e GitHub Actions | 15 | Casos organizados, execução automática em commits/PRs, resultado verificável |
| Produto final funcionando | 25 | Demonstração Web e Mobile com dados reais, incluindo contribuição individual |
| Domínio técnico individual | 25 | Explicação de implementação, validações, regras, erros e evolução desde a Sprint 1 |
| Rastreabilidade individual | 15 | Card → responsável → branch/commit/PR → funcionalidade → teste → conclusão |
| Integração e autonomia | 15 | Explicar entrada, processamento, banco, resposta e tratamento de falhas |

Uma API pronta só atende parte da demonstração. Cada entrega de backend precisa
ter uma tarefa correspondente de integração nas interfaces previstas pela equipe.

## 2. Diagnóstico inicial do repositório (antes desta implementação)

Verificado no checkout inicial `e753de5`, antes das correções:

- API Express/MySQL com autenticação, clientes, contratos, parcelas, pagamentos,
  documentos, histórico e rotas de OCR.
- `npm test -- --runInBand --silent`: **5 suítes e 69 testes passaram**.
- Os testes de API usam Jest/Supertest com banco simulado. Não validam execução
  SQL, constraints, concorrência e transações contra MySQL real.
- Não há workflow de GitHub Actions versionado no checkout inspecionado.
- Não há rotas registradas para despesas, dashboard, calendário e gestão de usuários.
- Web tem rotas de login, cadastro e listagem de contratos; ainda não apresenta
  os CRUDs completos esperados para o produto final.
- Web e Mobile possuem IP de rede fixo em seus clientes HTTP.
- Web solicita a listagem geral de pagamentos em `/pagamentos`; a API registra
  essa listagem em `/receitas`. O Mobile já utiliza `/receitas`.
- Dashboard/Agenda do Mobile derivam dados de listas limitadas a 100 contratos;
  receitas também são buscadas com limite 100. Isso pode produzir totais incompletos.
- Dashboard mobile soma o valor integral de parcelas vencidas, sem descontar
  pagamentos parciais nesse indicador.
- O OCR já foi restaurado na API, mas `docs/REQUISITOS.md` ainda descreve parte
  dele como isolada em outra branch. `docs/ENDPOINTS.md` descreve revisão com
  `dados_json`, enquanto controller e Mobile enviam `dados`.

Riscos do checkout inicial; agora reproduzidos/corrigidos nos cenários MySQL:

- Pagamento valida o saldo antes de iniciar a transação: requisições simultâneas
  podem ultrapassar o valor da parcela.
- Confirmação de OCR cria contrato/parcelas, move arquivo, insere documento e
  confirma a extração em etapas separadas. Não há atomicidade do fluxo inteiro;
  uma falha intermediária pode deixar estado parcial. Há `commit` do documento
  sem `beginTransaction` nessa conexão.
- Middleware autentica pelo JWT e usa o perfil do token, sem reler usuário ativo
  ou permissão atual. Desativação/rebaixamento exigem definir o comportamento
  de sessões já emitidas antes de implementar gestão administrativa.
- Calendário, calculadora e backend precisam concordar sobre datas, primeira
  parcela, centavos e tratamento de pagamentos parciais.
- Leitura de PDF textual e OCR de imagem precisam de arquivos reais de teste;
  PDF escaneado é explicitamente declarado como não suportado pelo serviço atual.

Referências existentes no repositório, sem confirmação de atualização externa:

- [Requisitos e regras](REQUISITOS.md), [API](ENDPOINTS.md), [Notion versionado](notion.md).
- [Notion informado pelo usuário](https://app.notion.com/p/ContractFlow-3c94bf8f7e4b80519094e41143914669).
- [Trello](https://trello.com/b/FMilhTuN/contractflow).
- [Figma](https://www.figma.com/design/aNfKBROulxyewRPhmNkW4l/ContractFlow?node-id=0-1).

A tentativa de leitura do Notion informado pelo usuário recebeu `403 Forbidden`
na conexão pelo proxy do ambiente. Seu conteúdo atual não foi verificado; os
links Trello/Figma acima vieram da cópia versionada da documentação.

## 3. Escopo e responsabilidade

Responsabilidade confirmada: o usuário cuida de todo o backend e entrega API,
regras, SQL/migrações, testes, CI e documentação técnica. Responsáveis Web/Mobile
entregam integração e telas;
a aceitação de cada fluxo é conjunta. Ajustar essa divisão aos cards reais.

Priorizar requisitos obrigatórios e de prioridade ALTA. Requisitos MÉDIA com
"deve" também permanecem compromissos do produto. Requisitos descritos com
"poderá" precisam de decisão registrada sobre o escopo final; não retirar
silenciosamente algo já prometido no protótipo ou no planejamento da equipe.

Antes de um endpoint novo, registrar método, URL, body/query, resposta de exemplo,
erros, filtros, paginação, permissões e regra financeira. URLs detalhadas em [API_SPRINT_2.md](API_SPRINT_2.md) já estão disponíveis
na branch de trabalho; os exemplos do backlog foram a base da implementação.

## 4. Backlog em ordem de execução

Os IDs abaixo são **referências locais**, não cards criados no Trello.
A implementação de API foi concluída e testada; integração das telas e
vinculação de evidências continuam pendentes. Ver estado de cada entrega em
[ENTREGA_SPRINT_2.md](ENTREGA_SPRINT_2.md).

| Card | Entrega | Aceite e testes essenciais | Dependência de interface |
| --- | --- | --- | --- |
| BE-S2-01 | CI com a suíte existente | GitHub Actions em push/PR; Node compatível; `npm ci`; falhas interrompem job; logs/resultados acessíveis. Execução local é distinta de execução no GitHub. | Equipe consulta o resultado do PR |
| BE-S2-02 | Contrato de integração e documentação | Corrigir divergências de URL/payload nos documentos; registrar padrão de datas/dinheiro; combinar configuração de URL da API; manter compatibilidade das rotas já usadas. | Web corrige `/receitas`; Web/Mobile configuram a URL da API |
| BE-S2-03 | Testes com MySQL real | Banco exclusivo de teste; schema aplicado automaticamente; criação de cliente/contrato/parcelas/pagamento; login/isolamento; limpeza previsível; execução também no Actions. Nunca limpar o banco de demonstração. | Fixtures reutilizáveis na demonstração |
| BE-S2-04 | Recebíveis, atrasos e integridade de pagamentos | `GET /api/recebiveis`; saldo por parcela = valor − pagamentos; quitação parcial/integral; cancelada fora dos totais previstos; autorização; filtros/paginação; duas requisições concorrentes não ultrapassam saldo. Reusar serviços existentes. | Financeiro e detalhe de contrato exibem os mesmos valores |
| BE-S2-05 | CRUD de despesas | `/api/despesas`; criar/listar/detalhar/editar/remover conforme regra acordada; dono, valor, data, status/categoria; paginação; entradas inválidas; usuário B não vê/altera despesa de A. Registrar eventual migração sem exigir recriar banco existente. | Telas de despesas Web/Mobile |
| BE-S2-06 | Dashboard e projeção | `GET /api/dashboard`; agregações no banco, sem somar só uma página; recebido, pendente, atraso líquido, contratos/clientes, vencimentos, receitas/despesas e projeção conforme regra documentada. Testar mais de 100 registros e pagamentos parciais. | Dashboard real nas duas interfaces; substituir agregações parciais |
| BE-S2-07 | Calendário e alertas | `GET /api/calendario?de=...&ate=...`; vencimentos/pagamentos/eventos definidos no escopo; intervalo validado; datas coerentes; isolamento; quitadas/canceladas tratadas conforme tipo de evento. Alertas inicialmente em tela, se aceito; push/e-mail somente se previsto. | Agenda Web/Mobile e navegação ao contrato |
| BE-S2-08 | OCR: leitura e revisão demonstráveis | Testar PDF textual, imagem em português, arquivo inválido e extração sem campos; dados ausentes editáveis; avisos claros; revisão persistida; definir suporte exigido a PDF escaneado. Se prometido, implementar e testar; se fora do escopo, registrar decisão. Modelos necessários disponíveis antes da apresentação. | Importação/revisão nas interfaces previstas; amostra controlada |
| BE-S2-09 | OCR: confirmação íntegra | Revisado → cliente/contrato/parcelas/documento original/histórico; repetir/concorrer confirmação não duplica; usuário B não acessa extração de A; falha de banco/arquivo não deixa contrato incompleto; transação + compensação do arquivo, sem supor rollback de SQL sobre disco. | Contrato criado aparece na listagem e original abre no detalhe |
| BE-S2-10 | Permissões e usuários | Implementar política aprovada para ADMIN/USUARIO; gestão de usuários se prevista; usuário comum recebe 403 nas operações restritas; desativação/rebaixamento afeta sessão conforme política; não remover último ADMIN nem retornar hash de senha. ADMIN não ganha acesso financeiro de outros por acidente. | Área administrativa e estados de acesso, se previstos |
| BE-S2-11 | Relatórios e exportação | Definir relatório financeiro/contratual e filtros; totais coerentes com dashboard/recebíveis; isolamento; arquivo legível. CSV é proposta inicial, XLSX se incluído no compromisso final. Tratar campos que planilhas interpretam como fórmulas. | Tela abre/exporta relatório com os mesmos filtros |
| BE-S2-12 | Regressão, requisitos e apresentação | Revalidar CRUDs existentes, busca/filtros/documentos; calculadora concorda com backend; suítes + CI + fluxos Web/Mobile; atualizar matriz RF/RNF/RN com evidência; roteiro de apresentação e limitações reais. | Ensaio do produto completo pela equipe |

Relações principais: 01 → 03; 02 acompanha todos os módulos; 04/05 → 06;
04 → 07; 08 → 09; 04/05/06 → 11; todas → 12. Permissões comuns continuam
obrigatórias em cada módulo, antes da entrega de gestão administrativa.

Complementar a matriz de requisitos na tarefa 12: recuperação de senha (RF04),
calculadora (RF28), pesquisa de documentos (RF33), filtros (RF34), notificações
(RF39) e renovação (RF42). Decidir e registrar os itens opcionais; corrigir
lacunas dos itens obrigatórios. Calculadora pode permanecer no cliente se as
mesmas regras forem verificadas, sem criar um endpoint apenas para aumentar escopo.

## 5. Calendário proposto até a entrega

As datas são janelas de trabalho, não datas a colocar artificialmente em commits.
Estimativas precisam ser ajustadas à disponibilidade real e ao progresso das telas.

| Janela | Resultado esperado |
| --- | --- |
| 02–04/10 | Registrar cards/responsáveis, escopo final e contratos de integração; primeira CI com testes atuais |
| 05–11/10 | Testes MySQL no CI; recebíveis/integridade de pagamentos; despesas; primeira demonstração conjunta |
| 12–18/10 | Dashboard/projeção e calendário; Web/Mobile consomem os endpoints; validar totais reais |
| 19–25/10 | OCR completo dentro do escopo, permissões e relatórios; segundo ensaio integrado |
| 26–30/10 | Fechar lacunas obrigatórias, regressão, documentação e evidências; funcionalidades finalizadas |
| 31/10–02/11 | Margem para falhas, preparação do banco demo e ensaio com equipamento/rede reais |
| 03/11 | Última conferência e envio dos links antes das 23:59; evitar começar módulo novo |

Se o esforço não couber, revisar **agora** capacidade/divisão e opcionais com a
equipe. Não deixar integração Web/Mobile ou testes para a última semana.

## 6. Branches e commits

Um commit deve representar uma mudança explicável e verificável. Código,
testes relevantes e documentação da funcionalidade podem estar no mesmo commit.
Uma tarefa maior pode ter dois ou três commits coerentes: base funcional,
tratamento de um risco concreto e integração. Não separar cada arquivo em um commit.

No ambiente cloud, usar o checkout existente; criar branches de trabalho quando
necessário, sem criar worktree adicional. Antes, conferir branch atual e alterações
locais. A branch local inspecionada é `work`, não assumir que ela seja `main`.

Exemplos de branches e commits (sugestões; não foram criados):

| Tarefa | Branch sugerida | Exemplo de commit |
| --- | --- | --- |
| CI | `feature/sprint-2-backend` | `ci(api): executar testes em pushes e pull requests` |
| MySQL real | `test/s2-mysql` | `test(api): validar fluxo financeiro com MySQL real` |
| Recebíveis | `feat/s2-recebiveis` | `feat(api): listar recebiveis com saldo e situacao` |
| Concorrência | mesma tarefa financeira, se isolável | `fix(api): impedir pagamentos concorrentes acima do saldo` |
| Despesas | `feat/s2-despesas` | `feat(api): implementar despesas com isolamento por usuario` |
| Dashboard | `feat/s2-dashboard` | `feat(api): agregar indicadores financeiros no banco` |
| Calendário | `feat/s2-calendario` | `feat(api): consultar eventos financeiros por periodo` |
| OCR | `fix/s2-ocr` | `fix(api): garantir consistencia na confirmacao do OCR` |
| Permissões | `feat/s2-permissoes` | `feat(api): controlar gestao de usuarios e sessoes` |
| Relatórios | `feat/s2-relatorios` | `feat(api): exportar relatorio financeiro filtrado` |
| Evidências | `docs/s2-entrega` | `docs: relacionar entregas da sprint 2 a testes e requisitos` |

Ritmo recomendado: terminar um bloco real de desenvolvimento/teste e então
commitar. Uma correção pequena pode terminar na mesma sessão; um módulo pode
exigir vários dias. Não há intervalo mínimo na rubrica. Espaçar pela realização
do trabalho, preservando horários reais, sem alterar datas ou esperar apenas
para produzir aparência de atividade. Não juntar toda a sprint no último commit.

Antes de cada commit:

1. Verificar `git status` e o diff; selecionar arquivos da tarefa, sem `.env`,
   uploads, modelos baixados, logs, dependências ou dados de MySQL.
2. Executar os testes relevantes e confirmar quantidade/cenários executados.
3. Revisar o diff staged, incluindo ausência de segredos, e commitar com mensagem
   que descreva o comportamento entregue.
4. Referenciar card e requisitos no corpo do commit/PR; informar testes feitos.
5. Registrar o resultado no card. Marcar integração pendente se ainda faltar tela.

Usar PRs revisáveis conforme o fluxo da equipe. CI local passando não significa
Actions passando: só registrar a execução remota após verificar o run no GitHub.

## 7. Modelo de card e definição de concluído

```text
Título: [BE-S2-XX] comportamento a entregar
Responsável: integrante efetivamente responsável
Requisitos: RFxx / RNFxx / RNxx
Objetivo: problema e comportamento esperado
Contrato da API: método, URL, entrada, saída, erros
Critérios de aceite: observáveis no fluxo e no banco
Cenários de teste: sucesso, validação, permissão, falha e limite relevante
Dependências: card Web/Mobile e contrato acordado
Evidências: branch, commits, PR, execução do Actions e teste/demonstração
Estado: Planejado / Em andamento / Em revisão / Aguardando integração / Concluído
```

Para concluir: implementação explicável; casos relevantes passando; CI verificado;
requisitos/endpoints atualizados; evidências vinculadas; fluxo integrado validado
ou limitação/dependência explicitamente registrada. Uma entrega somente de API
pode concluir seu card de backend, mas o fluxo do produto continua pendente até
concluir o card de integração. Não marcar uma tela ou teste como feito sem evidência.

## 8. Roteiro de apresentação individual

Ensaiar um percurso curto, repetível e conectado à própria contribuição:

1. Entrar no Web/Mobile; cadastrar cliente e contrato; mostrar parcelas/vencimentos.
2. Registrar pagamento parcial; mostrar saldo, receita, atraso e histórico atualizados.
3. Cadastrar despesa; mostrar reflexo no dashboard/projeção e evento no calendário.
4. Importar documento; revisar um campo extraído; confirmar; abrir contrato/original.
5. Mostrar relatório e permissões incluídos no produto final.
6. Abrir código de uma entrega própria: rota → autenticação → controller → serviço
   → SQL/transação → resposta → tela. Explicar um erro e o teste que o reproduz.
7. Abrir card, commit/PR e resultado de teste/Actions da mesma funcionalidade.

Combinar quais telas cada integrante demonstra. Preparar dados exclusivamente
de demonstração, amostra de OCR conhecida, banco inicial previsível e instruções
de startup. Testar no equipamento e rede de apresentação; o setup cloud não prova
que um celular físico alcança a API. Ter uma demonstração alternativa dos fluxos
essenciais e declarar limitações sem afirmar que uma falha foi corrigida.

## 9. Registro atual de evidências

| Item | Situação verificada |
| --- | --- |
| Testes rápidos | 84/84 passaram localmente, seis suítes |
| MySQL real | 33/33 passaram localmente, sete suítes; DB isolado e uploads temporários |
| Cobertura combinada | 91,09% linhas, 85,68% instruções, 71,13% ramificações, 92,90% funções |
| GitHub Actions | Workflow com testes rápidos, MySQL e merge de cobertura; consultar run remoto antes de afirmar sucesso |
| Novos módulos | Implementados/testados na API; formatos e limites documentados |
| Docker de produção | Build e runtime como `node`; login/financeiro/CSV/XLSX/OCR em rede interna sem internet passaram |
| Ambiente cloud | API/MySQL/Web iniciados; login e listagens pelo proxy verificados; script e instruções reutilizáveis salvos |
| Branch | `feature/sprint-2-backend`, publicada no GitHub; main preservada |
| Trello/Notion/Figma | Links da cópia versionada; nenhum card ou documento externo foi alterado |
| Interfaces finais | Integração e demonstração Web/Mobile pendentes; calculadora/mobile/totais exigem alinhamento |

Commits, critérios de aceite dos cards, cenários e roteiro individual em
[ENTREGA_SPRINT_2.md](ENTREGA_SPRINT_2.md). Os commits foram feitos ao concluir
blocos reais de implementação/validação, com horários reais. O calendário acima
continua útil para os ensaios e integrações até 03/11; não representa datas
artificiais para espalhar o histórico já produzido.
