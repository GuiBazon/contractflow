const db = require('../config/db');
const { period, choice, integer } = require('../utils/query');
const { HttpError } = require('../utils/http');
const { SITUACAO } = require('../services/recebivelService');

async function list(req, res) {
  const { de, ate } = period(req.query, { required: true });
  if ((Date.parse(ate) - Date.parse(de)) / 86400000 > 366) throw new HttpError(400, 'Calendário aceita períodos de até 366 dias');
  const tipo = req.query.tipo === undefined ? null : choice(req.query.tipo, ['VENCIMENTO', 'PAGAMENTO', 'DESPESA', 'RENOVACAO'], 'Tipo');
  const limit = integer(req.query.limit ?? 1000, 'limit', { max: 5000 });
  const page = integer(req.query.page ?? 1, 'page');
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) throw new HttpError(400, 'Página fora do limite');
  const pieces = [];
  const params = [];
  function add(type, sql) {
    if (!tipo || tipo === type) { pieces.push(sql); params.push(req.user.id, de, ate); }
  }
  add('VENCIMENTO', `SELECT CONCAT('parcela-',p.id) AS id, 'VENCIMENTO' AS tipo, p.data_vencimento AS data,
   c.id AS contrato_id, c.numero AS contrato_numero, cl.nome_razao_social AS cliente_nome,
   CONCAT('Parcela ',p.numero) AS titulo, GREATEST(p.valor-COALESCE(pg.pago,0),0) AS valor,
   ${SITUACAO} AS situacao, p.id AS parcela_id
   FROM parcelas p JOIN contratos c ON c.id=p.contrato_id JOIN clientes cl ON cl.id=c.cliente_id
   LEFT JOIN (SELECT parcela_id,SUM(valor) AS pago FROM pagamentos GROUP BY parcela_id) pg ON pg.parcela_id=p.id
   WHERE c.usuario_id=? AND p.data_vencimento BETWEEN ? AND ? AND p.status<>'CANCELADA' AND COALESCE(pg.pago,0)<p.valor`);
  add('PAGAMENTO', `SELECT CONCAT('pagamento-',pg.id), 'PAGAMENTO',pg.data_pagamento,c.id,c.numero,cl.nome_razao_social,
   CONCAT('Pagamento parcela ',p.numero),pg.valor,'PAGA',p.id
   FROM pagamentos pg JOIN parcelas p ON p.id=pg.parcela_id JOIN contratos c ON c.id=p.contrato_id JOIN clientes cl ON cl.id=c.cliente_id
   WHERE c.usuario_id=? AND pg.data_pagamento BETWEEN ? AND ?`);
  add('DESPESA', `SELECT CONCAT('despesa-',id),'DESPESA',data,NULL,NULL,NULL,descricao,valor,status,NULL
   FROM despesas WHERE usuario_id=? AND data BETWEEN ? AND ? AND status<>'CANCELADA'`);
  add('RENOVACAO', `SELECT CONCAT('contrato-',c.id),'RENOVACAO',c.data_fim,c.id,c.numero,cl.nome_razao_social,
   'Término do contrato',0,c.status,NULL FROM contratos c JOIN clientes cl ON cl.id=c.cliente_id
   WHERE c.usuario_id=? AND c.data_fim BETWEEN ? AND ? AND c.status IN ('ATIVO','EM_RENOVACAO')`);
  const union = pieces.join(' UNION ALL ');
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM (${union}) eventos`, params);
  const [rows] = await db.query(`SELECT * FROM (${union}) eventos ORDER BY data, id LIMIT ? OFFSET ?`, [...params, limit, offset]);
  res.json({ data: rows.map(row => ({ ...row, valor: Number(row.valor) })), periodo: { de, ate }, paginacao: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

module.exports = { list };
