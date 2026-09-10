require('dotenv').config();
const app = require('./app');

// Fail-fast: nao sobe a API com ambiente incompleto ou segredo fraco (RNF01/RNF03)
const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`Faltam variáveis de ambiente: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.JWT_SECRET === 'secret'
    || process.env.JWT_SECRET === 'troque-por-um-segredo-longo-e-aleatorio'
    || process.env.JWT_SECRET === 'troque-este-segredo-em-producao'
    || process.env.JWT_SECRET === 'coloque-um-segredo-longo-e-seguro') {
  console.error('JWT_SECRET deve ser alterado para um valor seguro');
  process.exit(1);
}

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
