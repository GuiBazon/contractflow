const { parseCpfCnpj, extrairDados } = require('../../src/services/ocrService');

test.each([
  ['CPF: 529.982,247-25', '529.982.247-25'],
  ['CPF: 529,982.247-25', '529.982.247-25'],
  ['cpf: 529,982,247-25', '529.982.247-25'],
  ['CPF: 529.982.247-25', '529.982.247-25'],
  ['CPF: 529.982,247-26', null],
  ['CPF: 111.111,111-11', null],
  ['Valor: 529.982,247-25', null],
  ['CPF:\n529.982,247-25', null],
])('CPF extraído de %s mantém validação para separador OCR', (text, expected) => {
  expect(parseCpfCnpj(text)).toBe(expected);
  expect(extrairDados(text).dados.cpf_cnpj ?? null).toBe(expected);
});
