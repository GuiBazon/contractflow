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
- integrar OCR em etapas futuras

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
