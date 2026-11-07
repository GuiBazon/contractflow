const pdfParse = require('pdf-parse/lib/pdf-parse');
// pdf.js antigo exige cópia sem offset do pool de Buffers do Node.
const pdfText = async buffer => (await pdfParse(new Uint8Array(buffer))).text;
const { initialize, clean, close, user, auth, db } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

const binary = (res, callback) => {
  const parts = [];
  res.on('data', chunk => parts.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(parts)));
  res.on('error', callback);
};

test('PDF respeita filtros e isolamento, inclui todos os dados filtrados e ignora paginação', async () => {
  const dono = await user();
  const api = auth(dono.token);
  await api.post('/api/despesas').send({ descricao: 'Energia São Paulo — €', categoria: 'Contas', valor: 25.5, data: '2026-10-01', status: 'PAGA' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Internet', categoria: 'Contas', valor: 34, data: '2026-10-02', status: 'PAGA' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Fora do período', categoria: 'Contas', valor: 10, data: '2026-09-30', status: 'PAGA' }).expect(201);
  await api.post('/api/despesas').send({ descricao: 'Outra categoria', categoria: 'Viagens', valor: 10, data: '2026-10-02', status: 'PAGA' }).expect(201);
  const outro = await user('outro@example.com');
  await auth(outro.token).post('/api/despesas').send({ descricao: 'Privado', categoria: 'Contas', valor: 10, data: '2026-10-01', status: 'PAGA' }).expect(201);
  const response = await api.get('/api/relatorios/despesas?formato=pdf&de=2026-10-01&ate=2026-10-31&categoria=Contas&status=PAGA&limit=1')
    .buffer(true).parse(binary).expect(200);
  expect(response.headers['content-type']).toMatch(/^application\/pdf/);
  expect(response.headers['access-control-expose-headers']).toContain('Content-Disposition');
  expect(response.headers['content-disposition']).toContain('attachment; filename="contractflow-despesas.pdf"');
  expect(response.body.subarray(0, 5).toString()).toBe('%PDF-');
  const text = await pdfText(response.body);
  expect(text).toContain('Energia São Paulo — €');
  expect(text).toContain('Internet');
  expect(text).toContain('25.5');
  expect(text).toContain('2026-10-01');
  expect(text).not.toContain('Fora do período');
  expect(text).not.toContain('Outra categoria');
  expect(text).not.toContain('Privado');
  await api.get('/api/relatorios/despesas?formato=pdf&de=2026-02-30').expect(400);
  await api.get('/api/relatorios/despesas?formato=pdf&limit=0').expect(400);
  await api.get('/api/relatorios/invalido?formato=pdf').expect(400);
  await api.get('/api/relatorios/despesas?formato=invalido').expect(400);
  await require('supertest')(require('../../src/app')).get('/api/relatorios/despesas?formato=pdf').expect(401);
});

test('PDF vazio identifica colunas e não expõe dados de outro usuário', async () => {
  const dono = await user();
  await auth(dono.token).post('/api/despesas').send({ descricao: 'Confidencial', valor: 10, data: '2026-01-01' }).expect(201);
  const outro = await user('outro@example.com');
  const response = await auth(outro.token).get('/api/relatorios/despesas?formato=PDF').buffer(true).parse(binary).expect(200);
  const text = await pdfText(response.body);
  expect(text).toContain('Nenhum registro encontrado');
  expect(text).toContain('descricao');
  expect(text).not.toContain('Confidencial');
});

test('PDF exporta resumo financeiro', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const summary = await api.get('/api/relatorios/financeiro?formato=pdf').buffer(true).parse(binary).expect(200);
  expect(await pdfText(summary.body)).toContain('saldo_realizado');
});

test('PDF aplica limite de registros', async () => {
  const dono = await user();
  const api = auth(dono.token);
  const values = Array.from({ length: 10001 }, () => [dono.id, 'Despesa de teste', 1, '2026-10-01']);
  await db.query('INSERT INTO despesas (usuario_id, descricao, valor, data) VALUES ?', [values]);
  const response = await api.get('/api/relatorios/despesas?formato=pdf').expect(413);
  expect(response.body.message).toMatch(/10000/);
}, 60000);

test('caracteres sem glifo retornam erro JSON antes de iniciar o download', async () => {
  const dono = await user();
  const api = auth(dono.token);
  await api.post('/api/despesas').send({ descricao: 'Teste 😀', valor: 10, data: '2026-01-01' }).expect(201);
  const response = await api.get('/api/relatorios/despesas?formato=pdf').expect(422);
  expect(response.headers['content-type']).toMatch(/application\/json/);
  expect(response.headers['content-disposition']).toBeUndefined();
  expect(response.body.message).toMatch(/CSV ou XLSX/);
});
