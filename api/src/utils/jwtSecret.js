const placeholders = new Set([
  'secret',
  'troque-por-um-segredo-longo-e-aleatorio',
  'troque-este-segredo-em-producao',
  'coloque-um-segredo-longo-e-seguro',
]);

// O comprimento evita segredos triviais, mas não comprova entropia: gere o
// valor com um gerador criptográfico e mantenha-o fora do repositório.
function validJwtSecret(value) {
  return typeof value === 'string' && value.trim().length > 0
    && Buffer.byteLength(value, 'utf8') >= 32 && !placeholders.has(value);
}

module.exports = { validJwtSecret };
