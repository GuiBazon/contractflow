const express = require('express');
const { getPerfilUsuario, updatePerfilUsuario, updateSenha } = require('../controllers/usuarioController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// PATCH /api/usuarios/senha — deve vir ANTES de /:id para nao colidir
router.patch('/senha', updateSenha);
router.patch('/password', updateSenha);

// GET  /api/usuarios/:id  — retorna perfil do usuario
router.get('/:id', getPerfilUsuario);

// PUT  /api/usuarios/:id  — atualiza perfil do usuario
router.put('/:id', updatePerfilUsuario);
router.patch('/:id', updatePerfilUsuario);

module.exports = router;

