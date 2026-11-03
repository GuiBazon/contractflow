process.env.JWT_SECRET = 'test-secret';

jest.mock('../../src/config/db', () => ({
  query: jest.fn(),
  execute: jest.fn(),
}));

const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../src/app');
const db = require('../../src/config/db');

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('rejeita nome curto sem consultar o banco', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'A', email: 'a@exemplo.com', senha: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Informe um nome válido');
    expect(db.query).not.toHaveBeenCalled();
  });

  test('rejeita e-mail invalido', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Ana', email: 'invalido', senha: '123456' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Informe um e-mail válido');
  });

  test('rejeita senha com menos de 6 caracteres', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Ana', email: 'ana@exemplo.com', senha: '123' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('A senha deve ter no mínimo 6 caracteres');
  });

  test('cria o primeiro usuario como ADMIN', async () => {
    db.query.mockResolvedValueOnce([[{ total: 0 }]]);
    db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Ana', email: 'Ana@Exemplo.com', senha: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.usuario).toMatchObject({
      id: 1,
      nome: 'Ana',
      email: 'ana@exemplo.com',
      perfil: 'ADMIN',
    });
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO usuarios'),
      ['Ana', 'ana@exemplo.com', expect.any(String), 'ADMIN']
    );
  });

  test('cria os demais usuarios como USUARIO', async () => {
    db.query.mockResolvedValueOnce([[{ total: 3 }]]);
    db.execute.mockResolvedValueOnce([{ insertId: 4 }]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Bruno', email: 'bruno@exemplo.com', senha: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.usuario.perfil).toBe('USUARIO');
  });

  test('responde 409 quando o e-mail ja existe', async () => {
    db.query.mockResolvedValueOnce([[{ total: 1 }]]);
    db.execute.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 'ER_DUP_ENTRY' }));

    const res = await request(app)
      .post('/api/auth/register')
      .send({ nome: 'Ana', email: 'ana@exemplo.com', senha: '123456' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('E-mail já cadastrado');
  });
});

describe('POST /api/auth/login', () => {
  const senhaHash = bcrypt.hashSync('123456', 4);

  beforeEach(() => jest.clearAllMocks());

  test('exige email e senha', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'ana@exemplo.com' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Email e senha são obrigatórios');
  });

  test('responde 401 para e-mail nao cadastrado', async () => {
    db.execute.mockResolvedValueOnce([[]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@exemplo.com', senha: '123456' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciais inválidas');
  });

  test('responde 403 para usuario desativado', async () => {
    db.execute.mockResolvedValueOnce([[{
      id: 1,
      nome: 'Ana',
      email: 'ana@exemplo.com',
      senha_hash: senhaHash,
      perfil: 'USUARIO',
      ativo: 0,
    }]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@exemplo.com', senha: '123456' });

    expect(res.status).toBe(403);
    expect(res.body.message).toBe('Usuário desativado');
  });

  test('responde 401 para senha incorreta', async () => {
    db.execute.mockResolvedValueOnce([[{
      id: 1,
      nome: 'Ana',
      email: 'ana@exemplo.com',
      senha_hash: senhaHash,
      perfil: 'USUARIO',
      ativo: 1,
    }]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@exemplo.com', senha: 'senha-errada' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciais inválidas');
  });

  test('retorna token e usuario no login valido', async () => {
    db.execute.mockResolvedValueOnce([[{
      id: 1,
      nome: 'Ana',
      email: 'ana@exemplo.com',
      senha_hash: senhaHash,
      perfil: 'ADMIN',
      ativo: 1,
    }]]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'Ana@Exemplo.com', senha: '123456' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.usuario).toEqual({
      id: 1,
      nome: 'Ana',
      email: 'ana@exemplo.com',
      perfil: 'ADMIN',
    });
  });
});
