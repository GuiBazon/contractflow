const db = require('../config/db');
const {
  obterContratoDono,
  validarDados,
  VALID_STATUS,
  criarContratoComParcelas,
  podeGerarParcelas,
  calcularVencimentos,
} = require('../services/contratoService');
const { getResumoContrato } = require('../services/financeiroService');
const { registrarHistorico } = require('../services/historicoService');
const { isDate, str } = require('../utils/validators');

async function listContratos(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const q = str(req.query.q);
  const status = str(req.query.status).toUpperCase();
  const clienteId = Number(req.query.cliente);
  const ini = str(req.query.inicio);
  const fim = str(req.query.fim);
  const offset = (page - 1) * limit;

  const where = ['c.usuario_id = ?'];
  const params = [req.user.id];

  if (q) {
    where.push('(c.numero LIKE ? OR c.descricao LIKE ? OR cl.nome_razao_social LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like);
  }
  if (status && VALID_STATUS.includes(status)) {
    where.push('c.status = ?');
    params.push(status);
  }
  if (clienteId) {
    where.push('c.cliente_id = ?');
    params.push(clienteId);
  }
  if (ini && isDate(ini)) {
    where.push('c.data_inicio >= ?');
    params.push(ini);
  }
  if (fim && isDate(fim)) {
    where.push('c.data_inicio <= ?');
    params.push(fim);
  }

  const whereSql = where.join(' AND ');

  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM contratos c JOIN clientes cl ON cl.id = c.cliente_id WHERE ${whereSql}`,
      params
    );

    const [rows] = await db.execute(
      `SELECT
         c.*,
         cl.nome_razao_social AS cliente_nome,
         (SELECT COUNT(*) FROM parcelas p2 WHERE p2.contrato_id = c.id) AS total_parcelas,
         (SELECT COUNT(*) FROM parcelas p3 WHERE p3.contrato_id = c.id AND p3.status = 'PAGA') AS parcelas_pagas,
         (SELECT COALESCE(SUM(p4.valor),0) FROM parcelas p4 WHERE p4.contrato_id = c.id AND p4.status <> 'CANCELADA') AS valor_parcelas,
         (SELECT COALESCE(SUM(pg.valor),0) FROM parcelas p5 JOIN pagamentos pg ON pg.parcela_id = p5.id WHERE p5.contrato_id = c.id) AS recebido
       FROM contratos c
       JOIN clientes cl ON cl.id = c.cliente_id
       WHERE ${whereSql}
       ORDER BY c.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const data = rows.map((r) => ({
      ...r,
      pendente: Number((Number(r.valor_parcelas || 0) - Number(r.recebido || 0)).toFixed(2)),
    }));

    return res.json({
      data,
      paginacao: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('erro ao listar contratos:', error);
    return res.status(500).json({ message: 'Erro ao listar contratos' });
  }
}

async function getContratoById(req, res) {
  const { id } = req.params;

  try {
    const contrato = await obterContratoDono(id, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const financeiro = await getResumoContrato(db, id, req.user.id);

    return res.json({ ...contrato, financeiro });
  } catch (error) {
    console.error('erro ao buscar contrato:', error);
    return res.status(500).json({ message: 'Erro ao buscar contrato' });
  }
}

async function createContrato(req, res) {
  const dados = {
    ...req.body,
    numero: str(req.body.numero),
    cliente_id: req.body.cliente_id,
  };

  // cliente deve pertencer ao usuario (RNF04)
  try {
    const [cliente] = await db.execute(
      'SELECT id FROM clientes WHERE id = ? AND usuario_id = ?',
      [dados.cliente_id, req.user.id]
    );
    if (cliente.length === 0) {
      return res.status(400).json({ message: 'Cliente inválido' });
    }
  } catch (error) {
    console.error('erro ao validar cliente do contrato:', error);
    return res.status(500).json({ message: 'Erro ao criar contrato' });
  }

  const result = await criarContratoComParcelas({ usuarioId: req.user.id, dados });

  if (result.erro) {
    return res.status(result.erro.status || 500).json({ message: result.erro.message });
  }

  return res.status(201).json({ message: 'Contrato criado com sucesso', contrato: result.contrato });
}

async function updateContrato(req, res) {
  const { id } = req.params;

  try {
    const contrato = await obterContratoDono(id, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const campos = {};
    const permitidos = [
      'descricao', 'data_inicio', 'data_fim', 'forma_pagamento',
      'juros_percentual', 'multa_percentual', 'observacoes',
    ];

    for (const field of permitidos) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        campos[field] = req.body[field];
      }
    }

    // numero e valor_total podem ser alterados apenas se nao houver parcelas pagas
    if (Object.prototype.hasOwnProperty.call(req.body, 'numero') && contrato.numero !== req.body.numero) {
      if (contrato.parcelas_pagas > 0) {
        return res.status(400).json({ message: 'Número do contrato não pode ser alterado após pagamentos' });
      }
      campos.numero = str(req.body.numero).toUpperCase();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'valor_total')) {
      const temPagamentos = await hasPayments(req.user.id, id);
      if (temPagamentos) {
        return res.status(400).json({ message: 'Valor total não pode ser alterado após pagamentos' });
      }
      campos.valor_total = req.body.valor_total;
    }

    if (campos.valor_total && (Number(campos.valor_total) < 0)) {
      return res.status(400).json({ message: 'Valor total inválido' });
    }

    const updates = [];
    const values = [];
    for (const [field, value] of Object.entries(campos)) {
      switch (field) {
        case 'numero':
          updates.push('numero = ?');
          values.push(value);
          break;
        case 'valor_total':
          updates.push('valor_total = ?');
          values.push(Number(value));
          break;
        case 'juros_percentual':
        case 'multa_percentual':
          updates.push(`${field} = ?`);
          values.push(Number(value) || 0);
          break;
        case 'data_inicio':
        case 'data_fim':
          if (value && !isDate(value)) {
            return res.status(400).json({ message: `Data inválida em ${field}` });
          }
          updates.push(`${field} = ?`);
          values.push(value || null);
          break;
        default:
          updates.push(`${field} = ?`);
          values.push(value ? String(value) : null);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo permitido enviado' });
    }

    values.push(id, req.user.id);
    await db.execute(
      `UPDATE contratos c JOIN clientes cl ON cl.id = c.cliente_id
       SET ${updates.join(', ')}
       WHERE c.id = ? AND cl.usuario_id = ?`,
      values
    );

    await registrarHistorico(db, {
      contratoId: id,
      usuarioId: req.user.id,
      acao: 'ALTERADO',
      descricao: `Dados do contrato atualizados (${updates.join(', ')})`,
    });

    const atualizado = await obterContratoDono(id, req.user.id);
    return res.json({ message: 'Contrato atualizado com sucesso', contrato: atualizado });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe um contrato com este número' });
    }
    console.error('erro ao atualizar contrato:', error);
    return res.status(500).json({ message: 'Erro ao atualizar contrato' });
  }
}

async function hasPayments(usuarioId, contratoId) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS total
     FROM pagamentos pg
     JOIN parcelas p ON p.id = pg.parcela_id
     JOIN contratos c ON c.id = p.contrato_id
     JOIN clientes cl ON cl.id = c.cliente_id
     WHERE c.id = ? AND cl.usuario_id = ?`,
    [contratoId, usuarioId]
  );
  return Number(rows[0].total) > 0;
}

async function updateContratoStatus(req, res) {
  const { id } = req.params;
  const status = str(req.body.status).toUpperCase();

  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ message: 'Status inválido' });
  }

  try {
    const contrato = await obterContratoDono(id, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    if (contrato.status === status) {
      return res.json({ message: 'Contrato já está com este status', contrato });
    }

    await db.execute(
      `UPDATE contratos c JOIN clientes cl ON cl.id = c.cliente_id
       SET c.status = ?
       WHERE c.id = ? AND cl.usuario_id = ?`,
      [status, id, req.user.id]
    );

    await registrarHistorico(db, {
      contratoId: id,
      usuarioId: req.user.id,
      acao: 'STATUS',
      descricao: `Status alterado de ${contrato.status} para ${status}`,
    });

    const atualizado = await obterContratoDono(id, req.user.id);
    return res.json({ message: 'Status atualizado', contrato: atualizado });
  } catch (error) {
    console.error('erro ao atualizar status do contrato:', error);
    return res.status(500).json({ message: 'Erro ao atualizar status do contrato' });
  }
}

// gera parcelas adicionais para o contrato (RN12: bloqueado em control ENCERRADO/CANCELADO)
async function generateParcelas(req, res) {
  const { id } = req.params;
  const quantidade = Number(req.body.quantidade_parcelas);
  const vencimentos = req.body.vencimentos;

  if (!Number.isInteger(quantidade) || quantidade < 1) {
    return res.status(400).json({ message: 'Informe a quantidade de parcelas a gerar' });
  }

  try {
    const contrato = await obterContratoDono(id, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    if (!podeGerarParcelas(contrato.status)) {
      return res.status(400).json({ message: 'Contrato encerrado ou cancelado não recebe novas parcelas (RN12)' });
    }

    const proximoNumero = await getProximoNumeroParcela(id);
    let listaVencimentos;
    try {
      listaVencimentos = calcularVencimentos({
        quantidade_parcelas: quantidade,
        vencimentos,
        data_inicio: contrato.data_inicio,
      });
    } catch (e) {
      return res.status(e.status || 400).json({ message: e.message });
    }

    const valores = Array(quantidade).fill(Number(req.body.valor_parcela) || 0);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      for (let i = 0; i < quantidade; i++) {
        await conn.execute(
          'INSERT INTO parcelas (contrato_id, numero, valor, data_vencimento) VALUES (?, ?, ?, ?)',
          [id, proximoNumero + i, valores[i], listaVencimentos[i]]
        );
      }
      await registrarHistorico(conn, {
        contratoId: id,
        usuarioId: req.user.id,
        acao: 'PARCELAS',
        descricao: `${quantidade} parcela(s) adicionada(s) manualmente`,
      });
      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }

    return res.status(201).json({ message: `${quantidade} parcela(s) criada(s)` });
  } catch (error) {
    console.error('erro ao gerar parcelas:', error);
    return res.status(500).json({ message: 'Erro ao gerar parcelas' });
  }
}

async function getProximoNumeroParcela(contratoId) {
  const [rows] = await db.execute(
    'SELECT COALESCE(MAX(numero), 0) + 1 AS prox FROM parcelas WHERE contrato_id = ?',
    [contratoId]
  );
  return rows[0].prox;
}

async function deleteContrato(req, res) {
  const { id } = req.params;

  try {
    const contrato = await obterContratoDono(id, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const [parcelas] = await db.execute(
      'SELECT COUNT(*) AS total FROM parcelas WHERE contrato_id = ?',
      [id]
    );

    if (Number(parcelas[0].total) > 0) {
      return res.status(409).json({
        message: 'Contrato possui parcelas/pagamentos e não pode ser removido. Use o status CANCELADO ou ENCERRADO (RN11).',
      });
    }

    await db.execute(
      `DELETE c FROM contratos c JOIN clientes cl ON cl.id = c.cliente_id
       WHERE c.id = ? AND cl.usuario_id = ?`,
      [id, req.user.id]
    );

    return res.json({ message: 'Contrato removido com sucesso' });
  } catch (error) {
    console.error('erro ao remover contrato:', error);
    return res.status(500).json({ message: 'Erro ao remover contrato' });
  }
}

async function getHistorico(req, res) {
  const { id } = req.params;

  try {
    const contrato = await obterContratoDono(id, req.user.id);
    if (!contrato) {
      return res.status(404).json({ message: 'Contrato não encontrado' });
    }

    const [rows] = await db.execute(
      `SELECT h.id, h.acao, h.descricao, h.created_at, u.nome AS usuario_nome
       FROM historico_contratos h
       JOIN usuarios u ON u.id = h.usuario_id
       WHERE h.contrato_id = ?
       ORDER BY h.id DESC`,
      [id]
    );

    return res.json(rows);
  } catch (error) {
    console.error('erro ao buscar histórico:', error);
    return res.status(500).json({ message: 'Erro ao buscar histórico do contrato' });
  }
}

module.exports = {
  listContratos,
  getContratoById,
  createContrato,
  updateContrato,
  updateContratoStatus,
  generateParcelas,
  deleteContrato,
  getHistorico,
};