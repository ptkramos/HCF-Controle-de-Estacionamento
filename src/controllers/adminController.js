const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');
const vehicleModel = require('../models/vehicleModel');

const adminController = {
    // GET /ger
    loginPage(req, res) {
        if (req.session.user) {
            return res.redirect('/inicio');
        }
        res.render('ger', { title: 'Login Hotelaria', error: null });
    },

    // POST /ger
    async loginSubmit(req, res) {
        const { username, password } = req.body;
        
        try {
            const user = userModel.findByUsername(username);
            
            if (!user) {
                return res.render('ger', { title: 'Login Hotelaria', error: 'Usuário não encontrado' });
            }

            const match = await bcrypt.compare(password, user.password_hash);
            
            if (!match) {
                return res.render('ger', { title: 'Login Hotelaria', error: 'Senha incorreta' });
            }

            req.session.user = {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role
            };

            res.redirect('/inicio');
        } catch (error) {
            console.error('Erro no login:', error);
            res.render('ger', { title: 'Login Hotelaria', error: 'Erro interno. Tente novamente.' });
        }
    },

    // GET /logout
    logout(req, res) {
        req.session.destroy();
        res.redirect('/ger');
    },

    // GET /inicio
    dashboard(req, res) {
        const { status } = req.query;
        let vehicles;

        if (status && status !== 'todos') {
            vehicles = vehicleModel.findByStatus(status);
        } else {
            vehicles = vehicleModel.findAll();
        }

        res.render('inicio', { 
            title: 'Painel Hotelaria',
            vehicles,
            currentStatus: status || 'todos'
        });
    },

    // GET /inicio/analisar/:plate
    analyzePage(req, res) {
        const { plate } = req.params;
        const vehicle = vehicleModel.findByPlate(plate);
        
        if (!vehicle) {
            return res.redirect('/inicio');
        }

        res.render('analise', {
            title: `Análise: ${vehicle.plate}`,
            vehicle
        });
    },

    // POST /inicio/analisar/:plate
    analyzeSubmit(req, res) {
        const { plate } = req.params;
        const { status, adminNotes } = req.body;
        
        try {
            const vehicle = vehicleModel.findByPlate(plate);
            if (vehicle) {
                vehicleModel.updateStatus(vehicle.id, status, adminNotes, req.session.user.id);
            }
            res.redirect('/inicio');
        } catch (error) {
            console.error('Erro ao analisar solicitação:', error);
            res.redirect('/inicio');
        }
    },

    // GET /inicio/pdf/:id
    async generatePdf(req, res) {
        const { id } = req.params;
        try {
            const vehicle = vehicleModel.findById(id);
            if (!vehicle || vehicle.status !== 'aprovado') {
                return res.status(404).send('Selo não disponível ou veículo não aprovado.');
            }

            const pdfService = require('../services/pdfService');
            const pdfBuffer = await pdfService.generateSticker(vehicle);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="selo_${vehicle.plate}.pdf"`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Erro ao gerar selo PDF:', error);
            res.status(500).send('Erro interno ao gerar o PDF.');
        }
    }
};

module.exports = adminController;
