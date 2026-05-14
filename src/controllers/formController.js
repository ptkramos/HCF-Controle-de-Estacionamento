const vehicleModel = require('../models/vehicleModel');

const formController = {
    // GET / - Formulário público
    index(req, res) {
        res.render('index', { 
            title: 'Controle de Estacionamento - HCF', 
            error: null 
        });
    },

    // POST /solicitar - Processa o envio do formulário
    submit(req, res) {
        try {
            const {
                fullName, cpf, sector, ramal, phone, email,
                vehicleType, brand, model, color, plate,
                isPcd, isElderly, needsSpecialSpot, specialSpotDetails
            } = req.body;

            // Validação simples de campos obrigatórios
            if (!fullName || !cpf || !sector || !ramal || !phone || !email || !vehicleType || !brand || !model || !color || !plate) {
                return res.render('index', {
                    title: 'Controle de Estacionamento - HCF',
                    error: 'Por favor, preencha todos os campos obrigatórios.'
                });
            }

            // Normalização do nome (ex: "Patrick DE SOUZA RAMOS" -> "Patrick de Souza Ramos")
            const normalizedFullName = fullName.trim().toLowerCase().replace(/(?:^|\s)\S/g, function(a) {
                return a.toUpperCase();
            }).replace(/\s(De|Da|Do|Dos|Das)\s/g, function(match) {
                return match.toLowerCase();
            });

            vehicleModel.create({
                full_name: normalizedFullName,
                cpf: cpf,
                sector: sector,
                ramal: ramal,
                phone: phone,
                email: email,
                vehicle_type: vehicleType,
                brand: brand,
                model: model,
                color: color,
                plate: plate,
                is_pcd: isPcd === 'sim',
                is_elderly: isElderly === 'sim',
                needs_special_spot: needsSpecialSpot === 'sim',
                special_spot_details: needsSpecialSpot === 'sim' ? specialSpotDetails : null
            });

            res.redirect('/sucesso');
        } catch (error) {
            console.error('Erro ao salvar solicitação:', error);
            res.render('index', {
                title: 'Controle de Estacionamento - HCF',
                error: 'Ocorreu um erro interno. Tente novamente mais tarde.'
            });
        }
    },

    // GET /sucesso - Tela de confirmação
    success(req, res) {
        res.render('sucesso', { 
            title: 'Solicitação Enviada - HCF' 
        });
    }
};

module.exports = formController;
