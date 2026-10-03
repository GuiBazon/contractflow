const db = require('../config/db');
const {
  obterContratoDono,
  bloquearContratoDono,
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
    validarDados(dados);
    const [cliente] = await db.execute(
      'SELECT id FROM clientes WHERE id = ? AND usuario_id = ?',
      [dados.cliente_id, req.user.id]
    );
    if (cliente.length === 0) {
      return res.status(400).json({ message: 'Cliente inválido' });
    }
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    console.error('erro ao validar cliente do contrato:', error);
    return res.status(500).json({ message: 'Erro ao criar contrato' });
  }

  const result = await criarContratoComParcelas({ usuarioId: req.user.id, dados });

  if (result.erro) {
    const status = result.erro.status || 500;
    return res.status(status).json({ message: result.erro.code === 'ER_DUP_ENTRY' ? 'Já existe um contrato com este número' : status >= 500 ? 'Erro ao criar contrato' : result.erro.message });
  }

  return res.status(201).json({ message: 'Contrato criado com sucesso', contrato: result.contrato });
}

async function updateContrato(req, res) {
  const { money, integer, choice } = require('../utils/query');
  const { HttpError } = require('../utils/http');
  const { calcularValoresParcelas } = require('../services/contratoService');
  let conn;
  try {
    const id = integer(req.params.id, 'Contrato');
    conn = await db.getConnection();
    await conn.beginTransaction();
    const before = await bloquearContratoDono(conn, id, req.user.id);
    // Bloqueia as parcelas na mesma ordem que as demais escritas financeiras.
    const [parcelas] = await conn.query('SELECT * FROM parcelas WHERE contrato_id=? ORDER BY id FOR UPDATE',[id]);
    const [[{ pagos }]] = await conn.query('SELECT COUNT(*) AS pagos FROM pagamentos pg JOIN parcelas p ON p.id=pg.parcela_id WHERE p.contrato_id=?',[id]);
    const fields = {};
    for (const name of ['tipo','descricao','forma_pagamento','observacoes']) if (Object.hasOwn(req.body,name)) {
      fields[name] = req.body[name] == null ? null : String(req.body[name]);
      if (fields[name] && fields[name].length > (name === 'tipo' ? 100 : name === 'forma_pagamento' ? 50 : 5000)) throw new HttpError(400, `${name} excede o tamanho permitido`);
    }
    if (Object.hasOwn(req.body,'numero')) {
      const numero = str(req.body.numero).toUpperCase();
      if (!numero || numero.length > 50) throw new HttpError(400,'Número inválido');
      if (numero !== before.numero && Number(pagos)) throw new HttpError(400,'Número do contrato não pode ser alterado após pagamentos');
      fields.numero = numero;
    }
    let replan = false;
    if (Object.hasOwn(req.body,'valor_total')) {
      fields.valor_total = money(req.body.valor_total,'Valor total',{ zero: true });
      if (fields.valor_total !== Number(before.valor_total)) {
        if (Number(pagos)) throw new HttpError(400,'Valor total não pode ser alterado após pagamentos');
        replan = true;
      }
    }
    for (const name of ['data_inicio','data_fim']) if (Object.hasOwn(req.body,name)) {
      if (req.body[name] !== null && !isDate(req.body[name])) throw new HttpError(400,`Data inválida em ${name}`);
      fields[name] = req.body[name];
    }
    const start = fields.data_inicio === undefined ? before.data_inicio : fields.data_inicio;
    const end = fields.data_fim === undefined ? before.data_fim : fields.data_fim;
    if (start && end && start > end) throw new HttpError(400,'Data de fim anterior à data de início');
    for (const name of ['juros_percentual','multa_percentual']) if (Object.hasOwn(req.body,name)) {
      fields[name] = money(req.body[name],name,{ zero: true });
      if (fields[name] > 100) throw new HttpError(400,'Taxa deve estar entre 0 e 100');
    }
    let quantity = parcelas.length;
    if (Object.hasOwn(req.body,'quantidade_parcelas')) {
      quantity = integer(req.body.quantidade_parcelas,'Quantidade de parcelas',{ max: 120 });
      fields.quantidade_parcelas = quantity;
      if (quantity !== parcelas.length) replan = true;
    }
    if (Object.hasOwn(req.body,'vencimentos')) {
      if (!Array.isArray(req.body.vencimentos)) throw new HttpError(400,'Vencimentos devem ser uma lista');
      replan = true;
    }
    if (req.body.status !== undefined) fields.status = choice(req.body.status,VALID_STATUS,'Status');
    if (replan && Number(pagos)) throw new HttpError(400,'Parcelamento não pode ser refeito após pagamentos');
    if (!Object.keys(fields).length && !replan) throw new HttpError(400,'Nenhum campo permitido enviado');
    if (replan) {
      quantity = integer(quantity,'Quantidade de parcelas',{ max: 120 });
      if (!podeGerarParcelas(fields.status ?? before.status)) throw new HttpError(400,'Contrato encerrado ou cancelado não permite refazer parcelas');
      // Alterar somente o valor preserva os vencimentos já combinados.
      const vencimentos = req.body.vencimentos ?? (quantity === parcelas.length ? parcelas.map(p => p.data_vencimento) : undefined);
      const dates = calcularVencimentos({ quantidade_parcelas: quantity,vencimentos,data_inicio: start });
      const values = calcularValoresParcelas({ quantidade_parcelas: quantity,valor_total: fields.valor_total ?? Number(before.valor_total) });
      await conn.execute('DELETE FROM parcelas WHERE contrato_id=?',[id]);
      for (let i=0;i<quantity;i++) await conn.execute('INSERT INTO parcelas (contrato_id,numero,valor,data_vencimento) VALUES (?,?,?,?)',[id,i+1,values[i],dates[i]]);
      fields.quantidade_parcelas = quantity;
    }
    if (Object.keys(fields).length) await conn.execute(`UPDATE contratos SET ${Object.keys(fields).map(k=>`${k}=?`).join(',')} WHERE id=?`,[...Object.values(fields),id]);
    await registrarHistorico(conn,{ contratoId: id,usuarioId: req.user.id,acao: 'ALTERADO',descricao: `Contrato atualizado: ${Object.keys(fields).join(', ')}${replan ? '; parcelas refeitas sem pagamentos' : ''}` });
    const contrato = await obterContratoDono(id,req.user.id,conn);
    await conn.commit();
    res.json({ message: 'Contrato atualizado com sucesso',contrato });
  } catch (err) {
    if (conn) await conn.rollback();
    const status = err.code === 'ER_DUP_ENTRY' ? 409 : err.status || 500;
    if (status >= 500) console.error('erro ao atualizar contrato:',err.code || err.message);
    res.status(status).json({ message: err.code === 'ER_DUP_ENTRY' ? 'Já existe um contrato com este número' : status >= 500 ? 'Erro ao atualizar contrato' : err.message });
  } finally { if (conn) conn.release(); }
}

