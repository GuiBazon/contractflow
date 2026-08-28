const db = require('../config/db');

async function listClientes(req, res) {
  try {
    const [rows] = await db.execute('SELECT * FROM clientes ORDER BY id DESC');
    return res.json(rows);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar clientes' });
  }
}

async function getClienteById(req, res) {
  const { id } = req.params;

  try {
    const [rows] = await db.execute('SELECT * FROM clientes WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    return res.json(rows[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar cliente' });
  }
}

async function createCliente(req, res) {
  const {
    nome_razao_social,
    cpf_cnpj,
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

  if (!nome_razao_social || !cpf_cnpj) {
    return res.status(400).json({ message: 'Nome/Razão social e CPF/CNPJ são obrigatórios' });
  }

  try {
    const [result] = await db.execute(
      `INSERT INTO clientes (
        nome_razao_social,
        cpf_cnpj,
        email,
        telefone,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        observacoes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nome_razao_social,
        cpf_cnpj,
        email || null,
        telefone || null,
        cep || null,
        logradouro || null,
        numero || null,
        complemento || null,
        bairro || null,
        cidade || null,
        estado || null,
        observacoes || null,
      ]
    );

    return res.status(201).json({
      message: 'Cliente cadastrado com sucesso',
      cliente: {
        id: result.insertId,
        nome_razao_social,
        cpf_cnpj,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao cadastrar cliente' });
  }
}

async function updateCliente(req, res) {
  const { id } = req.params;
  const campos = req.body;

  if (Object.keys(campos).length === 0) {
    return res.status(400).json({ message: 'Nenhum campo foi enviado para atualização' });
  }

  try {
    const validFields = [
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

    const updates = [];
    const values = [];

    for (const field of validFields) {
      if (Object.prototype.hasOwnProperty.call(campos, field)) {
        updates.push(`${field} = ?`);
        values.push(campos[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Campos inválidos para atualização' });
    }

    values.push(id);

    const [result] = await db.execute(
      `UPDATE clientes SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    return res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar cliente' });
  }
}

async function deleteCliente(req, res) {
  const { id } = req.params;

  try {
    const [result] = await db.execute('DELETE FROM clientes WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }

    return res.json({ message: 'Cliente removido com sucesso' });
  } catch (error) {
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
