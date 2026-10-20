const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { initialize, clean, close, user, auth, contract } = require('./helpers');
const specification = require('../../src/docs/openapi');

// OpenAPI 3.0 usa limites exclusivos booleanos; AJV usa JSON Schema Draft 7.
function jsonSchema(value) {
  if (Array.isArray(value)) return value.map(jsonSchema);
  if (!value || typeof value !== 'object') return value;
  const result = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, jsonSchema(child)]));
  for (const bound of ['Minimum', 'Maximum']) {
    const key = `exclusive${bound}`;
    const inclusive = bound.toLowerCase();
    if (result[key] === true) { result[key] = result[inclusive]; delete result[inclusive]; }
    if (result[key] === false) delete result[key];
  }
  return result;
}

const base = 'https://contractflow.test/openapi.json';
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ ...jsonSchema(JSON.parse(JSON.stringify(specification))), $id: base });
const pointer = value => String(value).replace(/~/g, '~0').replace(/\//g, '~1');
let api, c, clientId, expenseId;

beforeAll(async () => {
  await initialize(); await clean();
  const owner = await user(); api = auth(owner.token);
  c = await contract(owner.token, { valor_total: 100, quantidade_parcelas: 2 });
  clientId = c.cliente_id;
  const installments = await api.get(`/api/contratos/${c.id}/parcelas`).expect(200);
  await api.post(`/api/contratos/${c.id}/pagamentos`).send({ parcela_id: installments.body.data[0].id, valor: 20, data_pagamento: '2026-10-20' }).expect(201);
  const expense = await api.post('/api/despesas').send({ descricao: 'Despesa sem campos opcionais', valor: 10, data: '2026-10-20' }).expect(201);
  expenseId = expense.body.despesa.id;
  await api.post(`/api/contratos/${c.id}/documentos`).field('tipo', 'ANEXO').attach('arquivo', path.join(__dirname, '../fixtures/contrato-texto.pdf')).expect(201);
});
afterAll(async () => { await clean(); await close(); });

test.each([
  ['get', '/auth/me', () => '/auth/me'],
  ['get', '/clientes', () => '/clientes'],
  ['get', '/clientes/{id}', () => `/clientes/${clientId}`],
  ['get', '/contratos', () => '/contratos'],
  ['get', '/contratos/{contratoId}', () => `/contratos/${c.id}`],
  ['get', '/contratos/{contratoId}/parcelas', () => `/contratos/${c.id}/parcelas`],
  ['get', '/contratos/{contratoId}/pagamentos', () => `/contratos/${c.id}/pagamentos`],
  ['get', '/contratos/{contratoId}/historico', () => `/contratos/${c.id}/historico`],
  ['get', '/despesas', () => '/despesas'],
  ['get', '/despesas/{id}', () => `/despesas/${expenseId}`],
  ['get', '/dashboard', () => '/dashboard'],
  ['get', '/notificacoes', () => '/notificacoes'],
  ['get', '/notificacoes/resumo', () => '/notificacoes/resumo'],
  ['get', '/contratos/{contratoId}/documentos', () => `/contratos/${c.id}/documentos`],
  ['get', '/recebiveis', () => '/recebiveis'],
  ['get', '/calendario', () => '/calendario?de=2026-01-01&ate=2026-12-31'],
  ['get', '/relatorios/{tipo}', () => '/relatorios/receitas'],
  ['post', '/calculadora/parcelas', () => '/calculadora/parcelas', { valor_total: 100, quantidade_parcelas: 3, data_inicio: '2026-10-20' }],
  ['post', '/calculadora/saldo', () => '/calculadora/saldo', { valor: 100, valor_pago: 20 }],
  ['post', '/calculadora/projecao', () => '/calculadora/projecao', { recebido: 100, despesas_pagas: 30 }],
])('%s %s responde conforme o contrato publicado', async (method, documentedPath, address, body = null) => {
  const operation = api[method]('/api' + address());
  if (body) operation.send(body);
  const response = await operation.expect(200);
  const fragment = ['paths', documentedPath, method, 'responses', '200', 'content', 'application/json', 'schema'].map(pointer).join('/');
  const validate = ajv.compile({ $ref: `${base}#/${fragment}` });
  if (!validate(response.body)) throw new Error(`${documentedPath}: ${ajv.errorsText(validate.errors)}`);
});
