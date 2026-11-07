const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const sharp = require('sharp');
const db = require('../config/db');
const { UPLOAD_ROOT } = require('../config/uploads');
const { isEmail, isValidCpfCnpj, onlyDigits } = require('../utils/validators');
const { HttpError } = require('../utils/http');
const { invalidatePending } = require('../services/passwordRecoveryService');

const photoDir = path.join(UPLOAD_ROOT, 'perfil');
const fields = 'id,nome,email,perfil,cargo,telefone,razao_social,cnpj,inscricao_estadual,foto_arquivo';
const editable = ['nome', 'email', 'cargo', 'telefone', 'razao_social', 'cnpj', 'inscricao_estadual'];
const optionalLimits = { cargo: 150, telefone: 30, razao_social: 150, inscricao_estadual: 30 };
const extensions = { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'], 'image/webp': ['.webp'] };

function publicProfile(row) {
  const { foto_arquivo, ...usuario } = row;
  return { ...usuario, foto_url: foto_arquivo ? '/api/perfil/foto' : null };
}

async function get(req, res) {
  const [[row]] = await db.execute(`SELECT ${fields} FROM usuarios WHERE id=?`, [req.user.id]);
  if (!row) throw new HttpError(404, 'Usuário não encontrado');
  res.json({ usuario: publicProfile(row) });
}

async function update(req, res) {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Dados de perfil inválidos');
  if (Object.keys(body).some(key => !editable.includes(key) && key !== 'senha_atual')) throw new HttpError(400, 'Campo de perfil não permitido');
  const changes = {};
  for (const key of editable) {
    if (body[key] === undefined) continue;
    const value = body[key];
    if (typeof value !== 'string' && !(value === null && key !== 'nome' && key !== 'email')) throw new HttpError(400, `${key} deve ser texto`);
    const normalized = value === null ? '' : value.trim();
    if (key === 'nome') {
      if (normalized.length < 2 || normalized.length > 150) throw new HttpError(400, 'Nome inválido');
      changes.nome = normalized;
    } else if (key === 'email') {
      if (!isEmail(normalized)) throw new HttpError(400, 'E-mail inválido');
      changes.email = normalized.toLowerCase();
    } else if (key === 'cnpj') {
      if (normalized && (isValidCpfCnpj(normalized).tipo !== 'CNPJ' || !/^[\d.\/-]+$/.test(normalized))) throw new HttpError(400, 'CNPJ inválido');
      changes.cnpj = normalized ? onlyDigits(normalized) : null;
    } else {
      if (normalized.length > optionalLimits[key]) throw new HttpError(400, `${key} excede ${optionalLimits[key]} caracteres`);
      if (key === 'telefone' && normalized && !/^[\d+() .-]+$/.test(normalized)) throw new HttpError(400, 'Telefone inválido');
      changes[key] = normalized || null;
    }
  }
  if (!Object.keys(changes).length) throw new HttpError(400, 'Nenhum campo permitido enviado');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [[before]] = await conn.execute('SELECT email,senha_hash FROM usuarios WHERE id=? FOR UPDATE', [req.user.id]);
    if (!before) throw new HttpError(404, 'Usuário não encontrado');
    const emailChanged = changes.email !== undefined && changes.email !== before.email;
    if (emailChanged) {
      if (typeof body.senha_atual !== 'string' || !(await bcrypt.compare(body.senha_atual, before.senha_hash))) throw new HttpError(400, 'Informe a senha atual correta para alterar o e-mail');
    }
    await conn.execute(`UPDATE usuarios SET ${Object.keys(changes).map(key => `${key}=?`).join(',')}${emailChanged ? ',token_version=token_version+1' : ''} WHERE id=?`, [...Object.values(changes), req.user.id]);
    if (emailChanged) await invalidatePending(conn, req.user.id);
    const [[row]] = await conn.execute(`SELECT ${fields} FROM usuarios WHERE id=?`, [req.user.id]);
    await conn.commit();
    res.json({ message: emailChanged ? 'Perfil atualizado; entre novamente' : 'Perfil atualizado', usuario: publicProfile(row), sessao_encerrada: emailChanged });
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'E-mail já cadastrado');
    throw err;
  } finally { conn.release(); }
}

const receivePhoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 0 },
  fileFilter(req, file, cb) {
    const allowed = extensions[file.mimetype];
    if (!allowed || !allowed.includes(path.extname(file.originalname).toLowerCase())) return cb(new HttpError(400, 'Use uma imagem JPEG, PNG ou WebP com extensão correspondente'));
    cb(null, true);
  },
}).single('foto');
function uploadPhoto(req, res, next) {
  receivePhoto(req, res, err => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: 'Foto muito grande (máximo 2MB)' });
    if (err instanceof multer.MulterError || err.status === 400) return res.status(400).json({ message: err.status === 400 ? err.message : 'Arquivo de foto inválido' });
    next(err);
  });
}
async function normalizePhoto(buffer, mime) {
  const formats = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/webp': 'webp' };
  try {
    const image = sharp(buffer, { failOn: 'warning', limitInputPixels: 16000000 });
    const metadata = await image.metadata();
    if (metadata.format !== formats[mime] || metadata.pages > 1) throw new Error('Formato incompatível');
    // Decodifica e recodifica, aplica orientação EXIF e descarta metadados.
    const output = await image.rotate().toFormat(formats[mime]).toBuffer();
    if (output.length > 2 * 1024 * 1024) throw new HttpError(413, 'Foto processada excede 2MB');
    return output;
  } catch (err) {
    if (err.status) throw err;
    throw new HttpError(400, 'Imagem inválida ou excede 16 megapixels');
  }
}
function photoPath(name) {
  if (!/^[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$/.test(name)) throw new HttpError(500, 'Arquivo inválido');
  return path.join(photoDir, name);
}
async function removeFile(name) {
  if (!name) return;
  try { await fs.unlink(photoPath(name)); }
  catch (err) { if (err.code !== 'ENOENT') console.error('erro ao remover foto:', err.code || err.message); }
}
async function getPhoto(req, res) {
  const [[row]] = await db.execute('SELECT foto_arquivo,foto_mime FROM usuarios WHERE id=?', [req.user.id]);
  if (!row || !row.foto_arquivo) throw new HttpError(404, 'Foto não encontrada');
  let image;
  try { image = await fs.readFile(photoPath(row.foto_arquivo)); }
  catch (err) { if (err.code === 'ENOENT') throw new HttpError(404, 'Foto não encontrada'); throw err; }
  res.set({ 'Content-Type': row.foto_mime, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  res.send(image);
}
async function putPhoto(req, res) {
  if (!req.file) throw new HttpError(400, 'Envie a foto no campo foto');
  const image = await normalizePhoto(req.file.buffer, req.file.mimetype);
  await fs.mkdir(photoDir, { recursive: true });
  const name = crypto.randomUUID() + path.extname(req.file.originalname).toLowerCase();
  const file = await fs.open(photoPath(name), 'wx', 0o600);
  try { await file.writeFile(image); }
  catch (err) { await file.close(); await removeFile(name); throw err; }
  await file.close();
  let conn, oldName, committed = false;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const [[row]] = await conn.execute('SELECT foto_arquivo FROM usuarios WHERE id=? FOR UPDATE', [req.user.id]);
    if (!row) throw new HttpError(404, 'Usuário não encontrado');
    oldName = row.foto_arquivo;
    await conn.execute('UPDATE usuarios SET foto_arquivo=?,foto_mime=? WHERE id=?', [name, req.file.mimetype, req.user.id]);
    await conn.commit(); committed = true;
  } catch (err) {
    if (conn && !committed) await conn.rollback();
    if (!committed) await removeFile(name);
    throw err;
  } finally { if (conn) conn.release(); }
  await removeFile(oldName);
  res.json({ message: 'Foto atualizada', foto_url: '/api/perfil/foto' });
}
async function deletePhoto(req, res) {
  const conn = await db.getConnection();
  let oldName;
  try {
    await conn.beginTransaction();
    const [[row]] = await conn.execute('SELECT foto_arquivo FROM usuarios WHERE id=? FOR UPDATE', [req.user.id]);
    if (!row) throw new HttpError(404, 'Usuário não encontrado');
    oldName = row.foto_arquivo;
    await conn.execute('UPDATE usuarios SET foto_arquivo=NULL,foto_mime=NULL WHERE id=?', [req.user.id]);
    await conn.commit();
  } catch (err) { await conn.rollback(); throw err; }
  finally { conn.release(); }
  await removeFile(oldName);
  res.json({ message: 'Foto removida', foto_url: null });
}
module.exports = { get, update, uploadPhoto, getPhoto, putPhoto, deletePhoto };
