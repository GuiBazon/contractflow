const { extrairDados } = require('../../src/services/ocrService');

test.each([
  ['Numero do contrato: CTR-2026-001', 'CTR-2026-001'],
  ['Número do contrato: CTR-2026-001', 'CTR-2026-001'],
  ['Contrato número: CTR-2026-001', 'CTR-2026-001'],
  ['Numero: OCR-DEMO-001', 'OCR-DEMO-001'],
  ['Número de parcelas: 12', undefined],
])('identifica corretamente número de contrato em %s', (text, expected) => {
  expect(extrairDados(text).dados.numero).toBe(expected);
});
