const fs = require('fs/promises');
const path = require('path');
const { initialize, clean, close, user, auth, db } = require('./helpers');
beforeAll(initialize);
beforeEach(clean);
afterAll(close);
const fixture = name => path.join(__dirname, '../fixtures', name);
const reviewed = { cliente_novo: { nome_razao_social: 'Empresa Exemplo', cpf_cnpj: '11222333000181' }, numero: 'IMPORTADO-001', valor_total: 1000, quantidade_parcelas: 2, data_inicio: '2027-01-10' };

test.each(['contrato-texto.pdf','contrato.png','contrato-escaneado.pdf'])('extrai informações de arquivo real: %s', async name => {
  const dono = await user();
  const { body } = await auth(dono.token).post('/api/ocr/extract').attach('arquivo', fixture(name)).expect(201);
  expect(body.dados.valor_total).toBe(1000);
  expect(body.dados.quantidade_parcelas).toBe(2);
  expect(body.dados.numero).toBe('OCR-DEMO-001');
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM contratos');
  expect(total).toBe(0);
}, 60000);

test('revisão e confirmações concorrentes criam um único contrato com documento e histórico', async () => {
  const dono = await user(); const api = auth(dono.token);
  const { body: extraction } = await api.post('/api/ocr/extract').attach('arquivo', fixture('contrato-texto.pdf')).expect(201);
  await api.patch(`/api/ocr/${extraction.extracao_id}`).send({ dados: reviewed }).expect(200);
  const responses = await Promise.all([1,2].map(() => api.post(`/api/ocr/${extraction.extracao_id}/confirmar`).send({ dados: reviewed })));
  expect(responses.map(r => r.status).sort()).toEqual([201,409]);
  const [[counts]] = await db.query('SELECT (SELECT COUNT(*) FROM clientes) AS clientes,(SELECT COUNT(*) FROM contratos) AS contratos,(SELECT COUNT(*) FROM parcelas) AS parcelas,(SELECT COUNT(*) FROM documentos) AS documentos');
  expect(counts).toMatchObject({ clientes: 1, contratos: 1, parcelas: 2, documentos: 1 });
  const id = responses.find(r => r.status === 201).body.contrato_id;
  const { body: documents } = await api.get(`/api/contratos/${id}/documentos`).expect(200);
  expect(documents.data[0].tipo).toBe('ORIGINAL');
  await api.get(`/api/contratos/${id}/documentos/${documents.data[0].id}/arquivo`).expect(200);
  await api.delete(`/api/contratos/${id}/documentos/${documents.data[0].id}`).expect(400);
  const { body } = await api.get(`/api/ocr/${extraction.extracao_id}`).expect(200);
  expect(body.status).toBe('CONFIRMADA');
  const { body: history } = await api.get(`/api/contratos/${id}/historico`).expect(200);
  expect(history.map(h => h.acao).sort()).toEqual(['CRIADO','DOCUMENTO']);
});

test('falha após criar contrato reverte cliente/parcelas/histórico e mantém extração pendente', async () => {
  const dono = await user(); const api = auth(dono.token);
  const { body } = await api.post('/api/ocr/extract').attach('arquivo', fixture('contrato-texto.pdf')).expect(201);
  const [[row]] = await db.query('SELECT nome_arquivo FROM extracao_ocr WHERE id=?', [body.extracao_id]);
  await fs.unlink(path.join(process.env.UPLOAD_DIR,'ocr',row.nome_arquivo));
  await api.post(`/api/ocr/${body.extracao_id}/confirmar`).send({ dados: reviewed }).expect(409);
  for (const table of ['clientes','contratos','parcelas','documentos','historico_contratos']) {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM ${table}`);
    expect(total).toBe(0);
  }
  const { body: pending } = await api.get(`/api/ocr/${body.extracao_id}`).expect(200);
  expect(pending.status).toBe('PENDENTE');
});

test('extrações são isoladas e arquivos inválidos não ficam no banco', async () => {
  const dono = await user(); const outro = await user('outro@example.com');
  const api = auth(dono.token);
  const { body } = await api.post('/api/ocr/extract').attach('arquivo', fixture('contrato-texto.pdf')).expect(201);
  const other = auth(outro.token);
  await other.get(`/api/ocr/${body.extracao_id}`).expect(404);
  await other.patch(`/api/ocr/${body.extracao_id}`).send({ dados: reviewed }).expect(404);
  await other.post(`/api/ocr/${body.extracao_id}/confirmar`).send({ dados: reviewed }).expect(404);
  await api.post('/api/ocr/extract').attach('arquivo', Buffer.from('nao e pdf'), 'falso.pdf').expect(400);
  await api.delete(`/api/ocr/${body.extracao_id}`).expect(200);
  await api.post(`/api/ocr/${body.extracao_id}/confirmar`).send({ dados: reviewed }).expect(409);
});
