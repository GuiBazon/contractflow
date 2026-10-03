const db = require('../config/db');
const { pagination, integer, choice } = require('../utils/query');
const { str, isEmail } = require('../utils/validators');
const { HttpError } = require('../utils/http');
const publicFields = 'id,nome,email,perfil,ativo,created_at,updated_at';

async function list(req,res) {
  const pages = pagination(req.query);
  const q = str(req.query.q);
  const where = q ? 'WHERE nome LIKE ? OR email LIKE ?' : '';
  const params = q ? [`%${q}%`,`%${q}%`] : [];
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM usuarios ${where}`,params);
  const [rows] = await db.query(`SELECT ${publicFields} FROM usuarios ${where} ORDER BY id LIMIT ? OFFSET ?`,[...params,pages.limit,pages.offset]);
  res.json({ data: rows,paginacao: { page: pages.page,limit: pages.limit,total,totalPages: Math.ceil(total/pages.limit) } });
}

async function get(req,res) {
  const [[row]] = await db.query(`SELECT ${publicFields} FROM usuarios WHERE id=?`,[integer(req.params.id,'Usuário')]);
  if (!row) throw new HttpError(404,'Usuário não encontrado');
  res.json(row);
}

async function update(req,res) {
  const id = integer(req.params.id,'Usuário');
  const fields = {};
  if (req.method === 'DELETE') fields.ativo = 0;
  else {
    if (req.body.nome !== undefined) {
      const name = str(req.body.nome);
      if (name.length < 2 || name.length > 150) throw new HttpError(400,'Nome inválido');
      fields.nome = name;
    }
    if (req.body.email !== undefined) {
      if (!isEmail(req.body.email)) throw new HttpError(400,'E-mail inválido');
      fields.email = str(req.body.email).toLowerCase();
    }
    if (req.body.perfil !== undefined) fields.perfil = choice(req.body.perfil,['ADMIN','USUARIO'],'Perfil');
    if (req.body.ativo !== undefined) {
      if (![0,1,false,true].includes(req.body.ativo)) throw new HttpError(400,'Ativo deve ser booleano ou 0/1');
      fields.ativo = Number(req.body.ativo);
    }
  }
  if (!Object.keys(fields).length) throw new HttpError(400,'Nenhum campo permitido enviado');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Serializa alterações dos administradores para proteger o último ativo.
    const [admins] = await conn.query("SELECT id FROM usuarios WHERE perfil='ADMIN' AND ativo=1 ORDER BY id FOR UPDATE");
    const [[actor]] = await conn.query('SELECT perfil,ativo FROM usuarios WHERE id=?',[req.user.id]);
    if (!actor || !actor.ativo || actor.perfil !== 'ADMIN') throw new HttpError(403,'Acesso restrito a administradores');
    const [[before]] = await conn.query('SELECT perfil,ativo FROM usuarios WHERE id=? FOR UPDATE',[id]);
    if (!before) throw new HttpError(404,'Usuário não encontrado');
    if (before.perfil === 'ADMIN' && before.ativo && admins.length === 1 && (fields.perfil === 'USUARIO' || fields.ativo === 0)) throw new HttpError(409,'Não é possível remover o último administrador ativo');
    await conn.execute(`UPDATE usuarios SET ${Object.keys(fields).map(k=>`${k}=?`).join(',')},token_version=token_version+1 WHERE id=?`,[...Object.values(fields),id]);
    const [[row]] = await conn.query(`SELECT ${publicFields} FROM usuarios WHERE id=?`,[id]);
    await conn.commit();
    res.json({ message: req.method === 'DELETE' ? 'Usuário desativado; dados preservados' : 'Usuário atualizado; sessões anteriores revogadas',usuario: row });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409,'E-mail já cadastrado');
    throw err;
  } finally { conn.release(); }
}
module.exports = { list,get,update };
