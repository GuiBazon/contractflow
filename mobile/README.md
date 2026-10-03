# ContractFlow Mobile — React Native + Expo

Branch `mobile-teste`, baseada em `feature/sprint-2-backend`. Mantém o aplicativo nativo já previsto no projeto, com Expo SDK 57, React 19 e JavaScript. Usa componentes funcionais, hooks, Axios, React Navigation e SecureStore, seguindo a estrutura dos exemplos do SENAI. Vite pertence à branch web; Expo/Metro executa o aplicativo nativo e sua prévia no navegador.

## Executar

Inicie primeiro API e MySQL conforme [api/README.md](../api/README.md). Depois:

```bash
cd mobile
npm ci
cp .env.example .env
npm start
```

Ajuste `EXPO_PUBLIC_API_URL` e reinicie o Expo depois de mudar a variável:

| Uso | URL da API |
| --- | --- |
| Emulador Android no computador da API | `http://10.0.2.2:8080/api` |
| Simulador iOS ou navegador no mesmo computador | `http://127.0.0.1:8080/api` |
| Celular físico na mesma rede | `http://IP_DO_COMPUTADOR:8080/api` |
| Celular acessando backend hospedado | URL HTTPS da API, incluindo `/api` |

No celular físico, `localhost` aponta para o celular. A API deve estar acessível pela rede e o firewall deve permitir sua porta. Use Expo Go compatível com SDK 57 ou um development build compatível. Se o ambiente em nuvem não permitir conexão do telefone ao Metro, execute a branch no computador ou configure um endereço acessível; o teste no navegador não comprova esse acesso remoto.

`npm run web` abre a prévia Expo/RN no navegador. Inclua sua origem em `CORS_ORIGINS` da API. Não existe IP da escola fixo no código. A variável `EXPO_PUBLIC_API_URL` é pública e deve conter somente o endereço, nunca senha ou token.

## Funcionalidades

Cadastro/login/sessão/logout, painel com totais da API, clientes e contratos com busca e paginação, recebíveis/receitas/despesas, pagamentos parciais, proteção dos dados já pagos, edição de parcelas, parcelas extras, renovação, calendário de quatro tipos de eventos, alertas, documentos e download autenticado, cinco relatórios JSON/CSV/XLSX, calculadora, troca de senha e gestão de usuários para ADMIN.

OCR aceita PDF/imagem de até 10 MB. A extração abre uma revisão editável; salvar a revisão não cria contrato. A confirmação exige marcar que os dados foram conferidos. O original é preservado e anexos podem ser removidos. A revisão salva pode ser reaberta pela tela de importação enquanto esse fluxo permanece na navegação; a tela não oferece uma lista de extrações pendentes para recuperar o fluxo após fechar o aplicativo.

O token usa SecureStore no Android/iOS e AsyncStorage na prévia web. A API valida a sessão atual e uma resposta 401 retorna ao login. Troca de senha e logout revogam sessões no servidor. Download nativo usa arquivo temporário e a folha de compartilhamento; no navegador, usa um download autenticado.

## Código para estudar

- `App.js` e `src/navigation`: navegação, abas e retorno ao login.
- `src/services/api.js`: Axios, Bearer, erros, endpoints e multipart.
- `src/services/storage.js`: sessão e migração do token para SecureStore.
- `src/services/download.js`: download web e compartilhamento nativo.
- `src/hooks/useDados.js`: consulta ao focar a tela, erro e nova tentativa.
- `src/components/SprintUI.js`: tela, indicadores, erro/carregamento e paginação.
- `src/components/ClientePicker.js`: seleção de clientes com busca/páginas reais.
- `src/screens`: funcionalidades organizadas por tela. Os formulários duplicados de cliente/contrato foram unificados.

## Verificação

```bash
npm run lint
npm run build:web
npm run build:android
npx playwright install chromium
npm run test:e2e
```

`build:android` gera bundle Hermes e assets em `dist-android`, **não um APK instalado**. `build:web` gera a prévia de distribuição em `dist`.

Os testes E2E rodam essa prévia em Chromium 390×844 e consultam a API/MySQL reais. Precisam de uma API de QA já ligada, por padrão `http://127.0.0.1:8080/api`, com banco **exclusivo de teste** e `CORS_ORIGINS=http://127.0.0.1:8084`. Criam contas e dados sintéticos; não execute no banco de apresentação ou de produção. O Playwright gera a prévia e inicia um servidor Python 3 na porta 8084. Ajuste `CF_E2E_API_URL` e, se necessário, `PW_EXECUTABLE_PATH`. Para uma prévia Expo já iniciada, `CF_MOBILE_E2E_URL` troca a origem e reutiliza o servidor.

Em 03/10/2026: instalação pelo lockfile, lint, exportação web e bundle Android aprovados. **6 testes E2E aprovados** tanto no Metro quanto na prévia de distribuição: cadastro/sessão/logout; cliente/contrato/pagamento parcial/edição protegida/anexo/histórico/parcelas extras/renovação; OCR com revisão e original protegido; despesas/calendário/CSV/XLSX/proteção; centavos e primeiro vencimento/troca de senha; 25 contratos/paginação/totais/falha 503 com recuperação. O plugin Browser não estava disponível; foi usado Playwright.

O workflow [Mobile](../.github/workflows/mobile.yml) prepara MySQL isolado, schema, API, Poppler e Chromium, roda lint, exporta o Android e executa os E2E da prévia web. O resultado remoto do GitHub Actions ainda precisa ser consultado no repositório.

## Validação restante

É necessário instalar/abrir no Android/iOS para verificar teclado, seletor de arquivos, SecureStore, compartilhamento nativo, rede e botões do aparelho. Esses comportamentos nativos não são comprovados por Chromium nem pela exportação do bundle. A listagem de usuários com ADMIN foi verificada com a API real; as alterações administrativas ainda exigem ensaio.

Confira o Figma oficial e ensaie com os integrantes antes da apresentação. O aplicativo precisa da API; operação offline, recuperação de senha por e-mail e push não estão implementados. Juros/multa são estimativas de cobrança; pagamentos registram principal. A exportação limita resultados a 10.000 registros.

Veja o [roteiro de integração e evidências](../docs/FRONT_MOBILE_TESTE.md).
