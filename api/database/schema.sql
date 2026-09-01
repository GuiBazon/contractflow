-- ============================================================
-- ContractFlow - Schema do banco de dados (MySQL 8+)
-- ------------------------------------------------------------
-- Cada usuário possui seu próprio conjunto de dados (RNF04).
-- O dono é definido em clientes.usuario_id e contratos.usuario_id.
-- Parcelas, pagamentos e documentos são acessados sempre através
-- da cadeia contrato -> cliente -> usuário.
--
-- Para um banco já existente, execute: DROP DATABASE contractflow;
-- e rode este script novamente.
-- ============================================================

CREATE DATABASE IF NOT EXISTS contractflow
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE contractflow;

-- RNF02 / RF01 / RF02 / RF03: usuários
CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('ADMIN', 'USUARIO') DEFAULT 'USUARIO',
  ativo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- RF05 / RF06: clientes (pertencentes a um usuário)
CREATE TABLE IF NOT EXISTS clientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  nome_razao_social VARCHAR(200) NOT NULL,
  cpf_cnpj VARCHAR(30) NOT NULL,
  email VARCHAR(150),
  telefone VARCHAR(30),
  cep VARCHAR(20),
  logradouro VARCHAR(200),
  numero VARCHAR(20),
  complemento VARCHAR(100),
  bairro VARCHAR(100),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_clientes_usuario_cpf_cnpj (usuario_id, cpf_cnpj),
  KEY idx_clientes_usuario_id (usuario_id),
  CONSTRAINT fk_clientes_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- RF07 / RF40 / RN02 / RN01 / RN03: contratos
CREATE TABLE IF NOT EXISTS contratos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  cliente_id INT NOT NULL,
  numero VARCHAR(50) NOT NULL,
  tipo VARCHAR(100),
  descricao TEXT,
  valor_total DECIMAL(12,2) NOT NULL,
  data_inicio DATE,
  data_fim DATE,
  forma_pagamento VARCHAR(50),
  quantidade_parcelas INT,
  status ENUM('ATIVO', 'PENDENTE', 'ENCERRADO', 'CANCELADO', 'EM_RENOVACAO') DEFAULT 'ATIVO',
  juros_percentual DECIMAL(8,2) NOT NULL DEFAULT 0,
  multa_percentual DECIMAL(8,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_contratos_usuario_numero (usuario_id, numero),
  KEY idx_contratos_usuario_id (usuario_id),
  KEY idx_contratos_cliente_id (cliente_id),
  KEY idx_contratos_status (status),
  CONSTRAINT chk_contratos_valor_total CHECK (valor_total >= 0),
  CONSTRAINT fk_contratos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  CONSTRAINT fk_contratos_cliente
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT
);

-- RN04 / RN05 / RF14 / RF15 / RF16: parcelas
CREATE TABLE IF NOT EXISTS parcelas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  contrato_id INT NOT NULL,
  numero INT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status ENUM('PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA') DEFAULT 'PENDENTE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_parcelas_contrato_id (contrato_id),
  KEY idx_parcelas_status_vencimento (status, data_vencimento),
  KEY idx_parcelas_vencimento (data_vencimento),
  CONSTRAINT chk_parcelas_valor CHECK (valor >= 0),
  CONSTRAINT fk_parcelas_contrato
    FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_parcela_contrato_numero (contrato_id, numero)
);

-- RF17 / RF18 / RN06 / RF19 / RF21 + registros de pagamento
CREATE TABLE IF NOT EXISTS pagamentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parcela_id INT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_pagamento DATE NOT NULL,
  forma_pagamento VARCHAR(50),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pagamentos_parcela_id (parcela_id),
  KEY idx_pagamentos_data (data_pagamento),
  CONSTRAINT chk_pagamentos_valor CHECK (valor >= 0),
  CONSTRAINT fk_pagamentos_parcela
    FOREIGN KEY (parcela_id) REFERENCES parcelas(id) ON DELETE RESTRICT
);

-- RF09 / RF41 / RN10: documento original e anexos do contrato
CREATE TABLE IF NOT EXISTS documentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  contrato_id INT NOT NULL,
  usuario_id INT NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  caminho VARCHAR(500) NOT NULL,
  tipo ENUM('ORIGINAL', 'ANEXO') DEFAULT 'ANEXO',
  mime VARCHAR(100),
  tamanho BIGINT,
  hash VARCHAR(255),
  descricao VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_documentos_contrato_id (contrato_id),
  KEY idx_documentos_usuario_id (usuario_id),
  CONSTRAINT fk_documentos_contrato
    FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE RESTRICT,
  CONSTRAINT fk_documentos_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- RNF18 / RF12 / RF13 / RN09: extracoes de OCR aguardando confirmacao
CREATE TABLE IF NOT EXISTS extracao_ocr (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  caminho VARCHAR(500) NOT NULL,
  tipo_arquivo VARCHAR(80),
  tamanho BIGINT,
  texto_extraido LONGTEXT,
  dados_json JSON,
  confianca DECIMAL(5,2),
  status ENUM('PENDENTE', 'CONFIRMADA', 'CANCELADA') DEFAULT 'PENDENTE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_extracao_ocr_usuario_id (usuario_id),
  CONSTRAINT fk_extracao_ocr_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- RF36 / RN11: historico de eventos do contrato
CREATE TABLE IF NOT EXISTS historico_contratos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  contrato_id INT NOT NULL,
  usuario_id INT NOT NULL,
  acao VARCHAR(100) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_historico_contrato_id (contrato_id),
  CONSTRAINT fk_historico_contrato
    FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE RESTRICT,
  CONSTRAINT fk_historico_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);

-- RF25 / RF26: despesas da empresa
CREATE TABLE IF NOT EXISTS despesas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  descricao VARCHAR(200) NOT NULL,
  categoria VARCHAR(100),
  valor DECIMAL(12,2) NOT NULL,
  data DATE NOT NULL,
  status ENUM('PENDENTE', 'PAGA', 'CANCELADA') DEFAULT 'PENDENTE',
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_despesas_usuario_id (usuario_id),
  KEY idx_despesas_data (data),
  CONSTRAINT chk_despesas_valor CHECK (valor >= 0),
  CONSTRAINT fk_despesas_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);