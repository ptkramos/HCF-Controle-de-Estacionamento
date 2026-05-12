function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/ger');
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/ger');
}

module.exports = { requireAuth, requireAdmin };
