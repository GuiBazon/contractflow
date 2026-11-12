const reversals = require('../services/paymentReversalService');

async function reverse(req, res) {
  res.json(await reversals.reverse(req.user.id, req.params.pagamentoId, req.body.motivo));
}

module.exports = { reverse };
