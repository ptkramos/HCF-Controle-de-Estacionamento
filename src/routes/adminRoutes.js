const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');

// Login da Hotelaria
router.get('/ger', adminController.loginPage);
router.post('/ger', adminController.loginSubmit);
router.get('/logout', adminController.logout);

    // Painel administrativo
    router.get('/inicio', requireAuth, adminController.dashboard);
    router.get('/inicio/analisar/:plate', requireAuth, adminController.analyzePage);
    router.post('/inicio/analisar/:plate', requireAuth, adminController.analyzeSubmit);
    router.get('/inicio/pdf/:id', requireAuth, adminController.generatePdf);

module.exports = router;
