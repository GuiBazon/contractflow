const db = require('../config/db');
const recebiveis = require('./recebivelService');
const { period, dateWhere } = require('../utils/query');
const { calcularProjecao } = require('./financeiroService');

async function summary(usuarioId, query = {}) {
  const dates = period(query);
  const rw = ['c.usuario_id = ?']; const rp = [usuarioId];
  dateWhere('pg.data_pagamento', dates, rw, rp);
  const ew = ['usuario_id = ?']; const ep = [usuarioId];
  dateWhere('data', dates, ew, ep);
  const [financeiro, [counts], [income], [expenses]] = await Promise.all([
    recebiveis.summary(db, usuarioId, dates),
    db.query(`SELECT (SELECT COUNT(*) FROM clientes WHERE usuario_id = ?) AS clientes,
     (SELECT COUNT(*) FROM contratos WHERE usuario_id = ? AND status = 'ATIVO') AS contratos_ativos`, [usuarioId, usuarioId]),
    db.query(`SELECT COALESCE(SUM(pg.valor),0) AS recebido FROM pagamentos pg
     JOIN parcelas p ON p.id = pg.parcela_id JOIN contratos c ON c.id = p.contrato_id WHERE ${rw.join(' AND ')}`, rp),
    db.query(`SELECT COALESCE(SUM(CASE WHEN status = 'PAGA' THEN valor ELSE 0 END),0) AS pagas,
     COALESCE(SUM(CASE WHEN status = 'PENDENTE' THEN valor ELSE 0 END),0) AS pendentes FROM despesas WHERE ${ew.join(' AND ')}`, ep),
  ]);
  const recebido = Number(income[0].recebido);
  const despesas_pagas = Number(expenses[0].pagas);
  const despesas_pendentes = Number(expenses[0].pendentes);
  return { periodo: dates, clientes: Number(counts[0].clientes), contratos_ativos: Number(counts[0].contratos_ativos),
    recebido, pendente: financeiro.pendente, atrasado: financeiro.atrasado,
    despesas_pagas, despesas_pendentes,
    ...calcularProjecao({ recebido, pendente: financeiro.pendente, despesas_pagas, despesas_pendentes }) };
}

async function monthly(usuarioId, query) {
  const dates = period(query);
  const rw = ['c.usuario_id = ?']; const rp = [usuarioId];
  const ew = ['usuario_id = ?', "status = 'PAGA'"]; const ep = [usuarioId];
  dateWhere('pg.data_pagamento', dates, rw, rp);
  dateWhere('data', dates, ew, ep);
  const [[income], [expenses]] = await Promise.all([
    db.query(`SELECT DATE_FORMAT(pg.data_pagamento,'%Y-%m') AS mes, SUM(pg.valor) AS valor
     FROM pagamentos pg JOIN parcelas p ON p.id = pg.parcela_id JOIN contratos c ON c.id = p.contrato_id
     WHERE ${rw.join(' AND ')} GROUP BY mes ORDER BY mes`, rp),
    db.query(`SELECT DATE_FORMAT(data,'%Y-%m') AS mes, SUM(valor) AS valor FROM despesas
     WHERE ${ew.join(' AND ')} GROUP BY mes ORDER BY mes`, ep),
  ]);
  const months = new Map();
  for (const [rows, field] of [[income, 'receitas'], [expenses, 'despesas']]) {
    for (const row of rows) {
      if (!months.has(row.mes)) months.set(row.mes, { mes: row.mes, receitas: 0, despesas: 0 });
      months.get(row.mes)[field] = Number(row.valor);
    }
  }
  return [...months.values()].sort((a, b) => a.mes.localeCompare(b.mes)).map(row => ({ ...row, saldo: Number((row.receitas - row.despesas).toFixed(2)) }));
}

module.exports = { summary, monthly };
