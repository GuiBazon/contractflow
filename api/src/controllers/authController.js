const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { isEmail, str } = require('../utils/validators');

async function register(req, res) {
  const nome = str(req.body.nome);
  const email = str(req.body.email);
  const senha = req.body.senha;

  if (!nome || nome.length < 2) {
    return res.status(400).json({ message: 'Informe um nome válido' });
  }
  if (!isEmail(email)) {
    return res.status(400).json({ message: 'Informe um e-mail válido' });
  }
  if (!senha || String(senha).length < 6) {
    return res.status(400).json({ message: 'A senha deve ter no mínimo 6 caracteres' });
  }

  try {
    const senhaHash = await bcrypt.hash(String(senha), 10);

    // Perfil nao e escolhido pelo proprio usuario (RF03/RNF04).
    // O primeiro usuario cadastrado vira ADMIN (bootstrap); os demais sao USUARIO.
    const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM usuarios');
    const perfil = total === 0 ? 'ADMIN' : 'USUARIO';

    const [result] = await db.execute(
      'INSERT INTO usuarios (nome, email, senha_hash, perfil) VALUES (?, ?, ?, ?)',
      [nome, email.toLowerCase(), senhaHash, perfil]
    );

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso',
      usuario: {
        id: result.insertId,
        nome,
        email: email.toLowerCase(),
        perfil,
      },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'E-mail já cadastrado' });
    }
    console.error('erro ao cadastrar usuario:', error);
    return res.status(500).json({ message: 'Erro ao cadastrar usuário' });
  }
}

async function login(req, res) {
  const email = str(req.body.email).toLowerCase();
  const senha = req.body.senha;

  if (!email || !senha) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM usuarios WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const usuario = rows[0];

    if (usuario.ativo !== 1) {
      return res.status(403).json({ message: 'Usuário desativado' });
    }

    const senhaValida = await bcrypt.compare(String(senha), usuario.senha_hash);

    if (!senhaValida) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      message: 'Login realizado com sucesso',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
    });
  } catch (error) {
    console.error('erro ao realizar login:', error);
    return res.status(500).json({ message: 'Erro ao realizar login' });
  }
}

module.exports = { register, login };