const os = require('os');
const path = require('path');
const fs = require('fs');

const name = process.env.CF_TEST_DB_NAME || 'contractflow_test';
if (!/^contractflow_test(?:_[a-z0-9]+)?$/.test(name)) {
  throw new Error('Os testes reais só aceitam um banco contractflow_test ou contractflow_test_<sufixo>.');
}
process.env.DB_HOST = process.env.CF_TEST_DB_HOST || '127.0.0.1';
process.env.DB_PORT = process.env.CF_TEST_DB_PORT || '3307';
process.env.DB_USER = process.env.CF_TEST_DB_USER || 'contractflow_test';
process.env.DB_PASSWORD = process.env.CF_TEST_DB_PASSWORD || 'contractflow_test';
process.env.DB_NAME = name;
process.env.JWT_SECRET = 'segredo-exclusivo-dos-testes-mysql-contractflow';
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'contractflow-test-uploads-'));
process.env.CORS_ORIGINS = '';
process.env.TZ = 'UTC';
