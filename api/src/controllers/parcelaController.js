const db = require('../config/db');
const { SITUACAO_SQL, recalcSituacaoParcela } = require('../services/financeiroService');
const { registrarHistorico } = require('../services/historicoService');
const { obterContratoDono, bloquearContratoDono } = require('../services/contratoService');
const { isDate, str } = require('../utils/validators');

// listagem sempre restrita ao dono do contrato (RNF04)
async function listParcelas(req, res) {
  const { contratoId } = req.params;
  const filtro = str(req.query.filtro).toUpperCase(); // PENDENTE | PAGA | VENCIDA | CANCELADA

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
         FROM pagamentos
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
    const [[{ pago }]] = await conn.query('SELECT COALESCE(SUM(valor),0) AS pago FROM pagamentos WHERE parcela_id = ?', [parcelaId]);
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

module.exports = { listParcelas, updateParcela, recalcSituacaoParcela };
