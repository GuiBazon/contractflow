const path = require('path');
const fs = require('fs/promises');
const request = require('supertest');
const sharp = require('sharp');
const { initialize, clean, close, user, auth, db, app } = require('./helpers');
const image = path.join(__dirname, '../fixtures/contrato.png');
beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('perfil próprio é isolado, validado e não concede privilégios', async () => {
  const admin = await user(); const other = await user('outro@example.com');
  const api = auth(other.token);
  expect((await api.get('/api/perfil').expect(200)).body.usuario).toMatchObject({ id: other.id, perfil: 'USUARIO', foto_url: null });
  const changed = await api.patch('/api/perfil').send({ nome: 'Outra Pessoa', cargo: 'Gerente', telefone: '(11) 99999-9999', razao_social: 'Empresa Exemplo', cnpj: '11.222.333/0001-81', inscricao_estadual: '123456' }).expect(200);
  expect(changed.body).toMatchObject({ sessao_encerrada: false, usuario: { nome: 'Outra Pessoa', cnpj: '11222333000181', perfil: 'USUARIO' } });
  expect((await api.get('/api/perfil').expect(200)).body.usuario.cargo).toBe('Gerente');
  expect((await auth(admin.token).get('/api/perfil').expect(200)).body.usuario.nome).toBe('Usuario Teste');
  await api.patch('/api/perfil').send({ perfil: 'ADMIN' }).expect(400);
  await api.patch('/api/perfil').send({ ativo: 0 }).expect(400);
  await api.patch('/api/perfil').send({ cnpj: '123' }).expect(400);
  await api.patch('/api/perfil').send({ nome: {} }).expect(400);
  await api.patch('/api/perfil').send({ cargo: null }).expect(200);
  expect((await api.get('/api/perfil').expect(200)).body.usuario.cargo).toBeNull();
  await request(app).get('/api/perfil').expect(401);
  await request(app).put('/api/perfil/foto').expect(401);
});

test('troca de e-mail exige senha atual, evita duplicatas e revoga sessões', async () => {
  const first = await user(); await user('outro@example.com'); const api = auth(first.token);
  await api.patch('/api/perfil').send({ email: 'novo@example.com' }).expect(400);
  await api.patch('/api/perfil').send({ email: 'novo@example.com', senha_atual: 'errada' }).expect(400);
  await api.patch('/api/perfil').send({ email: 'outro@example.com', senha_atual: 'senha123' }).expect(409);
  const response = await api.patch('/api/perfil').send({ email: 'NOVO@example.com', senha_atual: 'senha123' }).expect(200);
  expect(response.body).toMatchObject({ sessao_encerrada: true, usuario: { email: 'novo@example.com' } });
  await api.get('/api/perfil').expect(401);
  await request(app).post('/api/auth/login').send({ email: 'novo@example.com', senha: 'senha123' }).expect(200);
});

test('foto autenticada suporta troca e remoção e fica isolada por usuário', async () => {
  const first = await user(); const other = await user('outro@example.com');
  const api = auth(first.token); const otherApi = auth(other.token);
  await api.get('/api/perfil/foto').expect(404);
  await api.put('/api/perfil/foto').attach('foto', image).expect(200);
  const photo = await api.get('/api/perfil/foto').expect('Content-Type', /image\/png/).expect('Cache-Control', /no-store/).expect(200);
  expect((await sharp(photo.body).metadata()).format).toBe('png');
  expect((await api.get('/api/perfil').expect(200)).body.usuario.foto_url).toBe('/api/perfil/foto');
  await otherApi.get('/api/perfil/foto').expect(404);
  const [[old]] = await db.execute('SELECT foto_arquivo FROM usuarios WHERE id=?', [first.id]);
  await api.put('/api/perfil/foto').attach('foto', image).expect(200);
  const [[replacement]] = await db.execute('SELECT foto_arquivo FROM usuarios WHERE id=?', [first.id]);
  expect(replacement.foto_arquivo).not.toBe(old.foto_arquivo);
  await expect(fs.access(path.join(process.env.UPLOAD_DIR, 'perfil', old.foto_arquivo))).rejects.toMatchObject({ code: 'ENOENT' });
  await api.delete('/api/perfil/foto').expect(200);
  await api.delete('/api/perfil/foto').expect(200);
  await api.get('/api/perfil/foto').expect(404);
  await expect(fs.access(path.join(process.env.UPLOAD_DIR, 'perfil', replacement.foto_arquivo))).rejects.toMatchObject({ code: 'ENOENT' });
});

