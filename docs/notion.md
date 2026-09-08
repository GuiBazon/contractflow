# ContractFlow — Backup do Notion da equipe

> Backup do documento oficial do Notion (fonte canônica dos requisitos).
> Gerado em 08/09/2026 a partir do conteúdo vigente. Serve como cópia de
> segurança e base para copiar/colar de volta no Notion.
>
> Divergências conhecidas entre este backup e o repositório (para sincronizar):
> - Aqui: pastas `backend/front/mobile` → no repo real: `api/web/mobile`.
> - Tabela "Descritivo dos endpoints" estava `[A definir]` — ver `ENDPOINTS.md` no repo.
> - Requisitos espelhados com status em `docs/REQUISITOS.md`; DER em `docs/DER.md`.

---

## 📋 Visão geral

Esta documentação apresenta as informações e definições do sistema ContractFlow, incluindo seu propósito, funcionalidades, requisitos, regras de negócio, modelagens, fluxogramas e demais artefatos relacionados ao desenvolvimento do projeto.

O documento também reúne os links referentes aos protótipos, repositório, ferramentas utilizadas no desenvolvimento e demais materiais produzidos pela equipe.

---

## 🎯 Descrição do Produto:

O ContractFlow é um sistema desenvolvido para auxiliar pequenas e médias empresas na gestão de contratos, recebíveis e controle financeiro.

O sistema tem como objetivo centralizar informações de clientes, contratos, parcelas, vencimentos e pagamentos em uma única plataforma, facilitando o acompanhamento financeiro e reduzindo a necessidade de controles manuais.

O contrato é o elemento central do sistema. A partir dele, são organizadas as informações relacionadas ao cliente, valores, parcelas, vencimentos, pagamentos e situação financeira.

Um dos principais diferenciais do ContractFlow é a possibilidade de realizar o upload de contratos em PDF ou imagem e utilizar OCR para identificar automaticamente informações relevantes do documento. Os dados extraídos serão apresentados ao usuário para conferência e correção antes da criação definitiva do contrato.

O sistema também contará com dashboard para acompanhamento dos principais indicadores financeiros, calendário de vencimentos, controle de recebíveis e ferramentas de apoio à gestão.

---

## ✏️ Requisitos Funcionais:

Os requisitos funcionais detalham as funcionalidades presentes ou planejadas no ContractFlow relacionadas diretamente às ações realizadas pelos usuários.

