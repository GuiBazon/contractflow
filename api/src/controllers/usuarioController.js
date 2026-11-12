const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { isEmail, str } = require('../utils/validators');

// Garante que as colunas de perfil existam na tabela usuarios (migracao idempotente)
let perfilColunasChecadas = false;
async function garantirColunasPerfilUsuario() {
  if (perfilColunasChecadas) return;
  const colunas = [
    { nome: 'cargo',              ddl: 'ADD COLUMN cargo VARCHAR(100) DEFAULT NULL' },
    { nome: 'telefone',           ddl: 'ADD COLUMN telefone VARCHAR(30) DEFAULT NULL' },
    { nome: 'razao_social',       ddl: 'ADD COLUMN razao_social VARCHAR(200) DEFAULT NULL' },
    { nome: 'cnpj',               ddl: 'ADD COLUMN cnpj VARCHAR(30) DEFAULT NULL' },
    { nome: 'inscricao_estadual', ddl: 'ADD COLUMN inscricao_estadual VARCHAR(50) DEFAULT NULL' },
  ];
  for (const col of colunas) {
    const [rows] = await db.query(`SHOW COLUMNS FROM usuarios LIKE '${col.nome}'`);
    if (rows.length === 0) {
      await db.query(`ALTER TABLE usuarios ${col.ddl}`);
    }
  }
  perfilColunasChecadas = true;
}

/**
 * GET /api/usuarios/:id
 * Retorna o perfil do usuario autenticado (apenas o proprio usuario)
 */
async function getPerfilUsuario(req, res) {
  const { id } = req.params;

  // Seguranca: usuario so pode ver o proprio perfil
  if (Number(id) !== Number(req.user.id)) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  try {
    await garantirColunasPerfilUsuario();

    const [rows] = await db.execute(
      `SELECT id, nome, email, perfil, cargo, telefone, razao_social, cnpj, inscricao_estadual, created_at
       FROM usuarios WHERE id = ? AND ativo = 1`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    return res.json({ usuario: rows[0] });
  } catch (error) {
    console.error('erro ao buscar perfil:', error);
    return res.status(500).json({ message: 'Erro ao buscar perfil do usuário' });
  }
}

/**
 * PUT /api/usuarios/:id
 * Atualiza os dados de perfil do usuario autenticado
 */
async function updatePerfilUsuario(req, res) {
  const { id } = req.params;

  if (Number(id) !== Number(req.user.id)) {
    return res.status(403).json({ message: 'Acesso negado' });
  }

  const nome = str(req.body.nome);
  const email = str(req.body.email).toLowerCase();
  const cargo = str(req.body.cargo) || null;
  const telefone = str(req.body.telefone) || null;
  const razao_social = str(req.body.razao_social) || null;
  const cnpj = str(req.body.cnpj) || null;
  const inscricao_estadual = str(req.body.inscricao_estadual) || null;

  if (!nome || nome.length < 2) {
    return res.status(400).json({ message: 'Informe um nome válido (mínimo 2 caracteres)' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ message: 'Informe um e-mail válido' });
  }

  try {
    await garantirColunasPerfilUsuario();

    await db.execute(
      `UPDATE usuarios
       SET nome = ?, email = ?, cargo = ?, telefone = ?, razao_social = ?, cnpj = ?, inscricao_estadual = ?
       WHERE id = ? AND ativo = 1`,
      [nome, email, cargo, telefone, razao_social, cnpj, inscricao_estadual, id]
    );

    const [rows] = await db.execute(
      `SELECT id, nome, email, perfil, cargo, telefone, razao_social, cnpj, inscricao_estadual
       FROM usuarios WHERE id = ?`,
      [id]
    );

    return res.json({
      message: 'Perfil atualizado com sucesso',
      usuario: rows[0],
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Este e-mail já está em uso por outro usuário' });
    }
    console.error('erro ao atualizar perfil:', error);
    return res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
}

/**
 * PATCH /api/usuarios/senha
 * Troca a senha do usuario autenticado (exige confirmacao da senha atual)
 */
async function updateSenha(req, res) {
  const senhaAtual = req.body.senhaAtual || req.body.senha_atual || req.body.currentPassword;
  const novaSenha = req.body.novaSenha || req.body.nova_senha || req.body.newPassword;

  if (!senhaAtual || !novaSenha) {
    return res.status(400).json({ message: 'Informe a senha atual e a nova senha' });
  }
  if (String(novaSenha).length < 6) {
    return res.status(400).json({ message: 'A nova senha deve ter no mínimo 6 caracteres' });
  }

  try {
    const [rows] = await db.execute(
      'SELECT id, senha_hash FROM usuarios WHERE id = ? AND ativo = 1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const usuario = rows[0];
    const senhaCorreta = await bcrypt.compare(String(senhaAtual), usuario.senha_hash);

    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Senha atual incorreta' });
    }

    const novoHash = await bcrypt.hash(String(novaSenha), 10);

    await db.execute(
      'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
      [novoHash, req.user.id]
    );

    return res.json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    console.error('erro ao atualizar senha:', error);
    return res.status(500).json({ message: 'Erro ao atualizar senha' });
  }
}

module.exports = { getPerfilUsuario, updatePerfilUsuario, updateSenha };

