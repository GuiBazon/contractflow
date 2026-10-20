const db = require('../config/db');
const alerts = require('./alertService');
const { HttpError } = require('../utils/http');

function definition(usuarioId, days) {
  const source = alerts.source(usuarioId, days);
  return {
    dias: source.dias,
    sql: `FROM (${source.sql}) a LEFT JOIN notificacoes_leituras n
      ON n.usuario_id=? AND n.chave_evento=CONCAT(a.tipo,':',a.id,':',a.data)`,
    params: [...source.params, usuarioId],
  };
}

async function summary(usuarioId, days = 7) {
  const source = definition(usuarioId, days);
  const [[row]] = await db.query(`SELECT COUNT(*) AS total,
    COALESCE(SUM(n.lida_em IS NULL),0) AS nao_lidas ${source.sql}`, source.params);
  const total = Number(row.total);
  const nao_lidas = Number(row.nao_lidas);
  return { total, nao_lidas, lidas: total - nao_lidas };
}

async function list(usuarioId, query, pages) {
  if (query.lida !== undefined && !['true', 'false'].includes(query.lida)) throw new HttpError(400, 'lida deve ser true ou false');
  const source = definition(usuarioId, query.dias ?? 7);
  const resumo = await summary(usuarioId, source.dias);
  const condition = query.lida === 'true' ? 'WHERE n.lida_em IS NOT NULL'
    : query.lida === 'false' ? 'WHERE n.lida_em IS NULL' : '';
  const [rows] = await db.query(`SELECT a.*, n.lida_em ${source.sql} ${condition}
    ORDER BY a.data,a.id LIMIT ? OFFSET ?`, [...source.params, pages.limit, pages.offset]);
  const total = query.lida === 'true' ? resumo.lidas : query.lida === 'false' ? resumo.nao_lidas : resumo.total;
  return {
    data: rows.map(row => ({ ...row, valor: Number(row.valor), lida: row.lida_em !== null })),
    dias: source.dias, resumo,
    paginacao: { page: pages.page, limit: pages.limit, total, totalPages: Math.ceil(total / pages.limit) },
  };
}

async function current(usuarioId, id) {
  if (!/^(parcela|contrato)-[1-9]\d*$/.test(id) || id.length > 40) throw new HttpError(400, 'Identificador de notificação inválido');
  const source = alerts.source(usuarioId, 90);
  const [[row]] = await db.query(`SELECT * FROM (${source.sql}) a WHERE a.id=?`, [...source.params, id]);
  if (!row) throw new HttpError(404, 'Notificação não encontrada');
  return row;
}

async function markRead(usuarioId, id) {
  const row = await current(usuarioId, id);
  const key = alerts.eventKey(row);
  await db.execute(`INSERT INTO notificacoes_leituras (usuario_id,chave_evento,lida_em)
    VALUES (?,?,UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`, [usuarioId, key]);
  const [[reading]] = await db.execute('SELECT lida_em FROM notificacoes_leituras WHERE usuario_id=? AND chave_evento=?', [usuarioId, key]);
  return { id: row.id, lida: true, lida_em: reading.lida_em };
}

async function markUnread(usuarioId, id) {
  const row = await current(usuarioId, id);
  await db.execute('DELETE FROM notificacoes_leituras WHERE usuario_id=? AND chave_evento=?', [usuarioId, alerts.eventKey(row)]);
  return { id: row.id, lida: false, lida_em: null };
}

async function markAllRead(usuarioId, days = 7) {
  const source = alerts.source(usuarioId, days);
  await db.query(`INSERT INTO notificacoes_leituras (usuario_id,chave_evento,lida_em)
    SELECT ?,CONCAT(a.tipo,':',a.id,':',a.data),UTC_TIMESTAMP() FROM (${source.sql}) a
    ON DUPLICATE KEY UPDATE id=notificacoes_leituras.id`, [usuarioId, ...source.params]);
  return summary(usuarioId, source.dias);
}

module.exports = { list, summary, markRead, markUnread, markAllRead };
