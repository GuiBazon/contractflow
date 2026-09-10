// Validacoes leves de entrada (RNF15). Nenhuma dependencia externa.

function onlyDigits(value) {
  return String(value).replace(/\D/g, '');
}

function isEmail(value) {
  if (!value || typeof value !== 'string') return false;
  if (value.length > 150) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function isDate(value) {
  if (!value || typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidCpf(digits) {
  if (!/^\d{11}$/.test(digits)) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const calc = (length) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === Number(digits[9]) && calc(10) === Number(digits[10]);
}

function isValidCnpj(digits) {
  if (!/^\d{14}$/.test(digits)) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;
  const calc = (length) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return calc(12) === Number(digits[12]) && calc(13) === Number(digits[13]);
}

// Aceita CPF (11 digitos) ou CNPJ (14 digitos); retorna { ok, tipo } ou { ok: false }
function isValidCpfCnpj(value) {
  if (!value) return { ok: false, tipo: null };
  const digits = onlyDigits(value);
  if (digits.length === 11 && isValidCpf(digits)) return { ok: true, tipo: 'CPF' };
  if (digits.length === 14 && isValidCnpj(digits)) return { ok: true, tipo: 'CNPJ' };
  return { ok: false, tipo: null };
}

function isDecimal(value) {
  if (value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0;
}

function isInteger(value) {
  if (value === null || value === undefined) return false;
  const n = Number(value);
  return Number.isInteger(n) && n > 0;
}

function isState(value) {
  return /^[A-Z]{2}$/.test(String(value || '').toUpperCase());
}

function str(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

module.exports = {
  onlyDigits,
  isEmail,
  isDate,
  isValidCpfCnpj,
  isDecimal,
  isInteger,
  isState,
  str,
};