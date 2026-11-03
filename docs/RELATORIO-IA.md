# ContractFlow — Relatório de Contexto para IAs

Atualizado em 22/10/2026.

## 1. Objetivo do projeto

O ContractFlow é um sistema de gestão de contratos, clientes, parcelas, pagamentos,
documentos e recebíveis. O repositório contém:

- `api/`: API Node.js/Express com MySQL, JWT, uploads, documentos e OCR.
- `mobile/`: aplicativo React Native/Expo para Android e iOS.
- `ocr-service/`: serviço Python/FastAPI para extração de texto de PDFs e imagens.
- `web/`: frente web do projeto; não faz parte da entrega mobile recente.
- `docs/`: documentação de setup, endpoints e requisitos.

## 2. Estrutura e pontos de entrada

### Mobile

- Entrada: `mobile/index.js` → `mobile/App.js`.
- Raiz: `SafeAreaProvider` → `ThemeProvider` → `NavigationContainer`.
- Navegação principal: `mobile/src/navigation/RootNavigator.js`.
- Abas inferiores: `mobile/src/navigation/MainTabs.js`.
- Telas: `mobile/src/screens/`.
- Componentes reutilizáveis: `mobile/src/components/`.
- Serviços: `mobile/src/services/`.
- Tema: `mobile/src/theme/`.

Fluxos disponíveis:

1. Splash, login, cadastro e sessão persistida.
2. Dashboard com totais e próximos vencimentos.
3. CRUD de clientes e contratos.
4. Detalhe do contrato com parcelas, pagamentos, documentos e histórico.
5. Agenda e Financeiro.
6. Importação de contrato por OCR.
7. Revisão e confirmação da importação.
8. Abertura autenticada de imagens e PDFs.

### API

- Entrada: `api/src/server.js`.
- Rotas agregadas em `api/src/routes/index.js`:
  - `/api/auth`
  - `/api/clientes`
  - `/api/contratos`
  - `/api/parcelas`
  - `/api/pagamentos`
  - `/api/receitas`
  - `/api/documentos`
  - `/api/ocr`
- Controllers em `api/src/controllers/`.
- Serviços em `api/src/services/`.
- Schema e seed em `api/database/`.

### OCR

- Serviço Python: `ocr-service/app/main.py`.
- O Node pode chamar o serviço Python por `api/src/services/pythonOcrService.js`.
- Existe fallback Node em `api/src/services/ocrService.js`.
- O fluxo mobile envia o arquivo para `/api/ocr/extract`, consulta `/api/ocr/:id`,
  atualiza os dados extraídos e confirma em `/api/ocr/:id/confirmar`.
- Não altere o OCR para corrigir problemas de interface.

## 3. Mobile — tema e navegação

Arquivos principais:

- `mobile/src/theme/colors.js`: tokens claros e escuros.
- `mobile/src/theme/ThemeContext.js`: provider, persistência e hooks.
- `mobile/src/theme/index.js`: exports públicos.
- `mobile/src/screens/Mais.js`: controle “Modo escuro”.

Funcionamento:

- O modo claro é o padrão seguro.
- A preferência é salva em `AsyncStorage` na chave exclusiva `contractflow_tema`.
- Valores aceitos: `claro` e `escuro`.
- A troca é imediata, sem reiniciar o app.
- `useTheme()` expõe `colors`, `escuro`, `modo` e `definirModo`.
- `useThemeStyles(createStyles)` cria estilos dinâmicos a partir da paleta.
- Telas e componentes usam factories `createStyles(colors)`.
- `NavigationContainer` e `StatusBar` acompanham o tema.
- O tema não toca no JWT nem nos dados de autenticação.

### Atenção com `expo-navigation-bar`

A versão instalada é `expo-navigation-bar@57.0.2`. Ela não exporta
`setBackgroundColorAsync` nem `setButtonStyleAsync`. Chamar esses métodos gera
`undefined is not a function` e derruba a renderização no Expo Go.

O `App.js` usa apenas:

```js
NavigationBar.setVisibilityAsync('hidden')
```

