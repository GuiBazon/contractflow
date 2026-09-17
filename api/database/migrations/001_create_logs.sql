-- ============================================================
-- ContractFlow - Migration: LOG GERAL DO SISTEMA
-- ------------------------------------------------------------
-- Cria a tabela `logs` (USUARIOS 1:N LOGS) em bancos ja
-- existentes criados pelo schema.sql anterior.
--
-- COMO USAR:
--   mysql -h 127.0.0.1 -P 3307 -u <user> -p contractflow < database/migrations/001_create_logs.sql
--
-- A operacao e idempotente (CREATE TABLE IF NOT EXISTS).
-- Nao altera nem remove nenhuma tabela existente.
-- historico_contratos continua existindo (historico especifico
-- de contratos); logs e o historico geral de acoes do sistema.
-- ============================================================

CREATE TABLE IF NOT EXISTS logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  acao VARCHAR(100) NOT NULL,
  entidade VARCHAR(100),
  entidade_id INT,
  descricao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_logs_usuario_id (usuario_id),
  KEY idx_logs_created_at (created_at),
  KEY idx_logs_entidade (entidade),
  KEY idx_logs_entidade_id (entidade_id),
  CONSTRAINT fk_logs_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
);
