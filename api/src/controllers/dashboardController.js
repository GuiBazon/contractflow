const service = require('../services/dashboardService');
const recebiveis = require('../services/recebivelService');
const db = require('../config/db');
const { period } = require('../utils/query');

async function get(req, res) {
  const dates = period(req.query);
  const [resumo, fluxo_mensal, proximos_vencimentos] = await Promise.all([
    service.summary(req.user.id, dates), service.monthly(req.user.id, dates),
    recebiveis.list(db, req.user.id, { ...dates, situacao: 'PENDENTE' }, { limit: 10, offset: 0 }),
  ]);
  res.json({ ...resumo, fluxo_mensal, proximos_vencimentos });
}

module.exports = { get };
