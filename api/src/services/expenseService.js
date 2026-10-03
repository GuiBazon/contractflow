const { period, dateWhere, choice } = require('../utils/query');
const { str } = require('../utils/validators');
const STATUS = ['PENDENTE', 'PAGA', 'CANCELADA'];

function filters(usuarioId, query) {
  const where = ['usuario_id = ?'];
  const params = [usuarioId];
  dateWhere('data', period(query), where, params);
  if (query.status !== undefined) { where.push('status = ?'); params.push(choice(query.status, STATUS, 'Status')); }
  if (query.categoria !== undefined) { where.push('categoria = ?'); params.push(str(query.categoria)); }
  if (query.q !== undefined) { where.push('(descricao LIKE ? OR categoria LIKE ?)'); params.push(`%${str(query.q)}%`, `%${str(query.q)}%`); }
  return { where: where.join(' AND '), params };
}

module.exports = { filters };
