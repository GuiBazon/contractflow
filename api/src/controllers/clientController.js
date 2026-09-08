const db = require('../config/db');
const { onlyDigits, isValidCpfCnpj, isEmail, isState, str } = require('../utils/validators');

const VALID_FIELDS = [
  'nome_razao_social',
  'cpf_cnpj',
  'email',
  'telefone',
  'cep',
  'logradouro',
  'numero',
  'complemento',
  'bairro',
  'cidade',
  'estado',
  'observacoes',
];

// Todos os clientes sempre filtrados pelo dono (RNF04 / isolamento de dados)
async function listClientes(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const q = str(req.query.q);
  const offset = (page - 1) * limit;

  const where = ['cl.usuario_id = ?'];
  const params = [req.user.id];

  if (q) {
    where.push('(cl.nome_razao_social LIKE ? OR cl.cpf_cnpj LIKE ? OR cl.email LIKE ? OR cl.cidade LIKE ?)');
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  const whereSql = where.join(' AND ');

  try {
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM clientes cl WHERE ${whereSql}`,
      params
    );

    const [rows] = await db.execute(
      `SELECT cl.*,
              (SELECT COUNT(*) FROM contratos c WHERE c.cliente_id = cl.id) AS total_contratos
       FROM clientes cl
       WHERE ${whereSql}
       ORDER BY cl.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return res.json({
      data: rows,
      paginacao: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('erro ao listar clientes:', error);
    return res.status(500).json({ message: 'Erro ao listar clientes' });
  }
}

async function getClienteById(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(
      'SELECT * FROM clientes WHERE id = ? AND usuario_id = ?',
      [id, req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('erro ao buscar cliente:', error);
    return res.status(500).json({ message: 'Erro ao buscar cliente' });
  }
}

function validateCliente(body) {
  const errors = [];
  const nome = str(body.nome_razao_social);
  if (!nome) errors.push('Nome/Razão social é obrigatório');

  const cpfCnpj = onlyDigits(body.cpf_cnpj);
  if (!body.cpf_cnpj) {
    errors.push('CPF/CNPJ é obrigatório');
  } else if (!isValidCpfCnpj(cpfCnpj).ok) {
    errors.push('CPF/CNPJ inválido');
  }

  if (body.email && !isEmail(body.email)) errors.push('E-mail inválido');
  if (body.estado && !isState(body.estado)) errors.push('Estado deve ter 2 letras (UF)');
  return { errors, nome, cpfCnpj };
}

async function createCliente(req, res) {
  const { errors, nome, cpfCnpj } = validateCliente(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ message: errors.join('; ') });
  }

  const {
    email,
    telefone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    observacoes,
  } = req.body;

  try {
    const [result] = await db.execute(
      `INSERT INTO clientes (
        usuario_id, nome_razao_social, cpf_cnpj, email, telefone,
        cep, logradouro, numero, complemento, bairro, cidade, estado, observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        nome,
        cpfCnpj,
        email ? str(email).toLowerCase() : null,
        telefone ? str(telefone) : null,
        cep ? str(cep) : null,
        logradouro ? str(logradouro) : null,
        numero ? str(numero) : null,
        complemento ? str(complemento) : null,
        bairro ? str(bairro) : null,
        cidade ? str(cidade) : null,
        estado ? str(estado).toUpperCase() : null,
        observacoes ? String(observacoes) : null,
      ]
    );

    return res.status(201).json({
      message: 'Cliente cadastrado com sucesso',
      cliente: { id: result.insertId, nome_razao_social: nome, cpf_cnpj: cpfCnpj },
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe um cliente com este CPF/CNPJ' });
    }
    console.error('erro ao cadastrar cliente:', error);
    return res.status(500).json({ message: 'Erro ao cadastrar cliente' });
  }
}

async function updateCliente(req, res) {
  const { id } = req.params;
  const campos = req.body;

  if (Object.keys(campos).length === 0) {
    return res.status(400).json({ message: 'Nenhum campo foi enviado para atualização' });
  }

  // garante que o cliente pertence ao usuario antes de alterar
  try {
    const [existente] = await db.execute(
      'SELECT id FROM clientes WHERE id = ? AND usuario_id = ?',
      [id, req.user.id]
    );
    if (existente.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
  } catch (error) {
    console.error('erro ao buscar cliente:', error);
    return res.status(500).json({ message: 'Erro ao atualizar cliente' });
  }

  const updates = [];
  const values = [];

  for (const field of VALID_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(campos, field)) {
      if (field === 'email') {
        updates.push('email = ?');
        values.push(campos[field] ? str(campos[field]).toLowerCase() : null);
      } else if (field === 'cpf_cnpj') {
        const cpfCnpj = onlyDigits(campos[field]);
        if (!isValidCpfCnpj(cpfCnpj).ok) {
          return res.status(400).json({ message: 'CPF/CNPJ inválido' });
        }
        updates.push('cpf_cnpj = ?');
        values.push(cpfCnpj);
      } else if (field === 'estado') {
        if (campos[field] && !isState(campos[field])) {
          return res.status(400).json({ message: 'Estado deve ter 2 letras (UF)' });
        }
        updates.push('estado = ?');
        values.push(campos[field] ? str(campos[field]).toUpperCase() : null);
      } else {
        updates.push(`${field} = ?`);
        values.push(campos[field] ? str(campos[field]) : null);
      }
    }
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'Campos inválidos para atualização' });
  }

  values.push(id, req.user.id);

  try {
    const [result] = await db.execute(
      `UPDATE clientes SET ${updates.join(', ')} WHERE id = ? AND usuario_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    return res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Já existe um cliente com este CPF/CNPJ' });
    }
    console.error('erro ao atualizar cliente:', error);
    return res.status(500).json({ message: 'Erro ao atualizar cliente' });
  }
}

async function deleteCliente(req, res) {
  const { id } = req.params;

  try {
    const [result] = await db.execute(
      'DELETE FROM clientes WHERE id = ? AND usuario_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    return res.json({ message: 'Cliente removido com sucesso' });
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED') {
      return res.status(409).json({
        message: 'Cliente possui contratos vinculados e não pode ser removido',
      });
    }
    console.error('erro ao remover cliente:', error);
    return res.status(500).json({ message: 'Erro ao remover cliente' });
  }
}

module.exports = {
  listClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
};