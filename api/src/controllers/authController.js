const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { isEmail, str } = require('../utils/validators');
const { HttpError } = require('../utils/http');

function password(value) {
  if (typeof value !== 'string' || value.length < 6 || Buffer.byteLength(value,'utf8') > 72) throw new HttpError(400, 'Senha deve ter ao menos 6 caracteres e até 72 bytes');
  return value;
}

async function register(req, res) {
  const nome = str(req.body.nome); const email = str(req.body.email).toLowerCase();
  let conn, locked = false;
  try {
    if (nome.length < 2 || nome.length > 150) throw new HttpError(400, 'Informe um nome válido');
    if (!isEmail(email)) throw new HttpError(400, 'Informe um e-mail válido');
    const hash = await bcrypt.hash(password(req.body.senha),10);
    conn = await db.getConnection();
    const [[{ acquired }]] = await conn.query("SELECT GET_LOCK(CONCAT(DATABASE(),':register'),10) AS acquired");
    if (!acquired) throw new HttpError(503, 'Cadastro ocupado; tente novamente');
    locked = true;
    await conn.beginTransaction();
    const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM usuarios');
    const perfil = total === 0 ? 'ADMIN' : 'USUARIO';
    const [result] = await conn.execute('INSERT INTO usuarios (nome,email,senha_hash,perfil) VALUES (?,?,?,?)', [nome,email,hash,perfil]);
    await conn.commit();
    res.status(201).json({ message: 'Usuário cadastrado com sucesso', usuario: { id: result.insertId, nome, email, perfil } });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'E-mail já cadastrado' });
    const status = err.status || 500;
    if (status >= 500) console.error('erro ao cadastrar usuario:',err.code || err.message);
    res.status(status).json({ message: status >= 500 ? 'Erro ao cadastrar usuário' : err.message });
  } finally {
    if (locked) {
      try { await conn.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(),':register'))"); }
      catch { conn.destroy(); conn = null; }
    }
    if (conn) conn.release();
  }
}

async function login(req, res) {
  const email = str(req.body.email).toLowerCase();
  if (!email || typeof req.body.senha !== 'string' || !req.body.senha) return res.status(400).json({ message: 'Email e senha são obrigatórios' });
  try {
    const [[user]] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ message: 'Credenciais inválidas' });
    if (!user.ativo) return res.status(403).json({ message: 'Usuário desativado' });
    if (!(await bcrypt.compare(req.body.senha,user.senha_hash))) return res.status(401).json({ message: 'Credenciais inválidas' });
    const usuario = { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil };
    const token = jwt.sign({ ...usuario, ver: Number(user.token_version) }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ message: 'Login realizado com sucesso', token, usuario });
  } catch (err) { console.error('erro ao realizar login:',err.code || err.message); res.status(500).json({ message: 'Erro ao realizar login' }); }
}

async function changePassword(req, res) {
  const nova = password(req.body.nova_senha);
  if (typeof req.body.senha_atual !== 'string') throw new HttpError(400, 'Informe senha_atual');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[user]] = await conn.query('SELECT senha_hash FROM usuarios WHERE id=? FOR UPDATE', [req.user.id]);
    if (!(await bcrypt.compare(req.body.senha_atual,user.senha_hash))) throw new HttpError(400, 'Senha atual incorreta');
    const hash = await bcrypt.hash(nova,10);
    await conn.execute('UPDATE usuarios SET senha_hash=?,token_version=token_version+1 WHERE id=?', [hash,req.user.id]);
    await conn.commit();
    res.json({ message: 'Senha alterada; entre novamente' });
  } catch (err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
}

async function logout(req, res) {
  await db.execute('UPDATE usuarios SET token_version=token_version+1 WHERE id=?', [req.user.id]);
  res.json({ message: 'Sessões encerradas' });
}
module.exports = { register, login, changePassword, logout };
