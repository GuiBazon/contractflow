const PDFDocument = require('pdfkit');
const { initialize, clean, close, user, auth, db } = require('./helpers');

beforeAll(initialize);
beforeEach(clean);
afterAll(close);

async function partialContractPdf({ includeQuantity = true } = {}) {
  const doc = new PDFDocument();
  const chunks = [];
  const output = new Promise((resolve, reject) => {
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
  doc.text('CONTRATO DE SERVICOS');
  doc.text('Cliente: Empresa Exemplo LTDA');
  doc.text('CPF/CNPJ: 11.222.333/0001-81');
  doc.text('Numero: PARCIAL-001');
  doc.text('Valor total: R$ 900,00');
  if (includeQuantity) doc.text('Pagamento em 3 x de R$ 300,00');
  doc.text('Vencimento 10/01/2027');
  doc.text('Vencimento 10/02/2027');
  doc.end();
  return output;
}

const dates = ['2027-01-10', '2027-02-10'];
const client = { nome_razao_social: 'Empresa Exemplo', cpf_cnpj: '11222333000181' };
const base = { cliente_novo: client, numero: 'PARCIAL-001', valor_total: 900, data_inicio: dates[0] };

async function extract(api, options) {
  return (await api.post('/api/ocr/extract')
    .attach('arquivo', await partialContractPdf(options), { filename: 'parcial.pdf', contentType: 'application/pdf' })
    .expect(201)).body;
}

test('OCR parcial permanece em revisão até confirmar datas completas escolhidas pelo usuário', async () => {
  const owner = await user(); const api = auth(owner.token);
  const extraction = await extract(api);
  const url = `/api/ocr/${extraction.extracao_id}`;
  expect(extraction.dados).toMatchObject({ quantidade_parcelas: 3, vencimentos: dates });
  expect(extraction.aviso).toMatch(/revise.*cada parcela/i);

  // Uma confirmação não salva nem cria cliente/contrato enquanto a lista for parcial.
  const partial = await api.post(`${url}/confirmar`).send({ dados: { ...base, quantidade_parcelas: 3, vencimentos: dates } }).expect(400);
  expect(partial.body.message).toMatch(/2 data\(s\).*3 parcela\(s\).*revise/i);
  for (const table of ['clientes', 'contratos', 'parcelas', 'documentos']) {
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM ${table}`);
    expect(total).toBe(0);
  }
  const initial = (await api.get(url).expect(200)).body;
  expect(initial).toMatchObject({ status: 'PENDENTE', dados: { quantidade_parcelas: 3, vencimentos: dates, numero: 'PARCIAL-001' } });

  // O front pode salvar outras alterações sem eliminar o parcelamento reconhecido.
  const reviewed = await api.patch(url).send({ dados: { descricao: 'Em revisão' } }).expect(200);
  expect(reviewed.body.dados).toMatchObject({ quantidade_parcelas: 3, vencimentos: dates, descricao: 'Em revisão', numero: 'PARCIAL-001', valor_total: 900, cliente_nome: 'Empresa Exemplo LTDA', cpf_cnpj: '11.222.333/0001-81' });
  for (const cleared of [null, []]) {
    const attempt = await api.patch(url).send({ dados: { ...base, quantidade_parcelas: 3, vencimentos: cleared } }).expect(400);
    expect(attempt.body.message).toMatch(/revise os vencimentos/i);
    await api.post(`${url}/confirmar`).send({ dados: { ...base, quantidade_parcelas: 3, vencimentos: cleared } }).expect(400);
  }
  const omitted = await api.post(`${url}/confirmar`).send({ dados: base }).expect(400);
  expect(omitted.body.message).toMatch(/revise.*cada parcela/i);
  const pending = (await api.get(url).expect(200)).body;
  expect(pending).toMatchObject({ status: 'PENDENTE', dados: { quantidade_parcelas: 3, vencimentos: dates, descricao: 'Em revisão' } });

  const complete = [...dates, '2027-04-15']; // data fornecida pelo usuário, não gerada pelo servidor
  await api.patch(url).send({ dados: { ...base, quantidade_parcelas: 3, vencimentos: complete } }).expect(200);
  const result = await api.post(`${url}/confirmar`).send({ dados: base }).expect(201);
  const installments = (await api.get(`/api/contratos/${result.body.contrato_id}/parcelas`).expect(200)).body.data;
  expect(installments.map(p => p.data_vencimento)).toEqual(complete);
  expect((await api.get(url).expect(200)).body.status).toBe('CONFIRMADA');
});

test('a quantidade pode ser corrigida explicitamente durante a revisão', async () => {
  const owner = await user(); const api = auth(owner.token);
  const extraction = await extract(api);
  const url = `/api/ocr/${extraction.extracao_id}`;
  const revised = await api.patch(url).send({ dados: { ...base, quantidade_parcelas: 2 } }).expect(200);
  expect(revised.body.dados).toMatchObject({ quantidade_parcelas: 2, vencimentos: dates });
  const result = await api.post(`${url}/confirmar`).send({ dados: base }).expect(201);
  const installments = (await api.get(`/api/contratos/${result.body.contrato_id}/parcelas`).expect(200)).body.data;
  expect(installments.map(p => p.data_vencimento)).toEqual(dates);
});

test('datas sem quantidade reconhecida exigem informação explícita antes de confirmar', async () => {
  const owner = await user(); const api = auth(owner.token);
  const extraction = await extract(api, { includeQuantity: false });
  const url = `/api/ocr/${extraction.extracao_id}`;
  expect(extraction.dados.vencimentos).toEqual(dates);
  expect(extraction.dados.quantidade_parcelas).toBeUndefined();
  expect(extraction.aviso).toMatch(/informe a quantidade.*revise/i);
  const rejected = await api.post(`${url}/confirmar`).send({ dados: base }).expect(400);
  expect(rejected.body.message).toMatch(/informe a quantidade.*revise/i);
  expect((await api.get(url).expect(200)).body).toMatchObject({ status: 'PENDENTE', dados: { vencimentos: dates } });
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM contratos');
  expect(total).toBe(0);
  await api.patch(url).send({ dados: { ...base, quantidade_parcelas: 2 } }).expect(200);
  const result = await api.post(`${url}/confirmar`).send({ dados: base }).expect(201);
  const installments = (await api.get(`/api/contratos/${result.body.contrato_id}/parcelas`).expect(200)).body.data;
  expect(installments.map(p => p.data_vencimento)).toEqual(dates);
});

test('revisão troca a seleção de cliente e confirmação não mescla cliente antigo', async () => {
  const owner = await user(); const api = auth(owner.token);
  const extraction = await extract(api);
  const url = `/api/ocr/${extraction.extracao_id}`;
  const existing = (await api.post('/api/clientes').send({ nome_razao_social: 'Cliente Selecionado', cpf_cnpj: '11144477735' }).expect(201)).body.cliente;
  await api.patch(url).send({ dados: { cliente_novo: client } }).expect(200);
  const selected = (await api.patch(url).send({ dados: { cliente_id: existing.id } }).expect(200)).body.dados;
  expect(selected.cliente_id).toBe(existing.id);
  expect(selected.cliente_novo).toBeUndefined();
  const newlySelected = (await api.patch(url).send({ dados: { cliente_novo: client } }).expect(200)).body.dados;
  expect(newlySelected.cliente_id).toBeUndefined();
  expect(newlySelected.cliente_novo).toEqual(client);
  await api.patch(url).send({ dados: { cliente_id: existing.id, cliente_novo: client } }).expect(400);
  const confirm = { cliente_id: existing.id, numero: 'PARCIAL-001', valor_total: 900, quantidade_parcelas: 3, vencimentos: [...dates, '2027-04-15'] };
  const result = await api.post(`${url}/confirmar`).send({ dados: confirm }).expect(201);
  const contract = (await api.get(`/api/contratos/${result.body.contrato_id}`).expect(200)).body;
  expect(contract.cliente_id).toBe(existing.id);
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM clientes WHERE usuario_id=?', [owner.id]);
  expect(total).toBe(1);
});
