const { estornarPagamento } = require('../../src/controllers/paymentController');
const { bulkPayParcelas } = require('../../src/controllers/parcelaController');

describe('Controle de Pagamentos — Estorno e Baixa em Lote', () => {
  describe('estornarPagamento', () => {
    test('rejeita ID de pagamento inválido', async () => {
      const req = { params: { id: 'abc' }, body: { motivo: 'Erro' }, user: { id: 1 } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await estornarPagamento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/ID do pagamento inválido/i) })
      );
    });

    test('exige justificativa com pelo menos 3 caracteres', async () => {
      const req = { params: { id: '10' }, body: { motivo: ' ' }, user: { id: 1 } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await estornarPagamento(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/justificativa/i) })
      );
    });
  });

  describe('bulkPayParcelas', () => {
    test('exige ID do contrato', async () => {
      const req = {
        params: {},
        body: { installmentIds: [1, 2] },
        user: { id: 1 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await bulkPayParcelas(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/ID do contrato é obrigatório/i) })
      );
    });

    test('exige lista de parcelas não vazia', async () => {
      const req = {
        params: { contratoId: 5 },
        body: { installmentIds: [] },
        user: { id: 1 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await bulkPayParcelas(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringMatching(/lista de parcelas/i) })
      );
    });
  });
});

