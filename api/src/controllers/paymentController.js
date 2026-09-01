const db = require('../config/db');
const { recalcSituacaoParcela } = require('../services/financeiroService');
const { registrarHistorico } = require('../services/historicoService');
const { obterContratoDono } = require('../services/contratoService');
const { isDate, isDecimal, str } = require('../utils/validators');

async function listPagamentos(req, res) {
  const { contratoId } = req.params;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const de = str(req.query.de);
  const ate = str(req.query.ate);

  const where = ['p.contrato_id = ?', 'cl.usuario_id = ?'];
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
  const { contratoId } = req.params;
  const parcelaId = Number(req.body.parcela_id);
  const valor = Number(req.body.valor);
  const data_pagamento = str(req.body.data_pagamento);
  const forma_pagamento = str(req.body.forma_pagamento) || null;

  if (!parcelaId) {
    return res.status(400).json({ message: 'Parcela é obrigatória' });
  }
  if (!isDecimal(valor) || valor <= 0) {
    return res.status(400).json({ message: 'Valor do pagamento deve ser maior que zero' });
  }
  if (!isDate(data_pagamento)) {
    return res.status(400).json({ message: 'Data do pagamento inválida' });
  }

  try {
    const contrato = await obterContratoDono(contratoId, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const [parcelas] = await db.execute(
      'SELECT * FROM parcelas WHERE id = ? AND contrato_id = ?',
      [parcelaId, contratoId]
    );
    if (parcelas.length === 0) {
      return res.status(404).json({ message: 'Parcela não encontrada neste contrato' });
    }
    const parcela = parcelas[0];

    if (parcela.status === 'CANCELADA') {
      return res.status(400).json({ message: 'Parcela cancelada não aceita pagamentos' });
    }

    const [[{ totalPago }]] = await db.query(
      'SELECT COALESCE(SUM(valor),0) AS totalPago FROM pagamentos WHERE parcela_id = ?',
      [parcelaId]
    );

    if (Number(totalPago) + valor > Number(parcela.valor) + 0.001) {
      return res.status(400).json({
        message: `Pagamento excede o valor da parcela (restam R$ ${(Number(parcela.valor) - Number(totalPago)).toFixed(2)})`,
      });
    }

    const conn = await db.getConnection();
    let pagamentoId;
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO pagamentos (parcela_id, valor, data_pagamento, forma_pagamento, observacoes)
         VALUES (?, ?, ?, ?, ?)`,
        [parcelaId, Number(valor.toFixed(2)), data_pagamento, forma_pagamento, req.body.observacoes ? String(req.body.observacoes) : null]
      );
      pagamentoId = result.insertId;

      await recalcSituacaoParcela(conn, parcelaId);

      await registrarHistorico(conn, {
        contratoId: Number(contratoId),
        usuarioId: req.user.id,
        acao: 'PAGAMENTO',
        descricao: `Pagamento de R$ ${Number(valor).toFixed(2)} registrado na parcela ${parcela.numero} em ${data_pagamento}`,
      });

      await conn.commit();

      const [[novoTotal]] = await conn.query(
        'SELECT COALESCE(SUM(valor),0) AS pago FROM pagamentos WHERE parcela_id = ?',
        [parcelaId]
      );
      return res.status(201).json({
        message: 'Pagamento registrado com sucesso',
        pagamento: { id: pagamentoId, parcela_id: parcelaId, valor, data_pagamento, forma_pagamento },
        parcela: {
          id: parcelaId,
          pago: Number(novoTotal.pago),
          valor: Number(parcela.valor),
          quitada: Number(novoTotal.pago) >= Number(parcela.valor),
        },
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('erro ao registrar pagamento:', error);
    return res.status(500).json({ message: 'Erro ao registrar pagamento' });
  }
}

// TODOS os pagamentos do usuario (RF26 receitas / RF24 recebiveis) com filtros
async function listAllPagamentos(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const de = str(req.query.de);
  const ate = str(req.query.ate);
  const clienteId = Number(req.query.cliente);

  const where = ['cl.usuario_id = ?'];
  const params = [req.user.id];

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

module.exports = { listPagamentos, createPagamento, listAllPagamentos };