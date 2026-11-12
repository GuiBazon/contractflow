const request = require('supertest');
const ExcelJS = require('exceljs');
const { initialize, clean, close, user, auth, contract, db, app } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

async function scenario(total = 100) {
  const owner = await user();
  const c = await contract(owner.token, { valor_total: total, quantidade_parcelas: 1, data_inicio: '2020-01-01', data_fim: '2030-12-31' });
  const [[p]] = await db.query('SELECT id FROM parcelas WHERE contrato_id=?', [c.id]);
  return { owner, api: auth(owner.token), c, parcela: p.id };
}

function pay(context, valor, key) {
  const operation = context.api.post(`/api/contratos/${context.c.id}/pagamentos`);
  if (key) operation.set('Idempotency-Key', key);
  return operation.send({ parcela_id: context.parcela, valor, data_pagamento: '2026-10-20', forma_pagamento: 'PIX' });
}

test('estorno preserva lançamento e histórico e atualiza saldos, agenda e notificações', async () => {
  const context = await scenario();
  const { api, c, owner, parcela } = context;
  await api.patch(`/api/notificacoes/parcela-${parcela}/leitura`).expect(200);
  const payment = await pay(context, 100).expect(201);
  const id = payment.body.pagamento.id;
  const reversed = await api.post(`/api/pagamentos/${id}/estorno`).send({ motivo: 'Pagamento lançado para a parcela errada' }).expect(200);
  expect(reversed.body.pagamento).toMatchObject({ id, valor: 100, data_pagamento: '2026-10-20', status: 'ESTORNADO', estornado_por: owner.id });
  expect(reversed.body.pagamento.estornado_em).toBeTruthy();
  expect(reversed.body.parcela).toMatchObject({ pago: 0, quitada: false });
  const [[original]] = await db.query('SELECT valor,data_pagamento,motivo_estorno FROM pagamentos WHERE id=?', [id]);
  expect(Number(original.valor)).toBe(100);
  expect(original.data_pagamento).toBe('2026-10-20');
  expect(original.motivo_estorno).toContain('parcela errada');
  const detail = await api.get(`/api/contratos/${c.id}`).expect(200);
  expect(detail.body.financeiro).toMatchObject({ recebido: 0, pendente: 100 });
  const contracts = await api.get('/api/contratos').expect(200);
  expect(Number(contracts.body.data[0].recebido)).toBe(0);
  const installments = await api.get(`/api/contratos/${c.id}/parcelas`).expect(200);
  expect(Number(installments.body.data[0].pago)).toBe(0);
  expect(installments.body.data[0].situacao).toBe('VENCIDA');
  const receivables = await api.get('/api/recebiveis').expect(200);
  expect(receivables.body.resumo).toMatchObject({ recebido: 0, pendente: 100, atrasado: 100 });
  const dashboard = await api.get('/api/dashboard').expect(200);
  expect(dashboard.body).toMatchObject({ recebido: 0, pendente: 100 });
  const notifications = await api.get('/api/notificacoes').expect(200);
  expect(notifications.body.resumo).toEqual({ total: 1, nao_lidas: 1, lidas: 0 });
  const calendar = await api.get('/api/calendario?de=2026-01-01&ate=2026-12-31&tipo=PAGAMENTO').expect(200);
  expect(calendar.body.data).toEqual([]);
  const due = await api.get('/api/calendario?de=2020-01-01&ate=2020-12-31&tipo=VENCIMENTO').expect(200);
  expect(due.body.data.map(row => row.parcela_id)).toContain(parcela);
  expect((await api.get('/api/pagamentos').expect(200)).body.data).toEqual([]);
  const audit = await api.get('/api/pagamentos?status=ESTORNADO').expect(200);
  expect(audit.body.data[0]).toMatchObject({ id, status: 'ESTORNADO', estornado_por: owner.id });
  const history = await api.get(`/api/contratos/${c.id}/historico`).expect(200);
  expect(history.body.some(row => row.acao === 'PAGAMENTO')).toBe(true);
  expect(history.body.filter(row => row.acao === 'ESTORNO')).toHaveLength(1);
});

test('reenvio do pagamento estornado não o recria e relatórios exportam só recebimentos confirmados', async () => {
  const context = await scenario();
  const original = await pay(context, 30, 'pagamento-original-001').expect(201);
  await pay(context, 40).expect(201);
  await context.api.post(`/api/pagamentos/${original.body.pagamento.id}/estorno`).send({ motivo: 'Registro duplicado por engano' }).expect(200);
  const replay = await pay(context, 30, 'pagamento-original-001').expect(201);
  expect(replay.headers['idempotency-replayed']).toBe('true');
  expect(replay.body.pagamento.id).toBe(original.body.pagamento.id);
  await pay(context, 60).expect(201);
  const detail = await context.api.get(`/api/contratos/${context.c.id}`).expect(200);
  expect(detail.body.financeiro).toMatchObject({ recebido: 100, pendente: 0 });
  const report = await context.api.get('/api/relatorios/receitas').expect(200);
  expect(report.body.data).toHaveLength(2);
  expect(report.body.data.reduce((sum, row) => sum + row.valor, 0)).toBe(100);
  const financial = await context.api.get('/api/relatorios/financeiro').expect(200);
  expect(financial.body.data[0].recebido).toBe(100);
  const csv = await context.api.get('/api/relatorios/receitas?formato=CSV').expect(200);
  expect(csv.text.split(/\r?\n/).filter(Boolean)).toHaveLength(3);
  const xlsx = await context.api.get('/api/relatorios/receitas?formato=XLSX').buffer(true).parse((res, callback) => {
    const chunks = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => callback(null, Buffer.concat(chunks)));
  }).expect(200);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(xlsx.body);
  expect(workbook.worksheets[0].rowCount).toBe(3);
  expect(workbook.worksheets[0].getColumn(6).values.slice(2).reduce((sum, value) => sum + value, 0)).toBe(100);
  const all = await context.api.get('/api/pagamentos?status=TODOS').expect(200);
  expect(all.body.data).toHaveLength(3);
});

