const request = require('supertest');
const { initialize,clean,close,user,auth,db,app } = require('./helpers');
beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('cadastros simultâneos criam somente um administrador inicial',async () => {
  const responses = await Promise.all(['a','b','c'].map(name => request(app).post('/api/auth/register').send({ nome: name+' Teste',email: name+'@example.com',senha: 'senha123' })));
  expect(responses.map(r=>r.status)).toEqual([201,201,201]);
  expect(responses.filter(r=>r.body.usuario.perfil==='ADMIN').length).toBe(1);
});

test('somente ADMIN gerencia usuários, mudanças revogam sessões e último ADMIN é protegido',async () => {
  const admin = await user(); const outro = await user('outro@example.com');
  const api = auth(admin.token);
  await auth(outro.token).get('/api/usuarios').expect(403);
  const { body } = await api.get('/api/usuarios').expect(200);
  expect(body.data).toHaveLength(2);
  expect(body.data.some(row=>Object.hasOwn(row,'senha_hash') || Object.hasOwn(row,'token_version'))).toBe(false);
  await api.patch(`/api/usuarios/${outro.id}`).send({ perfil: 'ADMIN' }).expect(200);
  await auth(outro.token).get('/api/auth/me').expect(401);
  const fresh = await request(app).post('/api/auth/login').send({ email: 'outro@example.com',senha: 'senha123' }).expect(200);
  await auth(fresh.body.token).get('/api/usuarios').expect(200);
  await api.delete(`/api/usuarios/${outro.id}`).expect(200);
  await auth(fresh.body.token).get('/api/clientes').expect(401);
  await request(app).post('/api/auth/login').send({ email: 'outro@example.com',senha: 'senha123' }).expect(403);
  await api.delete(`/api/usuarios/${admin.id}`).expect(409);
  await api.patch(`/api/usuarios/${admin.id}`).send({ perfil: 'USUARIO' }).expect(409);
});

test('troca de senha e logout invalidam tokens anteriores imediatamente',async () => {
  const dono = await user(); const api = auth(dono.token);
  await api.patch('/api/auth/password').send({ senha_atual: 'errada',nova_senha: 'nova123' }).expect(400);
  await api.patch('/api/auth/password').send({ senha_atual: 'senha123',nova_senha: 'nova123' }).expect(200);
  await api.get('/api/auth/me').expect(401);
  await request(app).post('/api/auth/login').send({ email: 'dono@example.com',senha: 'senha123' }).expect(401);
  const { body } = await request(app).post('/api/auth/login').send({ email: 'dono@example.com',senha: 'nova123' }).expect(200);
  await auth(body.token).post('/api/auth/logout').expect(200);
  await auth(body.token).get('/api/clientes').expect(401);
});

test('perfil presente no JWT não permite manter privilégio removido no banco',async () => {
  const dono = await user();
  await db.execute("UPDATE usuarios SET perfil='USUARIO' WHERE id=?",[dono.id]);
  await auth(dono.token).get('/api/usuarios').expect(403);
});

test('migração aditiva preserva usuários e pode ser repetida',async () => {
  const dono = await user();
  await db.query("DELETE FROM schema_migrations WHERE version='001-session-version.js'");
  await db.query('ALTER TABLE usuarios DROP COLUMN token_version');
  const conn = await db.getConnection();
  try {
    const { migrate } = require('../../scripts/migrate');
    await migrate(conn); await migrate(conn);
    const [[row]] = await conn.query('SELECT id,email,token_version FROM usuarios WHERE id=?',[dono.id]);
    expect(row).toMatchObject({ id: dono.id,email: dono.email,token_version: 0 });
    const [[{ total }]] = await conn.query('SELECT COUNT(*) AS total FROM schema_migrations');
    expect(total).toBe(1);
  } finally { conn.release(); }
  await auth(dono.token).get('/api/auth/me').expect(200);
});
