const db = require('../config/db');
const { isDate, str } = require('../utils/validators');
const { pagination, period, dateWhere, integer, money, choice } = require('../utils/query');
const { HttpError } = require('../utils/http');

const STATUS = ['PENDENTE', 'PAGA', 'CANCELADA'];
const dto = row => ({ ...row, valor: Number(row.valor) });

function filters(usuarioId, query) {
  const where = ['usuario_id = ?'];
  const params = [usuarioId];
  dateWhere('data', period(query), where, params);
  if (query.status !== undefined) { where.push('status = ?'); params.push(choice(query.status, STATUS, 'Status')); }
  if (query.categoria !== undefined) { where.push('categoria = ?'); params.push(str(query.categoria)); }
  if (query.q !== undefined) { where.push('(descricao LIKE ? OR categoria LIKE ?)'); params.push(`%${str(query.q)}%`, `%${str(query.q)}%`); }
  return { where: where.join(' AND '), params };
}

function validate(body, partial = false) {
  const fields = {};
  for (const field of ['descricao', 'categoria', 'observacoes']) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') throw new HttpError(400, `${field} inválido`);
      fields[field] = str(body[field]) || null;
      if ((field === 'descricao' && !fields[field]) || (fields[field] && fields[field].length > (field === 'descricao' ? 200 : field === 'categoria' ? 100 : 5000))) throw new HttpError(400, `${field} inválido`);
    }
  }
  if (body.valor !== undefined) fields.valor = money(body.valor);
  if (body.data !== undefined) {
    if (!isDate(body.data)) throw new HttpError(400, 'Data inválida');
    fields.data = body.data;
  }
  if (body.status !== undefined) fields.status = choice(body.status, STATUS, 'Status');
  if (!partial && (!fields.descricao || fields.valor === undefined || !fields.data)) throw new HttpError(400, 'Informe descrição, valor e data');
  if (partial && Object.keys(fields).length === 0) throw new HttpError(400, 'Nenhum campo permitido enviado');
  return fields;
}

async function getOwned(conn, id, usuarioId, lock = false) {
  const [[row]] = await conn.query(`SELECT * FROM despesas WHERE id = ? AND usuario_id = ?${lock ? ' FOR UPDATE' : ''}`, [id, usuarioId]);
  if (!row) throw new HttpError(404, 'Despesa não encontrada');
  return row;
}

async function list(req, res) {
  const pages = pagination(req.query);
  const { where, params } = filters(req.user.id, req.query);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM despesas WHERE ${where}`, params);
  const [rows] = await db.query(`SELECT * FROM despesas WHERE ${where} ORDER BY data DESC, id DESC LIMIT ? OFFSET ?`, [...params, pages.limit, pages.offset]);
  res.json({ data: rows.map(dto), paginacao: { page: pages.page, limit: pages.limit, total, totalPages: Math.ceil(total / pages.limit) } });
}

async function get(req, res) {
  res.json(dto(await getOwned(db, integer(req.params.id, 'ID'), req.user.id)));
}

async function create(req, res) {
  const fields = validate(req.body);
  const [result] = await db.execute('INSERT INTO despesas (usuario_id, descricao, categoria, valor, data, status, observacoes) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.user.id, fields.descricao, fields.categoria || null, fields.valor, fields.data, fields.status || 'PENDENTE', fields.observacoes || null]);
  res.status(201).json({ message: 'Despesa criada com sucesso', despesa: dto(await getOwned(db, result.insertId, req.user.id)) });
}

async function update(req, res) {
  const id = integer(req.params.id, 'ID');
  const fields = validate(req.body, true);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const before = await getOwned(conn, id, req.user.id, true);
    if (before.status === 'PAGA' && (fields.valor !== undefined || fields.data !== undefined || (fields.status !== undefined && fields.status !== 'PAGA'))) throw new HttpError(409, 'Despesa paga não permite alterar valor, data ou situação financeira');
    await conn.execute(`UPDATE despesas SET ${Object.keys(fields).map(k => `${k} = ?`).join(', ')} WHERE id = ? AND usuario_id = ?`, [...Object.values(fields), id, req.user.id]);
    const row = await getOwned(conn, id, req.user.id);
    await conn.commit();
    res.json({ message: 'Despesa atualizada', despesa: dto(row) });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally { conn.release(); }
}

async function remove(req, res) {
  const id = integer(req.params.id, 'ID');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const row = await getOwned(conn, id, req.user.id, true);
    if (row.status === 'PAGA') throw new HttpError(409, 'Despesa paga não pode ser excluída');
    await conn.execute('DELETE FROM despesas WHERE id = ? AND usuario_id = ?', [id, req.user.id]);
    await conn.commit();
    res.json({ message: 'Despesa removida' });
  } catch (err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
}

module.exports = { list, get, create, update, remove, filters };
