// Testes da reconciliacao de vencimentos usada na importacao por OCR (RF10/RF11).
// Contratos reais podem listar apenas alguns vencimentos de amostra; a importacao
// deve gerar a agenda mensal completa a partir da data de inicio, sem quebrar a
// validacao estrita do cadastro manual.

const { normalizarVencimentosImportados } = require('../../src/services/contratoService');

describe('normalizarVencimentosImportados', () => {
  test('gera agenda mensal quando a lista nao corresponde a quantidade de parcelas', () => {
    const r = normalizarVencimentosImportados({
      quantidade_parcelas: 12,
      vencimentos: ['2026-03-10', '2026-04-10', '2026-05-10', '2026-06-10'],
      data_inicio: '2026-03-10',
      data_fim: '2026-06-10',
    });
    expect(r.vencimentos).toHaveLength(12);
    expect(r.vencimentos[0]).toBe('2026-03-10');
    expect(r.vencimentos[11]).toBe('2027-02-10');
    expect(r.data_fim).toBe('2027-02-10');
  });

  test('mantem a lista quando corresponde a quantidade de parcelas', () => {
    const lista = ['2026-01-05', '2026-02-05'];
    const r = normalizarVencimentosImportados({
      quantidade_parcelas: 2,
      vencimentos: lista,
      data_inicio: '2026-01-05',
    });
    expect(r.vencimentos).toEqual(lista);
    expect(r.data_fim).toBe('2026-02-05');
  });

  test('gera a partir da data de inicio quando nao ha vencimentos', () => {
    const r = normalizarVencimentosImportados({
      quantidade_parcelas: 3,
      vencimentos: [],
      data_inicio: '2026-01-31',
    });
    expect(r.vencimentos).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  test('descarta vencimentos invalidos e mantem a data de inicio', () => {
    const r = normalizarVencimentosImportados({
      quantidade_parcelas: 1,
      vencimentos: ['2026-01-05', 'data-invalida'],
      data_inicio: '2026-01-05',
    });
    expect(r.vencimentos).toEqual(['2026-01-05']);
  });
});
