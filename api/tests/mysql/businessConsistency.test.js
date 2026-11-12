const { initialize, clean, close, user, auth, contract, db } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('replanejar contrato não reativa parcelas canceladas nem altera saldos silenciosamente', async () => {
  const owner = await user();
  const api = auth(owner.token);
  const created = await contract(owner.token, { valor_total: 300, quantidade_parcelas: 3 });
  const initial = (await api.get(`/api/contratos/${created.id}/parcelas`).expect(200)).body.data;
  await api.patch(`/api/contratos/${created.id}/parcelas/${initial[1].id}`).send({ status: 'CANCELADA' }).expect(200);
  const before = (await api.get(`/api/contratos/${created.id}`).expect(200)).body;
  expect(before.financeiro).toMatchObject({ valor_total: 300, valor_parcelas: 200, recebido: 0, pendente: 200 });
  const updates = [
    { valor_total: 600 },
    { quantidade_parcelas: 2 },
    { vencimentos: ['2026-01-31', '2026-02-28', '2026-03-31'] },
  ];
  for (const update of updates) {
    const response = await api.put(`/api/contratos/${created.id}`).send(update).expect(409);
    expect(response.body.message).toMatch(/canceladas/i);
  }
  await api.put(`/api/contratos/${created.id}`).send({ descricao: 'Edição sem replanejamento' }).expect(200);
  const after = (await api.get(`/api/contratos/${created.id}/parcelas`).expect(200)).body.data;
  expect(after.map(p => p.id)).toEqual(initial.map(p => p.id));
  expect(after.map(p => p.status)).toEqual(['PENDENTE', 'CANCELADA', 'PENDENTE']);
  expect((await api.get(`/api/contratos/${created.id}`).expect(200)).body.financeiro).toEqual(before.financeiro);
  // Uma mudança explícita de status libera o replanejamento normal.
  await api.patch(`/api/contratos/${created.id}/parcelas/${initial[1].id}`).send({ status: 'PENDENTE' }).expect(200);
  await api.put(`/api/contratos/${created.id}`).send({ valor_total: 600 }).expect(200);
  const replanned = (await api.get(`/api/contratos/${created.id}/parcelas`).expect(200)).body.data;
  expect(replanned.map(p => Number(p.valor))).toEqual([200, 200, 200]);
  expect((await api.get(`/api/contratos/${created.id}`).expect(200)).body.financeiro.pendente).toBe(600);
});

test('limites de texto são validados na criação de contrato e pagamento antes da gravação', async () => {
  const owner = await user();
  const api = auth(owner.token);
  const created = await contract(owner.token, { valor_total: 100, quantidade_parcelas: 1 });
  const base = { cliente_id: created.cliente_id, numero: 'CONTRATO-NOVO', valor_total: 10, quantidade_parcelas: 1, data_inicio: '2026-01-01' };
  for (const invalid of [
    { tipo: 'x'.repeat(101) }, { forma_pagamento: 'x'.repeat(51) },
    { descricao: 'x'.repeat(5001) }, { observacoes: 'x'.repeat(5001) },
  ]) await api.post('/api/contratos').send({ ...base, ...invalid }).expect(400);
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM contratos WHERE usuario_id=?', [owner.id]);
  expect(total).toBe(1);
  const plan = (await api.get(`/api/contratos/${created.id}/parcelas`).expect(200)).body.data;
  const payment = { parcela_id: plan[0].id, valor: 10, data_pagamento: '2026-01-31' };
  await api.post(`/api/contratos/${created.id}/pagamentos`).send({ ...payment, forma_pagamento: 'x'.repeat(51) }).expect(400);
  await api.post(`/api/contratos/${created.id}/pagamentos`).send({ ...payment, observacoes: 'x'.repeat(5001) }).expect(400);
  expect((await api.get(`/api/contratos/${created.id}`).expect(200)).body.financeiro.recebido).toBe(0);
  await api.post(`/api/contratos/${created.id}/pagamentos`).send({ ...payment, forma_pagamento: 'x'.repeat(50) }).expect(201);
});

test('contagem de parcelas pagas deriva do saldo e desconsidera canceladas e estornos', async () => {
  const owner = await user();
  const api = auth(owner.token);
  const created = await contract(owner.token, { valor_total: 0.01, quantidade_parcelas: 2 });
  const plan = (await api.get(`/api/contratos/${created.id}/parcelas`).expect(200)).body.data;
  expect(plan.map(p => Number(p.valor))).toEqual([0, 0.01]);
  expect(plan[0].situacao).toBe('PAGA');
  expect(['PENDENTE', 'VENCIDA']).toContain(plan[1].situacao);
  const paidCount = async () => (await api.get('/api/contratos').expect(200)).body.data.find(row => row.id === created.id).parcelas_pagas;
  expect(await paidCount()).toBe(1);
  await api.patch(`/api/contratos/${created.id}/parcelas/${plan[0].id}`).send({ status: 'CANCELADA' }).expect(200);
  expect(await paidCount()).toBe(0);
  const payment = (await api.post(`/api/contratos/${created.id}/pagamentos`).send({ parcela_id: plan[1].id, valor: 0.01, data_pagamento: '2026-01-31' }).expect(201)).body.pagamento;
  expect(await paidCount()).toBe(1);
  await api.post(`/api/pagamentos/${payment.id}/estorno`).send({ motivo: 'Pagamento informado por engano' }).expect(200);
  expect(await paidCount()).toBe(0);
  await api.patch(`/api/contratos/${created.id}/parcelas/${plan[0].id}`).send({ status: 'PENDENTE' }).expect(200);
  expect(await paidCount()).toBe(1);
});
