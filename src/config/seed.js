const bcrypt = require('bcrypt');
const { getDatabase, initializeDatabase } = require('./database');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

async function seed() {
    initializeDatabase();
    const db = getDatabase();

    // Verificar se já existe hotelaria
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('hotelaria');
    if (existing) {
        console.log('⚠️  Usuário hotelaria já existe. Pulando seed.');
        return;
    }

    // Criar usuário hotelaria padrão
    const passwordHash = await bcrypt.hash('Hot3l@ria26', 10);
    
    db.prepare(`
        INSERT INTO users (username, password_hash, full_name, role) 
        VALUES (?, ?, ?, ?)
    `).run('hotelaria', passwordHash, 'Hotelaria - HCF', 'admin');

    console.log('✅ Seed executado com sucesso!');
}

module.exports = { seed };

// Se rodar diretamente: node src/config/seed.js
if (require.main === module) {
    seed().catch(console.error);
}
