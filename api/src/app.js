const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : undefined;

app.use(cors(corsOrigins ? { origin: corsOrigins } : {}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ContractFlow API funcionando' });
});

app.use('/api', routes);

// 404 para rotas nao existentes
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// RNF14 - erros nao vazam detalhes internos para o cliente
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  if (status >= 500) {
    return res.status(status).json({ message: 'Erro interno do servidor' });
  }
  return res.status(status).json({ message: err.message });
});

module.exports = app;
