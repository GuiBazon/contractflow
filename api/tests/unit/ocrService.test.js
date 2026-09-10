const { parseValor, parseData, parseCpfCnpj, extrairDados } = require('../../src/services/ocrService');

describe('ocrService.parseValor', () => {
  test('parseia "R$ 1.234,56"', () => {
    expect(parseValor('R$ 1.234,56')).toBe(1234.56);
  });

  test('parseia "1.000,00" sem prefixo', () => {
    expect(parseValor('1.000,00')).toBe(1000);
  });

  test('retorna null para texto sem valor monetário', () => {
    expect(parseValor('nada aqui')).toBeNull();
    expect(parseValor('')).toBeNull();
  });
});

describe('ocrService.parseData', () => {
  test('parseia data dd/mm/aaaa para aaaa-mm-dd', () => {
    expect(parseData('15/01/2026')).toBe('2026-01-15');
  });

  test('retorna null para data inválida', () => {
    expect(parseData('sem data')).toBeNull();
  });
});

describe('ocrService.parseCpfCnpj', () => {
  test('identifica CPF com máscara', () => {
    expect(parseCpfCnpj('529.982.247-25')).toBe('529.982.247-25');
  });

  test('identifica CNPJ com máscara', () => {
    expect(parseCpfCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81');
  });

  test('retorna null quando não encontra', () => {
    expect(parseCpfCnpj('sem documento')).toBeNull();
  });
});

describe('ocrService.extrairDados (RF11/RNF17)', () => {
  const textoContrato =
    'Cliente: Empresa Exemplo Ltda\n' +
    'CPF/CNPJ: 11.222.333/0001-81\n' +
    'Numero: 2026-001\n' +
    'Valor total: R$ 10.000,00\n' +
    'Pagamento em 10 x de R$ 1.000,00\n' +
    'Vencimento 10/01/2026\n' +
    'Vencimento 10/02/2026\n' +
    'PIX\n' +
    'Tipo de contrato: Servicos';

  test('extrai campos relevantes e informa campos encontrados', () => {
    const { dados, campos, confianca } = extrairDados(textoContrato);
    expect(dados.cliente_nome).toContain('Empresa Exemplo');
    expect(dados.cpf_cnpj).toBe('11.222.333/0001-81');
    expect(dados.numero).toBe('2026-001');
    expect(dados.valor_total).toBe(10000);
    expect(dados.quantidade_parcelas).toBe(10);
    expect(dados.valor_parcela).toBe(1000);
    expect(dados.vencimentos).toContain('2026-01-10');
    expect(dados.vencimentos).toContain('2026-02-10');
    expect(dados.forma_pagamento).toBe('PIX');
    expect(dados.tipo).toContain('Servicos');
    expect(campos.length).toBeGreaterThan(0);
    expect(confianca).toBeGreaterThan(0);
  });

  test('retorna confianca 0 e dados vazios em texto sem campos', () => {
    const { dados, campos, confianca } = extrairDados('texto aleatorio sem estrutura');
    expect(Object.keys(dados)).toHaveLength(0);
    expect(campos).toHaveLength(0);
    expect(confianca).toBe(0);
  });

  test('trata texto vazio sem quebrar', () => {
    const { dados, confianca } = extrairDados('');
    expect(Object.keys(dados)).toHaveLength(0);
    expect(confianca).toBe(0);
  });
});
