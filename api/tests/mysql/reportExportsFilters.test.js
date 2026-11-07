const ExcelJS = require('exceljs');
const { initialize, clean, close, user, auth, contract, db } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, '').trimEnd().split('\r\n');
  return lines.map(line => (line.match(/"(?:[^"]|"")*"/g) || []).map(value => value.slice(1, -1).replace(/""/g, '"')));
}

async function exportRows(api, tipo, query) {
  const csv = await api.get(`/api/relatorios/${tipo}?${query}&formato=csv`).expect(200);
  expect(csv.headers['content-type']).toMatch(/^text\/csv/);
  expect(csv.headers['content-disposition']).toContain(`contractflow-${tipo}.csv`);
  expect(csv.text.startsWith('\uFEFF')).toBe(true);
  const [header, ...csvRows] = parseCsv(csv.text);
  const xlsx = await api.get(`/api/relatorios/${tipo}?${query}&formato=xlsx`).buffer(true).parse((res, callback) => {
    const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => callback(null, Buffer.concat(chunks)));
  }).expect(200);
  expect(xlsx.headers['content-type']).toMatch(/^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
  expect(xlsx.headers['content-disposition']).toContain(`contractflow-${tipo}.xlsx`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(xlsx.body);
  const sheet = workbook.worksheets[0];
  expect(sheet.getRow(1).values.slice(1)).toEqual(header);
  const xlsxRows = [];
  for (let n = 2; n <= sheet.rowCount; n++) {
    xlsxRows.push(Object.fromEntries(header.map((key, i) => [key, sheet.getRow(n).getCell(i + 1).value])));
  }
  return { csvRows: csvRows.map(row => Object.fromEntries(header.map((key, i) => [key, row[i]]))), xlsxRows };
}

test('CSV e XLSX aplicam filtros combinados de despesa e exportam todas as linhas filtradas', async () => {
  const dono = await user(); const api = auth(dono.token);
  for (const item of [
    { descricao: 'Aluguel; "Janeiro"', categoria: 'Escritório', valor: 123.45, data: '2026-01-01', status: 'PAGA' },
    { descricao: '=Aluguel fevereiro', categoria: 'Escritório', valor: 50, data: '2026-01-31', status: 'PAGA' },
    { descricao: 'Aluguel fora', categoria: 'Escritório', valor: 8, data: '2026-02-01', status: 'PAGA' },
    { descricao: 'Aluguel pendente', categoria: 'Escritório', valor: 9, data: '2026-01-10', status: 'PENDENTE' },
    { descricao: 'Aluguel outra categoria', categoria: 'Viagem', valor: 10, data: '2026-01-10', status: 'PAGA' },
    { descricao: 'Internet', categoria: 'Escritório', valor: 11, data: '2026-01-10', status: 'PAGA' },
  ]) await api.post('/api/despesas').send(item).expect(201);
  const outro = await user('outro@example.com');
  await auth(outro.token).post('/api/despesas').send({ descricao: 'Aluguel de terceiro', categoria: 'Escritório', valor: 12, data: '2026-01-10', status: 'PAGA' }).expect(201);
  const filters = new URLSearchParams({ de: '2026-01-01', ate: '2026-01-31', status: 'PAGA', categoria: 'Escritório', q: 'Aluguel', limit: '1', page: '2' }).toString();
  const { body: json } = await api.get(`/api/relatorios/despesas?${filters}`).expect(200);
  expect(json.paginacao.total).toBe(2);
  expect(json.data).toHaveLength(1);
  const { csvRows, xlsxRows } = await exportRows(api, 'despesas', filters);
  expect(csvRows).toHaveLength(2);
  expect(xlsxRows).toHaveLength(2);
  expect(csvRows.map(row => row.descricao)).toEqual(['Aluguel; "Janeiro"', "'=Aluguel fevereiro"]);
  expect(xlsxRows.map(row => row.descricao)).toEqual(['Aluguel; "Janeiro"', '=Aluguel fevereiro']);
  expect(xlsxRows.map(row => row.valor)).toEqual([123.45, 50]);
  expect(xlsxRows.map(row => row.data)).toEqual(['2026-01-01', '2026-01-31']);
  expect(xlsxRows.every(row => row.status === 'PAGA' && row.categoria === 'Escritório')).toBe(true);
  const empty = await exportRows(api, 'despesas', new URLSearchParams({ categoria: 'Inexistente' }).toString());
  expect(empty.csvRows).toEqual([]); expect(empty.xlsxRows).toEqual([]);
  await api.get('/api/relatorios/despesas?formato=xlsx&de=2026-02-01&ate=2026-01-01').expect(400);
});

test('CSV e XLSX respeitam filtros de cliente, contrato e período para contratos, receitas e recebíveis', async () => {
  const dono = await user(); const api = auth(dono.token);
  const c = await contract(dono.token, { numero: 'CONTRATO-FILTRADO', valor_total: 200, quantidade_parcelas: 2, data_inicio: '2026-01-01' });
  const [[p1, p2]] = await db.query('SELECT id FROM parcelas WHERE contrato_id=? ORDER BY numero', [c.id]);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: p1.id, valor: 100, data_pagamento: '2026-01-15' }).expect(201);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: p2.id, valor: 30, data_pagamento: '2026-02-15' }).expect(201);
  const cliente = c.cliente_id;
  const { body: created } = await api.post('/api/contratos').send({ cliente_id: cliente, numero: 'CONTRATO-FORA', valor_total: 300, quantidade_parcelas: 1, data_inicio: '2026-02-01' }).expect(201);
  const outroContrato = created.contrato.id;
  const cases = [
    { tipo: 'contratos', query: { cliente, contrato: c.id, de: '2026-01-01', ate: '2026-01-31', status: 'ATIVO' }, id: c.id, field: 'numero', value: 'CONTRATO-FILTRADO' },
    { tipo: 'receitas', query: { cliente, contrato: c.id, de: '2026-01-01', ate: '2026-01-31' }, field: 'valor', value: 100 },
    { tipo: 'recebiveis', query: { cliente, contrato: c.id, de: '2026-01-01', ate: '2026-01-31', situacao: 'PAGA' }, id: p1.id, field: 'pago', value: 100 },
  ];
  for (const item of cases) {
    const { csvRows, xlsxRows } = await exportRows(api, item.tipo, new URLSearchParams(item.query).toString());
    expect(csvRows).toHaveLength(1); expect(xlsxRows).toHaveLength(1);
    expect(csvRows[0][item.field]).toBe(String(item.value));
    expect(xlsxRows[0][item.field]).toBe(item.value);
    if (item.id) { expect(Number(csvRows[0].id)).toBe(item.id); expect(xlsxRows[0].id).toBe(item.id); }
    expect(JSON.stringify(xlsxRows)).not.toContain('CONTRATO-FORA');
    const empty = await exportRows(api, item.tipo, new URLSearchParams({ ...item.query, contrato: outroContrato }).toString());
    expect(empty.csvRows).toEqual([]); expect(empty.xlsxRows).toEqual([]);
  }
});

