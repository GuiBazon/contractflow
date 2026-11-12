const { initialize, clean, close, user, auth, contract, db } = require('./helpers');

let originalTimezone;
beforeAll(async () => {
  await initialize();
  // Simula o driver em um servidor brasileiro sem alterar o relógio da máquina.
  originalTimezone = db.pool.config.connectionConfig.timezone;
  db.pool.config.connectionConfig.timezone = '-03:00';
});
beforeEach(clean);
afterAll(async () => {
  db.pool.config.connectionConfig.timezone = originalTimezone;
  await close();
});

async function scenario() {
  const owner = await user();
  const api = auth(owner.token);
  const c = await contract(owner.token, {
    valor_total: 100, quantidade_parcelas: 1,
    data_inicio: '2020-01-01', data_fim: '2030-12-31',
  });
  const [[parcela]] = await db.query('SELECT id FROM parcelas WHERE contrato_id=?', [c.id]);
  return { api, c, parcela };
}

function expectCurrentUtc(timestamp, startedAt) {
  expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  expect(Date.parse(timestamp)).toBeGreaterThanOrEqual(startedAt - 1500);
  expect(Date.parse(timestamp)).toBeLessThanOrEqual(Date.now() + 1500);
}

test('leitura retorna o instante UTC correto com o driver no fuso -03:00', async () => {
  const { api, parcela } = await scenario();
  const startedAt = Date.now();
  const read = await api.patch(`/api/notificacoes/parcela-${parcela.id}/leitura`).expect(200);
  expectCurrentUtc(read.body.lida_em, startedAt);
  const list = await api.get('/api/notificacoes?lida=true').expect(200);
  expect(list.body.data.find(row => row.id === `parcela-${parcela.id}`).lida_em).toBe(read.body.lida_em);
});

test('estorno e suas duas listagens preservam o instante UTC no fuso -03:00', async () => {
  const { api, c, parcela } = await scenario();
  const payment = await api.post(`/api/contratos/${c.id}/pagamentos`).send({
    parcela_id: parcela.id, valor: 100, data_pagamento: '2026-10-20',
  }).expect(201);
  const startedAt = Date.now();
  const reversed = await api.post(`/api/pagamentos/${payment.body.pagamento.id}/estorno`)
    .send({ motivo: 'Correção de um lançamento equivocado' }).expect(200);
  const timestamp = reversed.body.pagamento.estornado_em;
  expectCurrentUtc(timestamp, startedAt);
  for (const path of ['/api/pagamentos', `/api/contratos/${c.id}/pagamentos`]) {
    const list = await api.get(`${path}?status=ESTORNADO`).expect(200);
    expect(list.body.data[0].estornado_em).toBe(timestamp);
  }
});
