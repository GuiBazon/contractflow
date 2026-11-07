const express = require('express');
const request = require('supertest');
const { createAuthRateLimits } = require('../../src/middlewares/authRateLimit');

function scenario(options) {
  const app = express();
  app.use(express.json());
  const limits = createAuthRateLimits({ resolveAccountKey: email => email, ...options });
  app.post('/login', ...limits.login, (req, res) => {
    if (req.body.senha === 'correta') return res.json({ ok: true });
    return res.status(401).json({ message: 'Credenciais inválidas' });
  });
  app.post('/forgot', ...limits.forgotPassword, (req, res) => res.json({ message: 'Confira seu e-mail' }));
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.use((err, req, res, next) => res.status(500).json({ message: 'Erro interno do servidor' }));
  return app;
}

test('falhas repetidas para a mesma conta retornam 429 com tempo de espera', async () => {
  const app = scenario({ accountLimit: 2, ipLimit: 10 });
  await request(app).post('/login').send({ email: 'conta@example.com', senha: 'errada' }).expect(401);
  await request(app).post('/login').send({ email: ' CONTA@EXAMPLE.COM ', senha: 'errada' }).expect(401);
  const blocked = await request(app).post('/login').send({ email: 'conta@example.com', senha: 'errada' }).expect(429);
  expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
  expect(blocked.headers.ratelimit).toBeDefined();
  expect(blocked.body.message).toContain('Muitas tentativas');
});

test('limite por IP também impede alternar e-mails para continuar as tentativas', async () => {
  const app = scenario({ accountLimit: 10, ipLimit: 2 });
  await request(app).post('/login').send({ email: 'a@example.com' }).expect(401);
  await request(app).post('/login').send({ email: 'b@example.com' }).expect(401);
  await request(app).post('/login').send({ email: 'c@example.com' }).expect(429);
});

test('logins bem-sucedidos não consomem o limite de falhas', async () => {
  const app = scenario({ accountLimit: 1, ipLimit: 2 });
  for (let i = 0; i < 4; i++) {
    await request(app).post('/login').send({ email: 'a@example.com', senha: 'correta' }).expect(200);
  }
  await request(app).post('/login').send({ email: 'a@example.com', senha: 'errada' }).expect(401);
  await request(app).post('/login').send({ email: 'a@example.com', senha: 'errada' }).expect(429);
});

test('falhas de uma conta não bloqueiam outra antes do limite por IP', async () => {
  const app = scenario({ accountLimit: 1, ipLimit: 10 });
  await request(app).post('/login').send({ email: 'a@example.com' }).expect(401);
  await request(app).post('/login').send({ email: 'a@example.com' }).expect(429);
  await request(app).post('/login').send({ email: 'b@example.com', senha: 'correta' }).expect(200);
});

test('recuperação limita solicitações para uma conta e mantém health acessível', async () => {
  const app = scenario();
  for (let i = 0; i < 3; i++) await request(app).post('/forgot').send({ email: 'a@example.com' }).expect(200);
  await request(app).post('/forgot').send({ email: 'a@example.com' }).expect(429);
  await request(app).get('/health').expect(200);
});

test('limite por IP e validação de tamanho ocorrem antes da resolução de conta', async () => {
  const resolveAccountKey = jest.fn(email => email);
  const app = scenario({ ipLimit: 2, accountLimit: 10, resolveAccountKey });
  await request(app).post('/login').send({ email: 'x'.repeat(151) }).expect(400);
  expect(resolveAccountKey).not.toHaveBeenCalled();
  await request(app).post('/login').send({ email: 'a@example.com' }).expect(401);
  await request(app).post('/login').send({ email: 'b@example.com' }).expect(429);
  expect(resolveAccountKey).toHaveBeenCalledTimes(1);
});

test('falha ao resolver chave não libera login e continua sujeita ao limite por IP', async () => {
  const resolveAccountKey = jest.fn(async () => { throw new Error('detalhe interno do banco'); });
  const app = scenario({ ipLimit: 1, resolveAccountKey });
  const failed = await request(app).post('/login').send({ email: 'a@example.com' }).expect(500);
  expect(failed.body).toEqual({ message: 'Erro interno do servidor' });
  await request(app).post('/login').send({ email: 'b@example.com' }).expect(429);
  expect(resolveAccountKey).toHaveBeenCalledTimes(1);
});
