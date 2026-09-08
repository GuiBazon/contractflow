const { calcJurosMulta, recalcSituacaoParcela } = require('../../src/services/financeiroService');

describe('financeiroService.calcJurosMulta (RF22/RF23)', () => {
  test('sem juros e sem multa', () => {
    const r = calcJurosMulta({ valor: 1000, diasAtraso: 10 });
    expect(r).toEqual({ multa: 0, juros: 0, total: 0 });
  });

  test('aplica multa única sobre o valor', () => {
    const r = calcJurosMulta({ valor: 1000, diasAtraso: 0, multaPercentual: 2 });
    expect(r.multa).toBe(20);
    expect(r.juros).toBe(0);
    expect(r.total).toBe(20);
  });

  test('aplica juros mensal proporcional ao dia', () => {
    // juros 3% a.m. sobre 1000 por 30 dias = 30,00
    const r = calcJurosMulta({ valor: 1000, diasAtraso: 30, jurosPercentual: 3 });
    expect(r.juros).toBe(30);
  });

  test('juros proporcional para 15 dias de 3% a.m. = 15,00', () => {
    const r = calcJurosMulta({ valor: 1000, diasAtraso: 15, jurosPercentual: 3 });
    expect(r.juros).toBe(15);
  });

  test('combina multa + juros', () => {
    const r = calcJurosMulta({ valor: 1000, diasAtraso: 30, jurosPercentual: 3, multaPercentual: 2 });
    expect(r).toEqual({ multa: 20, juros: 30, total: 50 });
  });
});

describe('financeiroService.recalcSituacaoParcela (RN06)', () => {
  const makeDb = ({ rows, updates }) => ({
    execute: jest.fn(async (sql, params) => {
      if (String(sql).includes('SELECT p.valor')) return [rows];
      if (String(sql).includes('UPDATE parcelas')) {
        if (updates) updates.push(params);
        return [{ affectedRows: 1 }];
      }
      return [[]];
    }),
  });

  test('marca como PAGA quando soma dos pagamentos >= valor', async () => {
    const updates = [];
    const db = makeDb({
      rows: [{ valor: 100, pago: 100, status: 'PENDENTE' }],
      updates,
    });
    const novo = await recalcSituacaoParcela(db, 1);
    expect(novo).toBe('PAGA');
    expect(updates.length).toBe(1);
    expect(updates[0]).toEqual(['PAGA', 1]);
  });

  test('mantém PENDENTE quando pagamento não quitou', async () => {
    const updates = [];
    const db = makeDb({
      rows: [{ valor: 100, pago: 40, status: 'PENDENTE' }],
      updates,
    });
    const novo = await recalcSituacaoParcela(db, 1);
    expect(novo).toBe('PENDENTE');
    expect(updates.length).toBe(0);
  });

  test('mantém CANCELADA mesmo com pagamento chegando ao valor', async () => {
    const updates = [];
    const db = makeDb({
      rows: [{ valor: 100, pago: 100, status: 'CANCELADA' }],
      updates,
    });
    const novo = await recalcSituacaoParcela(db, 1);
    expect(novo).toBe('CANCELADA');
    expect(updates.length).toBe(0);
  });
});
