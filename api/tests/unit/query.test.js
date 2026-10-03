const { money, period, pagination, integer } = require('../../src/utils/query');

test.each([null, undefined, '', true, [], {}, -1, Infinity, 1.005, 10000000000])('rejeita valor monetário inválido: %p', value => {
  expect(() => money(value)).toThrow();
});
test('preserva centavos e só permite zero quando solicitado', () => {
  expect(money('450.50')).toBe(450.5);
  expect(money(0, 'Valor', { zero: true })).toBe(0);
  expect(() => money(0)).toThrow();
});
test('períodos rejeitam data inexistente e ordem invertida', () => {
  expect(() => period({ de: '2026-02-30' })).toThrow();
  expect(() => period({ de: '2026-10-03', ate: '2026-10-02' })).toThrow();
  expect(period({ de: '2024-02-29' })).toEqual({ de: '2024-02-29', ate: null });
});
test('paginação e identificadores rejeitam frações, overflow e negativos', () => {
  for (const page of ['-1', '1.5', 'NaN', '9007199254740992']) expect(() => pagination({ page })).toThrow();
  expect(() => pagination({ limit: 101 })).toThrow();
  expect(() => integer('1 OR 1=1', 'ID')).toThrow();
  expect(pagination({ page: 2, limit: 10 })).toEqual({ page: 2, limit: 10, offset: 10 });
});
