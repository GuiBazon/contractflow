const db = require('../config/db');
const { listarLogs } = require('../services/logService');
const { isDate, str } = require('../utils/validators');

// GET /api/logs — consulta o log geral do proprio usuario (RNF04)
async function listLogs(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const offset = (page - 1) * limit;
  const acao = str(req.query.acao) || undefined;
  const entidade = str(req.query.entidade) || undefined;
  const entidadeId = Number(req.query.entidade_id) || undefined;
  const de = str(req.query.de);
  const ate = str(req.query.ate);

  try {
    const { total, rows } = await listarLogs(db, req.user.id, {
      acao,
      entidade,
      entidadeId,
      de: de && isDate(de) ? de : undefined,
      ate: ate && isDate(ate) ? ate : undefined,
      limit,
      offset,
    });

    return res.json({
      data: rows,
      paginacao: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('erro ao listar logs:', error);
    return res.status(500).json({ message: 'Erro ao listar logs' });
  }
}

// GET /api/logs/:id — detalhe de um registro do proprio usuario
async function getLogById(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(
      `SELECT l.id, l.acao, l.entidade, l.entidade_id, l.descricao, l.created_at,
              u.nome AS usuario_nome
       FROM logs l
       JOIN usuarios u ON u.id = l.usuario_id
       WHERE l.id = ? AND l.usuario_id = ?`,
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Log não encontrado' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('erro ao buscar log:', error);
    return res.status(500).json({ message: 'Erro ao buscar log' });
  }
}

module.exports = { listLogs, getLogById };
