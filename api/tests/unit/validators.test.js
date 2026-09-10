const {
  onlyDigits,
  isEmail,
  isDate,
  isValidCpfCnpj,
  isDecimal,
  isInteger,
  isState,
  str,
} = require('../../src/utils/validators');

describe('validators — CPF/CNPJ', () => {
  test('aceita CPF válido', () => {
    // 529.982.247-25 é um CPF válido conhecido
    expect(isValidCpfCnpj('529.982.247-25')).toEqual({ ok: true, tipo: 'CPF' });
  });

  test('aceita CNPJ válido', () => {
    // 11.222.333/0001-81 é um CNPJ válido conhecido
    expect(isValidCpfCnpj('11.222.333/0001-81')).toEqual({ ok: true, tipo: 'CNPJ' });
  });

  test('rejeita CPF com dígito verificador errado', () => {
    expect(isValidCpfCnpj('529.982.247-26').ok).toBe(false);
  });

  test('rejeita CPF com todos os dígitos iguais', () => {
    expect(isValidCpfCnpj('111.111.111-11').ok).toBe(false);
  });

  test('rejeita CNPJ com dígito verificador errado', () => {
    expect(isValidCpfCnpj('11.222.333/0001-82').ok).toBe(false);
  });

  test('rejeita tamanho inválido', () => {
    expect(isValidCpfCnpj('123').ok).toBe(false);
    expect(isValidCpfCnpj('12345678901').ok).toBe(false);
  });

  test('retorna tipo null para vazio', () => {
    expect(isValidCpfCnpj('')).toEqual({ ok: false, tipo: null });
  });
});

describe('validators — email', () => {
  test('aceita email válido', () => {
    expect(isEmail('joao@example.com')).toBe(true);
    expect(isEmail('a.b+c@sub.exemplo.com.br')).toBe(true);
  });

  test('rejeita emails inválidos', () => {
    expect(isEmail('joao')).toBe(false);
    expect(isEmail('joao@')).toBe(false);
    expect(isEmail('@example.com')).toBe(false);
    expect(isEmail('joao@example')).toBe(false);
    expect(isEmail('')).toBe(false);
    expect(isEmail(null)).toBe(false);
  });

  test('rejeita email muito longo', () => {
    expect(isEmail(`${'a'.repeat(150)}@x.com`)).toBe(false);
  });
});

describe('validators — data', () => {
  test('aceita datas válidas', () => {
    expect(isDate('2026-01-15')).toBe(true);
    expect(isDate('2024-02-29')).toBe(true);
  });

  test('rejeita datas inválidas', () => {
    expect(isDate('2026-13-01')).toBe(false);
    expect(isDate('2021-02-29')).toBe(false);
    expect(isDate('2026-1-5')).toBe(false);
    expect(isDate('15/01/2026')).toBe(false);
    expect(isDate('abcd')).toBe(false);
  });
});

describe('validators — números', () => {
  test('isDecimal aceita zero e positivos', () => {
    expect(isDecimal(0)).toBe(true);
    expect(isDecimal(10.5)).toBe(true);
    expect(isDecimal('100')).toBe(true);
  });

  test('isDecimal rejeita negativos e NaN', () => {
    expect(isDecimal(-1)).toBe(false);
    expect(isDecimal('abc')).toBe(false);
    expect(isDecimal(NaN)).toBe(false);
    expect(isDecimal(null)).toBe(false);
  });

  test('isInteger aceita inteiros positivos', () => {
    expect(isInteger(3)).toBe(true);
    expect(isInteger('10')).toBe(true);
  });

  test('isInteger rejeita zero, negativos, decimais', () => {
    expect(isInteger(0)).toBe(false);
    expect(isInteger(-3)).toBe(false);
    expect(isInteger(2.5)).toBe(false);
  });
});

describe('validators — UF', () => {
  test('aceita UF de 2 letras', () => {
    expect(isState('SP')).toBe(true);
    expect(isState('sp')).toBe(true);
  });

  test('rejeita UFs inválidas', () => {
    expect(isState('SPX')).toBe(false);
    expect(isState('1')).toBe(false);
    expect(isState('')).toBe(false);
  });
});

describe('validators — utilidades', () => {
  test('onlyDigits remove não dígitos', () => {
    expect(onlyDigits('529.982.247-25')).toBe('52998224725');
    expect(onlyDigits('11.222.333/0001-81')).toBe('11222333000181');
  });

  test('str retorna string limpa', () => {
    expect(str('  abc  ')).toBe('abc');
    expect(str(undefined)).toBe('');
    expect(str(null)).toBe('');
    expect(str(123)).toBe('123');
  });
});
