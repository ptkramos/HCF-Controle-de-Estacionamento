const { getDatabase } = require('../config/database');

const vehicleModel = {
    create(data) {
        const db = getDatabase();
        const result = db.prepare(`
            INSERT INTO vehicles (
                full_name, matricula, sector, ramal, phone, email, 
                vehicle_type, brand, model, color, plate, 
                is_pcd, is_elderly, needs_special_spot, special_spot_details, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
        `).run(
            data.full_name, data.matricula, data.sector, data.ramal, data.phone, data.email,
            data.vehicle_type, data.brand, data.model, data.color, data.plate,
            data.is_pcd ? 1 : 0, data.is_elderly ? 1 : 0, data.needs_special_spot ? 1 : 0, data.special_spot_details || null
        );
        return result.lastInsertRowid;
    },

    findAll() {
        const db = getDatabase();
        return db.prepare('SELECT * FROM vehicles ORDER BY created_at DESC').all();
    },

    findByStatus(status) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM vehicles WHERE status = ? ORDER BY created_at DESC').all(status);
    },

    findById(id) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM vehicles WHERE id = ?').get(id);
    },

    findByPlate(plate) {
        const db = getDatabase();
        return db.prepare('SELECT * FROM vehicles WHERE plate = ?').get(plate);
    },

    updateStatus(id, status, adminNotes, analyzedBy) {
        const db = getDatabase();
        return db.prepare(`
            UPDATE vehicles 
            SET status = ?, admin_notes = ?, analyzed_by = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(status, adminNotes || null, analyzedBy, id);
    }
};

module.exports = vehicleModel;
