const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do multer para anexo do comprovante via painel de análise
const uploadDir = path.join(__dirname, '..', '..', 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Apenas PDF ou Imagens (JPEG/PNG) são permitidos."));
    }
});

// Login da Hotelaria
router.get('/ger', adminController.loginPage);
router.post('/ger', adminController.loginSubmit);
router.get('/logout', adminController.logout);

// Painel administrativo
router.get('/inicio', requireAuth, adminController.dashboard);
router.get('/inicio/analisar/:id', requireAuth, adminController.analyzePage);
router.post('/inicio/analisar/:id', requireAuth, adminController.analyzeSubmit);
router.post('/inicio/analisar/:id/anexar', requireAuth, (req, res, next) => {
    upload.single('pcdAttachment')(req, res, function(err) {
        if (err) {
            // Em caso de erro do multer, redireciona com log
            console.error('Erro no upload de anexo do admin:', err.message);
            return res.redirect(`/inicio/analisar/${req.params.id}`);
        }
        next();
    });
}, adminController.attachDocument);
router.get('/inicio/pdf/:id', requireAuth, adminController.generatePdf);

module.exports = router;
