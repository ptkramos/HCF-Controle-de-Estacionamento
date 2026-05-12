const { getDatabase } = require('../config/database');
const crypto = require('crypto');

const listModel = {
    generateCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem I, O, 0, 1 para evitar confusão
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    create({ title, type, eventDate, scheduledNow, createdBy }) {
        const db = getDatabase();
        
        // Gerar código único
        let code;
        do {
            code = this.generateCode();
        } while (db.prepare('SELECT id FROM lists WHERE code = ?').get(code));

        // Calcular data de expiração (event_date + 10 dias)
        const expiresAt = new Date(eventDate);
        expiresAt.setDate(expiresAt.getDate() + 10);

        const result = db.prepare(`
            INSERT INTO lists (code, title, type, event_date, scheduled_now, created_by, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(code, title, type, eventDate, scheduledNow ? 1 : 0, createdBy, expiresAt.toISOString().split('T')[0]);

        return { id: result.lastInsertRowid, code };
    },

    findByCode(code) {
        const db = getDatabase();
        return db.prepare(`
            SELECT l.*, u.full_name as creator_name 
            FROM lists l 
            JOIN users u ON l.created_by = u.id 
            WHERE l.code = ?
        `).get(code);
    },

    findByUser(userId) {
        const db = getDatabase();
        return db.prepare(`
            SELECT l.*, 
                   (SELECT COUNT(*) FROM presences WHERE list_id = l.id) as presence_count
            FROM lists l 
            WHERE l.created_by = ? 
            ORDER BY l.created_at DESC
        `).all(userId);
    },

    updatePdf(listId, pdfBuffer) {
        const db = getDatabase();
        db.prepare('UPDATE lists SET pdf_data = ? WHERE id = ?').run(pdfBuffer, listId);
    },

    closeEvent(listId) {
        const db = getDatabase();
        db.prepare("UPDATE lists SET status = 'closed' WHERE id = ?").run(listId);
    },

    getPdf(code) {
        const db = getDatabase();
        return db.prepare('SELECT pdf_data, title, code FROM lists WHERE code = ?').get(code);
    },

    deleteExpired() {
        const db = getDatabase();
        const today = new Date().toISOString().split('T')[0];
        const result = db.prepare('DELETE FROM lists WHERE expires_at < ?').run(today);
        return result.changes;
    },

    isActiveToday(eventDate) {
        const today = new Date().toISOString().split('T')[0];
        return eventDate === today;
    }
};

module.exports = listModel;
