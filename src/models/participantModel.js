const { getDatabase } = require('../config/database');

const participantModel = {
    findByCpf(cpf) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM participants WHERE cpf = ?').get(cpf);
    },

    create({ cpf, fullName, roleTitle, sector }) {
        const db = getDatabase();
        const result = db.prepare(`
            INSERT INTO participants (cpf, full_name, role_title, sector)
            VALUES (?, ?, ?, ?)
        `).run(cpf, fullName, roleTitle, sector || null);
        return result.lastInsertRowid;
    },

    update(cpf, { fullName, roleTitle, sector }) {
        const db = getDatabase();
        return db.prepare(`
            UPDATE participants 
            SET full_name = ?, role_title = ?, sector = ?, updated_at = CURRENT_TIMESTAMP
            WHERE cpf = ?
        `).run(fullName, roleTitle, sector || null, cpf);
    }
};

module.exports = participantModel;
