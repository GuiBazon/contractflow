const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadSchemaStatements() {
  const schemaPath = path.join(__dirname, '../database/schema.sql');
  const raw = fs.readFileSync(schemaPath, 'utf8')
    .replace(/--.*$/gm, '')
    .replace(/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+\w+[\s\S]*?;/i, '')
    .replace(/USE\s+\w+\s*;/i, '');
  return raw
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

async function ensureBaseSchema(connection) {
  for (const statement of loadSchemaStatements()) {
    await connection.query(statement);
  }
}

async function migrate(connection) {
  const [[{ acquired }]] = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(),':migrations'),10) AS acquired");
  if (!acquired) throw new Error('Outro processo está aplicando migrações');
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
     version VARCHAR(200) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await ensureBaseSchema(connection);
    const dir = path.join(__dirname, '../database/migrations');
    for (const file of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
      const full = path.join(dir,file);
      const checksum = crypto.createHash('sha256').update(fs.readFileSync(full)).digest('hex');
      const [[saved]] = await connection.query('SELECT checksum FROM schema_migrations WHERE version=?', [file]);
      if (saved) {
        if (saved.checksum !== checksum) throw new Error(`Migração já aplicada foi alterada: ${file}`);
        continue;
      }
      await require(full)(connection);
      await connection.execute('INSERT INTO schema_migrations (version,checksum) VALUES (?,?)', [file,checksum]);
    }
  } finally { await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(),':migrations'))"); }
}

if (require.main === module) {
  require('dotenv').config();
  const db = require('../src/config/db');
  (async () => {
    const conn = await db.getConnection();
    try { await migrate(conn); console.log('Migrações aplicadas.'); }
    finally { conn.release(); }
  })().catch(err => { console.error(err.code || err.message); process.exitCode = 1; }).finally(() => db.end());
}
module.exports = { migrate, loadSchemaStatements };
