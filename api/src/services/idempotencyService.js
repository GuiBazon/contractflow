const crypto = require('crypto');
const { HttpError } = require('../utils/http');

function validateKey(value) {
  if (value === undefined) return null;
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{8,128}$/.test(value)) {
    throw new HttpError(400, 'Idempotency-Key deve conter entre 8 e 128 letras, números, pontos, dois-pontos, hífens ou sublinhados');
  }
  return value;
}

// O registro pertence à transação do pagamento. Um reenvio concorrente aguarda
// a primeira transação e recebe sua resposta, sem uma segunda escrita financeira.
async function begin(connection, usuarioId, key, payment) {
  if (!key) return null;
  const hash = crypto.createHash('sha256').update(JSON.stringify(payment)).digest('hex');
  await connection.execute(`INSERT INTO chaves_idempotencia (usuario_id, chave, request_hash)
    VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`, [usuarioId, key, hash]);
  const [[row]] = await connection.execute(`SELECT id, request_hash, response_status, response_json
    FROM chaves_idempotencia WHERE usuario_id=? AND chave=? FOR UPDATE`, [usuarioId, key]);
  if (row.request_hash !== hash) throw new HttpError(409, 'Idempotency-Key já utilizada para outro pagamento');
  if (row.response_json !== null) {
    const body = typeof row.response_json === 'string' ? JSON.parse(row.response_json) : row.response_json;
    return { id: row.id, replay: true, status: row.response_status, body };
  }
  return { id: row.id, replay: false };
}

async function complete(connection, operation, status, body) {
  if (operation) await connection.execute(`UPDATE chaves_idempotencia SET response_status=?, response_json=? WHERE id=?`,
    [status, JSON.stringify(body), operation.id]);
}

module.exports = { validateKey, begin, complete };
