const fs = require('fs');
const SwaggerParser = require('@apidevtools/swagger-parser');

async function validate() {
  const document = process.argv.includes('--stdin')
    ? JSON.parse(fs.readFileSync(0, 'utf8')) : require('../src/docs/openapi');
  await SwaggerParser.validate(document);
  const ids = Object.values(document.paths).flatMap(path => Object.values(path).map(operation => operation.operationId));
  if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error('Identificadores de operação ausentes ou duplicados');
  console.log(`OpenAPI válido: ${Object.keys(document.paths).length} caminhos e ${ids.length} operações`);
}

validate().catch(error => { console.error(error.message); process.exitCode = 1; });
