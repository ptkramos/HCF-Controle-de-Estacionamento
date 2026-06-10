const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuração do multer para salvar comprovantes na pasta persistente data/uploads (para Railway)
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
    limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB por arquivo
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|pdf/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error("Apenas arquivos PDF ou Imagens (JPEG/PNG) são permitidos."));
    }
});

// Formulário público
router.get('/', formController.index);
router.post('/solicitar', (req, res, next) => {
    // Intercepta erros do multer para renderizar página com mensagem apropriada
    upload.single('pcdAttachment')(req, res, function(err) {
        if (err) {
            return res.render('index', {
                title: 'Controle de Estacionamento - HCF',
                error: err.message
            });
        }
        next();
    });
}, formController.submit);

router.get('/sucesso', formController.success);
router.get('/api/check-cpf', formController.checkCpf);

// Validação pública via QR Code ou busca por placa
router.get('/validar', formController.validateSearch);
router.get('/validar/:id', formController.validate);

// Rota de visualização de e-mails (desenvolvimento)
router.get('/preview-email/:type', (req, res) => {
    const { type } = req.params;
    const emailService = require('../services/emailService');
    const dummyVehicle = {
        full_name: 'Carlos da Silva Medeiros',
        cpf: '123.456.789-00',
        plate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        color: 'Prata',
        sector: 'Almoxarifado',
        email: 'carlos.silva@hcf.gov.br',
        status: type === 'aprovado' ? 'aprovado' : (type === 'indeferido' ? 'indeferido' : 'pendente'),
        admin_notes: 'Documentação do comprovante PCD não legível. Por favor, envie novamente com resolução melhor.'
    };

    let html = '';
    if (type === 'confirmacao') {
        html = emailService.getConfirmationHtml(dummyVehicle);
    } else if (type === 'aprovado' || type === 'indeferido') {
        html = emailService.getStatusUpdateHtml(dummyVehicle);
    } else {
        return res.status(404).send('Tipo de e-mail inválido. Use: confirmacao, aprovado ou indeferido.');
    }

    res.send(html);
});

module.exports = router;
