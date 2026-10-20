const { initialize, clean, close, user, auth, contract } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('cada filtro do calendário retorna os campos de evento, inclusive sem UNION', async () => {
  const owner = await user();
  const api = auth(owner.token);
  const c = await contract(owner.token, { valor_total: 100, quantidade_parcelas: 2, data_inicio: '2026-01-01', data_fim: '2026-12-01' });
  const installments = await api.get(`/api/contratos/${c.id}/parcelas`).expect(200);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: installments.body.data[0].id, valor: 50, data_pagamento: '2026-10-20' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Despesa do calendário', valor: 25, data: '2026-10-21' }).expect(201);
  for (const type of ['VENCIMENTO', 'PAGAMENTO', 'DESPESA', 'RENOVACAO']) {
    const { body } = await api.get(`/api/calendario?de=2026-01-01&ate=2026-12-31&tipo=${type}`).expect(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({ tipo: type });
    expect(body.data[0].id).toBeTruthy();
    expect(body.data[0].data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(body.paginacao.total).toBe(1);
  }
});

test('filtros sem registros retornam lista vazia com o mesmo formato', async () => {
  const owner = await user();
  const api = auth(owner.token);
  for (const type of ['VENCIMENTO', 'PAGAMENTO', 'DESPESA', 'RENOVACAO']) {
    const { body } = await api.get(`/api/calendario?de=2026-01-01&ate=2026-12-31&tipo=${type}`).expect(200);
    expect(body.data).toEqual([]);
    expect(body.paginacao.total).toBe(0);
  }
});
