-- ============================================================
-- ContractFlow - Seed de demonstracao (Sprint 1)
-- ------------------------------------------------------------
-- COMO USAR (uma vez, em banco criado pelo schema.sql):
--   mysql -u <user> -p contractflow < seed.sql
--
-- Cria: 2 usuarios demo (senha: demo123), 1 cliente, 1 contrato
-- com 4 parcelas (1 PAGA, 1 VENCIDA, 2 PENDENTES), 1 pagamento
-- e historico. Serve para apresentar o fluxo sem cadastrar
-- tudo ao vivo.
--
-- LOGIN DEMO: demo@contractflow.com / demo123 (ADMIN)
-- ============================================================

USE contractflow;

-- usuarios demo (senha de ambos: demo123, bcrypt custo 10)
INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES
  ('Demo Admin', 'demo@contractflow.com', '$2a$10$nUgbbm3BfmLiEB6r/xEsN.oqa1GSt3wD.sIRsSCGynR0IUA8ZCjYa', 'ADMIN'),
  ('Demo Usuario', 'usuario@contractflow.com', '$2a$10$nUgbbm3BfmLiEB6r/xEsN.oqa1GSt3wD.sIRsSCGynR0IUA8ZCjYa', 'USUARIO');

SELECT id INTO @demo_id FROM usuarios WHERE email = 'demo@contractflow.com';

-- cliente demo (CPF valido de teste)
INSERT INTO clientes (usuario_id, nome_razao_social, cpf_cnpj, email, telefone, cidade, estado)
VALUES (@demo_id, 'Empresa Demonstracao LTDA', '11144477735', 'contato@empresademo.com', '(11) 99999-0000', 'Sao Paulo', 'SP');

SELECT id INTO @cli_id FROM clientes WHERE usuario_id = @demo_id AND cpf_cnpj = '11144477735' LIMIT 1;

-- contrato demo (valor 2000 em 4x de 500)
INSERT INTO contratos (usuario_id, cliente_id, numero, descricao, valor_total, data_inicio, forma_pagamento, quantidade_parcelas, status)
VALUES (@demo_id, @cli_id, 'DEMO-001', 'Contrato de demonstracao da Sprint 1', 2000.00, DATE_SUB(CURDATE(), INTERVAL 50 DAY), 'BOLETO', 4, 'ATIVO');

SELECT id INTO @ct_id FROM contratos WHERE usuario_id = @demo_id AND numero = 'DEMO-001' LIMIT 1;

-- parcelas: p1 vencida e paga, p2 vencida em aberto, p3/p4 futuras
INSERT INTO parcelas (contrato_id, numero, valor, data_vencimento, status) VALUES
  (@ct_id, 1, 500.00, DATE_SUB(CURDATE(), INTERVAL 40 DAY), 'PENDENTE'),
  (@ct_id, 2, 500.00, DATE_SUB(CURDATE(), INTERVAL 5 DAY), 'PENDENTE'),
  (@ct_id, 3, 500.00, DATE_ADD(CURDATE(), INTERVAL 25 DAY), 'PENDENTE'),
  (@ct_id, 4, 500.00, DATE_ADD(CURDATE(), INTERVAL 55 DAY), 'PENDENTE');

SELECT id INTO @p1_id FROM parcelas WHERE contrato_id = @ct_id AND numero = 1 LIMIT 1;

-- pagamento integral da parcela 1
INSERT INTO pagamentos (parcela_id, valor, data_pagamento, forma_pagamento, observacoes)
VALUES (@p1_id, 500.00, DATE_SUB(CURDATE(), INTERVAL 35 DAY), 'PIX', 'Pagamento demo');

-- historico do contrato
INSERT INTO historico_contratos (contrato_id, usuario_id, acao, descricao) VALUES
  (@ct_id, @demo_id, 'CRIACAO', 'Contrato DEMO-001 criado com 4 parcelas'),
  (@ct_id, @demo_id, 'PAGAMENTO', 'Pagamento de R$ 500.00 na parcela 1 via PIX');
