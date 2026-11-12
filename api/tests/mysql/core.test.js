const request = require('supertest');
const { initialize, clean, close, user, auth, contract, db, app } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('cliente → contrato → parcelas → pagamento → saldo → histórico funciona no MySQL', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const c = await contract(dono.token);
  const { body: parcelas } = await api.get(`/api/parcelas/${c.id}/parcelas`).expect(200);
  expect(parcelas.data.map(p => Number(p.valor))).toEqual([333.33, 333.33, 333.34]);
  expect(parcelas.data.map(p => String(p.data_vencimento).slice(0, 10))).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  await api.post(`/api/pagamentos/${c.id}/pagamentos`).send({ parcela_id: parcelas.data[0].id, valor: 100, data_pagamento: '2026-02-01', forma_pagamento: 'PIX' }).expect(201);
  const { body: detalhe } = await api.get(`/api/contratos/${c.id}`).expect(200);
  expect(detalhe.financeiro).toMatchObject({ recebido: 100, pendente: 900 });
  const { body: historico } = await api.get(`/api/contratos/${c.id}/historico`).expect(200);
  expect(historico.some(h => h.acao === 'PAGAMENTO')).toBe(true);
  await api.delete(`/api/clientes/${c.cliente_id}`).expect(409);
  await api.delete(`/api/contratos/${c.id}`).expect(409);
});

test('dados e operações financeiras de outro usuário são inacessíveis', async () => {
  const dono = await user();
  const outro = await user('outro@example.com');
  const c = await contract(dono.token);
  const api = auth(outro.token);
  await api.get(`/api/contratos/${c.id}`).expect(404);
  await api.get(`/api/parcelas/${c.id}/parcelas`).expect(404);
  await api.patch(`/api/contratos/${c.id}/status`).send({ status: 'CANCELADO' }).expect(404);
  const { body } = await api.get('/api/clientes').expect(200);
  expect(body.data).toEqual([]);
});

test('constraints rejeitam pagamento órfão e contrato inválido não deixa parcelas', async () => {
  await expect(db.execute('INSERT INTO pagamentos (parcela_id, valor, data_pagamento) VALUES (?, ?, ?)', [9999999, 10, '2026-01-01'])).rejects.toMatchObject({ code: 'ER_NO_REFERENCED_ROW_2' });
  const dono = await user();
  const c = await contract(dono.token);
  await auth(dono.token).post('/api/contratos').send({ cliente_id: c.cliente_id, numero: 'INVALIDO', valor_total: 100, quantidade_parcelas: 2, vencimentos: ['2026-01-31'] }).expect(400);
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM contratos');
  expect(total).toBe(1);
});

test('cadastro não aceita perfil escolhido, duplicidade nem login incorreto', async () => {
  await user();
  await request(app).post('/api/auth/register').send({ nome: 'Outro', email: 'novo@example.com', senha: 'senha123', perfil: 'ADMIN' }).expect(201);
  const [[row]] = await db.execute('SELECT perfil FROM usuarios WHERE email = ?', ['novo@example.com']);
  expect(row.perfil).toBe('USUARIO');
  await request(app).post('/api/auth/register').send({ nome: 'Outro', email: 'novo@example.com', senha: 'senha123' }).expect(409);
  await request(app).post('/api/auth/login').send({ email: 'novo@example.com', senha: 'incorreta' }).expect(401);
});
