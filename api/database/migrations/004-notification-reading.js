module.exports = async connection => {
  await connection.query(`CREATE TABLE IF NOT EXISTS notificacoes_leituras (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    chave_evento VARCHAR(120) NOT NULL,
    lida_em DATETIME NOT NULL,
    UNIQUE KEY uq_notificacao_usuario_evento (usuario_id, chave_evento),
    CONSTRAINT fk_notificacao_usuario FOREIGN KEY (usuario_id)
      REFERENCES usuarios(id) ON DELETE RESTRICT
  )`);
};
