require('dotenv').config();
const http = require('http');
const app = require('./app');

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
