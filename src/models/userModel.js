const { getDatabase } = require('../config/database');

const userModel = {
    findByUsername(username) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    findById(id) {
        const db = getDatabase();
        return db.prepare('SELECT id, username, full_name, role FROM users WHERE id = ?').get(id);
    },

    create({ username, passwordHash, fullName, role = 'admin' }) {
        const db = getDatabase();
        const result = db.prepare(`
            INSERT INTO users (username, password_hash, full_name, role) 
            VALUES (?, ?, ?, ?)
        `).run(username, passwordHash, fullName, role);
        return result.lastInsertRowid;
    },

    findAll() {
        const db = getDatabase();
        return db.prepare('SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at DESC').all();
    }
};

module.exports = userModel;
