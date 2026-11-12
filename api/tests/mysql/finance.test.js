const { initialize, clean, close, user, auth, contract, db } = require('./helpers');
beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('pagamentos concorrentes não ultrapassam o saldo da parcela', async () => {
  const dono = await user();
  const c = await contract(dono.token, { valor_total: 100, quantidade_parcelas: 1 });
  const [[p]] = await db.query('SELECT id FROM parcelas WHERE contrato_id = ?', [c.id]);
  const api = auth(dono.token);
  const responses = await Promise.all(Array.from({ length: 8 }, () => api.post(`/api/pagamentos/${c.id}/pagamentos`).send({ parcela_id: p.id, valor: 70, data_pagamento: '2026-02-01' })));
  expect(responses.filter(r => r.status === 201).length).toBe(1);
  expect(responses.filter(r => r.status === 400).length).toBe(7);
  const [[row]] = await db.query('SELECT SUM(valor) AS pago FROM pagamentos WHERE parcela_id = ?', [p.id]);
  expect(Number(row.pago)).toBe(70);
});

test('recebíveis descontam pagamentos parciais e excluem parcelas canceladas', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const c = await contract(dono.token, { valor_total: 100, quantidade_parcelas: 2, data_inicio: '2020-01-01' });
  const [parcelas] = await db.query('SELECT id FROM parcelas WHERE contrato_id = ? ORDER BY numero', [c.id]);
  await api.get(`/api/contratos/${c.id}/parcelas`).expect(200);
  await api.post(`/api/pagamentos/${c.id}/pagamentos`).send({ parcela_id: parcelas[0].id, valor: 20, data_pagamento: '2026-01-01' }).expect(201);
  await api.patch(`/api/parcelas/${c.id}/parcelas/${parcelas[1].id}`).send({ status: 'CANCELADA' }).expect(200);
  const { body } = await api.get('/api/recebiveis?limit=1').expect(200);
  expect(body.resumo).toMatchObject({ total: 2, recebido: 20, pendente: 30, atrasado: 30 });
  expect(body.data[0]).toMatchObject({ pago: 20, pendente: 30, situacao: 'VENCIDA' });
  const { body: filtro } = await api.get('/api/recebiveis?situacao=CANCELADA').expect(200);
  expect(filtro.data[0].pendente).toBe(0);
  await api.get(`/api/contratos/${c.id}/pagamentos`).expect(200);
  const { body: compat } = await api.get('/api/pagamentos').expect(200);
  expect(compat.data).toHaveLength(1);
  await api.get('/api/recebiveis?de=2026-02-30').expect(400);
  await api.get('/api/recebiveis?limit=1.5').expect(400);
  const outro = await user('outro@example.com');
  const { body: isolated } = await auth(outro.token).get('/api/recebiveis').expect(200);
  expect(isolated.resumo).toMatchObject({ total: 0, pendente: 0, recebido: 0, atrasado: 0 });
});

test('despesas têm CRUD, filtros, validação e proteção dos registros pagos', async () => {
  const dono = await user();
  const outro = await user('outro@example.com');
  const api = auth(dono.token);
  const { body } = await api.post('/api/despesas').send({ descricao: 'Aluguel', valor: '450.50', data: '2026-10-01', categoria: 'FIXAS' }).expect(201);
  const id = body.despesa.id;
  await auth(outro.token).get(`/api/despesas/${id}`).expect(404);
  await auth(outro.token).put(`/api/despesas/${id}`).send({ valor: 1 }).expect(404);
  await auth(outro.token).delete(`/api/despesas/${id}`).expect(404);
  await api.put(`/api/despesas/${id}`).send({ valor: 500, status: 'PAGA' }).expect(200);
  const { body: list } = await api.get('/api/despesas?status=PAGA&categoria=FIXAS&de=2026-10-01&ate=2026-10-31').expect(200);
  expect(list.data).toHaveLength(1);
  expect(list.data[0].valor).toBe(500);
  await api.delete(`/api/despesas/${id}`).expect(409);
  await api.patch(`/api/despesas/${id}`).send({ valor: 10 }).expect(409);
  await api.post('/api/despesas').send({ descricao: 'Invalida', valor: 1.005, data: '2026-02-30' }).expect(400);
  const { body: pending } = await api.post('/api/despesas').send({ descricao: 'Rascunho', valor: 10, data: '2026-10-02' }).expect(201);
  await api.delete(`/api/despesas/${pending.despesa.id}`).expect(200);
});
