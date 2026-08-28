const express = require('express');
const {
  listClientes,
  getClienteById,
  createCliente,
  updateCliente,
  deleteCliente,
} = require('../controllers/clientController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/', listClientes);
router.get('/:id', getClienteById);
router.post('/', createCliente);
router.put('/:id', updateCliente);
router.delete('/:id', deleteCliente);

module.exports = router;
