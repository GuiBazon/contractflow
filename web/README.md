# ContractFlow Web — React + Vite

Branch `front-teste`, baseada em `feature/sprint-2-backend`. JavaScript, React 19, Vite 7, React Router, Axios, React Icons e CSS comum. Componentes funcionais e hooks seguem o padrão dos exemplos do SENAI; não é necessário TypeScript.

## Executar

Inicie a API e o MySQL conforme [api/README.md](../api/README.md). Em outro terminal:

```bash
cd web
npm ci
npm run dev
```

O Vite usa `/api` e encaminha as chamadas para `http://127.0.0.1:8080`. Para outra API, copie `.env.example` para `.env.local`, ajuste `VITE_API_URL` incluindo `/api` e reinicie o Vite. Ao usar uma URL absoluta, inclua a origem do front em `CORS_ORIGINS` da API. Nenhum IP da escola fica fixo no código.

`npm run build` gera `dist/`. O servidor de distribuição deve retornar `index.html` para as rotas da aplicação e encaminhar `/api` ao backend, ou o build deve receber a URL pública da API em `VITE_API_URL`.

## Funcionalidades integradas

- Cadastro, login, sessão restaurada, logout, troca de senha e gestão de usuários para ADMIN.
- Dashboard com totais calculados pelo backend, período, fluxo mensal e próximos vencimentos.
- Clientes: cadastro, consulta, busca, edição, exclusão e contratos vinculados.
- Contratos: cadastro manual, edição, status, renovação, parcelas extras e edição de parcelas.
- Pagamentos parciais ou totais, com seleção de parcela e limite pelo saldo pendente.
- Recebíveis, receitas, despesas e proteção de valores de registros já pagos.
- Calendário com vencimentos, pagamentos, despesas e fim de contratos; alertas derivados dos dados.
- Importação OCR de PDF/imagem: extração, correção, salvamento da revisão e confirmação explícita.
- Anexos e originais, pesquisa, download autenticado e exclusão apenas de anexos.
- Cinco relatórios com paginação e exportação completa CSV/XLSX; calculadora por endpoints da API.

Busca e paginação são feitas no servidor. Os totais não são calculados apenas sobre a página carregada. O calendário consulta todas as páginas do mês.

## Organização

- `src/App.jsx`: rotas públicas e protegidas.
- `src/axios/axios.js`: Axios, token, erros e downloads autenticados.
- `src/hooks/useConsulta.js`: consultas, cancelamento, nova tentativa e paginação do calendário.
- `src/components/Layout.jsx`: navegação, conta e menu adaptado para celular.
- `src/components/ui.jsx`: formulários, tabelas, diálogos e estados de carregamento/erro/vazio.
- `src/pages`: telas por funcionalidade; `src/utils`: apresentação e montagem dos dados.
- `src/styles.css`: visual e responsividade.
- `e2e`: testes de interface com API e MySQL reais.

O backend continua responsável pelas permissões, CPF/CNPJ, datas e integridade financeira. Os campos protegidos pela interface também são verificados na API.

## Verificar

```bash
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Os testes precisam de uma API de QA já iniciada em `http://127.0.0.1:8080/api`, com um banco **exclusivo de teste** e `CORS_ORIGINS=http://127.0.0.1:5175`. Eles criam contas e dados sintéticos. Não execute contra o banco de apresentação ou de produção. `CF_E2E_API_URL` permite trocar a API; `PW_EXECUTABLE_PATH` permite usar um Chromium instalado no ambiente. O Playwright inicia seu Vite na porta 5175.

O workflow [Frontend](../.github/workflows/frontend.yml) prepara MySQL isolado, schema, API, Poppler, Chromium, lint, build e os testes. Foi validado localmente; o resultado remoto do GitHub Actions deve ser consultado no repositório.

Em 03/10/2026: instalação pelo lockfile, lint e build aprovados; **7 testes E2E aprovados**. Cobrem cadastro/login/sessão/menu; cliente/contrato/pagamento parcial/edição protegida/anexo/histórico/renovação; despesas/calendário/CSV/XLSX/proteção; OCR sem criação antes da confirmação; centavos e dia 1 na calculadora/troca de senha; 25 contratos/paginação/totais; falha 503 com nova tentativa.

## Visual e limites

A inspeção visual usou Chromium em 1504×1045 e 390×844. O plugin Browser não estava disponível; a automação usou Playwright. Textos, botões, tabelas e gráficos são elementos da aplicação, não uma imagem sobreposta.

A tela inicial foi comparada com um conceito visual de referência: barra lateral, cabeçalho, quatro indicadores, gráfico/resumo em duas colunas e tabela de vencimentos. O menu recolhe em telas pequenas. Os valores vêm da API, incluindo diferenças intencionais entre a referência e os dados reais; não foram adicionadas contagens fictícias ou notificações de leitura inexistentes. O Figma ficou inacessível neste ambiente (403), portanto esta branch não comprova fidelidade ao protótipo oficial.

Ainda é necessário ensaiar com os integrantes, conferir o Figma e testar os dispositivos e navegadores da apresentação. Recuperação de senha por e-mail, notificações push e operação offline não estão implementadas. Juros/multa são estimativas de cobrança; o pagamento registra principal. Exportações têm limite de 10.000 registros; arquivos, 10 MB.

Veja o [roteiro de integração e evidências](../docs/FRONT_MOBILE_TESTE.md).
