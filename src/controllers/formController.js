const vehicleModel = require('../models/vehicleModel');
const emailService = require('../services/emailService');

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

            // Normalização do CPF (apenas números para busca/validação)
            const cleanCpf = cpf.replace(/[^\d]/g, '');

            // Verificar duplicidade por CPF
            if (vehicleModel.hasActiveRequestForCpf(cleanCpf)) {
                return res.render('index', {
                    title: 'Controle de Estacionamento - HCF',
                    error: 'Já existe uma solicitação pendente ou aprovada para este CPF.'
                });
            }

            // Tratar anexo de comprovante PCD
            let pcdAttachment = null;
            if (isPcd === 'sim') {
                if (!req.file) {
                    return res.render('index', {
                        title: 'Controle de Estacionamento - HCF',
                        error: 'Por favor, envie o comprovante de condição especial (PCD).'
                    });
                }
                pcdAttachment = req.file.filename;
            }

            // Normalização do nome (ex: "Patrick DE SOUZA RAMOS" -> "Patrick de Souza Ramos")
            const normalizedFullName = fullName.trim().toLowerCase().replace(/(?:^|\s)\S/g, function(a) {
                return a.toUpperCase();
            }).replace(/\s(De|Da|Do|Dos|Das)\s/g, function(match) {
                return match.toLowerCase();
            });

            // Criação da solicitação
            const createdId = vehicleModel.create({
                full_name: normalizedFullName,
                cpf: cleanCpf,
                sector: sector,
                ramal: ramal,
                phone: phone,
                email: email,
                vehicle_type: vehicleType,
                brand: brand,
                model: model,
                color: color,
                plate: plate.toUpperCase().trim(),
                is_pcd: isPcd === 'sim',
                is_elderly: isElderly === 'sim',
                needs_special_spot: isPcd === 'sim' || needsSpecialSpot === 'sim',
                special_spot_details: isPcd === 'sim' ? (specialSpotDetails || 'Vaga PCD') : (needsSpecialSpot === 'sim' ? specialSpotDetails : null),
                pcd_attachment: pcdAttachment
            });

            // Disparar e-mail de confirmação (sem travar a resposta)
            const newVehicle = vehicleModel.findById(createdId);
            if (newVehicle) {
                emailService.sendSubmissionConfirmation(newVehicle).catch(err => {
                    console.error('Erro ao enviar e-mail de confirmação:', err);
                });
            }

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
    },

    // GET /api/check-cpf - Verifica se o CPF possui solicitação ativa
    checkCpf(req, res) {
        try {
            const { cpf } = req.query;
            if (!cpf) {
                return res.json({ exists: false });
            }
            const cleanCpf = cpf.replace(/[^\d]/g, '');
            const exists = vehicleModel.hasActiveRequestForCpf(cleanCpf);
            return res.json({ exists });
        } catch (error) {
            console.error('Erro ao verificar CPF:', error);
            return res.status(500).json({ error: 'Erro interno do servidor.' });
        }
    },

    // GET /validar - Página de busca por placa
    validateSearch(req, res) {
        try {
            const { plate } = req.query;
            let error = null;
            
            if (plate) {
                const vehicle = vehicleModel.findByPlate(plate);
                if (vehicle) {
                    return res.redirect(`/validar/${vehicle.id}`);
                } else {
                    error = `Placa "${plate.toUpperCase()}" não encontrada no sistema.`;
                }
            }
            
            res.render('validar_busca', {
                title: 'Consultar Placa - HCF',
                error,
                plate: plate || ''
            });
        } catch (error) {
            console.error('Erro ao buscar placa:', error);
            res.status(500).send('Erro interno do servidor.');
        }
    },

    // GET /validar/:id - Validação pública do QR Code
    validate(req, res) {
        try {
            const { id } = req.params;
            const vehicle = vehicleModel.findById(id);
            if (!vehicle) {
                return res.status(404).render('404', { title: 'Validação - Não Encontrado' });
            }
            res.render('validar', {
                title: 'Validação de Acesso - HCF',
                vehicle
            });
        } catch (error) {
            console.error('Erro na validação pública:', error);
            res.status(500).send('Erro interno do servidor.');
        }
    }
};

module.exports = formController;
