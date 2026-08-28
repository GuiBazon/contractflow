const express = require('express');
const cors = require('cors');
const routes = require('./routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ContractFlow API funcionando' });
});

app.use('/api', routes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: 'Erro interno do servidor',
    error: err.message,
  });
});

module.exports = app;