test('estornos concorrentes produzem uma única alteração e um único evento', async () => {
  const context = await scenario();
  const payment = await pay(context, 100).expect(201);
  const replies = await Promise.all(Array.from({ length: 6 }, () => context.api.post(`/api/pagamentos/${payment.body.pagamento.id}/estorno`).send({ motivo: 'Solicitação repetida de correção' })));
  expect(replies.filter(row => row.status === 200)).toHaveLength(1);
  expect(replies.filter(row => row.status === 409)).toHaveLength(5);
  const [[history]] = await db.query("SELECT COUNT(*) AS total FROM historico_contratos WHERE acao='ESTORNO'");
  expect(history.total).toBe(1);
});

test('estorno e novos pagamentos concorrentes respeitam os mesmos bloqueios', async () => {
  const context = await scenario(200);
  const original = await pay(context, 60).expect(201);
  const replies = await Promise.all([
    context.api.post(`/api/pagamentos/${original.body.pagamento.id}/estorno`).send({ motivo: 'Correção do primeiro lançamento' }),
    ...Array.from({ length: 4 }, () => pay(context, 20)),
  ]);
  expect(replies.map(row => row.status)).toEqual([200, 201, 201, 201, 201]);
  const detail = await context.api.get(`/api/contratos/${context.c.id}`).expect(200);
  expect(detail.body.financeiro).toMatchObject({ recebido: 80, pendente: 120 });
});

test('exige motivo válido, autenticação e propriedade do pagamento', async () => {
  const context = await scenario();
  const original = await pay(context, 20).expect(201);
  const path = `/api/pagamentos/${original.body.pagamento.id}/estorno`;
  await context.api.post(path).send({ motivo: 'x' }).expect(400);
  await context.api.post(path).send({ motivo: 'x'.repeat(501) }).expect(400);
  const other = await user('outra@example.com');
  await auth(other.token).post(path).send({ motivo: 'Tentativa de outro usuário' }).expect(404);
  await request(app).post(path).send({ motivo: 'Sem autenticação' }).expect(401);
  await context.api.post('/api/pagamentos/invalido/estorno').send({ motivo: 'Motivo válido' }).expect(400);
  await context.api.get('/api/pagamentos?status=INVALIDO').expect(400);
});

test('falha no histórico desfaz o estorno e a alteração da parcela na mesma transação', async () => {
  const context = await scenario();
  const original = await pay(context, 100).expect(201);
  const originalGet = db.getConnection.bind(db);
  const mocked = jest.spyOn(db, 'getConnection').mockImplementation(async () => {
    const conn = await originalGet();
    const execute = conn.execute.bind(conn);
    conn.execute = async (sql, params) => {
      if (sql.startsWith('INSERT INTO historico_contratos')) throw new Error('Falha simulada no histórico');
      return execute(sql, params);
    };
    return conn;
  });
  const logger = jest.spyOn(console, 'error').mockImplementation(() => {});
  try {
    await context.api.post(`/api/pagamentos/${original.body.pagamento.id}/estorno`).send({ motivo: 'Correção que deverá ser desfeita' }).expect(500);
  } finally { mocked.mockRestore(); logger.mockRestore(); }
  const [[payment]] = await db.query('SELECT estornado_em FROM pagamentos WHERE id=?', [original.body.pagamento.id]);
  const [[installment]] = await db.query('SELECT status FROM parcelas WHERE id=?', [context.parcela]);
  expect(payment.estornado_em).toBeNull();
  expect(installment.status).toBe('PAGA');
  const [[history]] = await db.query("SELECT COUNT(*) AS total FROM historico_contratos WHERE acao='ESTORNO'");
  expect(history.total).toBe(0);
});

test('migração atualiza tabela antiga preservando pagamentos e pode ser repetida', async () => {
  const context = await scenario();
  const original = await pay(context, 45).expect(201);
  await db.query('ALTER TABLE pagamentos DROP CHECK chk_pagamento_estorno');
  await db.query('ALTER TABLE pagamentos DROP FOREIGN KEY fk_pagamento_estornado_por');
  await db.query('ALTER TABLE pagamentos DROP COLUMN estornado_em, DROP COLUMN estornado_por, DROP COLUMN motivo_estorno');
  await db.query("DELETE FROM schema_migrations WHERE version='005-payment-reversals.js'");
  const connection = await db.getConnection();
  try {
    const { migrate } = require('../../scripts/migrate');
    await migrate(connection); await migrate(connection);
  } finally { connection.release(); }
  const [[payment]] = await db.query('SELECT valor,data_pagamento,estornado_em FROM pagamentos WHERE id=?', [original.body.pagamento.id]);
  expect(Number(payment.valor)).toBe(45);
  expect(payment.data_pagamento).toBe('2026-10-20');
  expect(payment.estornado_em).toBeNull();
});
