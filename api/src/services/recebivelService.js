const { dateWhere, integer, choice, period } = require('../utils/query');
const { calcJurosMulta } = require('./financeiroService');

const SITUACAO = `CASE WHEN p.status = 'CANCELADA' THEN 'CANCELADA'
 WHEN COALESCE(pg.pago, 0) >= p.valor THEN 'PAGA'
 WHEN p.data_vencimento < CURDATE() THEN 'VENCIDA' ELSE 'PENDENTE' END`;
const JOINS = `FROM parcelas p JOIN contratos c ON c.id = p.contrato_id
 JOIN clientes cl ON cl.id = c.cliente_id
 LEFT JOIN (SELECT parcela_id, SUM(valor) AS pago FROM pagamentos GROUP BY parcela_id) pg ON pg.parcela_id = p.id`;

function filters(usuarioId, query = {}) {
  const where = ['c.usuario_id = ?'];
  const params = [usuarioId];
  dateWhere('p.data_vencimento', period(query), where, params);
  for (const [name, column] of [['cliente', 'c.cliente_id'], ['contrato', 'c.id']]) {
    const id = integer(query[name], name, { optional: true });
    if (id) { where.push(`${column} = ?`); params.push(id); }
  }
  if (query.situacao !== undefined) {
    where.push(`(${SITUACAO}) = ?`);
    params.push(choice(query.situacao, ['PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA'], 'Situação'));
  }
  return { where: where.join(' AND '), params };
}

function normalize(row) {
  const valor = Number(row.valor);
  const pago = Number(row.pago);
  const pendente = row.situacao === 'CANCELADA' ? 0 : Math.max(0, Number((valor - pago).toFixed(2)));
  const dias = pendente > 0 ? Math.max(0, Number(row.dias_atraso)) : 0;
  const encargos = dias > 0 ? calcJurosMulta({ valor: pendente, diasAtraso: dias, jurosPercentual: Number(row.juros_percentual), multaPercentual: Number(row.multa_percentual) }) : { juros: 0, multa: 0, total: 0 };
  return { ...row, valor, pago, pendente, dias_atraso: dias, juros: encargos.juros, multa: encargos.multa, total_atualizado: Number((pendente + encargos.total).toFixed(2)) };
}

async function summary(db, usuarioId, query = {}) {
  const { where, params } = filters(usuarioId, query);
  const [[row]] = await db.query(`SELECT COUNT(*) AS total,
   COALESCE(SUM(COALESCE(pg.pago,0)),0) AS recebido,
   COALESCE(SUM(CASE WHEN p.status <> 'CANCELADA' THEN GREATEST(p.valor-COALESCE(pg.pago,0),0) ELSE 0 END),0) AS pendente,
   COALESCE(SUM(CASE WHEN p.status <> 'CANCELADA' AND p.data_vencimento < CURDATE() THEN GREATEST(p.valor-COALESCE(pg.pago,0),0) ELSE 0 END),0) AS atrasado
   ${JOINS} WHERE ${where}`, params);
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
}

async function list(db, usuarioId, query, { limit, offset }) {
  const { where, params } = filters(usuarioId, query);
  const [rows] = await db.query(`SELECT p.id, p.numero, p.contrato_id, p.valor, p.data_vencimento,
   c.numero AS contrato_numero, c.cliente_id, cl.nome_razao_social AS cliente_nome,
   c.juros_percentual, c.multa_percentual, COALESCE(pg.pago,0) AS pago,
   ${SITUACAO} AS situacao, GREATEST(DATEDIFF(CURDATE(),p.data_vencimento),0) AS dias_atraso
   ${JOINS} WHERE ${where} ORDER BY p.data_vencimento, p.id LIMIT ? OFFSET ?`, [...params, limit, offset]);
  return rows.map(normalize);
}

module.exports = { filters, summary, list, normalize, JOINS, SITUACAO };
