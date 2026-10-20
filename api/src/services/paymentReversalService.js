const db = require('../config/db');
const { integer } = require('../utils/query');
const { HttpError } = require('../utils/http');
const { bloquearContratoDono } = require('./contratoService');
const { recalcSituacaoParcela } = require('./financeiroService');
const { registrarHistorico } = require('./historicoService');
const notifications = require('./notificationService');

async function reverse(usuarioId, paymentId, reason) {
  const id = integer(paymentId, 'Pagamento');
  if (typeof reason !== 'string' || reason.trim().length < 5 || reason.trim().length > 500) {
    throw new HttpError(400, 'Informe motivo do estorno com 5 a 500 caracteres');
  }
  const motivo = reason.trim();
  const [[owned]] = await db.execute(`SELECT pg.parcela_id,p.contrato_id FROM pagamentos pg
    JOIN parcelas p ON p.id=pg.parcela_id JOIN contratos c ON c.id=p.contrato_id
    WHERE pg.id=? AND c.usuario_id=?`, [id, usuarioId]);
  if (!owned) throw new HttpError(404, 'Pagamento não encontrado');
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    // Mesma ordem das demais escritas financeiras: contrato, parcela, pagamento.
    await bloquearContratoDono(conn, owned.contrato_id, usuarioId);
    const [[parcela]] = await conn.execute('SELECT * FROM parcelas WHERE id=? AND contrato_id=? FOR UPDATE', [owned.parcela_id, owned.contrato_id]);
    if (!parcela) throw new HttpError(404, 'Parcela não encontrada');
    const [[payment]] = await conn.execute('SELECT * FROM pagamentos WHERE id=? AND parcela_id=? FOR UPDATE', [id, parcela.id]);
    if (!payment) throw new HttpError(404, 'Pagamento não encontrado');
    if (payment.estornado_em !== null) throw new HttpError(409, 'Pagamento já estornado');
    await conn.execute(`UPDATE pagamentos SET estornado_em=UTC_TIMESTAMP(),estornado_por=?,motivo_estorno=? WHERE id=?`, [usuarioId, motivo, id]);
    await recalcSituacaoParcela(conn, parcela.id);
    await notifications.resetForInstallment(conn, usuarioId, parcela);
    await registrarHistorico(conn, { contratoId: owned.contrato_id, usuarioId, acao: 'ESTORNO',
      descricao: `Pagamento ${id} de R$ ${Number(payment.valor).toFixed(2)} estornado. Motivo: ${motivo}` });
    const [[updated]] = await conn.execute(`SELECT id,parcela_id,valor,data_pagamento,forma_pagamento,observacoes,
      DATE_FORMAT(estornado_em,'%Y-%m-%dT%H:%i:%sZ') AS estornado_em,
      estornado_por,motivo_estorno FROM pagamentos WHERE id=?`, [id]);
    const [[totals]] = await conn.execute('SELECT COALESCE(SUM(valor),0) AS pago FROM pagamentos WHERE parcela_id=? AND estornado_em IS NULL', [parcela.id]);
    await conn.commit();
    return {
      message: 'Pagamento estornado; registro original preservado',
      pagamento: { ...updated, valor: Number(updated.valor), status: 'ESTORNADO' },
      parcela: { id: parcela.id, valor: Number(parcela.valor), pago: Number(totals.pago), quitada: Number(totals.pago) >= Number(parcela.valor) },
    };
  } catch (error) { await conn.rollback(); throw error; }
  finally { conn.release(); }
}

module.exports = { reverse };
