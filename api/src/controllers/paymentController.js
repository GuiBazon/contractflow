const db = require('../config/db');
const { recalcSituacaoParcela } = require('../services/financeiroService');
const { registrarHistorico } = require('../services/historicoService');
const { obterContratoDono, bloquearContratoDono } = require('../services/contratoService');
const { isDate, str } = require('../utils/validators');
const { integer,pagination,period } = require('../utils/query');
const { asyncHandler } = require('../utils/http');

async function listPagamentos(req, res) {
  const { contratoId } = req.params;
  integer(contratoId,'Contrato');
  const { page,limit,offset } = pagination({ ...req.query,limit: req.query.limit ?? 50 });
  const { de,ate } = period(req.query);

  const where = ['par.contrato_id = ?', 'cl.usuario_id = ?'];
  const params = [contratoId, req.user.id];

  if (de && isDate(de)) {
    where.push('pg.data_pagamento >= ?');
    params.push(de);
  }
  if (ate && isDate(ate)) {
    where.push('pg.data_pagamento <= ?');
    params.push(ate);
  }

  const whereSql = where.join(' AND ');

  try {
    const contrato = await obterContratoDono(contratoId, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM pagamentos pg
       JOIN parcelas par ON par.id = pg.parcela_id
       JOIN contratos c ON c.id = par.contrato_id
       JOIN clientes cl ON cl.id = c.cliente_id
       WHERE ${whereSql}`,
      params
    );

    const [rows] = await db.execute(
      `SELECT
         pg.id, pg.valor, pg.data_pagamento, pg.forma_pagamento, pg.observacoes,
         pg.created_at, par.numero AS parcela_numero, par.id AS parcela_id,
         par.data_vencimento AS parcela_vencimento
       FROM pagamentos pg
       JOIN parcelas par ON par.id = pg.parcela_id
       JOIN contratos c ON c.id = par.contrato_id
       JOIN clientes cl ON cl.id = c.cliente_id
       WHERE ${whereSql}
       ORDER BY pg.data_pagamento DESC, pg.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      data: rows,
      paginacao: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('erro ao listar pagamentos:', error);
    return res.status(500).json({ message: 'Erro ao listar pagamentos' });
  }
}

async function createPagamento(req, res) {
  const { integer, money } = require('../utils/query');
  const { HttpError } = require('../utils/http');
  const { contratoId } = req.params;
  const data_pagamento = str(req.body.data_pagamento);
  const forma_pagamento = str(req.body.forma_pagamento) || null;
  let conn;
  try {
    const parcelaId = integer(req.body.parcela_id, 'Parcela');
    const valor = money(req.body.valor, 'Valor do pagamento');
    if (!isDate(data_pagamento)) throw new HttpError(400, 'Data do pagamento inválida');
    const contrato = await obterContratoDono(contratoId, req.user.id);
    if (!contrato) throw new HttpError(404, 'Contrato não encontrado');
    conn = await db.getConnection();
    await conn.beginTransaction();
    await bloquearContratoDono(conn, contratoId, req.user.id);
    // O contrato vem primeiro; o lock da parcela protege seu saldo.
    const [parcelas] = await conn.execute(
      'SELECT * FROM parcelas WHERE id = ? AND contrato_id = ? FOR UPDATE',
      [parcelaId, contratoId]
    );
    if (parcelas.length === 0) throw new HttpError(404, 'Parcela não encontrada neste contrato');
    const parcela = parcelas[0];
    if (parcela.status === 'CANCELADA') throw new HttpError(400, 'Parcela cancelada não aceita pagamentos');
    const [[{ totalPago }]] = await conn.query(
      'SELECT COALESCE(SUM(valor),0) AS totalPago FROM pagamentos WHERE parcela_id = ?', [parcelaId]
    );
    const restante = Math.round(Number(parcela.valor) * 100) - Math.round(Number(totalPago) * 100);
    if (Math.round(valor * 100) > restante) throw new HttpError(400, `Pagamento excede o valor da parcela (restam R$ ${(restante / 100).toFixed(2)})`);
    const [result] = await conn.execute(
      `INSERT INTO pagamentos (parcela_id, valor, data_pagamento, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?)`,
      [parcelaId, valor, data_pagamento, forma_pagamento, req.body.observacoes ? String(req.body.observacoes) : null]
    );
    await recalcSituacaoParcela(conn, parcelaId);
    await registrarHistorico(conn, {
      contratoId: Number(contratoId), usuarioId: req.user.id, acao: 'PAGAMENTO',
      descricao: `Pagamento de R$ ${valor.toFixed(2)} registrado na parcela ${parcela.numero} em ${data_pagamento}`,
    });
    const [[novoTotal]] = await conn.query('SELECT COALESCE(SUM(valor),0) AS pago FROM pagamentos WHERE parcela_id = ?', [parcelaId]);
    await conn.commit();
    return res.status(201).json({
      message: 'Pagamento registrado com sucesso',
      pagamento: { id: result.insertId, parcela_id: parcelaId, valor, data_pagamento, forma_pagamento },
      parcela: { id: parcelaId, pago: Number(novoTotal.pago), valor: Number(parcela.valor), quitada: Number(novoTotal.pago) >= Number(parcela.valor) },
    });
  } catch (error) {
    if (conn) await conn.rollback();
    const status = error.status || 500;
    if (status >= 500) console.error('erro ao registrar pagamento:', error);
    return res.status(status).json({ message: status >= 500 ? 'Erro ao registrar pagamento' : error.message });
  } finally {
    if (conn) conn.release();
  }
}

// TODOS os pagamentos do usuario (RF26 receitas / RF24 recebiveis) com filtros
async function listAllPagamentos(req, res) {
  const { page,limit,offset } = pagination({ ...req.query,limit: req.query.limit ?? 50 });
  const { de,ate } = period(req.query);
  const clienteId = integer(req.query.cliente,'Cliente',{ optional: true });
  const contratoId = integer(req.query.contrato,'Contrato',{ optional: true });

  const where = ['cl.usuario_id = ?'];
  const params = [req.user.id];

  if (contratoId) {
    where.push('c.id = ?');
    params.push(contratoId);
  }

  if (de && isDate(de)) {
    where.push('pg.data_pagamento >= ?');
    params.push(de);
  }
  if (ate && isDate(ate)) {
    where.push('pg.data_pagamento <= ?');
    params.push(ate);
  }
  if (clienteId) {
    where.push('cl.id = ?');
    params.push(clienteId);
  }

  const whereSql = where.join(' AND ');

  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM pagamentos pg
       JOIN parcelas par ON par.id = pg.parcela_id
       JOIN contratos c ON c.id = par.contrato_id
       JOIN clientes cl ON cl.id = c.cliente_id
       WHERE ${whereSql}`,
      params
    );

    const [rows] = await db.execute(
      `SELECT
         pg.id, pg.valor, pg.data_pagamento, pg.forma_pagamento, pg.observacoes,
         c.id AS contrato_id, c.numero AS contrato_numero,
         cl.id AS cliente_id, cl.nome_razao_social AS cliente_nome,
         par.numero AS parcela_numero
       FROM pagamentos pg
       JOIN parcelas par ON par.id = pg.parcela_id
       JOIN contratos c ON c.id = par.contrato_id
       JOIN clientes cl ON cl.id = c.cliente_id
       WHERE ${whereSql}
       ORDER BY pg.data_pagamento DESC, pg.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      data: rows,
      paginacao: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('erro ao listar todos os pagamentos:', error);
    return res.status(500).json({ message: 'Erro ao listar pagamentos' });
  }
}

module.exports = { listPagamentos: asyncHandler(listPagamentos),createPagamento: asyncHandler(createPagamento),listAllPagamentos: asyncHandler(listAllPagamentos) };
