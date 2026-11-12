const request = require('supertest');
const crypto = require('crypto');
const { initialize, clean, close, user, auth, db, app } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);
let sequence = 0;

async function owner() {
  const email = `recuperacao-${Date.now()}-${++sequence}@example.com`;
  return { ...(await user(email)), email };
}

async function requestLink(email, { host, extra = {} } = {}) {
  const base = process.env.CF_TEST_MAILPIT_URL || 'http://127.0.0.1:8025';
  const before = await (await fetch(`${base}/api/v1/messages?limit=100`)).json();
  const previousIds = new Set(before.messages.map(item => item.ID));
  const operation = request(app).post('/api/auth/forgot-password');
  if (host) operation.set('Host', host);
  const response = await operation.send({ email, ...extra }).expect(200);
  let message;
  for (let attempt = 0; attempt < 20; attempt++) {
    const list = await (await fetch(`${base}/api/v1/messages?limit=100`)).json();
    message = list.messages.find(item => !previousIds.has(item.ID) && item.To.some(to => to.Address === email));
    if (message) break;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  if (!message) throw new Error('E-mail de recuperação não chegou ao SMTP de teste');
  const mail = await (await fetch(`${base}/api/v1/message/${message.ID}`)).json();
  const url = new URL(mail.Text.match(/https?:\/\/\S+/)[0]);
  return { token: url.searchParams.get('token'), url, response, mail };
}

test('entrega link por SMTP sem retornar token na API e guarda apenas seu hash', async () => {
  const account = await owner();
  const { token, url, response } = await requestLink(account.email);
  expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(url.origin).toBe('http://localhost:5173');
  expect(JSON.stringify(response.body)).not.toContain(token);
  const [[row]] = await db.query('SELECT * FROM recuperacoes_senha WHERE usuario_id=?', [account.id]);
  expect(row.token_hash).toBe(crypto.createHash('sha256').update(token).digest('hex'));
  expect(JSON.stringify(row)).not.toContain(token);
  const missing = await request(app).post('/api/auth/forgot-password').send({ email: `inexistente-${sequence}@example.com` }).expect(200);
  expect(missing.body).toEqual(response.body);
});

test('redefinição usa o link uma única vez, troca a senha e revoga sessões', async () => {
  const account = await owner();
  const { token } = await requestLink(account.email);
  await request(app).post('/api/auth/reset-password').send({ token, nova_senha: 'senha-nova-123' }).expect(200);
  await auth(account.token).get('/api/auth/me').expect(401);
  await request(app).post('/api/auth/login').send({ email: account.email, senha: 'senha123' }).expect(401);
  await request(app).post('/api/auth/login').send({ email: account.email, senha: 'senha-nova-123' }).expect(200);
  await request(app).post('/api/auth/reset-password').send({ token, nova_senha: 'outra123' }).expect(400);
});

test('dois usos concorrentes do mesmo link só permitem uma alteração', async () => {
  const account = await owner();
  const { token } = await requestLink(account.email);
  const replies = await Promise.all(['primeira123', 'segunda123'].map(nova_senha =>
    request(app).post('/api/auth/reset-password').send({ token, nova_senha })));
  expect(replies.map(item => item.status).sort()).toEqual([200, 400]);
  const [[row]] = await db.query('SELECT token_version FROM usuarios WHERE id=?', [account.id]);
  expect(row.token_version).toBe(1);
});

test('links expirados ou desconhecidos não alteram a conta', async () => {
  const account = await owner();
  const { token } = await requestLink(account.email);
  await db.query('UPDATE recuperacoes_senha SET expira_em=DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 SECOND) WHERE usuario_id=?', [account.id]);
  const expired = await request(app).post('/api/auth/reset-password').send({ token, nova_senha: 'nova123' }).expect(400);
  const unknown = await request(app).post('/api/auth/reset-password').send({ token: crypto.randomBytes(32).toString('base64url'), nova_senha: 'nova123' }).expect(400);
  expect(unknown.body).toEqual(expired.body);
  await auth(account.token).get('/api/auth/me').expect(200);
});

test('solicitar novo link invalida o anterior', async () => {
  const account = await owner();
  const first = await requestLink(account.email);
  // A API do Mailpit lista a mensagem mais recente primeiro.
  const second = await requestLink(account.email);
  expect(second.token).not.toBe(first.token);
  await request(app).post('/api/auth/reset-password').send({ token: first.token, nova_senha: 'nova123' }).expect(400);
  await request(app).post('/api/auth/reset-password').send({ token: second.token, nova_senha: 'nova123' }).expect(200);
});

test('falha no SMTP mantém resposta genérica e invalida o token não entregue', async () => {
  const account = await owner();
  const previous = process.env.SMTP_PORT;
  const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    process.env.SMTP_PORT = '1';
    const response = await request(app).post('/api/auth/forgot-password').send({ email: account.email }).expect(200);
    expect(response.body.message).toContain('Se a conta estiver ativa');
    const [[row]] = await db.query('SELECT usado_em FROM recuperacoes_senha WHERE usuario_id=?', [account.id]);
    expect(row.usado_em).not.toBeNull();
    expect(logger).toHaveBeenCalled();
  } finally {
    process.env.SMTP_PORT = previous;
    logger.mockRestore();
  }
});

