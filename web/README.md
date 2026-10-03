# ContractFlow Web — React + Vite

Branch de testes baseada em `feature/sprint-2-backend`. JavaScript, React, React Router, Axios e CSS; componentes funcionais com hooks, como os exemplos do SENAI.

## Executar

Inicie primeiro a API conforme [api/README.md](../api/README.md). Depois:

```bash
cd web
npm ci
npm run dev
```

O Vite usa `/api` e encaminha as chamadas para `http://127.0.0.1:8080`. Para uma API em outro servidor, copie `.env.example` para `.env.local` e ajuste `VITE_API_URL`, incluindo `/api`. Reinicie o Vite depois de alterar variáveis. Não existe IP da escola fixo no código.

Em produção, `npm run build` cria `dist/`. Configure o servidor para encaminhar `/api` ao backend e retornar `index.html` para as rotas da aplicação, ou use a URL pública da API em `VITE_API_URL` durante o build.

## Organização

- `src/App.jsx`: rotas públicas e protegidas.
- `src/axios/axios.js`: Axios, token, erros e downloads autenticados.
- `src/hooks/useConsulta.js`: carregamento, cancelamento de consultas antigas e paginação completa do calendário.
- `src/components/Layout.jsx`: navegação, sessão e menu para celular.
- `src/components/ui.jsx`: campos, tabelas, formulários, diálogos e estados de carregamento/erro/vazio.
- `src/pages`: telas organizadas por funcionalidade.
- `src/styles.css`: padrão visual e adaptação a diferentes telas.

O backend valida permissões, CPF/CNPJ, datas e integridade financeira. Os controles da interface não substituem essas validações. A sessão fica no navegador; para uma implantação pública, avalie cookies HTTP-only e HTTPS junto com o backend.

## Verificação

```bash
npm run lint
npm run build
```

Login, painel com dados reais e menu responsivo foram verificados em Chromium/Playwright nos tamanhos 1504×1045 e 390×844. O Figma não ficou acessível neste ambiente (403); o visual usa o padrão azul do projeto e um conceito de referência para esta branch experimental.
