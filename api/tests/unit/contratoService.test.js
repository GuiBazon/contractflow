const {
  calcularVencimentos,
  calcularValoresParcelas,
  podeGerarParcelas,
} = require('../../src/services/contratoService');

describe('contratoService.calcularVencimentos', () => {
  test('gera vencimentos mensais a partir da data de início', () => {
    const result = calcularVencimentos({
      quantidade_parcelas: 3,
      vencimentos: null,
      data_inicio: '2026-01-15',
    });
    expect(result).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
  });

  test('ajusta dia 31 para o último dia de meses mais curtos', () => {
    const result = calcularVencimentos({
      quantidade_parcelas: 2,
      vencimentos: null,
      data_inicio: '2026-01-31',
    });
    // fevereiro não tem dia 31 → usa 28
    expect(result).toEqual(['2026-01-31', '2026-02-28']);
  });

  test('faz rollover de ano', () => {
    const result = calcularVencimentos({
      quantidade_parcelas: 2,
      vencimentos: null,
      data_inicio: '2026-12-10',
    });
    expect(result).toEqual(['2026-12-10', '2027-01-10']);
  });

  test('usa a lista de vencimentos fornecida', () => {
    const result = calcularVencimentos({
      quantidade_parcelas: 2,
      vencimentos: ['2026-03-01', '2026-04-01'],
      data_inicio: null,
    });
    expect(result).toEqual(['2026-03-01', '2026-04-01']);
  });

  test('lança erro se a lista de vencimentos tem tamanho diferente da quantidade', () => {
    expect(() =>
      calcularVencimentos({ quantidade_parcelas: 3, vencimentos: ['2026-01-01', '2026-02-01'], data_inicio: null })
    ).toThrow(/difere/i);
  });

  test('lança erro se não há vencimentos nem data de início', () => {
    expect(() =>
      calcularVencimentos({ quantidade_parcelas: 2, vencimentos: null, data_inicio: null })
    ).toThrow(/vencimentos/i);
  });
});

describe('contratoService.calcularValoresParcelas', () => {
  test('distribui igualmente com última parcela absorvendo centavos', () => {
    // 1000 / 3 = 333.33 → soma 999.99 → última recebe 1000.01
    const result = calcularValoresParcelas({
      valor_total: 1000,
      valor_parcela: null,
      quantidade_parcelas: 3,
    });
    expect(result).toEqual([333.33, 333.33, 333.34]);
    expect(result.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 2);
  });

  test('divisão exata', () => {
    const result = calcularValoresParcelas({
      valor_total: 1000,
      valor_parcela: null,
      quantidade_parcelas: 10,
    });
    expect(result).toEqual(Array(10).fill(100));
  });

  test('usa valor_parcela fixo quando informado', () => {
    const result = calcularValoresParcelas({
      valor_total: 1000,
      valor_parcela: 200,
      quantidade_parcelas: 5,
    });
    expect(result).toEqual([200, 200, 200, 200, 200]);
  });

  test('soma sempre iguala o valor total (RN06)', () => {
    const totals = [
      { valor_total: 0.03, qtd: 2 },
      { valor_total: 500.01, qtd: 7 },
      { valor_total: 12345.67, qtd: 11 },
    ];
    for (const { valor_total, qtd } of totals) {
      const vals = calcularValoresParcelas({ valor_total, valor_parcela: null, quantidade_parcelas: qtd });
      expect(vals.reduce((a, b) => a + b, 0)).toBeCloseTo(valor_total, 2);
    }
  });
});

describe('contratoService.podeGerarParcelas (RN12)', () => {
  test('permite gerar em ATIVO, PENDENTE, EM_RENOVACAO', () => {
    expect(podeGerarParcelas('ATIVO')).toBe(true);
    expect(podeGerarParcelas('PENDENTE')).toBe(true);
    expect(podeGerarParcelas('EM_RENOVACAO')).toBe(true);
  });

  test('bloqueia em ENCERRADO e CANCELADO', () => {
    expect(podeGerarParcelas('ENCERRADO')).toBe(false);
    expect(podeGerarParcelas('CANCELADO')).toBe(false);
  });
});