test('contas desativadas não recebem token e dados inválidos são rejeitados', async () => {
  const account = await owner();
  await db.execute('UPDATE usuarios SET ativo=0 WHERE id=?', [account.id]);
  await request(app).post('/api/auth/forgot-password').send({ email: account.email }).expect(200);
  const [[row]] = await db.query('SELECT COUNT(*) AS total FROM recuperacoes_senha');
  expect(row.total).toBe(0);
  await request(app).post('/api/auth/forgot-password').send({ email: 'invalido' }).expect(400);
  await request(app).post('/api/auth/reset-password').send({ token: 'curto', nova_senha: 'nova123' }).expect(400);
  await request(app).post('/api/auth/reset-password').send({ token: crypto.randomBytes(32).toString('base64url'), nova_senha: '123' }).expect(400);
});

test('cabeçalho Host e redirecionamento informado pelo cliente não alteram o link', async () => {
  const account = await owner();
  const { url } = await requestLink(account.email, { host: 'outro-dominio.example', extra: { redirect_url: 'https://outro-dominio.example' } });
  expect(url.origin).toBe('http://localhost:5173');
  expect(url.pathname).toBe('/redefinir-senha');
});

test('configuração indisponível produz a mesma resposta para conta conhecida e desconhecida', async () => {
  const account = await owner();
  const previous = process.env.PASSWORD_RESET_URL;
  try {
    delete process.env.PASSWORD_RESET_URL;
    const known = await request(app).post('/api/auth/forgot-password').send({ email: account.email }).expect(503);
    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: `ausente-${sequence}@example.com` }).expect(503);
    expect(unknown.body).toEqual(known.body);
  } finally { process.env.PASSWORD_RESET_URL = previous; }
});

test('trocar a senha autenticada também invalida o link de recuperação pendente', async () => {
  const account = await owner();
  const { token } = await requestLink(account.email);
  await auth(account.token).patch('/api/auth/password')
    .send({ senha_atual: 'senha123', nova_senha: 'senha-alterada-123' }).expect(200);
  await request(app).post('/api/auth/reset-password').send({ token, nova_senha: 'senha-indevida-123' }).expect(400);
  await request(app).post('/api/auth/login').send({ email: account.email, senha: 'senha-alterada-123' }).expect(200);
});

test('alterar e-mail revoga o link entregue ao endereço antigo e permite nova recuperação', async () => {
  const admin = await owner();
  const account = await owner();
  const { token } = await requestLink(account.email);
  const email = `novo-${sequence}@example.com`;
  await auth(admin.token).patch(`/api/usuarios/${account.id}`).send({ email }).expect(200);
  await request(app).post('/api/auth/reset-password').send({ token, nova_senha: 'senha-indevida-123' }).expect(400);
  const next = await requestLink(email);
  await request(app).post('/api/auth/reset-password').send({ token: next.token, nova_senha: 'senha-nova-123' }).expect(200);
  await request(app).post('/api/auth/login').send({ email, senha: 'senha-nova-123' }).expect(200);
});

test('desativar e reativar a conta não restaura links de recuperação anteriores', async () => {
  const admin = await owner();
  const account = await owner();
  const { token } = await requestLink(account.email);
  await auth(admin.token).delete(`/api/usuarios/${account.id}`).expect(200);
  await auth(admin.token).patch(`/api/usuarios/${account.id}`).send({ ativo: 1 }).expect(200);
  await request(app).post('/api/auth/reset-password').send({ token, nova_senha: 'senha-indevida-123' }).expect(400);
  await request(app).post('/api/auth/login').send({ email: account.email, senha: 'senha123' }).expect(200);
});

test('alterar o perfil invalida o link emitido com as permissões anteriores', async () => {
  const admin = await owner();
  const account = await owner();
  const { token } = await requestLink(account.email);
  await auth(admin.token).patch(`/api/usuarios/${account.id}`).send({ perfil: 'ADMIN' }).expect(200);
  await request(app).post('/api/auth/reset-password').send({ token, nova_senha: 'senha-indevida-123' }).expect(400);
  await request(app).post('/api/auth/login').send({ email: account.email, senha: 'senha123' }).expect(200);
});
