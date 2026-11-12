const { initialize, clean, close, user, auth, contract, db, app } = require('./helpers');
const request = require('supertest');
beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('calculadora produz os mesmos centavos e vencimentos do contrato sem criar registros', async () => {
  await request(app).post('/api/calculadora/parcelas').send({}).expect(401);
  const dono = await user();
  const api = auth(dono.token);
  const params = { valor_total: 1000,quantidade_parcelas: 6,data_inicio: '2026-01-31' };
  const { body: simulation } = await api.post('/api/calculadora/parcelas').send(params).expect(200);
  expect(simulation.parcelas.map(p=>p.valor)).toEqual([166.66,166.66,166.66,166.66,166.66,166.70]);
  expect(simulation.parcelas.map(p=>p.data_vencimento)).toEqual(['2026-01-31','2026-02-28','2026-03-31','2026-04-30','2026-05-31','2026-06-30']);
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM contratos');
  expect(total).toBe(0);
  const c = await contract(dono.token,params);
  const { body: actual } = await api.get(`/api/contratos/${c.id}/parcelas`).expect(200);
  expect(actual.data.map(p=>({ numero: p.numero,valor: Number(p.valor),data_vencimento: p.data_vencimento })))
    .toEqual(simulation.parcelas.map(({ numero,valor,data_vencimento })=>({ numero,valor,data_vencimento })));
  const { body: small } = await api.post('/api/calculadora/parcelas').send({ valor_total: 0.01,quantidade_parcelas: 120,data_inicio: '2026-01-01' }).expect(200);
  expect(small.parcelas.every(p=>p.valor>=0)).toBe(true);
  expect(small.parcelas[0].data_vencimento).toBe('2026-01-01');
  expect(small.resumo.valor_total).toBe(0.01);
  await api.post('/api/calculadora/parcelas').send({ ...params,data_inicio: '2026-02-30' }).expect(400);
  await api.post('/api/calculadora/parcelas').send({ ...params,quantidade_parcelas: [1] }).expect(400);
});

test('calculadora estima encargos só sobre saldo atrasado e usa a projeção do dashboard', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const params = { valor: 100,valor_pago: 20,dias_atraso: 30,juros_percentual: 2,multa_percentual: 2 };
  const { body } = await api.post('/api/calculadora/saldo').send(params).expect(200);
  expect(body).toMatchObject({ pendente: 80,juros: 1.60,multa: 1.60,total_atualizado: 83.20 });
  const { body: ontime } = await api.post('/api/calculadora/saldo').send({ ...params,dias_atraso: 0 }).expect(200);
  expect(ontime).toMatchObject({ juros: 0,multa: 0,total_atualizado: 80 });
  const { body: paid } = await api.post('/api/calculadora/saldo').send({ ...params,valor_pago: 100 }).expect(200);
  expect(paid.total_atualizado).toBe(0);
  await api.post('/api/calculadora/saldo').send({ ...params,valor_pago: 101 }).expect(400);
  await api.post('/api/calculadora/saldo').send({ ...params,juros_percentual: 101 }).expect(400);
  await api.post('/api/calculadora/saldo').send({ ...params,dias_atraso: -1 }).expect(400);
  await contract(dono.token,{ valor_total: 100,quantidade_parcelas: 1 });
  await api.post('/api/despesas').send({ descricao: 'Paga',valor: 10,status: 'PAGA',data: '2026-01-01' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Prevista',valor: 20,data: '2026-01-01' }).expect(201);
  const { body: dashboard } = await api.get('/api/dashboard').expect(200);
  const { body: projection } = await api.post('/api/calculadora/projecao').send({ recebido: 0,pendente: 100,despesas_pagas: 10,despesas_pendentes: 20 }).expect(200);
  expect(projection).toMatchObject({ saldo_realizado: -10,saldo_projetado: 70 });
  expect(projection.saldo_projetado).toBe(dashboard.saldo_projetado);
});

test('renovação concorrente cria um único contrato, registra origem e preserva financeiro anterior', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const c = await contract(dono.token,{ data_fim: '2026-10-31' });
  const [[p]] = await db.query('SELECT id FROM parcelas WHERE contrato_id=? ORDER BY numero LIMIT 1',[c.id]);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: p.id,valor: 100,data_pagamento: '2026-01-31' }).expect(201);
  const responses = await Promise.all(['REN-001','REN-002'].map(numero=>api.post(`/api/contratos/${c.id}/renovar`).send({ numero,valor_total: 1200,quantidade_parcelas: 3,data_inicio: '2026-11-01',data_fim: '2027-01-31' })));
  expect(responses.map(r=>r.status).sort()).toEqual([201,409]);
  const renewal = responses.find(r=>r.status===201).body;
  expect(renewal.contrato_origem_id).toBe(c.id);
  expect(renewal.contrato.cliente_id).toBe(c.cliente_id);
  const { body: original } = await api.get(`/api/contratos/${c.id}`).expect(200);
  expect(original.status).toBe('ENCERRADO');
  expect(original.financeiro).toMatchObject({ recebido: 100,pendente: 900,valor_total: 1000 });
  const { body: next } = await api.get(`/api/contratos/${renewal.contrato.id}`).expect(200);
  expect(next.status).toBe('ATIVO');
  expect(next.financeiro).toMatchObject({ recebido: 0,pendente: 1200 });
  const { body: history } = await api.get(`/api/contratos/${c.id}/historico`).expect(200);
  expect(history.find(h=>h.acao==='RENOVADO').descricao).toContain(String(renewal.contrato.id));
  const { body: nextHistory } = await api.get(`/api/contratos/${renewal.contrato.id}/historico`).expect(200);
  expect(nextHistory.some(h=>h.acao==='ORIGEM_RENOVACAO')).toBe(true);
});

test('renovação inválida ou de outra conta reverte todas as etapas', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const c = await contract(dono.token,{ data_fim: '2026-10-31' });
  const params = { numero: c.numero,valor_total: 1200,quantidade_parcelas: 3,data_inicio: '2026-11-01' };
  await api.post(`/api/contratos/${c.id}/renovar`).send(params).expect(409);
  await api.post(`/api/contratos/${c.id}/renovar`).send({ ...params,numero: 'REN-001',data_inicio: '2026-10-01' }).expect(400);
  await api.post(`/api/contratos/${c.id}/renovar`).send({ ...params,numero: 'REN-001',quantidade_parcelas: 0 }).expect(400);
  const outro = await user('outro@example.com');
  await auth(outro.token).post(`/api/contratos/${c.id}/renovar`).send({ ...params,numero: 'REN-001' }).expect(404);
  const [[counts]] = await db.query('SELECT (SELECT COUNT(*) FROM contratos) AS contratos,(SELECT COUNT(*) FROM parcelas) AS parcelas,(SELECT COUNT(*) FROM historico_contratos) AS historico');
  expect(counts).toEqual({ contratos: 1,parcelas: 3,historico: 1 });
  const { body } = await api.get(`/api/contratos/${c.id}`).expect(200);
  expect(body.status).toBe('ATIVO');
});