A API atual oferece `setHidden`, `setStyle` e `setVisibilityAsync`. Antes de
adicionar qualquer chamada nova, confirme o export em
`mobile/node_modules/expo-navigation-bar/build/NavigationBar.js`.

## 4. Mobile — documentos e PDF

Arquivos principais:

- `mobile/src/components/DocumentViewer.js`: modal de visualização.
- `mobile/src/components/DocumentoAcao.js`: botão reutilizável de abertura.
- `mobile/src/services/documentos.js`: detecção de tipo, rótulos e abertura.
- `mobile/src/services/api.js`: download autenticado.
- `mobile/src/screens/ImportarContrato.js`: arquivo selecionado antes do OCR.
- `mobile/src/screens/RevisaoContrato.js`: ação de abrir o arquivo importado.
- `mobile/src/screens/DetalheContrato.js`: documentos do contrato.

Comportamento:

- Imagens são exibidas no modal interno, com zoom.
- PDFs são baixados com token e abertos no mecanismo externo do sistema.
- Android usa `expo-intent-launcher`/visualizador de PDF instalado.
- iOS usa `expo-sharing`; não há prévia interna de PDF.
- O download valida status 200/401/404/outros, tem timeout de 45 segundos e cache local.
- A revisão só consegue reabrir o arquivo enquanto a URI local existir.
- `api.baixarDocumento` é o único caminho para obter o arquivo autenticado.
- Nunca torne `api/uploads/docs` público nem remova a verificação de proprietário.

## 5. Configuração local

### API

Crie `api/.env` a partir do exemplo existente e configure MySQL/JWT. Não commite
segredos. O schema fica em `api/database/schema.sql`; o seed é opcional.

```powershell
cd api
npm install
npm run dev
```

### Mobile

Crie `mobile/.env`:

```env
EXPO_PUBLIC_API_URL=http://IP_DO_COMPUTADOR:3000/api
```

Depois:

```powershell
cd mobile
npm install
npx expo start --lan --clear
```

O IP precisa ser acessível pelo emulador/celular, e a porta da API deve estar
liberada no firewall.

### OCR

```powershell
cd ocr-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python run.py
```

Consulte `docs/SETUP.md` para detalhes de banco, rede e execução.

## 6. Validação usada nesta entrega

- Parse Babel dos arquivos mobile: 52 arquivos, 0 falhas.
- `npx expo export --platform android`: sucesso, 1.106 módulos.
- Android Emulator `emulator-5554` com Expo Go 57.0.9:
  - app abriu sem `Render Error`;
  - Dashboard, abas e `Mais` funcionaram;
  - modo escuro alternou e persistiu após fechar/reabrir;
  - PDF abriu no visualizador externo do Android.
- `git diff --check`: limpo.
- Teste físico em celular ainda não realizado.
- Aviso de depreciação de `SafeAreaView` do React Native permanece; não bloqueia o app.

## 7. Regras para próximas alterações

1. Trabalhe somente na branch indicada pelo solicitante.
2. Não use `git reset --hard`, `git clean -fd` nem descarte alterações sem auditoria.
3. Não altere API, banco, OCR ou web para resolver problema visual do mobile.
4. Não adicione dependências sem verificar a versão do Expo SDK.
5. Preserve autenticação, CRUD, navegação e fluxo de documentos.
6. Não reintroduza `setBackgroundColorAsync`/`setButtonStyleAsync` no mobile.
7. Não commite `.env`, tokens, senhas ou uploads.
8. Antes de declarar sucesso, gere o bundle Android e teste a abertura real no emulador.
9. Se precisar integrar o mobile à `main`, aplique apenas as mudanças de `mobile/` e
   documentação; não faça merge cego da branch inteira, pois ela contém commits de
   API/OCR que podem sobrescrever o trabalho atual da `main`.

## 8. Limitações conhecidas

- Sem teste em aparelho físico nesta rodada.
- PDF no iOS depende do seletor de compartilhamento.
- A prévia da revisão depende da URI local temporária.
- O splash escuro é configuração legada do Expo; `expo-splash-screen` não está instalado.
- O modo escuro usa `userInterfaceStyle: "light"` no `app.json` por ausência de
  `expo-system-ui`; a troca visual é feita em JavaScript.