test('foto rejeita conteúdo inválido ou grande sem substituir a anterior', async () => {
  const person = await user(); const api = auth(person.token);
  await api.put('/api/perfil/foto').attach('foto', image).expect(200);
  await api.put('/api/perfil/foto').expect(400);
  await api.put('/api/perfil/foto').attach('foto', Buffer.from('fake'), { filename: 'foto.png', contentType: 'image/png' }).expect(400);
  await api.put('/api/perfil/foto').attach('foto', Buffer.from([137,80,78,71,13,10,26,10]), { filename: 'foto.png', contentType: 'image/png' }).expect(400);
  await api.put('/api/perfil/foto').attach('foto', Buffer.from([255,216,1,2,3,4,5,6,7,8,255,217]), { filename: 'foto.jpg', contentType: 'image/jpeg' }).expect(400);
  await api.put('/api/perfil/foto').attach('foto', image, { filename: 'foto.jpg', contentType: 'image/jpeg' }).expect(400);
  await api.put('/api/perfil/foto').attach('foto', Buffer.from('fake'), { filename: 'foto.pdf', contentType: 'application/pdf' }).expect(400);
  await api.put('/api/perfil/foto').attach('foto', Buffer.alloc(2 * 1024 * 1024 + 1), { filename: 'foto.png', contentType: 'image/png' }).expect(413);
  await api.get('/api/perfil/foto').expect(200);
});

test.each([['perfil.jpg', 'image/jpeg'], ['perfil.webp', 'image/webp']])('aceita foto real %s', async (filename, mime) => {
  const person = await user(); const api = auth(person.token);
  await api.put('/api/perfil/foto').attach('foto', path.join(__dirname, '../fixtures', filename)).expect(200);
  await api.get('/api/perfil/foto').expect('Content-Type', mime).expect(200);
});

test('normaliza orientação e remove metadados, limitando pixels', async () => {
  const person = await user(); const api = auth(person.token);
  const original = await sharp(path.join(__dirname, '../fixtures/perfil.jpg')).withMetadata({ orientation: 6 }).toBuffer();
  await api.put('/api/perfil/foto').attach('foto', original, { filename: 'foto.jpg', contentType: 'image/jpeg' }).expect(200);
  const result = await api.get('/api/perfil/foto').expect(200);
  const metadata = await sharp(result.body).metadata();
  expect(metadata.orientation).toBeUndefined();
  expect(metadata.exif).toBeUndefined();
  const large = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: 'white' } }).png().toBuffer();
  await api.put('/api/perfil/foto').attach('foto', large, { filename: 'foto.png', contentType: 'image/png' }).expect(400);
});

test('migração de perfil é aditiva, repetível e preserva usuário existente', async () => {
  const person = await user();
  await db.query("DELETE FROM schema_migrations WHERE version='006-user-profile.js'");
  for (const column of ['cargo','telefone','razao_social','cnpj','inscricao_estadual','foto_arquivo','foto_mime']) {
    await db.query(`ALTER TABLE usuarios DROP COLUMN ${column}`);
  }
  const conn = await db.getConnection();
  try {
    const { migrate } = require('../../scripts/migrate');
    await migrate(conn); await migrate(conn);
  } finally { conn.release(); }
  expect((await auth(person.token).get('/api/perfil').expect(200)).body.usuario).toMatchObject({ id: person.id, email: 'dono@example.com', foto_url: null });
});
