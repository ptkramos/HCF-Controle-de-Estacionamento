require('dotenv').config();
const app = require('./src/app');
const { initializeDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// Inicializar banco de dados
initializeDatabase();

// Seed automático (cria admin se banco estiver vazio)
const { seed } = require('./src/config/seed');
seed().catch(err => console.error('Erro no seed automático:', err));

app.listen(PORT, () => {
    console.log(`\n🏥 HCF - Controle de Estacionamento`);
    console.log(`🌐 Servidor rodando em: http://localhost:${PORT}`);
    console.log(`📅 ${new Date().toLocaleDateString('pt-BR')}\n`);
});
