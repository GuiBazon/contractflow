const db = require('../config/db');
const service = require('../services/recebivelService');
const { pagination } = require('../utils/query');

async function list(req, res) {
  const pages = pagination(req.query);
  const resumo = await service.summary(db, req.user.id, req.query);
  const data = await service.list(db, req.user.id, req.query, pages);
  res.json({ data, resumo, paginacao: { page: pages.page, limit: pages.limit, total: resumo.total, totalPages: Math.ceil(resumo.total / pages.limit) } });
}

module.exports = { list };
