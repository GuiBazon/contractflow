const request = require('supertest');
const { execFileSync } = require('child_process');
const path = require('path');
const app = require('../../src/app');

test('o documento servido é OpenAPI válido com referências e operações únicas', async () => {
  const response = await request(app).get('/api/openapi.json').expect(200);
  const document = response.body;
  const validation = execFileSync(process.execPath, [path.join(__dirname, '../../scripts/validate-openapi.js'), '--stdin'], {
    input: JSON.stringify(document), encoding: 'utf8',
  });
  expect(validation).toContain('OpenAPI válido');
  expect(document.openapi).toBe('3.0.3');
  expect(document.servers).toEqual([{ url: '/api' }]);
  const operationIds = Object.values(document.paths).flatMap(path => Object.values(path).map(operation => operation.operationId));
  expect(operationIds.length).toBeGreaterThan(60);
  expect(new Set(operationIds).size).toBe(operationIds.length);
});

test('Swagger é servido com assets locais e não libera acesso aos dados protegidos', async () => {
  const page = await request(app).get('/api/docs/').expect(200);
  expect(page.text).toContain('ContractFlow');
  expect(page.text).toContain('swagger-ui-bundle.js');
  const script = await request(app).get('/api/docs/swagger-ui-init.js').expect(200);
  expect(script.text).toContain('persistAuthorization');
  await request(app).get('/api/clientes').expect(401);
});

test('especifica autenticação, arquivos, reenvios e recuperação sem expor configuração SMTP', async () => {
  const { body } = await request(app).get('/api/openapi.json').expect(200);
  expect(body.security).toEqual([{ bearerAuth: [] }]);
  expect(body.paths['/auth/login'].post.security).toEqual([]);
  expect(body.paths['/auth/forgot-password'].post.security).toEqual([]);
  expect(body.paths['/auth/reset-password'].post.security).toEqual([]);
  const payment = body.paths['/contratos/{contratoId}/pagamentos'].post;
  expect(payment.parameters.some(item => item.in === 'header' && item.name === 'Idempotency-Key')).toBe(true);
  expect(body.paths['/ocr/extract'].post.requestBody.content['multipart/form-data']).toBeDefined();
  expect(body.paths['/relatorios/{tipo}'].get.responses['200'].content['text/csv']).toBeDefined();
  expect(body.paths['/notificacoes/{id}/leitura'].patch).toBeDefined();
  expect(body.components.schemas.User.properties.senha_hash).toBeUndefined();
  expect(body.components.schemas.User.properties.token_version).toBeUndefined();
});
