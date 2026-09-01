const db = require('../config/db');
const { SITUACAO_SQL, recalcSituacaoParcela } = require('../services/financeiroService');
const { registrarHistorico } = require('../services/historicoService');
const { obterContratoDono } = require('../services/contratoService');
const { isDate, isDecimal, str } = require('../utils/validators');

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
         (SELECT COALESCE(SUM(pg.valor),0) FROM pagamentos pg WHERE pg.parcela_id = p.id) AS pago,
         DATEDIFF(CURDATE(), p.data_vencimento) AS dias_atraso
       FROM parcelas p
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
  const { contratoId, parcelaId } = req.params;

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
      return res.status(404).json({ message: 'Parcela não encontrada' });
    }
    const parcela = parcelas[0];

    const [pags] = await db.execute(
      'SELECT COUNT(*) AS total FROM pagamentos WHERE parcela_id = ?',
      [parcelaId]
    );
    const haPagamentos = Number(pags[0].total) > 0;

    const updates = [];
    const values = [];

    if (Object.prototype.hasOwnProperty.call(req.body, 'data_vencimento')) {
      if (!isDate(req.body.data_vencimento)) {
        return res.status(400).json({ message: 'Data de vencimento inválida' });
      }
      updates.push('data_vencimento = ?');
      values.push(req.body.data_vencimento);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'valor')) {
      if (haPagamentos) {
        return res.status(400).json({ message: 'Valor da parcela não pode ser alterado após pagamentos' });
      }
      if (!isDecimal(req.body.valor)) {
        return res.status(400).json({ message: 'Valor da parcela inválido' });
      }
      updates.push('valor = ?');
      values.push(Number(req.body.valor));
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status')) {
      const novoStatus = str(req.body.status).toUpperCase();
      if (!['PENDENTE', 'PAGA', 'VENCIDA', 'CANCELADA'].includes(novoStatus)) {
        return res.status(400).json({ message: 'Status da parcela inválido' });
      }
      if (novoStatus === 'CANCELADA' && haPagamentos) {
        return res.status(400).json({ message: 'Parcela com pagamentos não pode ser cancelada' });
      }
      updates.push('status = ?');
      values.push(novoStatus);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido enviado' });
    }

    values.push(parcelaId, contratoId);
    await db.execute(
      `UPDATE parcelas p
       JOIN contratos c ON c.id = p.contrato_id
       JOIN clientes cl ON cl.id = c.cliente_id
       SET ${updates.join(', ')}
       WHERE p.id = ? AND p.contrato_id = ? AND cl.usuario_id = ?`,
      values
    );

    await registrarHistorico(db, {
      contratoId: Number(contratoId),
      usuarioId: req.user.id,
      acao: 'PARCELA_ALTERADA',
      descricao: `Parcela ${parcela.numero} atualizada (${updates.join(', ')})`,
    });

    const [atualizada] = await db.execute(
      `SELECT id, numero, valor, data_vencimento, status FROM parcelas WHERE id = ?`,
      [parcelaId]
    );

    return res.json({ message: 'Parcela atualizada com sucesso', parcela: atualizada[0] });
  } catch (error) {
    console.error('erro ao atualizar parcela:', error);
    return res.status(500).json({ message: 'Erro ao atualizar parcela' });
  }
}

module.exports = { listParcelas, updateParcela, recalcSituacaoParcela };