| Requisitos Funcionais | Prioridade | Descrição detalhada |
| --- | --- | --- |
| Cadastro de Usuário | ALTA | O sistema deve permitir o cadastro de usuários, contendo informações como nome, e-mail e senha. |
| Login de Usuário | ALTA | O sistema deve permitir que usuários cadastrados realizem login utilizando e-mail e senha. |
| Controle de acesso | ALTA | O sistema deve controlar o acesso às funcionalidades de acordo com as permissões do usuário. |
| Recuperação de senha | MÉDIA | O sistema poderá permitir a recuperação ou redefinição da senha do usuário. |
| Cadastro de Clientes | ALTA | O usuário deve poder cadastrar clientes ou devedores, contendo informações como nome ou razão social, CPF/CNPJ, e-mail, telefone, endereço e observações. |
| Consulta de Clientes | ALTA | O sistema deve permitir pesquisar, visualizar e editar os clientes cadastrados. |
| Cadastro de Contratos | ALTA | O usuário deve poder cadastrar contratos manualmente, informando cliente, número, tipo, valor, datas, forma de pagamento, quantidade de parcelas, vencimentos e observações. |
| Upload de Contratos | ALTA | O sistema deve permitir o envio de contratos em formatos como PDF e imagens. |
| Armazenamento de Documentos | ALTA | O sistema deve armazenar o documento original enviado e associá-lo ao respectivo contrato. |
| Leitura Automática de Documentos | ALTA | O sistema deve utilizar OCR para identificar textos presentes nos documentos enviados. |
| Extração Automática de Informações | ALTA | O sistema deve tentar identificar automaticamente informações relevantes do contrato, como cliente, valor, datas, parcelas, vencimentos e forma de pagamento. |
| Revisão dos Dados Extraídos | ALTA | O usuário deve poder visualizar e corrigir as informações identificadas pelo OCR antes da criação do contrato. |
| Confirmação da Importação | ALTA | O usuário deve confirmar os dados extraídos antes que o contrato seja criado definitivamente no sistema. |
| Geração Automática de Parcelas | ALTA | O sistema deve gerar automaticamente as parcelas do contrato a partir das informações cadastradas ou extraídas. |
| Geração de Vencimentos | ALTA | O sistema deve registrar as datas de vencimento correspondentes às parcelas do contrato. |
| Alteração de Parcelas | MÉDIA | Usuários autorizados poderão corrigir informações relacionadas às parcelas cadastradas. |
| Registro de Pagamentos | ALTA | O sistema deve permitir registrar pagamentos realizados, informando data, valor, forma de pagamento, parcela relacionada e observações. |
| Atualização do Saldo | ALTA | Após o registro de um pagamento, o sistema deve atualizar os valores recebidos e o saldo restante do contrato. |
| Controle de Parcelas em Atraso | MÉDIA | O sistema deve identificar parcelas cujo vencimento tenha passado sem que o pagamento tenha sido registrado. |
| Controle de Inadimplência | MÉDIA | O sistema deve apresentar clientes, contratos e parcelas que estejam em situação de atraso. |
| Histórico Financeiro | MÉDIA | O sistema deve apresentar as movimentações financeiras relacionadas ao contrato, como vencimentos, juros, multas e pagamentos. |
| Cálculo de Juros | MÉDIA | O sistema poderá calcular juros sobre valores em atraso de acordo com as regras definidas para o contrato. |
| Cálculo de Multas | MÉDIA | O sistema poderá calcular multas relacionadas ao atraso de pagamentos. |
| Controle de Recebíveis | MÉDIA | O sistema deve apresentar os valores recebidos, pendentes e atrasados relacionados aos contratos. |
| Controle de Despesas | MÉDIA | O usuário poderá cadastrar despesas da empresa, como aluguel, funcionários, energia, internet, fornecedores e impostos. |
| Controle de Receitas | MÉDIA | O sistema deve apresentar as receitas provenientes dos pagamentos registrados. |
| Saldo Projetado | MÉDIA | O sistema poderá calcular uma projeção financeira com base nas receitas e despesas previstas. |
| Calculadora Financeira | MÉDIA | O sistema deve possuir uma calculadora para auxiliar em cálculos de parcelas, juros, multas, saldo devedor e projeções. |
| Calendário Financeiro | ALTA | O sistema deve apresentar vencimentos, pagamentos e eventos relacionados aos contratos em um calendário. |
| Alertas de Vencimento | MÉDIA | O sistema poderá apresentar alertas relacionados a parcelas próximas do vencimento. |
| Alertas de Atraso | MÉDIA | O sistema poderá apresentar alertas relacionados a parcelas vencidas e contratos em atraso. |
| Dashboard | ALTA | O sistema deve apresentar indicadores gerais, como contratos ativos, clientes, valores a receber, valores recebidos, valores em atraso, próximos vencimentos, receitas, despesas e saldo projetado. |
| Pesquisa | MÉDIA | O sistema deve permitir pesquisar contratos, clientes e documentos cadastrados. |
| Filtros | MÉDIA | O sistema deve permitir filtrar informações por período, cliente, contrato, status, categoria e situação de pagamento. |
| Visualização do Contrato | ALTA | O usuário deve poder visualizar os dados cadastrados e o documento original associado ao contrato. |
| Histórico do Contrato | MÉDIA | O sistema deve apresentar informações relevantes relacionadas ao histórico do contrato. |
| Relatórios | MÉDIA | O sistema deve permitir gerar relatórios financeiros e contratuais. |
| Exportação | MÉDIA | O sistema poderá permitir a exportação de dados nos formatos XLSX e CSV. |
| Notificações | MÉDIA | O sistema poderá apresentar notificações relacionadas a vencimentos, atrasos e outros eventos importantes. |
| Status de Contrato | ALTA | O sistema deve permitir identificar contratos como Ativo, Encerrado, Cancelado, Pendente ou Em Renovação. |
| Anexos | MÉDIA | O usuário poderá adicionar documentos complementares associados a um contrato. |
| Renovação de Contrato | BAIXA | O sistema poderá alertar sobre contratos próximos do término e permitir o registro de uma renovação. |

