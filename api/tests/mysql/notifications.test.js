const { initialize, clean, close, user, auth, contract, db } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

async function scenario() {
  const owner = await user();
  const c = await contract(owner.token, { quantidade_parcelas: 3, valor_total: 90, data_inicio: '2020-01-01', data_fim: '2030-12-31' });
  const api = auth(owner.token);
  const { body } = await api.get('/api/notificacoes').expect(200);
  return { owner, api, c, notifications: body.data };
}

test('lista e contador refletem leitura persistida e permitem marcar como não lida', async () => {
  const { api, notifications } = await scenario();
  const id = notifications[0].id;
  const initial = await api.get('/api/notificacoes/resumo').expect(200);
  expect(initial.body).toEqual({ total: 3, nao_lidas: 3, lidas: 0 });
  const first = await api.patch(`/api/notificacoes/${id}/leitura`).expect(200);
  const again = await api.patch(`/api/notificacoes/${id}/leitura`).expect(200);
  expect(again.body).toEqual(first.body);
  const { body } = await api.get('/api/notificacoes?lida=true&limit=1').expect(200);
  expect(body.data).toHaveLength(1);
  expect(body.data[0]).toMatchObject({ id, lida: true });
  expect(body.resumo).toEqual({ total: 3, nao_lidas: 2, lidas: 1 });
  expect(body.paginacao.total).toBe(1);
  await api.delete(`/api/notificacoes/${id}/leitura`).expect(200);
  const unread = await api.get('/api/notificacoes/resumo').expect(200);
  expect(unread.body.nao_lidas).toBe(3);
});

test('outra conta não consulta nem altera o estado das notificações do dono', async () => {
  const { notifications } = await scenario();
  const other = await user('outra@example.com');
  const api = auth(other.token);
  await api.patch(`/api/notificacoes/${notifications[0].id}/leitura`).expect(404);
  await api.delete(`/api/notificacoes/${notifications[0].id}/leitura`).expect(404);
  const { body } = await api.get('/api/notificacoes').expect(200);
  expect(body.resumo).toEqual({ total: 0, nao_lidas: 0, lidas: 0 });
});

test('pagamento remove o alerta e sua leitura não infla o contador', async () => {
  const { api, notifications, c } = await scenario();
  const id = notifications[0].id;
  await api.patch(`/api/notificacoes/${id}/leitura`).expect(200);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: Number(id.split('-')[1]), valor: 30, data_pagamento: '2026-10-20' }).expect(201);
  const { body } = await api.get('/api/notificacoes').expect(200);
  expect(body.data.some(row => row.id === id)).toBe(false);
  expect(body.resumo).toEqual({ total: 2, nao_lidas: 2, lidas: 0 });
});

test('alterar vencimento gera um novo evento não lido', async () => {
  const { api, notifications, c } = await scenario();
  const id = notifications[0].id;
  await api.patch(`/api/notificacoes/${id}/leitura`).expect(200);
  await api.patch(`/api/contratos/${c.id}/parcelas/${id.split('-')[1]}`).send({ data_vencimento: '2020-02-15' }).expect(200);
  const { body } = await api.get('/api/notificacoes?lida=false').expect(200);
  expect(body.data.find(row => row.id === id)).toMatchObject({ lida: false, data: '2020-02-15' });
  expect(body.resumo.nao_lidas).toBe(3);
});

test('marcar todas respeita o período consultado e preserva notificações futuras', async () => {
  const { api, c } = await scenario();
  const [[dates]] = await db.query('SELECT DATE_ADD(CURDATE(), INTERVAL 15 DAY) AS futura');
  await api.post('/api/contratos').send({ cliente_id: c.cliente_id, numero: 'FUTURO-001', valor_total: 50,
    quantidade_parcelas: 1, data_inicio: dates.futura, data_fim: '2030-12-31' }).expect(201);
  const marked = await api.patch('/api/notificacoes/ler-todas?dias=7').expect(200);
  expect(marked.body).toEqual({ total: 3, nao_lidas: 0, lidas: 3 });
  const { body } = await api.get('/api/notificacoes?dias=30&lida=false').expect(200);
  expect(body.data).toHaveLength(1);
  expect(body.data[0].data).toBe(dates.futura);
  expect(body.resumo).toEqual({ total: 4, nao_lidas: 1, lidas: 3 });
});

test('valida filtros, identificador e autenticação', async () => {
  const { api } = await scenario();
  await api.get('/api/notificacoes?lida=sim').expect(400);
  await api.get('/api/notificacoes?dias=91').expect(400);
  await api.patch('/api/notificacoes/invalida/leitura').expect(400);
  const request = require('supertest');
  await request(require('../../src/app')).get('/api/notificacoes/resumo').expect(401);
});
