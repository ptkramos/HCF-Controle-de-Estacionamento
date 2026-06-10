const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', '..', 'data');
const dbPath = process.env.DB_PATH || path.join(dbDir, 'estacionamento.db');

let db;

function getDatabase() {
    if (!db) {
        const targetDir = path.dirname(dbPath);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

function initializeDatabase() {
    const db = getDatabase();

    // Tabela de usuários (Hotelaria)
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT DEFAULT 'admin',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Tabela de veículos
    db.exec(`
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            cpf TEXT NOT NULL,
            sector TEXT,
            ramal TEXT,
            phone TEXT,
            email TEXT,
            vehicle_type TEXT NOT NULL,
            brand TEXT NOT NULL,
            model TEXT NOT NULL,
            color TEXT NOT NULL,
            plate TEXT NOT NULL,
            is_pcd BOOLEAN DEFAULT 0,
            is_elderly BOOLEAN DEFAULT 0,
            needs_special_spot BOOLEAN DEFAULT 0,
            special_spot_details TEXT,
            pcd_attachment TEXT,
            status TEXT DEFAULT 'pendente',
            admin_notes TEXT,
            analyzed_by INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (analyzed_by) REFERENCES users(id)
        )
    `);

    // Migração: Se a coluna matricula existir, renomear para cpf
    const tableInfo = db.prepare("PRAGMA table_info(vehicles)").all();
    const hasMatricula = tableInfo.some(col => col.name === 'matricula');
    const hasCpf = tableInfo.some(col => col.name === 'cpf');

    if (hasMatricula && !hasCpf) {
        try {
            db.exec("ALTER TABLE vehicles RENAME COLUMN matricula TO cpf");
            console.log('✅ Coluna matricula renomeada para cpf com sucesso');
        } catch (e) {
            console.error('Erro ao renomear coluna:', e);
        }
    }

    // Migração: Adicionar coluna pcd_attachment se não existir
    const hasPcdAttachment = tableInfo.some(col => col.name === 'pcd_attachment');
    if (!hasPcdAttachment) {
        try {
            db.exec("ALTER TABLE vehicles ADD COLUMN pcd_attachment TEXT");
            console.log('✅ Coluna pcd_attachment adicionada com sucesso');
        } catch (e) {
            console.error('Erro ao adicionar coluna pcd_attachment:', e);
        }
    }

    // Índices
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
        CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
        CREATE INDEX IF NOT EXISTS idx_vehicles_cpf ON vehicles(cpf);
    `);

    // Limpeza de duplicados
    cleanDuplicateVehicles(db);

    console.log('✅ Banco de dados inicializado com sucesso (Estacionamento)');
}

function cleanDuplicateVehicles(db) {
    try {
        // Encontrar CPFs duplicados
        const duplicates = db.prepare(`
            SELECT cpf, COUNT(*) as count 
            FROM vehicles 
            GROUP BY cpf 
            HAVING COUNT(*) > 1
        `).all();

        if (duplicates.length === 0) {
            return;
        }

        console.log(`🔍 Encontrados ${duplicates.length} CPFs com registros duplicados no banco. Iniciando limpeza...`);

        const deleteStmt = db.prepare('DELETE FROM vehicles WHERE id = ?');

        for (const row of duplicates) {
            const cpf = row.cpf;
            // Obter todos os registros desse CPF
            const records = db.prepare('SELECT id, status FROM vehicles WHERE cpf = ? ORDER BY id ASC').all(cpf);
            
            let keepId = null;
            
            // Priorizar o que estiver aprovado, se houver
            const approved = records.filter(r => r.status === 'aprovado');
            if (approved.length > 0) {
                keepId = approved[approved.length - 1].id;
            } else {
                // Senão, manter o mais recente
                keepId = records[records.length - 1].id;
            }

            // Deletar os outros
            for (const record of records) {
                if (record.id !== keepId) {
                    deleteStmt.run(record.id);
                }
            }
        }
        console.log('✅ Limpeza de duplicados concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao limpar duplicados no banco:', error);
    }
}

module.exports = { getDatabase, initializeDatabase };
