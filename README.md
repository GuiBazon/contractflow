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
- importar contratos por OCR com revisão e confirmação

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

## Backend — Sprint 2

API e testes da Sprint 2 estão na branch `feature/sprint-2-backend`. A entrega
inclui recebíveis, despesas, dashboard, calendário/alertas, relatórios CSV/XLSX,
OCR português de PDF/imagem/scan, gestão de usuários/sessões, calculadora e
renovação, além da regressão dos CRUDs.

- [Instalação e testes](api/README.md)
- [API para integração Web/Mobile](docs/API_SPRINT_2.md)
- [Requisitos com evidências](docs/REQUISITOS.md)
- [Entrega, commits, cards e roteiro de apresentação](docs/ENTREGA_SPRINT_2.md)

Validação local: 84 testes rápidos + 33 cenários MySQL; cobertura combinada de
91,09% das linhas do backend medido. Workflow Backend automatiza as duas suítes
e combina os relatórios. A versão final nas telas Web/Mobile ainda exige a
integração e o ensaio da equipe; os resultados locais não atestam essa etapa.
