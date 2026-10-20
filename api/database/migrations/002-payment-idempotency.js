module.exports = async connection => {
  await connection.query(`CREATE TABLE IF NOT EXISTS chaves_idempotencia (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    chave VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    request_hash CHAR(64) NOT NULL,
    response_status SMALLINT UNSIGNED NULL,
    response_json JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_idempotencia_usuario_chave (usuario_id, chave),
    CONSTRAINT fk_idempotencia_usuario FOREIGN KEY (usuario_id)
      REFERENCES usuarios(id) ON DELETE RESTRICT
  )`);
};
