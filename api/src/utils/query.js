const { isDate, str } = require('./validators');
const { HttpError } = require('./http');

function integer(value, name, { optional = false, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (optional && (value === undefined || value === '')) return null;
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
    throw new HttpError(400, `${name} deve ser um inteiro positivo`);
  }
  return Number(value);
}

function pagination(query) {
  const page = integer(query.page ?? 1, 'page');
  const limit = integer(query.limit ?? 20, 'limit', { max: 100 });
  const offset = (page - 1) * limit;
  if (!Number.isSafeInteger(offset)) throw new HttpError(400, 'Página fora do limite');
  return { page, limit, offset };
}

function period(query, { required = false } = {}) {
  const de = query.de == null ? null : str(query.de);
  const ate = query.ate == null ? null : str(query.ate);
  if ((required && (!de || !ate)) || (de !== null && !isDate(de)) || (ate !== null && !isDate(ate)) || (de && ate && de > ate)) {
    throw new HttpError(400, 'Informe um período válido em de/ate (AAAA-MM-DD)');
  }
  return { de, ate };
}

function dateWhere(column, dates, where, params) {
  if (dates.de) { where.push(`${column} >= ?`); params.push(dates.de); }
  if (dates.ate) { where.push(`${column} <= ?`); params.push(dates.ate); }
}

function money(value, name = 'Valor', { zero = false } = {}) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') throw new HttpError(400, `${name} inválido`);
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (!zero && n === 0) || n > 9999999999.99 || Math.abs(n * 100 - Math.round(n * 100)) > 0.0001) {
    throw new HttpError(400, `${name} deve ser ${zero ? 'não negativo' : 'positivo'} e ter até duas casas decimais`);
  }
  return Math.round(n * 100) / 100;
}

function choice(value, values, name) {
  const result = str(value).toUpperCase();
  if (!values.includes(result)) throw new HttpError(400, `${name} inválido`);
  return result;
}

module.exports = { integer, pagination, period, dateWhere, money, choice };
