const request = require('supertest');
const { initialize, clean, close, user, db, app } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('variantes equivalentes na collation compartilham o limite por conta, existente ou não', async () => {
  await user('rateuser@example.com');
  // Confirma que o caso exercita de fato a igualdade da coluna no MySQL.
  const [[{ total }]] = await db.execute('SELECT COUNT(*) AS total FROM usuarios WHERE email=?', ['ráteuſer@example.com']);
  expect(total).toBe(1);

  const known = ['rateuser@example.com', 'ráteuser@example.com', 'rateuſer@example.com', 'rateusér@example.com', 'râteuser@example.com', 'rátéuser@example.com'];
  const unknown = ['ausente@example.com', 'áusente@example.com', 'auſente@example.com', 'ausénte@example.com', 'aûsente@example.com', 'áuſente@example.com'];
  for (let i = 0; i < known.length; i++) {
    const actual = await request(app).post('/api/auth/login').send({ email: known[i], senha: 'incorreta' });
    const absent = await request(app).post('/api/auth/login').send({ email: unknown[i], senha: 'incorreta' });
    expect(actual.status).toBe(i < 5 ? 401 : 429);
    expect(absent.status).toBe(actual.status);
    expect(absent.body).toEqual(actual.body);
  }
});

test('recuperação limita endereços equivalentes sem consultar existência da conta', async () => {
  // Testa o middleware com resposta uniforme e sem depender de SMTP externo.
  const express = require('express');
  const { createAuthRateLimits } = require('../../src/middlewares/authRateLimit');
  const server = express(); server.use(express.json());
  server.post('/forgot', ...createAuthRateLimits().forgotPassword, (req, res) => res.json({ message: 'Resposta genérica' }));
  for (const email of ['outra@example.com', 'óutra@example.com', 'outŕa@example.com']) {
    await request(server).post('/forgot').send({ email }).expect(200);
  }
  await request(server).post('/forgot').send({ email: 'ôutra@example.com' }).expect(429);
});
