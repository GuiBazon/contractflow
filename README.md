# ContractFlow

Sistema de gestão de contratos, recebíveis, pagamentos e controle financeiro para pequenas e médias empresas.

## Integrantes
- Guilherme Bazon Garcia Neves
- Ulisses Santini Gomes
- Renam Vieira Mobrise
- João Victor Oliveira Silva
- Eduardo Augusto Tognati

## Visão geral
O ContractFlow foi pensado para centralizar a gestão de clientes, contratos, parcelas, vencimentos, pagamentos e documentos em uma única plataforma, reduzindo o uso de planilhas e controles manuais.

A ideia principal é permitir que a empresa acompanhe sua situação financeira com mais organização, visualizando o que já foi recebido, o que está pendente, o que está em atraso e tudo o que está relacionado ao ciclo de vida do contrato.

## Objetivo do sistema
- cadastrar clientes e contratos
- gerar e controlar parcelas
- registrar pagamentos
- acompanhar recebíveis e atrasos
- controlar despesas
- manter documentos e histórico do contrato
- oferecer dashboard e calendário financeiro
- importar PDF e imagem com OCR, revisar os dados sugeridos e confirmar a criação do contrato

## Stack do projeto
- Backend: Node.js + Express
- Banco de dados: MySQL
- Autenticação: JWT + bcrypt
- Frontend Web: React
- Mobile: React Native + Expo
- Repositório: Git/GitHub

## Papel de cada área
### Backend
Responsável pela regra de negócio, autenticação, banco de dados, endpoints e lógica financeira.

### Frontend Web
Responsável pela interface web para uso da equipe e clientes internos.

### Mobile
Responsável pela versão mobile do sistema, com foco em usabilidade e consulta rápida.

## Fluxo principal do sistema
1. cadastro do cliente
2. cadastro do contrato
3. geração das parcelas
4. registro de pagamentos
5. atualização do saldo e situação financeira
6. acompanhamento por dashboard e calendário
7. gestão de documentos e histórico

## Observações finais
- A branch principal deve ser usada para versões estáveis.
- O desenvolvimento de features acontece em branches separadas.

## Versão final da Sprint 2 (12/11/2026)

A implementação integrada da API, Web e Mobile está na branch [`main`](https://github.com/GuiBazon/contractflow/tree/main). O merge final está documentado no [PR #5](https://github.com/GuiBazon/contractflow/pull/5).

Funcionalidades implementadas no backend: autenticação JWT, usuários e permissões, CRUD de clientes/contratos/despesas, parcelas, pagamentos parciais e em lote, estornos auditáveis, idempotência financeira, OCR com revisão e confirmação, documentos, dashboard, calendário, relatórios e exportações CSV/XLSX.

### Iniciar demonstração local

Requisitos: Node.js 24, Docker Desktop com suporte a Linux e rede local para testar o Mobile.

1. Na pasta `api`, crie `.env` baseado em [`.env.example`](api/.env.example), configure `DB_HOST=127.0.0.1`, `DB_PORT` livre na máquina, `DB_USER`, `DB_PASSWORD`, `DB_NAME=contractflow` e um `JWT_SECRET` forte. Para o Compose, use os mesmos valores `DB_PORT`, `DB_USER` e `DB_PASSWORD`.
2. Execute `docker compose up -d db`, `npm ci`, `npm run demo:setup` e `npm run dev` em `api/`. O seed não apaga dados existentes e a API inicia na porta especificada por `PORT` (recomendado 8080).
3. Em `web/`, configure `.env` com `VITE_API_URL=http://localhost:8080/api`, execute `npm ci` e `npm run dev`.
4. Em `mobile/`, configure `EXPO_PUBLIC_API_URL=http://IP_DO_COMPUTADOR:8080/api`, execute `npm ci` e `npx expo start --lan --clear`; celular e PC precisam compartilhar a rede, sem bloqueio entre clientes.

O seed gera uma conta e 12 clientes, 12 contratos, 89 parcelas, 39 pagamentos e 12 despesas de demonstração. Use esse usuário **somente em desenvolvimento**, nunca em produção.

### Evidências da entrega

- [Documentação, requisitos e DER (Notion)](https://wild-toaster-3fa.notion.site/contractflow)
- [Tarefas e responsáveis (Trello)](https://trello.com/b/FMilhTuN/contractflow)
- [Protótipos (Figma)](https://www.figma.com/design/aNfKBROulxyewRPhmNkW4l/ContractFlow?node-id=0-1)
- [Branch individual de backend](https://github.com/GuiBazon/contractflow/tree/feature/sprint-2-backend)
- [Card individual de backend](https://trello.com/c/rjpDKLhD/9-back-end-sprint-2)
- [Roteiro técnico de implementação](docs/ROTEIRO_EVOLUCOES_BACKEND.md)
- [Especificação dos endpoints](docs/ENDPOINTS.md) e [Swagger local](http://localhost:8080/api/docs/)
- [Testes da API com MySQL no CI da main](https://github.com/GuiBazon/contractflow/actions/runs/43212979047)
- [Build Web e Mobile no CI](https://github.com/GuiBazon/contractflow/actions/runs/43212475702)

**Limitações verificadas:** build e testes de API não substituem ensaios manuais de todos os fluxos da Web/Mobile. A [Web na Vercel](https://contractflow-web-final.vercel.app) está publicada, mas a API e o MySQL ainda não estão hospedados publicamente; para demonstrar login e operações financeiras reais, use o ambiente local completo. Certas telas secundárias (como sessões de segurança e autenticação em duas etapas) ainda contêm elementos demonstrativos ou planejados.
