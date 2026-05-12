const bcrypt = require('bcrypt');
const listModel = require('../models/listModel');
const presenceModel = require('../models/presenceModel');
const participantModel = require('../models/participantModel');
const userModel = require('../models/userModel');
const pdfService = require('../services/pdfService');

const presenceController = {
    // GET /confirmar/:code
    confirmPage(req, res) {
        try {
            const list = listModel.findByCode(req.params.code);
            
            if (!list) {
                return res.render('confirmar-presenca', { 
                    title: 'Confirmar Presença',
                    list: null,
                    error: 'Lista não encontrada',
                    user: req.session.user || null,
                    participant: null
                });
            }

            const today = new Date().toISOString().split('T')[0];
            const isActive = list.event_date === today && list.status !== 'closed';

            if (!isActive) {
                const eventDate = new Date(list.event_date + 'T12:00:00');
                const isFuture = list.event_date > today;
                
                return res.render('confirmar-presenca', {
                    title: 'Confirmar Presença',
                    list: {
                        ...list,
                        typeLabel: list.type === 'reuniao' ? 'Reunião' : 'Treinamento',
                        dateFormatted: eventDate.toLocaleDateString('pt-BR')
                    },
                    error: isFuture 
                        ? `Esta lista estará disponível em ${eventDate.toLocaleDateString('pt-BR')}`
                        : 'Esta lista não está mais disponível para confirmação',
                    user: req.session.user || null,
                    participant: null
                });
            }

            res.render('confirmar-presenca', { 
                title: 'Confirmar Presença',
                list: {
                    ...list,
                    typeLabel: list.type === 'reuniao' ? 'Reunião' : 'Treinamento',
                    dateFormatted: new Date(list.event_date + 'T12:00:00').toLocaleDateString('pt-BR')
                },
                error: null,
                user: req.session.user || null,
                participant: null
            });
        } catch (error) {
            console.error('Erro ao carregar confirmação:', error);
            res.render('confirmar-presenca', { 
                title: 'Confirmar Presença',
                list: null,
                error: 'Erro ao carregar lista',
                user: req.session.user || null,
                participant: null
            });
        }
    },

    // GET /api/participante/:cpf - AJAX lookup
    lookupParticipant(req, res) {
        try {
            const cpf = req.params.cpf.replace(/\D/g, '');
            if (cpf.length !== 11) {
                return res.status(400).json({ error: 'CPF inválido' });
            }

            const participant = participantModel.findByCpf(cpf);
            if (!participant) {
                return res.status(404).json({ error: 'Participante não encontrado' });
            }

            res.json({
                fullName: participant.full_name,
                roleTitle: participant.role_title,
                sector: participant.sector
            });
        } catch (error) {
            console.error('Erro ao buscar participante:', error);
            res.status(500).json({ error: 'Erro interno' });
        }
    },

    // POST /confirmar/:code
    async confirmSubmit(req, res) {
        let { participantName, participantRole, participantSector, participantCpf } = req.body;
        
        try {
            const list = listModel.findByCode(req.params.code);
            
            if (!list) {
                return res.render('confirmar-presenca', { 
                    title: 'Confirmar Presença',
                    list: null,
                    error: 'Lista não encontrada',
                    user: req.session.user || null,
                    participant: null
                });
            }

            // Verificar se está ativa hoje
            const today = new Date().toISOString().split('T')[0];
            if (list.event_date !== today || list.status === 'closed') {
                return res.render('confirmar-presenca', {
                    title: 'Confirmar Presença',
                    list,
                    error: 'Esta lista não está disponível para confirmação hoje',
                    user: req.session.user || null,
                    participant: null
                });
            }

            // Validar campos obrigatórios
            if (!participantName || !participantRole || !participantCpf || !participantSector) {
                return res.render('confirmar-presenca', {
                    title: 'Confirmar Presença',
                    list: {
                        ...list,
                        typeLabel: list.type === 'reuniao' ? 'Reunião' : 'Treinamento',
                        dateFormatted: new Date(list.event_date + 'T12:00:00').toLocaleDateString('pt-BR')
                    },
                    error: 'Todos os campos são obrigatórios',
                    user: req.session.user || null,
                    participant: null
                });
            }

            // Validar nome completo (mínimo 2 nomes)
            if (participantName.trim().split(/\s+/).length < 2) {
                return res.render('confirmar-presenca', {
                    title: 'Confirmar Presença',
                    list: {
                        ...list,
                        typeLabel: list.type === 'reuniao' ? 'Reunião' : 'Treinamento',
                        dateFormatted: new Date(list.event_date + 'T12:00:00').toLocaleDateString('pt-BR')
                    },
                    error: 'Informe pelo menos nome e sobrenome',
                    user: req.session.user || null,
                    participant: null
                });
            }

            // Limpar CPF (remover formatação)
            const cleanCpf = participantCpf.replace(/\D/g, '');
            if (cleanCpf.length !== 11) {
                return res.render('confirmar-presenca', {
                    title: 'Confirmar Presença',
                    list: {
                        ...list,
                        typeLabel: list.type === 'reuniao' ? 'Reunião' : 'Treinamento',
                        dateFormatted: new Date(list.event_date + 'T12:00:00').toLocaleDateString('pt-BR')
                    },
                    error: 'CPF inválido. Informe os 11 dígitos.',
                    user: req.session.user || null,
                    participant: null
                });
            }

            // Verificar duplicidade por CPF
            const existing = presenceModel.alreadyConfirmedByCpf(list.id, cleanCpf);
            if (existing) {
                return res.render('confirmar-presenca', {
                    title: 'Confirmar Presença',
                    list: {
                        ...list,
                        typeLabel: list.type === 'reuniao' ? 'Reunião' : 'Treinamento',
                        dateFormatted: new Date(list.event_date + 'T12:00:00').toLocaleDateString('pt-BR')
                    },
                    error: 'Sua presença já foi confirmada nesta lista',
                    user: req.session.user || null,
                    participant: null
                });
            }

            // Importar utilitários
            const { normalizeName, generateUniqueUsername } = require('../utils/stringUtils');
            participantName = normalizeName(participantName);

            // Auto-cadastro: criar ou atualizar participante
            const existingParticipant = participantModel.findByCpf(cleanCpf);
            if (!existingParticipant) {
                participantModel.create({
                    cpf: cleanCpf,
                    fullName: participantName,
                    roleTitle: participantRole,
                    sector: participantSector
                });

                // Criar conta de usuário automaticamente (se não existir)
                const username = generateUniqueUsername(participantName, userModel);
                if (username) {
                    const passwordHash = await bcrypt.hash(cleanCpf, 10);
                    userModel.create({
                        username,
                        passwordHash,
                        fullName: participantName,
                        role: 'user',
                        sector: participantSector || null
                    });
                }
            } else {
                participantModel.update(cleanCpf, {
                    fullName: participantName,
                    roleTitle: participantRole,
                    sector: participantSector
                });
            }

            // Registrar presença
            presenceModel.create({
                listId: list.id,
                participantName,
                participantRole,
                participantSector: participantSector || null,
                participantCpf: cleanCpf
            });

            // Regenerar PDF
            const presences = presenceModel.findByList(list.id);
            const pdfBuffer = await pdfService.generate({ list, presences });
            listModel.updatePdf(list.id, pdfBuffer);

            res.render('confirmacao-sucesso', {
                title: 'Presença Confirmada',
                list: {
                    ...list,
                    typeLabel: list.type === 'reuniao' ? 'Reunião' : 'Treinamento'
                },
                participantName
            });
        } catch (error) {
            console.error('Erro ao confirmar presença:', error);
            res.render('confirmar-presenca', {
                title: 'Confirmar Presença',
                list: null,
                error: 'Erro ao confirmar presença. Tente novamente.',
                user: req.session.user || null,
                participant: null
            });
        }
    }
};

module.exports = presenceController;
