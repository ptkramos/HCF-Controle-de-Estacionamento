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
        const status = req.query.status || 'pendente';
        let vehicles;

        if (status && status !== 'todos') {
            vehicles = vehicleModel.findByStatus(status);
        } else {
            vehicles = vehicleModel.findAll();
        }

        // Calcular contadores dinamicamente para os chips
        const { getDatabase } = require('../config/database');
        const db = getDatabase();
        const counts = {
            todos: db.prepare('SELECT COUNT(*) as count FROM vehicles').get().count,
            pendente: db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'pendente'").get().count,
            aprovado: db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'aprovado'").get().count,
            indeferido: db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'indeferido'").get().count
        };

        res.render('inicio', { 
            title: 'Painel Hotelaria',
            vehicles,
            currentStatus: status,
            counts
        });
    },

    // GET /inicio/analisar/:id
    analyzePage(req, res) {
        const { id } = req.params;
        const vehicle = vehicleModel.findById(id);
        
        if (!vehicle) {
            return res.redirect('/inicio');
        }

        res.render('analise', {
            title: `Análise: ${vehicle.plate}`,
            vehicle
        });
    },

    // POST /inicio/analisar/:id
    async analyzeSubmit(req, res) {
        const { id } = req.params;
        const { status, adminNotes } = req.body;
        
        try {
            const vehicle = vehicleModel.findById(id);
            if (vehicle) {
                vehicleModel.updateStatus(vehicle.id, status, adminNotes, req.session.user.id);

                // Carregar veículo atualizado para o e-mail
                const updatedVehicle = vehicleModel.findById(vehicle.id);
                
                let pdfBuffer = null;
                if (status === 'aprovado') {
                    const pdfService = require('../services/pdfService');
                    const protocol = req.protocol;
                    const host = req.get('host');
                    const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
                    pdfBuffer = await pdfService.generateSticker(updatedVehicle, baseUrl);
                }

                // Disparar e-mail de atualização de status (Aprovado com PDF ou Indeferido)
                const emailService = require('../services/emailService');
                emailService.sendStatusUpdate(updatedVehicle, pdfBuffer).catch(err => {
                    console.error('Erro ao enviar e-mail de atualização de status:', err);
                });
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
            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
            const pdfBuffer = await pdfService.generateSticker(vehicle, baseUrl);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="selo_${vehicle.plate}.pdf"`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Erro ao gerar selo PDF:', error);
            res.status(500).send('Erro interno ao gerar o PDF.');
        }
    },

    attachDocument(req, res) {
        const { id } = req.params;
        try {
            if (!req.file) {
                console.warn('Nenhum arquivo enviado para anexar comprovante PCD.');
                return res.redirect(`/inicio/analisar/${id}`);
            }
            const vehicle = vehicleModel.findById(id);
            if (vehicle) {
                vehicleModel.updateAttachment(id, req.file.filename);
                console.log(`✅ Comprovante PCD anexado com sucesso para o veículo ID: ${id}`);
            }
            res.redirect(`/inicio/analisar/${id}`);
        } catch (error) {
            console.error('Erro ao anexar documento via painel admin:', error);
            res.redirect(`/inicio/analisar/${id}`);
        }
    }
};

module.exports = adminController;
