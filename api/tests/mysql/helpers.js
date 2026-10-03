const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const request = require('supertest');
const db = require('../../src/config/db');
const app = require('../../src/app');

async function initialize() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME, multipleStatements: true,
  });
  try {
    const schema = fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8')
      .replace(/CREATE DATABASE IF NOT EXISTS contractflow[\s\S]*?;/, '')
      .replace(/USE contractflow;/, '');
    await connection.query(schema);
    await require('../../scripts/migrate').migrate(connection);
  } finally {
    await connection.end();
  }
}

async function clean() {
  if (!/^contractflow_test(?:_[a-z0-9]+)?$/.test(process.env.DB_NAME)) throw new Error('Banco inseguro');
  for (const table of ['historico_contratos', 'documentos', 'extracao_ocr', 'pagamentos', 'parcelas', 'contratos', 'clientes', 'despesas', 'usuarios']) {
    await db.query(`DELETE FROM ${table}`);
  }
}

async function close() {
  await db.end();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
}

async function user(email = 'dono@example.com') {
  await request(app).post('/api/auth/register').send({ nome: 'Usuario Teste', email, senha: 'senha123' }).expect(201);
  const { body } = await request(app).post('/api/auth/login').send({ email, senha: 'senha123' }).expect(200);
  return { ...body.usuario, token: body.token };
}

function auth(token) {
  return {
    get: url => request(app).get(url).set('Authorization', `Bearer ${token}`),
    post: url => request(app).post(url).set('Authorization', `Bearer ${token}`),
    put: url => request(app).put(url).set('Authorization', `Bearer ${token}`),
    patch: url => request(app).patch(url).set('Authorization', `Bearer ${token}`),
    delete: url => request(app).delete(url).set('Authorization', `Bearer ${token}`),
  };
}

async function contract(token, overrides = {}) {
  const api = auth(token);
  const { body: client } = await api.post('/api/clientes').send({ nome_razao_social: 'Cliente Teste', cpf_cnpj: '11144477735' }).expect(201);
  const { body } = await api.post('/api/contratos').send({
    cliente_id: client.cliente.id, numero: 'TESTE-001', valor_total: 1000,
    quantidade_parcelas: 3, data_inicio: '2026-01-31', ...overrides,
  }).expect(201);
  return body.contrato;
}

module.exports = { initialize, clean, close, user, auth, contract, db, app };