async function updateContratoStatus(req, res) {
  const status = str(req.body.status).toUpperCase();
  if (!VALID_STATUS.includes(status)) return res.status(400).json({ message: 'Status inválido' });
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();
    const contrato = await bloquearContratoDono(conn, req.params.id, req.user.id);
    if (contrato.status !== status) {
      await conn.execute('UPDATE contratos SET status=? WHERE id=?', [status, contrato.id]);
      await registrarHistorico(conn, {
        contratoId: contrato.id, usuarioId: req.user.id, acao: 'STATUS',
        descricao: `Status alterado de ${contrato.status} para ${status}`,
      });
    }
    const atualizado = await obterContratoDono(contrato.id, req.user.id, conn);
    await conn.commit();
    return res.json({ message: 'Status atualizado', contrato: atualizado });
  } catch (error) {
    if (conn) await conn.rollback();
    const statusCode = error.status || 500;
    if (statusCode >= 500) console.error('erro ao atualizar status do contrato:', error.code || error.message);
    return res.status(statusCode).json({ message: statusCode >= 500 ? 'Erro ao atualizar status do contrato' : error.message });
  } finally { if (conn) conn.release(); }
}

// gera parcelas adicionais para o contrato (RN12: bloqueado em contrato ENCERRADO/CANCELADO)
async function generateParcelas(req, res) {
  const { money, integer } = require('../utils/query');
  const { HttpError } = require('../utils/http');
  let conn;
  try {
    const id = integer(req.params.id,'Contrato');
    const quantity = integer(req.body.quantidade_parcelas,'quantidade de parcelas',{ max: 120 });
    const valor = money(req.body.valor_parcela,'Valor da parcela');
    if (req.body.vencimentos !== undefined && !Array.isArray(req.body.vencimentos)) throw new HttpError(400, 'Vencimentos devem ser uma lista');
    conn = await db.getConnection();
    await conn.beginTransaction();
    const contract = await bloquearContratoDono(conn, id, req.user.id);
    if (!podeGerarParcelas(contract.status)) throw new HttpError(400,'Contrato encerrado ou cancelado não recebe novas parcelas (RN12)');
    const [[last]] = await conn.query('SELECT COALESCE(MAX(numero),0) AS numero, MAX(data_vencimento) AS data, COUNT(*) AS quantidade FROM parcelas WHERE contrato_id=?',[id]);
    const newQuantity = integer(Number(last.quantidade) + quantity, 'Quantidade total de parcelas', { max: 120 });
    let base = contract.data_inicio;
    const diaBase = Number((contract.data_inicio || last.data || '').slice(-2));
    if (last.data) base = calcularVencimentos({ quantidade_parcelas: 2,data_inicio: last.data,dia_base: diaBase })[1];
    const dates = calcularVencimentos({ quantidade_parcelas: quantity,vencimentos: req.body.vencimentos,data_inicio: base,dia_base: diaBase || undefined });
    for (let i=0;i<quantity;i++) await conn.execute('INSERT INTO parcelas (contrato_id,numero,valor,data_vencimento) VALUES (?,?,?,?)',[id,Number(last.numero)+i+1,valor,dates[i]]);
    const newTotal = money((Math.round(Number(contract.valor_total)*100)+quantity*Math.round(valor*100))/100,'Novo valor total',{ zero: true });
    await conn.execute('UPDATE contratos SET valor_total=?,quantidade_parcelas=? WHERE id=?',[newTotal,newQuantity,id]);
    await registrarHistorico(conn,{ contratoId: id,usuarioId: req.user.id,acao: 'PARCELAS',descricao: `${quantity} parcela(s) adicionais de R$ ${valor.toFixed(2)}; valor total atualizado para R$ ${newTotal.toFixed(2)}` });
    await conn.commit();
    res.status(201).json({ message: `${quantity} parcela(s) criada(s)` });
  } catch (err) {
    if (conn) await conn.rollback();
    const status = err.status || 500;
    if (status >= 500) console.error('erro ao gerar parcelas:',err.code || err.message);
    res.status(status).json({ message: status >= 500 ? 'Erro ao gerar parcelas' : err.message });
  } finally { if (conn) conn.release(); }
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
