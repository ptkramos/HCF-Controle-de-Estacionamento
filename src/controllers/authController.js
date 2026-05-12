const bcrypt = require('bcrypt');
const userModel = require('../models/userModel');

const authController = {
    // GET / - Tela de login
    loginPage(req, res) {
        if (req.session.user) {
            return res.redirect('/inicio');
        }
        res.render('login', { 
            title: 'Entrar', 
            error: null 
        });
    },

    // POST /entrar
    async loginSubmit(req, res) {
        const { username, password } = req.body;
        
        try {
            const user = userModel.findByUsername(username);
            
            if (!user) {
                return res.render('login', { 
                    title: 'Entrar', 
                    error: 'Usuário ou senha inválidos' 
                });
            }

            const validPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!validPassword) {
                return res.render('login', { 
                    title: 'Entrar', 
                    error: 'Usuário ou senha inválidos' 
                });
            }

            // Criar sessão
            req.session.user = {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role,
                sector: user.sector
            };

            res.redirect('/inicio');
        } catch (error) {
            console.error('Erro no login:', error);
            res.render('login', { 
                title: 'Entrar', 
                error: 'Erro interno. Tente novamente.' 
            });
        }
    },

    // GET /sair
    logout(req, res) {
        req.session.destroy();
        res.redirect('/');
    },

    // GET /cadastrar
    registerPage(req, res) {
        res.render('cadastrar', { 
            title: 'Cadastrar Usuário', 
            error: null, 
            success: null 
        });
    },

    // POST /cadastrar
    async registerSubmit(req, res) {
        let { fullName, password, role, sector } = req.body;
        const { normalizeName, generateUniqueUsername } = require('../utils/stringUtils');
        
        try {
            fullName = normalizeName(fullName);

            // Validar nome completo (mínimo 2 nomes)
            if (!fullName || fullName.trim().split(/\s+/).length < 2) {
                return res.render('cadastrar', { 
                    title: 'Cadastrar Usuário', 
                    error: 'Informe pelo menos nome e sobrenome',
                    success: null
                });
            }

            const username = generateUniqueUsername(fullName, userModel);
            if (!username) {
                return res.render('cadastrar', { 
                    title: 'Cadastrar Usuário', 
                    error: 'Nome inválido para geração de usuário',
                    success: null
                });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            userModel.create({ 
                username, 
                passwordHash, 
                fullName, 
                role: role || 'user', 
                sector: sector || null 
            });

            res.render('cadastrar', { 
                title: 'Cadastrar Usuário', 
                error: null, 
                success: `Usuário "${username}" cadastrado com sucesso!` 
            });
        } catch (error) {
            console.error('Erro no cadastro:', error);
            res.render('cadastrar', { 
                title: 'Cadastrar Usuário', 
                error: 'Erro ao cadastrar. Tente novamente.',
                success: null
            });
        }
    }
};

module.exports = authController;
