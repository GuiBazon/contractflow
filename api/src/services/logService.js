// Log geral do sistema (USUARIOS 1:N LOGS).
// Padrao identico ao historicoService: recebe um executor (pool ou
// conexao transacional) e grava o evento. O usuario responsavel vem
// sempre da autenticacao (req.user.id) — nunca do corpo da requisicao.
// Nao substitui historico_contratos (historico especifico de contratos).
async function registrarLog(db, { usuarioId, acao, entidade, entidadeId, descricao }) {
  if (!usuarioId) {
    throw Object.assign(new Error('usuarioId é obrigatório para registrar o log'), { status: 500 });
  }
  if (!acao) {
    throw Object.assign(new Error('acao é obrigatória para registrar o log'), { status: 500 });
  }
  await db.execute(
    'INSERT INTO logs (usuario_id, acao, entidade, entidade_id, descricao) VALUES (?, ?, ?, ?, ?)',
    [
      usuarioId,
      String(acao),
      entidade ? String(entidade) : null,
      entidadeId ? Number(entidadeId) : null,
      descricao ? String(descricao) : null,
    ]
  );
}

// Consulta os logs do proprio usuario (RNF04 / isolamento de dados).
// Suporta filtros opcionais: acao, entidade, entidade_id, de, ate.
async function listarLogs(db, usuarioId, { acao, entidade, entidadeId, de, ate, limit = 50, offset = 0 } = {}) {
  const where = ['l.usuario_id = ?'];
  const params = [usuarioId];

  if (acao) {
    where.push('l.acao = ?');
    params.push(String(acao));
  }
  if (entidade) {
    where.push('l.entidade = ?');
    params.push(String(entidade));
  }
  if (entidadeId) {
    where.push('l.entidade_id = ?');
    params.push(Number(entidadeId));
  }
  if (de) {
    where.push('l.created_at >= ?');
    params.push(de);
  }
  if (ate) {
    where.push('l.created_at <= ?');
    params.push(ate);
  }

  const whereSql = where.join(' AND ');

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM logs l WHERE ${whereSql}`,
    params
  );

  const [rows] = await db.execute(
    `SELECT l.id, l.acao, l.entidade, l.entidade_id, l.descricao, l.created_at,
            u.nome AS usuario_nome
     FROM logs l
     JOIN usuarios u ON u.id = l.usuario_id
     WHERE ${whereSql}
     ORDER BY l.id DESC
     LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)]
  );

  return { total, rows };
}

module.exports = { registrarLog, listarLogs };
