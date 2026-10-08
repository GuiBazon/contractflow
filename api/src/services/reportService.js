const db = require('../config/db');
const recebiveis = require('./recebivelService');
const expenses = require('./expenseService');
const { period, dateWhere, integer, choice } = require('../utils/query');

function definition(usuarioId, tipo, query) {
  if (tipo === 'DESPESAS') {
    const { where, params } = expenses.filters(usuarioId, query);
    return { sql: `FROM despesas WHERE ${where}`, params,
      select: 'id, descricao, categoria, valor, data, status, observacoes', numbers: ['valor'] };
  }
  const where = ['c.usuario_id = ?']; const params = [usuarioId];
  const cliente = integer(query.cliente, 'cliente', { optional: true });
  const contrato = integer(query.contrato, 'contrato', { optional: true });
  if (cliente) { where.push('c.cliente_id = ?'); params.push(cliente); }
  if (contrato) { where.push('c.id = ?'); params.push(contrato); }
  if (tipo === 'RECEITAS') {
    dateWhere('pg.data_pagamento', period(query), where, params);
    return { sql: `FROM pagamentos pg JOIN parcelas p ON p.id=pg.parcela_id JOIN contratos c ON c.id=p.contrato_id JOIN clientes cl ON cl.id=c.cliente_id WHERE ${where.join(' AND ')}`, params,
      select: 'pg.id,c.id AS contrato_id,c.numero AS contrato_numero,cl.nome_razao_social AS cliente_nome,p.numero AS parcela_numero,pg.valor,pg.data_pagamento,pg.forma_pagamento', numbers: ['valor'] };
  }
  dateWhere('c.data_inicio', period(query), where, params);
  if (query.status !== undefined) { where.push('c.status = ?'); params.push(choice(query.status, ['ATIVO','PENDENTE','ENCERRADO','CANCELADO','EM_RENOVACAO'], 'Status')); }
  return { sql: `FROM contratos c JOIN clientes cl ON cl.id=c.cliente_id WHERE ${where.join(' AND ')}`, params,
    select: 'c.id,c.numero,cl.nome_razao_social AS cliente_nome,c.tipo,c.valor_total,c.data_inicio,c.data_fim,c.status', numbers: ['valor_total'] };
}

async function count(usuarioId, tipo, query) {
  if (tipo === 'RECEBIVEIS') return (await recebiveis.summary(db, usuarioId, query)).total;
  const def = definition(usuarioId, tipo, query);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${def.sql}`, def.params);
  return Number(total);
}

async function list(usuarioId, tipo, query, pages) {
  if (tipo === 'RECEBIVEIS') return recebiveis.list(db, usuarioId, query, pages);
  const def = definition(usuarioId, tipo, query);
  const [rows] = await db.query(`SELECT ${def.select} ${def.sql} ORDER BY id LIMIT ? OFFSET ?`, [...def.params, pages.limit, pages.offset]);
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([k,v]) => [k, def.numbers.includes(k) ? Number(v) : v])));
}

function csvCell(value) {
  const string = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  const safe = typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(string) ? `'${string}` : string;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csv(rows, columns) {
  return '\uFEFF' + [columns.map(csvCell).join(';'), ...rows.map(row => columns.map(key => csvCell(row[key])).join(';'))].join('\r\n') + '\r\n';
}

const columns = {
  RECEBIVEIS: ['id','numero','contrato_id','valor','data_vencimento','contrato_numero','cliente_id','cliente_nome','juros_percentual','multa_percentual','pago','situacao','dias_atraso','pendente','juros','multa','total_atualizado'],
  RECEITAS: ['id','contrato_id','contrato_numero','cliente_nome','parcela_numero','valor','data_pagamento','forma_pagamento'],
  DESPESAS: ['id','descricao','categoria','valor','data','status','observacoes'],
  CONTRATOS: ['id','numero','cliente_nome','tipo','valor_total','data_inicio','data_fim','status'],
};

module.exports = { count, list, csv, columns };