---

## ✏️ Requisitos Não Funcionais:

Os requisitos não funcionais detalham características relacionadas à qualidade, segurança, desempenho, manutenção e funcionamento do ContractFlow, não estando necessariamente relacionadas a uma ação direta do usuário.

| Requisitos Não Funcionais | Prioridade | Descrição detalhada |
| --- | --- | --- |
| Segurança | ALTA | O sistema deve proteger as informações financeiras, contratuais e pessoais contra acessos não autorizados, utilizando mecanismos adequados de autenticação e autorização. |
| Senhas | ALTA | As senhas dos usuários não devem ser armazenadas em texto puro, devendo utilizar mecanismo seguro de hash. |
| Autenticação | ALTA | A autenticação deve utilizar mecanismos seguros, como tokens de acesso e controle de sessão. |
| Controle de Permissões | ALTA | O sistema deve impedir que usuários sem autorização acessem funcionalidades restritas. |
| Privacidade | ALTA | Os dados pessoais e documentos contratuais devem ser tratados de acordo com as regras aplicáveis de proteção de dados. |
| Usabilidade | ALTA | O sistema deve possuir uma interface intuitiva, com navegação clara e direta, permitindo que usuários sem conhecimento técnico utilizem suas funcionalidades. |
| Responsividade | ALTA | A aplicação web deve funcionar adequadamente em computadores, tablets e diferentes tamanhos de tela. |
| Compatibilidade Mobile | MÉDIA | As principais funcionalidades definidas no escopo devem ser adaptadas para o aplicativo mobile. |
| Desempenho | ALTA | As principais telas e consultas do sistema devem apresentar carregamento eficiente e não realizar operações desnecessárias. |
| Disponibilidade | MÉDIA | O sistema deve permanecer disponível durante o período previsto para sua utilização. |
| Manutenibilidade | MÉDIA | O código deve ser organizado e estruturado de forma a facilitar sua manutenção e evolução. |
| Modularidade | MÉDIA | Os módulos de usuários, clientes, contratos, financeiro e OCR devem possuir responsabilidades bem definidas. |
| Integridade dos Dados | ALTA | O sistema deve evitar inconsistências entre contratos, parcelas, pagamentos e valores financeiros. |
| Tratamento de Erros | ALTA | O sistema deve apresentar mensagens claras quando ocorrerem erros de validação ou processamento. |
| Validação | ALTA | Dados como e-mail, CPF/CNPJ, valores e datas devem ser validados antes de serem armazenados. |
| Controle de Arquivos | ALTA | O sistema deve limitar os formatos e tamanhos dos arquivos enviados para o sistema. |
| OCR | ALTA | O sistema deve informar ao usuário quando não conseguir identificar determinada informação ou quando a leitura apresentar baixa confiança. |
| Transparência da Automação | ALTA | As informações extraídas automaticamente pelo OCR devem permanecer disponíveis para revisão e correção antes da confirmação da importação. |
| Consistência Visual | MÉDIA | As telas do sistema devem utilizar componentes, padrões visuais e comportamentos consistentes. |
| Acessibilidade | MÉDIA | A interface deve utilizar boas práticas de contraste, legibilidade e organização das informações. |

---

## ✏️ Regras de negócio:

As regras de negócio abordam as políticas, restrições e condições que devem ser respeitadas pelo ContractFlow para garantir a consistência das operações realizadas no sistema.

