const cron = require('node-cron');
const listModel = require('../models/listModel');

function startCleanupJob() {
    // Executa todo dia à meia-noite
    cron.schedule('0 0 * * *', () => {
        try {
            const deleted = listModel.deleteExpired();
            if (deleted > 0) {
                console.log(`🗑️  Limpeza automática: ${deleted} lista(s) expirada(s) removida(s)`);
            }
        } catch (error) {
            console.error('Erro na limpeza automática:', error);
        }
    });

    console.log('🔄 Job de limpeza automática agendado (meia-noite diariamente)');
}

module.exports = { startCleanupJob };
