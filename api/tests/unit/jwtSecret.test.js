const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { validJwtSecret } = require('../../src/utils/jwtSecret');

test('valida mínimo em bytes e rejeita placeholders sem presumir entropia', () => {
  expect(validJwtSecret('curto')).toBe(false);
  expect(validJwtSecret(' '.repeat(32))).toBe(false);
  expect(validJwtSecret('troque-por-um-segredo-longo-e-aleatorio')).toBe(false);
  expect(validJwtSecret('á'.repeat(15))).toBe(false);
  expect(validJwtSecret('á'.repeat(16))).toBe(true);
  expect(validJwtSecret(require('crypto').randomBytes(32).toString('hex'))).toBe(true);
});

test('o servidor recusa segredo curto antes de aceitar requisições sem expor seu valor', () => {
  const uploads = fs.mkdtempSync(path.join(os.tmpdir(), 'contractflow-secret-test-'));
  try {
    const secret = 'exemplo-curto-para-teste';
    const result = spawnSync(process.execPath, ['src/server.js'], {
      cwd: path.join(__dirname, '../..'),
      env: { ...process.env, DB_HOST: '127.0.0.1', DB_USER: 'teste', DB_PASSWORD: 'teste', DB_NAME: 'contractflow_test', JWT_SECRET: secret, UPLOAD_DIR: uploads },
      encoding: 'utf8', timeout: 10000,
    });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('JWT_SECRET deve ter pelo menos 32 bytes');
    expect(result.stderr).not.toContain(secret);
  } finally { fs.rmSync(uploads, { recursive: true, force: true }); }
});
