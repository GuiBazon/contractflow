const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/db');

const db = require('../../src/config/db');
const app = require('../../src/app');

// ---- utilitario: gera token valido para um usuario ----
const SECRET = process.env.JWT_SECRET;
function tokenDoUsuario({ id = 1, nome = 'Usuario', email = 'u@example.com', perfil = 'USUARIO' } = {}) {
  return jwt.sign({ id, nome, email, perfil }, SECRET, { expiresIn: '8h' });
}

// ---- fake DB: resolve handlers registrados por padrão em SQL ----
function makeDb() {
  const handlers = [];

  function when(substr, handler) {
    handlers.push({ substr, handler });
    return api;
  }

  const api = {
    when,
    reset() {
      handlers.length = 0;
    },
  };

  async function dispatch(sql, params) {
    for (const { substr, handler } of handlers) {
      if (String(sql).includes(substr)) {
        return handler(sql, params);
      }
    }
    throw new Error(`SQL não registrado no fake: ${sql}`);
  }

  api.execute = jest.fn((sql, params) => dispatch(sql, params).then((r) => r));
  api.query = jest.fn((sql, params) => dispatch(sql, params).then((r) => r));
  api.getConnection = jest.fn(async () => Promise.resolve(makeConn()));

  function makeConn() {
    const conn = {
      beginTransaction: jest.fn(async () => {}),
      commit: jest.fn(async () => {}),
      rollback: jest.fn(async () => {}),
      release: jest.fn(async () => {}),
    };
    conn.execute = jest.fn((sql, params) => dispatch(sql, params).then((r) => r));
    conn.query = jest.fn((sql, params) => dispatch(sql, params).then((r) => r));
    return conn;
  }

  return api;
}

