const ExcelJS = require('exceljs');
const { initialize, clean, close, user, auth, contract, db } = require('./helpers');
beforeAll(initialize);
beforeEach(clean);
afterAll(close);

test('dashboard agrega mais de 100 pagamentos, saldo parcial e despesas reais', async () => {
  const dono = await user(); const api = auth(dono.token);
  const c = await contract(dono.token, { valor_total: 200, quantidade_parcelas: 1, data_inicio: '2020-01-01' });
  const [[p]] = await db.query('SELECT id FROM parcelas WHERE contrato_id=?', [c.id]);
  await db.query('INSERT INTO pagamentos (parcela_id,valor,data_pagamento) VALUES ?', [Array.from({ length: 125 }, () => [p.id, 1, '2026-01-01'])]);
  await api.post('/api/despesas').send({ descricao: 'Paga', valor: 10, data: '2026-01-01', status: 'PAGA' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Pendente', valor: 5, data: '2026-01-01' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Cancelada', valor: 7, data: '2026-01-01', status: 'CANCELADA' }).expect(201);
  const { body } = await api.get('/api/dashboard').expect(200);
  expect(body).toMatchObject({ recebido: 125, pendente: 75, atrasado: 75, despesas_pagas: 10, despesas_pendentes: 5, saldo_realizado: 115, saldo_projetado: 185, clientes: 1, contratos_ativos: 1 });
  expect(body.fluxo_mensal).toContainEqual({ mes: '2026-01', receitas: 125, despesas: 10, saldo: 115 });
  const { body: filtered } = await api.get('/api/dashboard?de=2026-02-01&ate=2026-02-28').expect(200);
  expect(filtered).toMatchObject({ recebido: 0, pendente: 0, despesas_pagas: 0 });
  const outro = await user('outro@example.com');
  const { body: isolated } = await auth(outro.token).get('/api/dashboard').expect(200);
  expect(isolated).toMatchObject({ recebido: 0, pendente: 0, despesas_pagas: 0, clientes: 0 });
});

test('calendário diferencia vencimento, pagamento, despesa e término e protege datas/dados', async () => {
  const dono = await user(); const api = auth(dono.token);
  const c = await contract(dono.token, { valor_total: 100, quantidade_parcelas: 1, data_inicio: '2026-01-01', data_fim: '2026-01-31' });
  const [[p]] = await db.query('SELECT id FROM parcelas WHERE contrato_id=?', [c.id]);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: p.id, valor: 20, data_pagamento: '2026-01-03' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Internet', valor: 50, data: '2026-01-05' }).expect(201);
  const { body } = await api.get('/api/calendario?de=2026-01-01&ate=2026-01-31').expect(200);
  expect(body.data.map(e => e.tipo).sort()).toEqual(['DESPESA','PAGAMENTO','RENOVACAO','VENCIMENTO']);
  expect(body.data.find(e => e.tipo === 'VENCIMENTO').valor).toBe(80);
  expect(body.data[0].data).toBe('2026-01-01');
  const { body: paginated } = await api.get('/api/calendario?de=2026-01-01&ate=2026-01-31&limit=2').expect(200);
  expect(paginated.data).toHaveLength(2); expect(paginated.paginacao.total).toBe(4);
  await api.get('/api/calendario').expect(400);
  await api.get('/api/calendario?de=2026-02-30&ate=2026-03-01').expect(400);
  await api.get('/api/calendario?de=2026-01-01&ate=2028-01-01').expect(400);
  const outro = await user('outro@example.com');
  const { body: isolated } = await auth(outro.token).get('/api/calendario?de=2026-01-01&ate=2026-01-31').expect(200);
  expect(isolated.data).toEqual([]);
});

test('relatórios exportam todos os resultados em CSV/XLSX e neutralizam fórmulas no CSV', async () => {
  const dono = await user(); const api = auth(dono.token);
  await api.post('/api/despesas').send({ descricao: '=HYPERLINK("https://example.com")', valor: 25, data: '2026-10-01' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Outra', valor: 10, data: '2026-10-02' }).expect(201);
  const { body } = await api.get('/api/relatorios/despesas?limit=1').expect(200);
  expect(body.data).toHaveLength(1); expect(body.paginacao.total).toBe(2);
  const csv = await api.get('/api/relatorios/despesas?formato=csv&limit=1').expect(200);
  expect(csv.text).toContain("'=HYPERLINK"); expect(csv.text).toContain('Outra');
  expect(csv.headers['content-disposition']).toContain('.csv');
  const xlsx = await api.get('/api/relatorios/despesas?formato=xlsx').buffer(true).parse((res, callback) => {
    const parts = []; res.on('data', chunk => parts.push(chunk)); res.on('end', () => callback(null, Buffer.concat(parts)));
  }).expect(200);
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(xlsx.body);
  expect(workbook.worksheets[0].rowCount).toBe(3);
  expect(workbook.worksheets[0].getCell('B2').value).toBe('=HYPERLINK("https://example.com")');
  const outro = await user('outro@example.com');
  const { body: isolated } = await auth(outro.token).get('/api/relatorios/despesas').expect(200);
  expect(isolated.data).toEqual([]);
  await api.get('/api/relatorios/senhas').expect(400);
});

test('alertas usam o saldo aberto e ignoram parcelas quitadas/canceladas', async () => {
  const dono = await user(); const api = auth(dono.token);
  const c = await contract(dono.token, { valor_total: 100, quantidade_parcelas: 2, data_inicio: '2020-01-01' });
  const [ps] = await db.query('SELECT id FROM parcelas WHERE contrato_id=? ORDER BY numero', [c.id]);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: ps[0].id, valor: 20, data_pagamento: '2026-01-01' }).expect(201);
  await api.patch(`/api/contratos/${c.id}/parcelas/${ps[1].id}`).send({ status: 'CANCELADA' }).expect(200);
  const { body } = await api.get('/api/alertas').expect(200);
  expect(body.data).toHaveLength(1); expect(body.data[0]).toMatchObject({ tipo: 'ATRASO', valor: 30 });
  await api.get('/api/alertas?dias=9999').expect(400);
});
