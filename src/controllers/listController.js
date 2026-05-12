const listModel = require('../models/listModel');
const presenceModel = require('../models/presenceModel');
const qrCodeService = require('../services/qrCodeService');
const pdfService = require('../services/pdfService');

const listController = {
    // GET /inicio
    homePage(req, res) {
        res.render('home', { title: 'Início' });
    },

    // GET /criar-lista
    createPage(req, res) {
        res.render('criar-lista', { title: 'Criar Lista', error: null });
    },

    // POST /criar-lista
    async createSubmit(req, res) {
        const { title, type, dateOption, eventDate } = req.body;

        try {
            let date;
            if (dateOption === 'agora') {
                date = new Date().toISOString().split('T')[0];
            } else {
                date = eventDate;
            }

            if (!title || !type || !date) {
                return res.render('criar-lista', { 
                    title: 'Criar Lista', 
                    error: 'Preencha todos os campos obrigatórios' 
                });
            }

            const result = listModel.create({
                title,
                type,
                eventDate: date,
                scheduledNow: dateOption === 'agora',
                createdBy: req.session.user.id
            });

            res.redirect(`/lista-criada/${result.code}`);
        } catch (error) {
            console.error('Erro ao criar lista:', error);
            res.render('criar-lista', { 
                title: 'Criar Lista', 
                error: 'Erro ao criar lista. Tente novamente.' 
            });
        }
    },

    // GET /lista-criada/:code
    async listCreatedPage(req, res) {
        try {
            const list = listModel.findByCode(req.params.code);
            
            if (!list || list.created_by !== req.session.user.id) {
                return res.redirect('/gerenciar');
            }

            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
            const confirmUrl = `${baseUrl}/confirmar/${list.code}`;
            const qrDataUrl = await qrCodeService.generateDataUrl(confirmUrl);

            res.render('lista-criada', { 
                title: 'Lista Criada',
                list,
                confirmUrl,
                qrDataUrl
            });
        } catch (error) {
            console.error('Erro ao carregar lista criada:', error);
            res.redirect('/gerenciar');
        }
    },

    // GET /gerenciar
    myListsPage(req, res) {
        try {
            const lists = listModel.findByUser(req.session.user.id);
            const today = new Date().toISOString().split('T')[0];
            
            // Marcar status de cada lista
            const listsWithStatus = lists.map(list => ({
                ...list,
                isActive: list.event_date === today && list.status !== 'closed',
                isExpired: new Date(list.expires_at) < new Date(),
                isFuture: list.event_date > today,
                typeLabel: list.type === 'reuniao' ? 'Reunião' : 'Treinamento',
                dateFormatted: new Date(list.event_date + 'T12:00:00').toLocaleDateString('pt-BR')
            }));

            res.render('gerenciar', { 
                title: 'Gerenciar Listas', 
                lists: listsWithStatus 
            });
        } catch (error) {
            console.error('Erro ao carregar listas:', error);
            res.render('gerenciar', { title: 'Gerenciar Listas', lists: [] });
        }
    },

    // GET /lista/:code
    async listDetailsPage(req, res) {
        try {
            const list = listModel.findByCode(req.params.code);
            
            if (!list || list.created_by !== req.session.user.id) {
                return res.redirect('/gerenciar');
            }

            const presences = presenceModel.findByList(list.id);
            const today = new Date().toISOString().split('T')[0];
            
            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
            const confirmUrl = `${baseUrl}/confirmar/${list.code}`;
            const qrDataUrl = await qrCodeService.generateDataUrl(confirmUrl);

            res.render('detalhes-lista', { 
                title: `Lista: ${list.title}`,
                list: {
                    ...list,
                    isActive: list.event_date === today && list.status !== 'closed',
                    typeLabel: list.type === 'reuniao' ? 'Reunião' : 'Treinamento',
                    dateFormatted: new Date(list.event_date + 'T12:00:00').toLocaleDateString('pt-BR')
                },
                presences,
                confirmUrl,
                qrDataUrl
            });
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
            res.redirect('/gerenciar');
        }
    },

    // GET /lista/:code/pdf
    async downloadPdf(req, res) {
        try {
            const list = listModel.findByCode(req.params.code);
            
            if (!list || list.created_by !== req.session.user.id) {
                return res.redirect('/gerenciar');
            }

            const presences = presenceModel.findByList(list.id);
            
            // Gerar PDF fresco
            const pdfBuffer = await pdfService.generate({ list, presences });
            
            // Salvar no banco
            listModel.updatePdf(list.id, pdfBuffer);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=presenca-${list.code}.pdf`);
            res.send(pdfBuffer);
        } catch (error) {
            console.error('Erro ao gerar PDF:', error);
            res.redirect(`/lista/${req.params.code}`);
        }
    },

    // POST /lista/:code/encerrar
    async closeEvent(req, res) {
        try {
            const list = listModel.findByCode(req.params.code);
            
            if (!list || list.created_by !== req.session.user.id) {
                return res.redirect('/gerenciar');
            }

            listModel.closeEvent(list.id);
            res.redirect(`/lista/${req.params.code}`);
        } catch (error) {
            console.error('Erro ao encerrar evento:', error);
            res.redirect('/gerenciar');
        }
    }
};

module.exports = listController;
