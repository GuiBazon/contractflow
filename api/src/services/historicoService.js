// Historico de eventos do contrato (RF36 / RN11)
async function registrarHistorico(db, { contratoId, usuarioId, acao, descricao }) {
  await db.execute(
    'INSERT INTO historico_contratos (contrato_id, usuario_id, acao, descricao) VALUES (?, ?, ?, ?)',
    [contratoId, usuarioId, acao, descricao || '']
  );
}

module.exports = { registrarHistorico };