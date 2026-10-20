const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const mail = require('./mailService');
const { HttpError } = require('../utils/http');
const { password } = require('../utils/password');

const digest = token => crypto.createHash('sha256').update(token).digest('hex');
const invalidToken = () => new HttpError(400, 'Link de recuperação inválido ou expirado');

async function requestReset(email) {
  // Verificar a configuração para todas as contas mantém a mesma resposta
  // de indisponibilidade sem revelar se o e-mail existe.
  mail.settings();
  const minutes = Number(process.env.PASSWORD_RESET_TTL_MINUTES || 30);
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 120) throw new HttpError(503, 'Recuperação de senha indisponível');
  const token = crypto.randomBytes(32).toString('base64url');
  const conn = await db.getConnection();
  let recoveryId;
  try {
    await conn.beginTransaction();
    const [[user]] = await conn.execute('SELECT id, ativo FROM usuarios WHERE email=? FOR UPDATE', [email]);
    if (!user?.ativo) { await conn.commit(); return; }
    await conn.execute('UPDATE recuperacoes_senha SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND usado_em IS NULL', [user.id]);
    const [created] = await conn.execute(`INSERT INTO recuperacoes_senha (usuario_id, token_hash, expira_em)
      VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? MINUTE))`, [user.id, digest(token), minutes]);
    recoveryId = created.insertId;
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
  try {
    await mail.sendPasswordReset(email, token, minutes);
  } catch (error) {
    await db.execute('UPDATE recuperacoes_senha SET usado_em=UTC_TIMESTAMP() WHERE id=?', [recoveryId]);
    // Não registrar destinatário, link, senha ou conteúdo da mensagem.
    console.error('Falha no envio da recuperação de senha:', error.code || 'SMTP_FAILURE');
  }
}

async function resetPassword(token, novaSenha) {
  password(novaSenha);
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw invalidToken();
  const hash = digest(token);
  const [[preview]] = await db.execute('SELECT usuario_id FROM recuperacoes_senha WHERE token_hash=?', [hash]);
  if (!preview) throw invalidToken();
  const newHash = await bcrypt.hash(novaSenha, 10);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Ordem comum à emissão de novos links: usuário antes dos tokens.
    const [[user]] = await conn.execute('SELECT ativo FROM usuarios WHERE id=? FOR UPDATE', [preview.usuario_id]);
    const [[recovery]] = await conn.execute(`SELECT id FROM recuperacoes_senha
      WHERE token_hash=? AND usado_em IS NULL AND expira_em>UTC_TIMESTAMP() FOR UPDATE`, [hash]);
    if (!user?.ativo || !recovery) throw invalidToken();
    await conn.execute('UPDATE usuarios SET senha_hash=?, token_version=token_version+1 WHERE id=?', [newHash, preview.usuario_id]);
    await conn.execute('UPDATE recuperacoes_senha SET usado_em=UTC_TIMESTAMP() WHERE usuario_id=? AND usado_em IS NULL', [preview.usuario_id]);
    await conn.commit();
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}

module.exports = { requestReset, resetPassword };
