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
         COALESCE(pg_sum.valor, 0) AS pago,
         DATEDIFF(CURDATE(), p.data_vencimento) AS dias_atraso
       FROM parcelas p
       LEFT JOIN (
         SELECT parcela_id, COALESCE(SUM(valor),0) AS valor
         FROM pagamentos
         WHERE status IS NULL OR (status != 'ESTORNADO' AND status != 'REVERSED')
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
    const updatesComAlias = updates.map((u) => u.replace(/^(\w+)\s*=/, 'p.$1 ='));
    await db.execute(
      `UPDATE parcelas p
       JOIN contratos c ON c.id = p.contrato_id
       JOIN clientes cl ON cl.id = c.cliente_id
       SET ${updatesComAlias.join(', ')}
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

// Processamento de baixa em lote de múltiplas parcelas com transação atômica (Bulk Actions)
async function bulkPayParcelas(req, res) {
  const contractIdRaw = req.params.contratoId || req.body.contractId || req.body.contrato_id || req.body.contratoId;
  const contractId = Number(contractIdRaw);

  const installmentIdsRaw = req.body.installmentIds || req.body.parcelas_ids || req.body.parcelasIds;
  const paymentMethod = str(req.body.paymentMethod || req.body.forma_pagamento) || 'PIX';
  const paymentDate = str(req.body.paymentDate || req.body.data_pagamento) || new Date().toISOString().split('T')[0];
  const totalPaid = req.body.totalPaid !== undefined ? Number(req.body.totalPaid) : (req.body.valor_total !== undefined ? Number(req.body.valor_total) : null);
  const observacoes = str(req.body.observacoes) || 'Baixa realizada em lote';

  if (!contractId || Number.isNaN(contractId) || contractId <= 0) {
    return res.status(400).json({ message: 'ID do contrato é obrigatório' });
  }

  if (!Array.isArray(installmentIdsRaw) || installmentIdsRaw.length === 0) {
    return res.status(400).json({ message: 'Informe a lista de parcelas para liquidação em lote' });
  }

  const installmentIds = installmentIdsRaw.map(Number).filter((id) => !Number.isNaN(id) && id > 0);
  if (installmentIds.length === 0) {
    return res.status(400).json({ message: 'Nenhuma parcela válida selecionada' });
  }

  if (!isDate(paymentDate)) {
    return res.status(400).json({ message: 'Data de pagamento inválida' });
  }

  try {
    const contrato = await obterContratoDono(contractId, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    if (typeof db.garantirColunasPagamentos === 'function') {
      await db.garantirColunasPagamentos();
    }

    // Busca todas as parcelas informadas garantindo que pertençam a este contrato
    const placeholders = installmentIds.map(() => '?').join(', ');
    const [parcelas] = await db.query(
      `SELECT id, numero, valor, status, data_vencimento
       FROM parcelas
       WHERE contrato_id = ? AND id IN (${placeholders})`,
      [contractId, ...installmentIds]
    );

    if (parcelas.length !== installmentIds.length) {
      return res.status(400).json({
        message: 'Algumas parcelas informadas não pertencem a este contrato ou não foram encontradas',
      });
    }

    // Valida se há parcelas já quitadas ou canceladas
    for (const p of parcelas) {
      if (p.status === 'PAGA') {
        return res.status(400).json({ message: `A parcela #${p.numero} já está quitada` });
      }
      if (p.status === 'CANCELADA') {
        return res.status(400).json({ message: `A parcela #${p.numero} está cancelada e não aceita liquidação` });
      }
    }

    // Somatório das parcelas
    const somaValores = parcelas.reduce((acc, p) => acc + Number(p.valor), 0);

    // Se o cliente forneceu totalPaid, valida com margem para centavos
    if (totalPaid !== null && !Number.isNaN(totalPaid) && totalPaid > 0) {
      if (Math.abs(somaValores - totalPaid) > 0.05) {
        return res.status(400).json({
          message: `Divergência de valores: o somatório das parcelas (R$ ${somaValores.toFixed(2)}) difere do total informado (R$ ${totalPaid.toFixed(2)})`,
        });
      }
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      const pagamentosCriados = [];

      for (const p of parcelas) {
        const [result] = await conn.execute(
          `INSERT INTO pagamentos (parcela_id, valor, data_pagamento, forma_pagamento, observacoes, status)
           VALUES (?, ?, ?, ?, ?, 'CONCLUIDO')`,
          [p.id, Number(Number(p.valor).toFixed(2)), paymentDate, paymentMethod, observacoes]
        );

        await conn.execute(
          "UPDATE parcelas SET status = 'PAGA' WHERE id = ?",
          [p.id]
        );

        pagamentosCriados.push({
          pagamento_id: result.insertId,
          parcela_id: p.id,
          parcela_numero: p.numero,
          valor: Number(p.valor),
        });
      }

      const numerosParcelas = parcelas.map((p) => `#${p.numero}`).join(', ');
      await registrarHistorico(conn, {
        contratoId: contractId,
        usuarioId: req.user.id,
        acao: 'PAGAMENTO_LOTE',
        descricao: `Baixa em lote de ${parcelas.length} parcelas (${numerosParcelas}) totalizando R$ ${somaValores.toFixed(2)} via ${paymentMethod} em ${paymentDate}`,
      });

      await conn.commit();

      return res.status(200).json({
        message: `${parcelas.length} parcelas liquidadas com sucesso`,
        contractId,
        parcelas_liquidadas: parcelas.length,
        total_pago: Number(somaValores.toFixed(2)),
        data_pagamento: paymentDate,
        forma_pagamento: paymentMethod,
        pagamentos: pagamentosCriados,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (error) {
    console.error('erro ao realizar baixa em lote:', error);
    return res.status(500).json({ message: 'Erro ao processar baixa em lote' });
  }
}

module.exports = { listParcelas, updateParcela, bulkPayParcelas, recalcSituacaoParcela };