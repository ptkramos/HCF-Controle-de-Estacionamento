const express = require('express');
const session = require('express-session');
const path = require('path');

const indexRoutes = require('./routes/indexRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Configurações
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1); // Confiar no proxy (Railway, Render, etc) para detectar HTTPS

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'data', 'uploads')));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'hotelaria-hcf-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' // Cookie seguro em produção
    }
}));

// Disponibilizar dados de sessão para todas as views
app.use((req, res, next) => {
    const protocol = req.protocol;
    const host = req.get('host');
    res.locals.user = req.session.user || null;
    res.locals.baseUrl = process.env.BASE_URL || `${protocol}://${host}`;
    next();
});

// Rotas
app.use('/', indexRoutes);
app.use('/', adminRoutes);

// 404
app.use((req, res) => {
    res.status(404).render('404', { title: 'Página não encontrada' });
});

module.exports = app;
