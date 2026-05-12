const { getDatabase } = require('../config/database');

const presenceModel = {
    create({ listId, participantName, participantRole, participantSector = null, participantCpf = null }) {
        const db = getDatabase();
        const result = db.prepare(`
            INSERT INTO presences (list_id, participant_name, participant_role, participant_sector, participant_cpf)
            VALUES (?, ?, ?, ?, ?)
        `).run(listId, participantName, participantRole, participantSector || null, participantCpf || null);
        return result.lastInsertRowid;
    },

    findByList(listId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT * FROM presences 
            WHERE list_id = ? 
            ORDER BY confirmed_at ASC
        `).all(listId);
    },

    countByList(listId) {
        const db = getDatabase();
        const result = db.prepare('SELECT COUNT(*) as count FROM presences WHERE list_id = ?').get(listId);
        return result.count;
    },

    alreadyConfirmed(listId, participantName) {
        const db = getDatabase();
        return db.prepare(`
            SELECT id FROM presences 
            WHERE list_id = ? AND LOWER(participant_name) = LOWER(?)
        `).get(listId, participantName);
    },

    alreadyConfirmedByCpf(listId, cpf) {
        const db = getDatabase();
        return db.prepare(`
            SELECT id FROM presences 
            WHERE list_id = ? AND participant_cpf = ?
        `).get(listId, cpf);
    }
};

module.exports = presenceModel;
