const { integer } = require('../utils/query');
const { JOINS } = require('./recebivelService');

function source(usuarioId, requestedDays = 7) {
  const dias = integer(requestedDays, 'dias', { max: 90 });
  const sql = `SELECT CONCAT('parcela-',p.id) AS id,
    CASE WHEN p.data_vencimento<CURDATE() THEN 'ATRASO' ELSE 'VENCIMENTO' END AS tipo,
    p.data_vencimento AS data, c.id AS contrato_id, c.numero AS contrato_numero,
    cl.nome_razao_social AS cliente_nome, GREATEST(p.valor-COALESCE(pg.pago,0),0) AS valor
    ${JOINS} WHERE c.usuario_id=? AND p.status<>'CANCELADA' AND COALESCE(pg.pago,0)<p.valor
    AND p.data_vencimento<=DATE_ADD(CURDATE(),INTERVAL ? DAY)
    UNION ALL SELECT CONCAT('contrato-',c.id),'RENOVACAO',c.data_fim,c.id,c.numero,cl.nome_razao_social,0
    FROM contratos c JOIN clientes cl ON cl.id=c.cliente_id WHERE c.usuario_id=?
    AND c.status IN ('ATIVO','EM_RENOVACAO') AND c.data_fim BETWEEN CURDATE() AND DATE_ADD(CURDATE(),INTERVAL ? DAY)`;
  return { sql, params: [usuarioId, dias, usuarioId, dias], dias };
}

function eventKey(row) {
  return `${row.tipo}:${row.id}:${row.data}`;
}

module.exports = { source, eventKey };