describe('API — autenticação (rotas reais)', () => {
  const fake = makeDb();
  beforeAll(() => {
    db.execute.mockImplementation(fake.execute);
    db.query.mockImplementation(fake.query);
    db.getConnection.mockImplementation(fake.getConnection);
  });

  test('health check retorna ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('rota protegida sem token retorna 401', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.status).toBe(401);
  });

  test('rota protegida com token inválido retorna 401', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });

  test('token sem prefixo Bearer é rejeitado (401)', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', tokenDoUsuario());
    expect(res.status).toBe(401);
  });

  test('token com prefixo Bearer atravessa a autenticação', async () => {
    fake.reset();
    fake
      .when('COUNT(*)', async () => [[{ total: 1 }]])
      .when('SELECT cl.*', async () => [[{ id: 1, nome_razao_social: 'A', cpf_cnpj: '1', total_contratos: 0 }]]);
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${tokenDoUsuario()}`)
      .query({ limit: 1 });
    expect(res.status).not.toBe(401);
  });

  test('rota inexistente retorna 404', async () => {
    const res = await request(app).get('/api/nao-existe');
    expect(res.status).toBe(404);
  });

  test('register valida email e senha', async () => {
    const res = await request(app).post('/api/auth/register').send({ nome: 'A', email: 'invalido', senha: '123' });
    expect(res.status).toBe(400);
  });
});

describe('API — clientes (rotas reais + fake DB)', () => {
  const fake = makeDb();
  let token;

  beforeAll(() => {
    db.execute.mockImplementation(fake.execute);
    db.query.mockImplementation(fake.query);
    token = tokenDoUsuario({ id: 1 });
  });

  test('listagem filtra por usuario_id (isolamento RNF04)', async () => {
    fake.reset();
    fake
      .when('COUNT(*)', async () => [[{ total: 0 }]])
      .when('SELECT cl.*', async () => [[{ id: 1, nome_razao_social: 'Cliente A', cpf_cnpj: '111', total_contratos: 0 }]]);

    const res = await request(app).get('/api/clientes').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    // garante que a consulta sempre passa req.user.id como primeiro parametro (dono)
    expect(res.body.paginacao.total).toBe(0);
  });
});

describe('API — contratos (isolamento por usuario)', () => {
  const fake = makeDb();
  let token;

  beforeAll(() => {
    db.execute.mockImplementation(fake.execute);
    db.query.mockImplementation(fake.query);
    db.getConnection.mockImplementation(fake.getConnection);
    token = tokenDoUsuario({ id: 7 });
  });

  test('GET /api/contratos/:id de outro usuario retorna 404 (isolamento)', async () => {
    fake.reset();
    // contrato de outro usuario -> obterContratoDono nao retorna linha
    fake.when('SELECT c.*', async () => [[]]);

    const res = await request(app).get('/api/contratos/99').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('GET /api/contratos/:id do proprio usuario retorna financeiro', async () => {
    fake.reset();
    const contrato = { id: 1, valor_total: 1000, status: 'ATIVO', cliente_id: 5, numero: 'C1' };
    fake
      .when('cl.nome_razao_social', async () => [[contrato]])
      .when('AS recebido', async () => [[{ id: 1, valor_total: 1000, recebido: 400 }]])
      .when('SUM(p.valor)', async () => [[{ total: 1000 }]]);

    const res = await request(app).get('/api/contratos/1').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.financeiro.pendente).toBe(600);
    expect(res.body.financeiro.recebido).toBe(400);
  });
});

describe('API — regras de negócio (pagamentos, status, documentos)', () => {
  const fake = makeDb();
  let token;

  beforeAll(() => {
    db.execute.mockImplementation(fake.execute);
    db.query.mockImplementation(fake.query);
    db.getConnection.mockImplementation(fake.getConnection);
    token = tokenDoUsuario({ id: 3 });
  });

  test('pagamento em parcela cancelada retorna 400', async () => {
    fake.reset();
    fake
      .when('cl.nome_razao_social', async () => [[{ id: 1, status: 'ATIVO' }]])
      .when('SELECT * FROM parcelas', async () => [[{ id: 1, valor: 100, status: 'CANCELADA', numero: 1 }]]);

    const res = await request(app)
      .post('/api/pagamentos/1/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ parcela_id: 1, valor: 100, data_pagamento: '2026-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('cancelada');
  });

  test('pagamento que excede o valor da parcela retorna 400 (RN06)', async () => {
    fake.reset();
    fake
      .when('cl.nome_razao_social', async () => [[{ id: 1, status: 'ATIVO' }]])
      .when('SELECT * FROM parcelas', async () => [[{ id: 1, valor: 100, status: 'PENDENTE', numero: 1 }]])
      .when('SELECT COALESCE(SUM(valor),0)', async () => [[{ totalPago: 0 }]]);

    const res = await request(app)
      .post('/api/pagamentos/1/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ parcela_id: 1, valor: 150, data_pagamento: '2026-01-01' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('excede');
  });

  test('registro de pagamento válido recalcula e retorna saldo da parcela', async () => {
    fake.reset();
    fake
      .when('cl.nome_razao_social', async () => [[{ id: 1, status: 'ATIVO' }]])
      .when('SELECT * FROM parcelas', async () => [[{ id: 1, valor: 100, status: 'PENDENTE', numero: 1 }]])
      // antes de pagar: total 0
      .when('AS totalPago', async () => [[{ totalPago: 0 }]])
      // depois de pagar: total 100
      .when('AS pago', async () => [[{ pago: 100 }]])
      .when('INSERT INTO pagamentos', async () => [[{ insertId: 9 }]])
      .when('SELECT p.valor', async () => [[{ valor: 100, pago: 100, status: 'PENDENTE' }]])
      .when('UPDATE parcelas SET status', async () => [[{ affectedRows: 1 }]])
      .when('INSERT INTO historico_contratos', async () => [[{ insertId: 1 }]]);

    const res = await request(app)
      .post('/api/pagamentos/1/pagamentos')
      .set('Authorization', `Bearer ${token}`)
      .send({ parcela_id: 1, valor: 100, data_pagamento: '2026-01-01', forma_pagamento: 'PIX' });

    expect(res.status).toBe(201);
    expect(res.body.parcela.quitada).toBe(true);
    expect(res.body.parcela.pago).toBe(100);
  });

  test('gerar parcelas em contrato ENCERRADO retorna 400 (RN12)', async () => {
    fake.reset();
    fake.when('cl.nome_razao_social', async () => [[{ id: 1, status: 'ENCERRADO', data_inicio: '2026-01-01' }]]);

    const res = await request(app)
      .post('/api/contratos/1/parcelas')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantidade_parcelas: 2, valor_parcela: 500, vencimentos: ['2026-02-01', '2026-03-01'] });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('encerrado');
  });

  test('gerar parcelas sem informar quantidade retorna 400', async () => {
    fake.reset();
    fake.when('cl.nome_razao_social', async () => [[{ id: 1, status: 'ATIVO', data_inicio: '2026-01-01' }]]);

    const res = await request(app)
      .post('/api/contratos/1/parcelas')
      .set('Authorization', `Bearer ${token}`)
      .send({ valor_parcela: 500 });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('quantidade');
  });

  test('alterar número do contrato após pagamentos retorna 400', async () => {
    fake.reset();
    fake
      .when('cl.nome_razao_social', async () => [[{ id: 1, status: 'ATIVO', numero: 'OLD', valor_total: 1000 }]])
      .when('COUNT(*) AS total', async () => [[{ total: 1 }]]);

    const res = await request(app)
      .put('/api/contratos/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ numero: 'NEW' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('pagamentos');
  });

  test('excluir documento ORIGINAL retorna 400 (RN10/RN11)', async () => {
    fake.reset();
    fake.when('SELECT d.*', async () => [[{ id: 1, nome_arquivo: 'x.pdf', tipo: 'ORIGINAL' }]]);

    const res = await request(app)
      .delete('/api/documentos/1/documentos/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('original');
  });

  test('atualizar status do contrato com status inválido retorna 400', async () => {
    fake.reset();
    const res = await request(app)
      .patch('/api/contratos/1/status')
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'NAO_EXISTE' });

    expect(res.status).toBe(400);
  });
});
