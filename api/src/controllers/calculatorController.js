const { calcularValoresParcelas, calcularVencimentos } = require('../services/contratoService');
const { calcJurosMulta, calcularProjecao } = require('../services/financeiroService');
const { integer, money } = require('../utils/query');
const { isDate } = require('../utils/validators');
const { HttpError, asyncHandler } = require('../utils/http');

function charges(body) {
  const dias = body.dias_atraso ?? 0;
  if (!['number', 'string'].includes(typeof dias) || !/^(0|[1-9]\d*)$/.test(String(dias)) || Number(dias) > 36500) {
    throw new HttpError(400, 'Dias de atraso deve ser um inteiro entre 0 e 36500');
  }
  const juros = money(body.juros_percentual ?? 0, 'Juros', { zero: true });
  const multa = money(body.multa_percentual ?? 0, 'Multa', { zero: true });
  if (juros > 100 || multa > 100) throw new HttpError(400, 'Taxas devem estar entre 0 e 100');
  return { diasAtraso: Number(dias), jurosPercentual: juros, multaPercentual: multa };
}

function estimate(valor, options) {
  if (!options.diasAtraso || !valor) return { juros: 0, multa: 0, total: 0 };
  return calcJurosMulta({ valor, ...options });
}

async function installments(req, res) {
  const quantidade = integer(req.body.quantidade_parcelas, 'Quantidade de parcelas', { max: 120 });
  const total = money(req.body.valor_total, 'Valor total', { zero: true });
  if (req.body.vencimentos !== undefined && !Array.isArray(req.body.vencimentos)) throw new HttpError(400, 'Vencimentos devem ser uma lista');
  if (req.body.data_inicio !== undefined && !isDate(req.body.data_inicio)) throw new HttpError(400, 'Data de início inválida');
  const options = charges(req.body);
  const dates = calcularVencimentos({ quantidade_parcelas: quantidade, vencimentos: req.body.vencimentos, data_inicio: req.body.data_inicio });
  const values = calcularValoresParcelas({ quantidade_parcelas: quantidade, valor_total: total });
  const parcelas = values.map((valor, index) => {
    const encargo = estimate(valor, options);
    return { numero: index + 1, valor, data_vencimento: dates[index], juros: encargo.juros, multa: encargo.multa, total_atualizado: Number((valor + encargo.total).toFixed(2)) };
  });
  const juros = Number(parcelas.reduce((sum, p) => sum + p.juros, 0).toFixed(2));
  const multa = Number(parcelas.reduce((sum, p) => sum + p.multa, 0).toFixed(2));
  res.json({ parcelas, resumo: { valor_total: total, juros, multa, total_atualizado: Number((total + juros + multa).toFixed(2)) } });
}

async function balance(req, res) {
  const valor = money(req.body.valor, 'Valor', { zero: true });
  const pago = money(req.body.valor_pago ?? 0, 'Valor pago', { zero: true });
  if (pago > valor) throw new HttpError(400, 'Valor pago excede o principal');
  const pendente = Number((valor - pago).toFixed(2));
  const encargo = estimate(pendente, charges(req.body));
  res.json({ valor, pago, pendente, juros: encargo.juros, multa: encargo.multa, total_atualizado: Number((pendente + encargo.total).toFixed(2)) });
}

async function projection(req, res) {
  const fields = Object.fromEntries(['recebido', 'pendente', 'despesas_pagas', 'despesas_pendentes'].map(name => [name, money(req.body[name] ?? 0, name, { zero: true })]));
  res.json({ ...fields, ...calcularProjecao(fields) });
}

module.exports = { installments: asyncHandler(installments), balance: asyncHandler(balance), projection: asyncHandler(projection) };
