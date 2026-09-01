// Calculos financeiros centrais. Unica fonte de verdade para saldo,
// situacao das parcelas e juros/multas (RN06, RN07, RF22, RF23).

const SITUACAO_SQL = `
  CASE
    WHEN p.status = 'CANCELADA' THEN 'CANCELADA'
    WHEN COALESCE(pg_sum.valor, 0) >= p.valor THEN 'PAGA'
    WHEN p.data_vencimento < CURDATE() THEN 'VENCIDA'
    ELSE 'PENDENTE'
  END
`;

// Resumo financeiro de um contrato (somente do dono do contrato - RNF04)
async function getResumoContrato(db, contratoId, usuarioId) {
  const [rows] = await db.execute(
    `SELECT
       c.id,
       c.valor_total,
       COALESCE(SUM(pg_sum.valor), 0) AS recebido
     FROM contratos c
     JOIN clientes cl ON cl.id = c.cliente_id
     LEFT JOIN parcelas p ON p.contrato_id = c.id
     LEFT JOIN (
       SELECT parcela_id, SUM(valor) AS valor
       FROM pagamentos
       GROUP BY parcela_id
     ) pg_sum ON pg_sum.parcela_id = p.id
     WHERE c.id = ? AND cl.usuario_id = ?
     GROUP BY c.id, c.valor_total`,
    [contratoId, usuarioId]
  );

  if (rows.length === 0) return null;

  const { valor_total, recebido } = rows[0];
  const valorParcelas = await getValorParcelas(db, contratoId, usuarioId);

  return {
    valor_total: Number(valor_total),
    valor_parcelas: valorParcelas,
    recebido: Number(recebido),
    pendente: Number((valorParcelas - recebido).toFixed(2)),
  };
}

// Soma das parcelas nao canceladas de um contrato
async function getValorParcelas(db, contratoId, usuarioId) {
  const [rows] = await db.execute(
    `SELECT COALESCE(SUM(p.valor), 0) AS total
     FROM parcelas p
     JOIN contratos c ON c.id = p.contrato_id
     JOIN clientes cl ON cl.id = c.cliente_id
     WHERE p.contrato_id = ? AND cl.usuario_id = ? AND p.status <> 'CANCELADA'`,
    [contratoId, usuarioId]
  );
  return Number(rows[0].total);
}

// Atualiza o status armazenado da parcela com base nos pagamentos (RN06).
// A situacao "VENCIDA" e computada nas consultas e nao precisa ser gravada.
async function recalcSituacaoParcela(db, parcelaId) {
  const [rows] = await db.execute(
    `SELECT p.valor, COALESCE(SUM(pg.valor), 0) AS pago, p.status
     FROM parcelas p
     LEFT JOIN pagamentos pg ON pg.parcela_id = p.id
     WHERE p.id = ?
     GROUP BY p.id, p.valor, p.status`,
    [parcelaId]
  );

  if (rows.length === 0) return;

  const { valor, pago, status } = rows[0];
  let novoStatus = status;

  if (status !== 'CANCELADA') {
    novoStatus = Number(pago) >= Number(valor) ? 'PAGA' : 'PENDENTE';
  }

  if (novoStatus !== status) {
    await db.execute('UPDATE parcelas SET status = ? WHERE id = ?', [novoStatus, parcelaId]);
  }

  return novoStatus;
}

// Calcula juros e multa de uma parcela vencida (RF22/RF23).
// Regra documentada:
//   multa = valor * multa_percentual / 100            (aplicada uma unica vez)
//   juros = valor * juros_percentual / 100 / 30 * dias  (juros mensal proporcional ao dia)
function calcJurosMulta({ valor, diasAtraso, jurosPercentual = 0, multaPercentual = 0 }) {
  const multa = Number((valor * multaPercentual / 100).toFixed(2));
  const juros = Number((valor * jurosPercentual / 100 / 30 * diasAtraso).toFixed(2));
  return { multa, juros, total: Number((multa + juros).toFixed(2)) };
}

// Lista parcelas em atraso de um usuario (RF19/RF20)
async function listarParcelasAtraso(db, usuarioId, { limite = 50 } = {}) {
  const [rows] = await db.execute(
    `SELECT
       p.id, p.numero, p.valor, p.data_vencimento, p.contrato_id,
       c.numero AS contrato_numero, c.cliente_id,
       cl.nome_razao_social AS cliente_nome
     FROM parcelas p
     JOIN contratos c ON c.id = p.contrato_id
     JOIN clientes cl ON cl.id = c.cliente_id
     LEFT JOIN (
       SELECT parcela_id, SUM(valor) AS valor
       FROM pagamentos
       GROUP BY parcela_id
     ) pg_sum ON pg_sum.parcela_id = p.id
     WHERE cl.usuario_id = ?
       AND p.status <> 'CANCELADA'
       AND p.data_vencimento < CURDATE()
       AND COALESCE(pg_sum.valor, 0) < p.valor
     ORDER BY p.data_vencimento ASC
     LIMIT ?`,
    [usuarioId, limite]
  );
  return rows;
}

module.exports = {
  SITUACAO_SQL,
  getResumoContrato,
  getValorParcelas,
  recalcSituacaoParcela,
  calcJurosMulta,
  listarParcelasAtraso,
};