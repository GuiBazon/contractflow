const db = require('../config/db');
const { pagination } = require('../utils/query');
const alerts = require('../services/alertService');

async function list(req, res) {
  const pages = pagination(req.query);
  const { sql, params, dias } = alerts.source(req.user.id, req.query.dias ?? 7);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM (${sql}) alertas`, params);
  const [rows] = await db.query(`SELECT * FROM (${sql}) alertas ORDER BY data,id LIMIT ? OFFSET ?`, [...params, pages.limit, pages.offset]);
  res.json({ data: rows.map(row => ({ ...row, valor: Number(row.valor) })), dias, paginacao: { page: pages.page, limit: pages.limit, total, totalPages: Math.ceil(total / pages.limit) } });
}
module.exports = { list };
