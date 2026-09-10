// Servico de contratos: validacao, geracao de parcelas/vencimentos (RF14/RF15)
// e criacao transacional. Tudo no escopo do usuario autenticado (RNF04).

const db = require('../config/db');
const { isDate, isDecimal, isInteger, str } = require('../utils/validators');
const { registrarHistorico } = require('./historicoService');

const VALID_STATUS = ['ATIVO', 'PENDENTE', 'ENCERRADO', 'CANCELADO', 'EM_RENOVACAO'];

async function obterContratoDono(contratoId, usuarioId) {
  const [rows] = await db.execute(
    `SELECT c.*, cl.nome_razao_social AS cliente_nome, cl.cpf_cnpj AS cliente_cpf_cnpj
     FROM contratos c
     JOIN clientes cl ON cl.id = c.cliente_id
     WHERE c.id = ? AND cl.usuario_id = ?`,
    [contratoId, usuarioId]
  );
  return rows[0] || null;
}

// monta o objeto de dados validado; lanca Error com campo message quando invalido
function validarDados({ cliente_id, numero, valor_total, data_inicio, data_fim, status }) {
  const erros = [];

  if (!Number(cliente_id)) erros.push('Cliente é obrigatório');
  if (!numero) erros.push('Número do contrato é obrigatório');
  if (!isDecimal(valor_total)) erros.push('Valor total deve ser um número válido maior ou igual a zero');
  if (data_inicio && !isDate(data_inicio)) erros.push('Data de início inválida');
  if (data_fim && !isDate(data_fim)) erros.push('Data de fim inválida');
  if (data_inicio && data_fim && data_fim < data_inicio) erros.push('Data de fim anterior à data de início');

  if (status && !VALID_STATUS.includes(status)) {
    erros.push('Status inválido');
  }

  if (erros.length > 0) {
    const err = new Error(erros.join('; '));
    err.status = 400;
    throw err;
  }
}

// gera lista de vencimentos; aceita lista fornecida ou gera mensalmente a partir da data base
function calcularVencimentos({ quantidade_parcelas, vencimentos, data_inicio }) {
  if (vencimentos && Array.isArray(vencimentos)) {
    const vals = vencimentos.map((v) => (v && isDate(v) ? v : null));
    if (vals.some((v) => v === null)) {
      throw Object.assign(new Error('Lista de vencimentos contém datas inválidas'), { status: 400 });
    }
    if (quantidade_parcelas && vals.length !== quantidade_parcelas) {
      throw Object.assign(
        new Error(`Quantidade de vencimentos (${vals.length}) difere da quantidade de parcelas (${quantidade_parcelas})`),
        { status: 400 }
      );
    }
    return vals;
  }

  if (!data_inicio) {
    throw Object.assign(
      new Error('Informe os vencimentos ou a data de início para gerar os vencimentos'),
      { status: 400 }
    );
  }

  const resultados = [];
  let [year, month, day] = data_inicio.split('-').map(Number);
  for (let i = 0; i < quantidade_parcelas; i++) {
    const ultimoDia = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const dia = Math.min(day, ultimoDia);
    resultados.push(
      `${year}-${String(month).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    );
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return resultados;
}

// distribui o valor total entre as parcelas (a ultima absorve o centavo da divisao)
function calcularValoresParcelas({ valor_total, valor_parcela, quantidade_parcelas }) {
  if (valor_parcela) return Array(quantidade_parcelas).fill(Number(valor_parcela));

  const base = Number((valor_total / quantidade_parcelas).toFixed(2));
  const valores = Array(quantidade_parcelas).fill(base);
  const soma = base * quantidade_parcelas;
  const diferenca = Number((valor_total - soma).toFixed(2));
  valores[valores.length - 1] = Number((valores[valores.length - 1] + diferenca).toFixed(2));
  return valores;
}

// cria contrato + parcelas + historico em transacao (RN06/RF14/RF15)
async function criarContratoComParcelas({ usuarioId, dados }) {
  try {
    validarDados(dados);
  } catch (e) {
    return { erro: e };
  }

  if (!isInteger(dados.quantidade_parcelas) && !(dados.vencimentos && dados.vencimentos.length > 0)) {
    return { erro: Object.assign(new Error('Informe a quantidade de parcelas ou os vencimentos'), { status: 400 }) };
  }

  const quantidade_parcelas = Number(dados.quantidade_parcelas) || (dados.vencimentos ? dados.vencimentos.length : 0);

  let vencimentos;
  try {
    vencimentos = calcularVencimentos({
      quantidade_parcelas,
      vencimentos: dados.vencimentos,
      data_inicio: dados.data_inicio,
    });
  } catch (e) {
    return { erro: e };
  }

  const valores = calcularValoresParcelas({
    valor_total: Number(dados.valor_total),
    valor_parcela: dados.valor_parcela ? Number(dados.valor_parcela) : null,
    quantidade_parcelas,
  });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.execute(
      `INSERT INTO contratos (
        usuario_id, cliente_id, numero, tipo, descricao, valor_total,
        data_inicio, data_fim, forma_pagamento, quantidade_parcelas,
        status, juros_percentual, multa_percentual, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        usuarioId,
        dados.cliente_id,
        str(dados.numero).toUpperCase(),
        dados.tipo ? str(dados.tipo) : null,
        dados.descricao ? String(dados.descricao) : null,
        Number(dados.valor_total),
        dados.data_inicio || null,
        dados.data_fim || null,
        dados.forma_pagamento ? str(dados.forma_pagamento) : null,
        quantidade_parcelas,
        dados.status || 'ATIVO',
        Number(dados.juros_percentual || 0),
        Number(dados.multa_percentual || 0),
        dados.observacoes ? String(dados.observacoes) : null,
      ]
    );

    const contratoId = result.insertId;

    for (let i = 0; i < quantidade_parcelas; i++) {
      await conn.execute(
        'INSERT INTO parcelas (contrato_id, numero, valor, data_vencimento) VALUES (?, ?, ?, ?)',
        [contratoId, i + 1, valores[i], vencimentos[i]]
      );
    }

    await registrarHistorico(conn, {
      contratoId,
      usuarioId,
      acao: 'CRIADO',
      descricao: `Contrato criado com ${quantidade_parcelas} parcela(s) e ${vencimentos.length} vencimento(s)`,
    });

    await conn.commit();

    const contrato = await obterContratoDono(contratoId, usuarioId);
    return { contrato };
  } catch (error) {
    await conn.rollback();
    console.error('erro ao criar contrato:', error);
    return { erro: error };
  } finally {
    conn.release();
  }
}

// regra de negocio: contrato encerrado/cancelado nao recebe novas parcelas (RN12)
function podeGerarParcelas(status) {
  return status !== 'ENCERRADO' && status !== 'CANCELADO';
}

module.exports = {
  VALID_STATUS,
  obterContratoDono,
  validarDados,
  calcularVencimentos,
  calcularValoresParcelas,
  criarContratoComParcelas,
  podeGerarParcelas,
};