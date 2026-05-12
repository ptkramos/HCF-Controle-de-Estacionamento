const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');

// Formulário público
router.get('/', formController.index);
router.post('/solicitar', formController.submit);
router.get('/sucesso', formController.success);

module.exports = router;
