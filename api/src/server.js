require('dotenv').config();
const http = require('http');
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

const PORT = Number(process.env.PORT) || 3000;
const APP_SIGNATURE = 'ContractFlow API funcionando';

function verificarApiJaRodando(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { host: '127.0.0.1', port, path: '/api/health', timeout: 2000 },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
        res.resume();
      }
    );
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: null, body: '' });
    });
    req.on('error', () => resolve({ status: null, body: '' }));
  });
}

async function iniciar() {
  const probe = await verificarApiJaRodando(PORT);

  if (probe.status === 200 && probe.body.includes(APP_SIGNATURE)) {
    console.log(
      `A API ContractFlow ja esta em execucao na porta ${PORT}. ` +
        'Nenhuma nova instancia iniciada.'
    );
    process.exit(0);
  }

  if (probe.status !== null) {
    console.error(
      `A porta ${PORT} ja esta em uso por outro servico ` +
        '(nao responde como ContractFlow). Encerrando o start.'
    );
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      verificarApiJaRodando(PORT).then((re) => {
        if (re.status === 200 && re.body.includes(APP_SIGNATURE)) {
          console.log(
            `A API ContractFlow ja estava em execucao na porta ${PORT}. ` +
              'Nenhuma nova instancia iniciada.'
          );
          process.exit(0);
        }
        console.error(
          `A porta ${PORT} esta em uso em outro processo: ${err.message}`
        );
        process.exit(1);
      });
      return;
    }
    console.error('Erro ao iniciar o servidor:', err);
    process.exit(1);
  });
}

iniciar();
