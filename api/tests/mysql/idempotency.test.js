const { initialize, clean, close, user, auth, contract, db } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

async function scenario(email) {
  const owner = await user(email);
  const c = await contract(owner.token, { valor_total: 100, quantidade_parcelas: 1 });
  const [[p]] = await db.query('SELECT id FROM parcelas WHERE contrato_id=?', [c.id]);
  return {
    owner, c, api: auth(owner.token),
    payload: { parcela_id: p.id, valor: 20, data_pagamento: '2026-10-20', forma_pagamento: 'PIX' },
  };
}

test('reenvio por outra rota compatível devolve o mesmo pagamento e resposta', async () => {
  const { c, api, payload } = await scenario();
  const first = await api.post(`/api/contratos/${c.id}/pagamentos`)
    .set('Idempotency-Key', 'pagamento-rede-001').send(payload).expect(201);
  const replay = await api.post(`/api/pagamentos/${c.id}/pagamentos`)
    .set('Idempotency-Key', 'pagamento-rede-001').send({ ...payload, valor: '20.00' }).expect(201);
  expect(replay.body).toEqual(first.body);
  expect(replay.headers['idempotency-replayed']).toBe('true');
  const [[row]] = await db.query('SELECT COUNT(*) AS total, SUM(valor) AS pago FROM pagamentos');
  expect(row.total).toBe(1);
  expect(Number(row.pago)).toBe(20);
});

test('oito reenvios concorrentes registram uma única operação mesmo com saldo disponível', async () => {
  const { c, api, payload } = await scenario();
  const replies = await Promise.all(Array.from({ length: 8 }, () =>
    api.post(`/api/contratos/${c.id}/pagamentos`).set('Idempotency-Key', 'concorrencia-001').send(payload)));
  expect(replies.map(response => response.status)).toEqual(Array(8).fill(201));
  expect(new Set(replies.map(response => response.body.pagamento.id)).size).toBe(1);
  expect(replies.filter(response => response.headers['idempotency-replayed'] === 'true')).toHaveLength(7);
  const [[row]] = await db.query('SELECT COUNT(*) AS total, SUM(valor) AS pago FROM pagamentos');
  expect(row.total).toBe(1);
  expect(Number(row.pago)).toBe(20);
});

test('reutilizar chave com outro conteúdo retorna conflito sem alterar o saldo', async () => {
  const { c, api, payload } = await scenario();
  const path = `/api/contratos/${c.id}/pagamentos`;
  await api.post(path).set('Idempotency-Key', 'mesma-chave-001').send(payload).expect(201);
  await api.post(path).set('Idempotency-Key', 'mesma-chave-001').send({ ...payload, valor: 30 }).expect(409);
  const [[row]] = await db.query('SELECT SUM(valor) AS pago FROM pagamentos');
  expect(Number(row.pago)).toBe(20);
});

test('falha de negócio desfaz a reserva da chave e permite uma tentativa corrigida', async () => {
  const { c, api, payload } = await scenario();
  const path = `/api/contratos/${c.id}/pagamentos`;
  await api.post(path).set('Idempotency-Key', 'tentativa-corrigida').send({ ...payload, valor: 110 }).expect(400);
  const [[before]] = await db.query('SELECT COUNT(*) AS total FROM chaves_idempotencia');
  expect(before.total).toBe(0);
  await api.post(path).set('Idempotency-Key', 'tentativa-corrigida').send(payload).expect(201);
});

test('chaves são isoladas por usuário e não revelam pagamentos de outra conta', async () => {
  const a = await scenario('a@example.com');
  const b = await scenario('b@example.com');
  const first = await a.api.post(`/api/contratos/${a.c.id}/pagamentos`)
    .set('Idempotency-Key', 'chave-compartilhada').send(a.payload).expect(201);
  const second = await b.api.post(`/api/contratos/${b.c.id}/pagamentos`)
    .set('Idempotency-Key', 'chave-compartilhada').send(b.payload).expect(201);
  expect(second.body.pagamento.id).not.toBe(first.body.pagamento.id);
  await b.api.post(`/api/contratos/${a.c.id}/pagamentos`)
    .set('Idempotency-Key', 'chave-compartilhada').send(a.payload).expect(404);
});

test('chave inválida é rejeitada e pagamentos independentes sem chave continuam permitidos', async () => {
  const { c, api, payload } = await scenario();
  const path = `/api/contratos/${c.id}/pagamentos`;
  await api.post(path).set('Idempotency-Key', 'curta').send(payload).expect(400);
  await api.post(path).send(payload).expect(201);
  await api.post(path).send(payload).expect(201);
  const [[row]] = await db.query('SELECT COUNT(*) AS total, SUM(valor) AS pago FROM pagamentos');
  expect(row.total).toBe(2);
  expect(Number(row.pago)).toBe(40);
});