test('resumo financeiro exporta valores do período em CSV e XLSX', async () => {
  const dono = await user(); const api = auth(dono.token);
  const c = await contract(dono.token, { valor_total: 200, quantidade_parcelas: 2, data_inicio: '2026-01-01' });
  const [[p1, p2]] = await db.query('SELECT id FROM parcelas WHERE contrato_id=? ORDER BY numero', [c.id]);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: p1.id, valor: 60, data_pagamento: '2026-01-15' }).expect(201);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: p2.id, valor: 80, data_pagamento: '2026-02-15' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Despesa dentro', valor: 5, data: '2026-01-31', status: 'PAGA' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Despesa fora', valor: 99, data: '2026-02-01', status: 'PAGA' }).expect(201);
  const filters = 'de=2026-01-01&ate=2026-01-31';
  const { csvRows, xlsxRows } = await exportRows(api, 'financeiro', filters);
  expect(csvRows).toHaveLength(1); expect(xlsxRows).toHaveLength(1);
  expect(csvRows[0]).toMatchObject({ de: '2026-01-01', ate: '2026-01-31', recebido: '60', pendente: '40', despesas_pagas: '5', saldo_realizado: '55' });
  expect(xlsxRows[0]).toMatchObject({ de: '2026-01-01', ate: '2026-01-31', recebido: 60, pendente: 40, despesas_pagas: 5, saldo_realizado: 55 });
});