| Regras de negócio | Prioridade | Descrição detalhada |
| --- | --- | --- |
| Um cliente pode possuir vários contratos | ALTA | O sistema deve permitir que um mesmo cliente esteja associado a mais de um contrato. |
| Todo contrato deve estar associado a um cliente | ALTA | Não deve ser possível cadastrar um contrato sem vinculá-lo a um cliente existente. |
| Um contrato pode possuir várias parcelas | ALTA | O sistema deve permitir que um contrato possua uma ou mais parcelas de acordo com sua configuração. |
| Toda parcela deve possuir uma data de vencimento | ALTA | Cada parcela cadastrada deve estar associada a uma data de vencimento. |
| Uma parcela pode estar pendente, paga, vencida ou cancelada | ALTA | O sistema deve identificar a situação de cada parcela de acordo com seu vencimento e registro de pagamento. |
| O saldo do contrato deve considerar os pagamentos registrados | ALTA | O saldo restante do contrato deve ser atualizado de acordo com os pagamentos realizados. |
| Parcela vencida e não paga deve ser identificada como atraso | ALTA | Quando a data de vencimento passar sem que o pagamento seja registrado, a parcela deverá ser identificada como vencida. |
| Juros e multas devem seguir as regras do contrato | MÉDIA | Quando aplicáveis, os valores de juros e multas devem ser calculados de acordo com as configurações definidas para o contrato. |
| Dados extraídos pelo OCR devem ser confirmados | ALTA | O contrato não deve ser efetivamente criado a partir do OCR sem que o usuário confira e confirme os dados extraídos. |
| O documento original deve permanecer associado ao contrato | ALTA | Após a importação, o documento enviado deve permanecer armazenado e vinculado ao contrato correspondente. |
| Informações financeiras importantes não devem ser excluídas sem controle | ALTA | O sistema deve impedir ou controlar a exclusão de informações financeiras que possam comprometer os dados registrados. |
| Contrato encerrado não deve gerar novas parcelas | ALTA | Um contrato encerrado não deve gerar novas parcelas automaticamente. |
| O sistema deve diferenciar valores recebidos e valores a receber | ALTA | Valores já pagos devem ser apresentados separadamente dos valores que ainda estão pendentes. |
| O dashboard deve utilizar dados registrados no sistema | ALTA | Os indicadores apresentados no dashboard devem ser calculados a partir das informações armazenadas no sistema. |
| Datas de vencimento devem alimentar o calendário | ALTA | As datas de vencimento das parcelas devem ser utilizadas para criar os eventos correspondentes no calendário. |
| Contratos próximos do vencimento poderão gerar alertas | MÉDIA | O sistema poderá apresentar alertas quando um contrato estiver próximo da sua data de término. |
| O OCR não substitui a conferência do usuário | ALTA | As informações identificadas automaticamente pelo OCR devem ser consideradas sugestões até que sejam conferidas pelo usuário. |
| Informações não identificadas pelo OCR podem ser preenchidas manualmente | ALTA | Caso o OCR não consiga identificar determinada informação, o campo correspondente deverá permanecer disponível para preenchimento manual. |

---

## 💡 Protótipos:

Representação visual das interfaces e fluxos de navegação do ContractFlow.

#### **Link - Figma:**

https://www.figma.com/design/aNfKBROulxyewRPhmNkW4l/ContractFlow?node-id=0-1&t=6PyQqd1qtlLcg8Uq-1

---

## 💾 Banco de Dados:

DER Conceitual e DER Lógico desenvolvidos com base na estrutura de dados do sistema.

#### Link - Miro:

https://miro.com/app/board/uXjVHttnxfk=/?share_link_id=809784729181

---

## Organização:

Organização do grupo.

#### Link - Trello:

https://trello.com/b/FMilhTuN/contractflow

---

## ⚙️ Implementação:

O projeto será versionado utilizando GitHub e organizado em um único repositório, separado em três áreas principais:

- `backend` — Desenvolvimento da API e regras de negócio.
- `front` — Desenvolvimento da aplicação web.
- `mobile` — Desenvolvimento do aplicativo mobile.

A equipe será dividida da seguinte forma:

- **Backend:** Bazon
- **Frontend Web:** Renan e João
- **Mobile:** Ulisses e Eduardo

Tecnologias usadas:

- Backend: Node.js + Express
- Banco: MySQL
- Frontend Web: React
- Mobile: React Native + Expo

**Versão do projeto:** 1.0.0

**Repositório:**

https://github.com/GuiBazon/contractflow

---

## ⚙️ Descritivo dos endpoints

Informações sobre os endpoints disponibilizados pela API do ContractFlow, incluindo métodos HTTP, parâmetros necessários e exemplos de utilização.

| Descrição | Método | Parâmetros | Exemplo |
| --- | --- | --- | --- |
| [A definir] | [GET/POST/PUT/PATCH/DELETE] | [A definir] | [A definir] |

---

## 📁 Anexos:

Materiais complementares relacionados ao desenvolvimento do projeto.

- DER Conceitual
- DER Lógico
- Documentos complementares
- Outros materiais produzidos pela equipe
