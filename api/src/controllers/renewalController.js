const db = require('../config/db');
const { bloquearContratoDono, criarContratoComParcelas } = require('../services/contratoService');
const { registrarHistorico } = require('../services/historicoService');
const { integer } = require('../utils/query');
const { str, isDate } = require('../utils/validators');
const { HttpError, asyncHandler } = require('../utils/http');

async function renew(req, res) {
  let conn;
  try {
    const id = integer(req.params.id, 'Contrato');
    conn = await db.getConnection();
    await conn.beginTransaction();
    const origem = await bloquearContratoDono(conn, id, req.user.id);
    if (!['ATIVO', 'EM_RENOVACAO'].includes(origem.status)) throw new HttpError(409, 'Somente contratos ativos ou em renovação podem ser renovados');
    if (!isDate(req.body.data_inicio) || (origem.data_fim && req.body.data_inicio < origem.data_fim)) {
      throw new HttpError(400, 'Informe início válido para o novo período, a partir do fim do contrato anterior');
    }
    if (req.body.cliente_id !== undefined && Number(req.body.cliente_id) !== origem.cliente_id) throw new HttpError(400, 'Renovação deve manter o cliente original');
    const dados = {
      tipo: origem.tipo, descricao: origem.descricao, forma_pagamento: origem.forma_pagamento,
      juros_percentual: origem.juros_percentual, multa_percentual: origem.multa_percentual,
      ...req.body, numero: str(req.body.numero), cliente_id: origem.cliente_id, status: 'ATIVO',
    };
    const result = await criarContratoComParcelas({ usuarioId: req.user.id, dados, connection: conn });
    if (result.erro) throw result.erro;
    await conn.execute("UPDATE contratos SET status='ENCERRADO' WHERE id=?", [id]);
    await registrarHistorico(conn, {
      contratoId: id, usuarioId: req.user.id, acao: 'RENOVADO',
      descricao: `Renovado pelo contrato ${result.contrato.numero} (id ${result.contrato.id}), a partir de ${dados.data_inicio}; anterior encerrado`,
    });
    await registrarHistorico(conn, {
      contratoId: result.contrato.id, usuarioId: req.user.id, acao: 'ORIGEM_RENOVACAO',
      descricao: `Renovação do contrato ${origem.numero} (id ${id}); financeiro e documentos anteriores preservados na origem`,
    });
    await conn.commit();
    res.status(201).json({ message: 'Renovação registrada', contrato_origem_id: id, contrato: result.contrato });
  } catch (err) {
    if (conn) await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Já existe um contrato com este número');
    throw err;
  } finally { if (conn) conn.release(); }
}
module.exports = { renew: asyncHandler(renew) };
