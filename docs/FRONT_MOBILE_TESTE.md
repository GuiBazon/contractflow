# Branches de teste Web e Mobile — Sprint 2

Estas branches partem do backend `feature/sprint-2-backend` no commit `017cf2e`. Foram criadas separadamente para testar a integração e facilitar a avaliação das interfaces. Não representam um merge na `main`.

| Branch | Interface | Instruções |
| --- | --- | --- |
| [front-teste](https://github.com/GuiBazon/contractflow/tree/front-teste) | React + Vite, JavaScript e CSS | [web/README.md](https://github.com/GuiBazon/contractflow/blob/front-teste/web/README.md) |
| [mobile-teste](https://github.com/GuiBazon/contractflow/tree/mobile-teste) | React Native + Expo, JavaScript | [mobile/README.md](https://github.com/GuiBazon/contractflow/blob/mobile-teste/mobile/README.md) |

A branch web mantém o diretório mobile da base; a branch mobile mantém o diretório web da base. Para ver a interface nova, use a branch correspondente. A API é a mesma base finalizada da Sprint 2 nas duas branches.

Os exemplos `apisistema2026`, `frontvio2026react` e `mobilevio2026` do GitLab foram consultados. A estrutura mantém funções, `useState`/hooks, Axios, formulários de CRUD e navegação, sem exigir TypeScript ou um framework web adicional. O mobile foi mantido nativo, como o aplicativo existente e o exemplo Expo das aulas.

## O que demonstrar

| Fluxo | O que a tela evidencia | Backend para explicar |
| --- | --- | --- |
| Cliente → contrato | Dados válidos, cliente selecionado, valores e vencimentos | `clientController`, `contractController`, `contratoService` |
| Pagamento parcial de 40 numa parcela de 500 | Restam 460; não se permite receber 461 na mesma parcela | `paymentController`, `financeiroService`, transação e bloqueio |
| Editar depois de receber | Dados descritivos editáveis; valor/parcelamento protegidos | Validação das alterações e histórico no `contractController` |
| Parcelas extras | Quantidade e valor enviados; total aumenta sem apagar parcelas antigas | `generateParcelas` e sequência de vencimentos |
| Renovação | Novo número/período, mesma pessoa, origem encerrada e dados preservados | `renewalController`, criação transacional e vínculos no histórico |
| OCR | Arquivo → extração → revisão salva → confirmação → contrato e parcelas | `ocrController`, `ocrService`, validação e confirmação transacional |
| Documentos | Anexo enviado/baixado; original da importação preservado | `documentController`, dono do contrato, MIME, assinatura e limite de tamanho |
| Despesas/financeiro | CRUD, recebíveis, receitas e totais de todas as páginas | `expenseController`, `recebivelService`, `dashboardService` |
| Calendário/alertas | Vencimentos, pagamentos, despesas e fim de contrato | `calendarController`, `alertController`, filtros e datas |
| Relatórios | Consulta paginada e arquivos CSV/XLSX com todos os resultados filtrados | `reportController`, `reportService`, limite de exportação e células seguras |
| Sessão/ADMIN | Login, senha/logout revogando sessões, acesso por perfil | `authController`, `authMiddleware`, `requireAdmin`, `userController` |

Os arquivos citados ficam em `api/src/controllers`, `api/src/services` e `api/src/middlewares`. Confira o [contrato da API](API_SPRINT_2.md), os [requisitos](REQUISITOS.md) e o [roteiro do backend](ENTREGA_SPRINT_2.md).

## Como explicar a integração

No cadastro manual: a interface coleta os campos; Axios envia JSON com Bearer; o middleware identifica o usuário; o controller valida o cliente e os dados; o serviço gera parcelas e vencimentos; uma transação grava contrato, parcelas e histórico; a API devolve o identificador; a interface consulta o detalhe e mostra o resultado.

No pagamento: a tela consulta o saldo, mas a API verifica novamente dentro da transação. Isso protege contra dados desatualizados e duas tentativas simultâneas. Após a resposta, a tela recarrega contrato, parcelas e pagamentos; o dashboard consulta os agregados do banco.

Uma resposta 400/409 mantém os dados do formulário e mostra a mensagem da API. Falhas de consulta oferecem uma nova tentativa. Uma resposta 401 numa rota protegida limpa a sessão e retorna ao login. O teste de erro 503 é o único cenário que simula uma resposta; os demais usam os endpoints reais.

## Evidências verificadas

Validação local em 03/10/2026, Node 24, Chromium/Playwright, API Express e MySQL 8 isolado para QA. Os testes usam contas sintéticas e não alteram o banco de demonstração. O plugin Browser não estava disponível; Playwright foi o recurso de automação utilizado.

| Verificação | Resultado |
| --- | --- |
| Web: instalação pelo lockfile, ESLint e build Vite | Aprovados |
| Web: cenários E2E | 7 aprovados, sem falhas ou casos pulados |
| Mobile: instalação pelo lockfile e ESLint | Aprovados |
| Mobile: exportação web e bundle Android/Hermes | Aprovados; bundle não é APK |
| Mobile: cenários E2E em 390×844 | 6 aprovados no Metro e na prévia de distribuição |
| Navegação, autenticação, CRUDs, erros, pagamentos, arquivos e formulários | Cobertos nos cenários documentados nos READMEs |
| Fluxo completo com API e MySQL reais | Verificado nas duas interfaces |
| Listagem de usuários com ADMIN no mobile | Verificada com a API real; edição administrativa ainda exige ensaio |
| Visual web em 1504×1045 e 390×844 | Inspecionado, incluindo menu para celular e ausência de rolagem horizontal da página |
| Mobile em aparelho Android/iOS | Ainda não executado |
| Resultado remoto dos workflows GitHub Actions | Ainda não consultado neste ambiente |
| Comparação com o Figma oficial | Não executada: acesso indisponível (403) |

Esses resultados são de testes de integração/interface. Não representam medição de cobertura de código do frontend. A cobertura de 91,09% registrada na base refere-se ao backend e não deve ser atribuída às interfaces.

Os workflows `Frontend` e `Mobile`, em `.github/workflows`, preparam suas próprias bases MySQL de teste. Ao abrir as branches no GitHub, confira o resultado das execuções; um arquivo de workflow publicado não significa que a execução remota passou.

## Organização da entrega

Os commits foram separados por entregas: fundação/autenticação/painéis, fluxos e CRUDs integrados, automação e documentação. Datas são as reais de trabalho. Para localizar as alterações desta tarefa:

```bash
git log --oneline 017cf2e..front-teste
git log --oneline 017cf2e..mobile-teste
git diff --stat 017cf2e..front-teste -- web
git diff --stat 017cf2e..mobile-teste -- mobile
```

Relacione os cards com os commits e os testes correspondentes. O Trello não foi editado por esta tarefa; a distribuição de responsabilidades e a conclusão dos cards precisam constar no quadro usado pela equipe. Use os links reais das branches e da documentação na entrega do Classroom.

## Antes da apresentação

1. Conferir com os integrantes o Figma e quais interfaces serão utilizadas na versão final.
2. Abrir o mobile em um aparelho para verificar rede, teclado, seletor de arquivos, SecureStore e compartilhamento.
3. Validar as alterações de usuários com ADMIN e consultar os workflows no GitHub.
4. Ensaiar cliente → contrato → pagamento parcial → dashboard, e OCR → revisão → confirmação.
5. Ter os trechos do backend, os cards e os testes abertos para explicar a própria contribuição e suas regras de negócio.

As interfaces precisam da API. Não há recuperação por e-mail, push ou funcionamento offline. Juros/multa são estimativas, e pagamentos registram principal. Exportações limitam-se a 10.000 registros e arquivos a 10 MB. Essas limitações devem ser explicadas se forem questionadas na banca.
