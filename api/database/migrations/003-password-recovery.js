module.exports = async connection => {
  await connection.query(`CREATE TABLE IF NOT EXISTS recuperacoes_senha (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expira_em DATETIME NOT NULL,
    usado_em DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    KEY idx_recuperacoes_usuario (usuario_id),
    CONSTRAINT fk_recuperacao_usuario FOREIGN KEY (usuario_id)
      REFERENCES usuarios(id) ON DELETE RESTRICT
  )`);
};
