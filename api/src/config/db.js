const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

let colunasChecadas = false;
async function garantirColunasPagamentos() {
  if (colunasChecadas) return;
  try {
    // Verifica e adiciona cada coluna individualmente para ser idempotente.
    // Assim, bancos existentes que nao rodaram schema.sql ganham as colunas sem erro.
    const colunasNecessarias = [
      { nome: 'status',         ddl: "ADD COLUMN status VARCHAR(20) DEFAULT 'CONCLUIDO'" },
      { nome: 'motivo_estorno', ddl: 'ADD COLUMN motivo_estorno TEXT' },
      { nome: 'data_estorno',   ddl: 'ADD COLUMN data_estorno DATETIME' },
    ];
    for (const col of colunasNecessarias) {
      const [rows] = await db.query(`SHOW COLUMNS FROM pagamentos LIKE '${col.nome}'`);
      if (rows.length === 0) {
        await db.query(`ALTER TABLE pagamentos ${col.ddl}`);
      }
    }
    colunasChecadas = true;
  } catch (err) {
    // Se a tabela ainda nao existir ou o banco estiver em setup, nao quebra o boot
    console.warn('garantirColunasPagamentos:', err.message);
  }
}

db.garantirColunasPagamentos = garantirColunasPagamentos;

module.exports = db;
