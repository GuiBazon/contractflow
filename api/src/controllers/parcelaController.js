const db = require('../config/db');
const { SITUACAO_SQL, recalcSituacaoParcela } = require('../services/financeiroService');
const { registrarHistorico } = require('../services/historicoService');
const { obterContratoDono, bloquearContratoDono } = require('../services/contratoService');
const { isDate } = require('../utils/validators');
const { integer,choice } = require('../utils/query');
const { asyncHandler } = require('../utils/http');

// listagem sempre restrita ao dono do contrato (RNF04)
async function listParcelas(req, res) {
  const { contratoId } = req.params;
  integer(contratoId,'Contrato');
  const filtro = req.query.filtro === undefined ? null : choice(req.query.filtro,['PENDENTE','PAGA','VENCIDA','CANCELADA'],'Situação');

  try {
    const contrato = await obterContratoDono(contratoId, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const where = ['p.contrato_id = ?'];
    const params = [contratoId];

    if (['PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA'].includes(filtro)) {
      where.push(`(${SITUACAO_SQL}) = ?`);
      params.push(filtro);
    }

    const [rows] = await db.execute(
      `SELECT
         p.id, p.numero, p.valor, p.data_vencimento, p.status, p.created_at, p.updated_at,
         ${SITUACAO_SQL} AS situacao,
         COALESCE(pg_sum.valor, 0) AS pago,
         DATEDIFF(CURDATE(), p.data_vencimento) AS dias_atraso
       FROM parcelas p
       LEFT JOIN (
         SELECT parcela_id, COALESCE(SUM(valor),0) AS valor
         FROM pagamentos WHERE estornado_em IS NULL
         GROUP BY parcela_id
       ) pg_sum ON pg_sum.parcela_id = p.id
       WHERE ${where.join(' AND ')}
       ORDER BY p.numero ASC`,
      params
    );

    return res.json({ contrato_id: Number(contratoId), data: rows });
  } catch (error) {
    console.error('erro ao listar parcelas:', error);
    return res.status(500).json({ message: 'Erro ao listar parcelas' });
  }
}

async function updateParcela(req, res) {
  const { integer, money, choice } = require('../utils/query');
  const { HttpError } = require('../utils/http');
  const { contratoId, parcelaId } = req.params;
  let conn;
  try {
    integer(parcelaId, 'Parcela');
    const contrato = await obterContratoDono(contratoId, req.user.id);
    if (!contrato) throw new HttpError(404, 'Contrato não encontrado');
    conn = await db.getConnection();
    await conn.beginTransaction();
    const lockedContract = await bloquearContratoDono(conn, contratoId, req.user.id);
    const [parcelas] = await conn.execute('SELECT * FROM parcelas WHERE id = ? AND contrato_id = ? FOR UPDATE', [parcelaId, contratoId]);
    if (!parcelas.length) throw new HttpError(404, 'Parcela não encontrada');
    const parcela = parcelas[0];
    const [[{ pago }]] = await conn.query('SELECT COALESCE(SUM(valor),0) AS pago FROM pagamentos WHERE parcela_id = ? AND estornado_em IS NULL', [parcelaId]);
    const updates = [];
    const values = [];
    if (Object.hasOwn(req.body, 'data_vencimento')) {
      if (!isDate(req.body.data_vencimento)) throw new HttpError(400, 'Data de vencimento inválida');
      updates.push('data_vencimento = ?'); values.push(req.body.data_vencimento);
    }
    if (Object.hasOwn(req.body, 'valor')) {
      if (Number(pago) > 0) throw new HttpError(400, 'Valor da parcela não pode ser alterado após pagamentos');
      updates.push('valor = ?'); values.push(money(req.body.valor, 'Valor da parcela', { zero: true }));
    }
    if (Object.hasOwn(req.body, 'status')) {
      const status = choice(req.body.status, ['PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA'], 'Status da parcela');
      if (status === 'CANCELADA' && Number(pago) > 0) throw new HttpError(400, 'Parcela com pagamentos não pode ser cancelada');
      if (status === 'PAGA' && Number(pago) < Number(parcela.valor)) throw new HttpError(400, 'Registre o pagamento para quitar a parcela');
      updates.push('status = ?'); values.push(status);
    }
    if (!updates.length) throw new HttpError(400, 'Nenhum campo válido enviado');
    if (Object.hasOwn(req.body, 'valor')) {
      const total = money((Math.round(Number(lockedContract.valor_total) * 100) - Math.round(Number(parcela.valor) * 100) + Math.round(Number(req.body.valor) * 100)) / 100, 'Novo valor total', { zero: true });
      await conn.execute('UPDATE contratos SET valor_total=? WHERE id=?', [total, contratoId]);
    }
    await conn.execute(`UPDATE parcelas SET ${updates.join(', ')} WHERE id = ? AND contrato_id = ?`, [...values, parcelaId, contratoId]);
    await recalcSituacaoParcela(conn, parcelaId);
    await registrarHistorico(conn, { contratoId: Number(contratoId), usuarioId: req.user.id, acao: 'PARCELA_ALTERADA', descricao: `Parcela ${parcela.numero} atualizada (${updates.join(', ')})` });
    const [[atualizada]] = await conn.query('SELECT id, numero, valor, data_vencimento, status FROM parcelas WHERE id = ?', [parcelaId]);
    await conn.commit();
    return res.json({ message: 'Parcela atualizada com sucesso', parcela: atualizada });
  } catch (error) {
    if (conn) await conn.rollback();
    const status = error.status || 500;
    if (status >= 500) console.error('erro ao atualizar parcela:', error);
    return res.status(status).json({ message: status >= 500 ? 'Erro ao atualizar parcela' : error.message });
  } finally { if (conn) conn.release(); }
}


async function bulkPayParcelas(req, res) {
  const db = require('../config/db');
  const { bloquearContratoDono } = require('../services/contratoService');
  const { registrarHistorico } = require('../services/historicoService');
  const idRaw = req.params.contratoId ?? req.body?.contractId ?? req.body?.contrato_id ?? req.body?.contratoId;
  if (!/^[1-9]\d*$/.test(String(idRaw || ''))) return res.status(400).json({ message: 'ID do contrato é obrigatório' });
  const idsRaw = req.body?.installmentIds ?? req.body?.parcelas_ids ?? req.body?.parcelasIds;
  if (!Array.isArray(idsRaw) || !idsRaw.length) return res.status(400).json({ message: 'Informe a lista de parcelas para liquidação em lote' });
  const ids = idsRaw.map(Number);
  if (ids.some(id => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length || ids.length > 120) {
    return res.status(400).json({ message: 'Lista de parcelas inválida ou com duplicidades' });
  }
  const data = req.body?.paymentDate ?? req.body?.data_pagamento ?? new Date().toISOString().slice(0, 10);
  if (!isDate(data)) return res.status(400).json({ message: 'Data de pagamento inválida' });
  const forma = String(req.body?.paymentMethod ?? req.body?.forma_pagamento ?? 'PIX').trim();
  const observacoes = String(req.body?.observacoes ?? 'Baixa em lote').trim();
  if (!forma || forma.length > 50 || observacoes.length > 5000) return res.status(400).json({ message: 'Forma de pagamento ou observações inválidas' });
  const totalInformado = req.body?.totalPaid ?? req.body?.valor_total;
  if (totalInformado !== undefined && (!Number.isFinite(Number(totalInformado)) || Number(totalInformado) < 0)) {
    return res.status(400).json({ message: 'Valor informado inválido' });
  }
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const contrato = await bloquearContratoDono(conn, Number(idRaw), req.user.id);
    if (['CANCELADO', 'ENCERRADO'].includes(contrato.status)) {
      const err = new Error('Contrato encerrado ou cancelado não aceita pagamentos'); err.status = 409; throw err;
    }
    const placeholders = ids.map(() => '?').join(',');
    const [parcelas] = await conn.query(
      `SELECT id, numero, valor, status FROM parcelas WHERE contrato_id=? AND id IN (${placeholders}) ORDER BY id FOR UPDATE`,
      [Number(idRaw), ...ids]
    );
    if (parcelas.length !== ids.length) {
      const err = new Error('Uma ou mais parcelas não pertencem ao contrato'); err.status = 400; throw err;
    }
    const vencimentos = [];
    let totalCentavos = 0;
    for (const parcela of parcelas) {
      if (parcela.status === 'CANCELADA') {
        const err = new Error('Parcela cancelada não aceita pagamento'); err.status = 409; throw err;
      }
      const [[{ pago }]] = await conn.query(
        'SELECT COALESCE(SUM(valor),0) AS pago FROM pagamentos WHERE parcela_id=? AND estornado_em IS NULL',
        [parcela.id]
      );
      const centavos = Math.round(Number(parcela.valor) * 100) - Math.round(Number(pago) * 100);
      if (centavos <= 0) {
        const err = new Error('Uma das parcelas já está quitada'); err.status = 409; throw err;
      }
      totalCentavos += centavos;
      vencimentos.push({ parcela, valor: centavos / 100 });
    }
    if (totalInformado !== undefined && Math.round(Number(totalInformado) * 100) !== totalCentavos) {
      const err = new Error('Total informado difere do saldo restante das parcelas'); err.status = 400; throw err;
    }
    const pagamentos = [];
    for (const item of vencimentos) {
      const [result] = await conn.execute(
        'INSERT INTO pagamentos (parcela_id, valor, data_pagamento, forma_pagamento, observacoes) VALUES (?, ?, ?, ?, ?)',
        [item.parcela.id, item.valor, data, forma, observacoes]
      );
      await recalcSituacaoParcela(conn, item.parcela.id);
      pagamentos.push({ pagamento_id: result.insertId, parcela_id: item.parcela.id, parcela_numero: item.parcela.numero, valor: item.valor });
    }
    await registrarHistorico(conn, {
      contratoId: Number(idRaw), usuarioId: req.user.id, acao: 'PAGAMENTO',
      descricao: `Baixa em lote de ${pagamentos.length} parcelas no valor total de R$ ${(totalCentavos / 100).toFixed(2)}`,
    });
    await conn.commit();
    return res.json({ message: 'Parcelas liquidadas com sucesso', contractId: Number(idRaw), parcelas_liquidadas: pagamentos.length, total_pago: totalCentavos / 100, pagamentos });
  } catch (error) {
    if (conn) await conn.rollback();
    const status = error.status || 500;
    if (status >= 500) console.error('Erro em baixa em lote:', error);
    return res.status(status).json({ message: status >= 500 ? 'Erro ao processar baixa em lote' : error.message });
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { bulkPayParcelas, listParcelas: asyncHandler(listParcelas),updateParcela: asyncHandler(updateParcela),recalcSituacaoParcela };
