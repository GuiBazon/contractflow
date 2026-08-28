CREATE DATABASE IF NOT EXISTS contractflow;
USE contractflow;

CREATE TABLE IF NOT EXISTS usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  senha_hash VARCHAR(255) NOT NULL,
  perfil ENUM('ADMIN', 'USUARIO') DEFAULT 'USUARIO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clientes (
  id INT PRIMARY KEY AUTO_INCREMENT,
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
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contratos (
  id INT PRIMARY KEY AUTO_INCREMENT,
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
  juros_percentual DECIMAL(8,2) DEFAULT 0,
  multa_percentual DECIMAL(8,2) DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS parcelas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  contrato_id INT NOT NULL,
  numero INT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  status ENUM('PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA') DEFAULT 'PENDENTE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (contrato_id) REFERENCES contratos(id)
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  parcela_id INT NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  data_pagamento DATE NOT NULL,
  forma_pagamento VARCHAR(50),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (parcela_id) REFERENCES parcelas(id)
);

CREATE TABLE IF NOT EXISTS documentos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  contrato_id INT NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  caminho VARCHAR(500) NOT NULL,
  tipo VARCHAR(80),
  tamanho BIGINT,
  hash VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contrato_id) REFERENCES contratos(id)
);

CREATE TABLE IF NOT EXISTS historico_contratos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  contrato_id INT NOT NULL,
  usuario_id INT NOT NULL,
  acao VARCHAR(100) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (contrato_id) REFERENCES contratos(id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

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
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE INDEX idx_contratos_cliente_id ON contratos(cliente_id);
CREATE INDEX idx_parcelas_contrato_id ON parcelas(contrato_id);
CREATE INDEX idx_pagamentos_parcela_id ON pagamentos(parcela_id);
CREATE INDEX idx_documentos_contrato_id ON documentos(contrato_id);
CREATE INDEX idx_historico_contrato_id ON historico_contratos(contrato_id);
