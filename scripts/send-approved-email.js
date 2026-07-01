const path = require('path');
// Configurar variáveis de ambiente do arquivo .env se estiver rodando localmente
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { getDatabase, initializeDatabase } = require('../src/config/database');
const vehicleModel = require('../src/models/vehicleModel');
const emailService = require('../src/services/emailService');
const pdfService = require('../src/services/pdfService');

// Inicializar DB e Tabelas
initializeDatabase();

// Ler argumentos do console
const args = process.argv.slice(2);
const getArgValue = (flag) => {
    const index = args.indexOf(flag);
    return index !== -1 ? args[index + 1] : null;
};

const id = getArgValue('--id');
const testEmail = getArgValue('--test-email');
const limit = parseInt(getArgValue('--limit')) || 1;
const since = getArgValue('--since');
const status = getArgValue('--status') || 'aprovado';

async function run() {
    try {
        if (id) {
            // Enviar e-mail de um cadastro específico
            const vehicle = vehicleModel.findById(id);
            if (!vehicle) {
                console.error(`❌ Registro com ID ${id} não encontrado.`);
                process.exit(1);
            }
            
            if (testEmail) {
                console.log(`✉️ Redirecionando e-mail do ID ${id} para o endereço de teste: ${testEmail}`);
                vehicle.email = testEmail;
            }
            
            await sendEmailForVehicle(vehicle);
        } else {
            const db = getDatabase();
            let vehicles = [];

            if (since) {
                // Buscar registros atualizados a partir de uma data/hora específica
                let query = 'SELECT * FROM vehicles WHERE updated_at >= ?';
                const queryParams = [since];

                if (status !== 'all') {
                    query += ' AND status = ?';
                    queryParams.push(status);
                } else {
                    query += " AND status IN ('aprovado', 'indeferido')";
                }

                query += ' ORDER BY updated_at ASC';
                console.log(`🔍 Buscando registros com status "${status}" desde ${since}...`);
                vehicles = db.prepare(query).all(...queryParams);
            } else {
                // Buscar os últimos registros conforme o limite informado
                let query = 'SELECT * FROM vehicles';
                const queryParams = [];

                if (status !== 'all') {
                    query += ' WHERE status = ?';
                    queryParams.push(status);
                } else {
                    query += " WHERE status IN ('aprovado', 'indeferido')";
                }

                query += ' ORDER BY id DESC LIMIT ?';
                queryParams.push(limit);

                console.log(`🔍 Buscando os últimos ${limit} registros com status "${status}"...`);
                vehicles = db.prepare(query).all(...queryParams);
            }
            
            if (vehicles.length === 0) {
                console.log('⚠️ Nenhum veículo correspondente aos filtros encontrado no banco.');
                process.exit(0);
            }
            
            console.log(`🚀 Iniciando envio em lote de ${vehicles.length} e-mails...`);
            for (let i = 0; i < vehicles.length; i++) {
                const vehicle = vehicles[i];
                if (testEmail) {
                    vehicle.email = testEmail;
                }
                
                console.log(`[${i+1}/${vehicles.length}] Enviando e-mail para ${vehicle.email} (Placa: ${vehicle.plate})...`);
                await sendEmailForVehicle(vehicle);
                
                // Delay de 2.5 segundos entre envios para evitar gargalos/limites do SMTP
                if (i < vehicles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2500));
                }
            }
        }
        console.log('✅ Execução concluída com sucesso!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Erro durante a execução do script:', err);
        process.exit(1);
    }
}

async function sendEmailForVehicle(vehicle) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    let pdfBuffer = null;
    
    if (vehicle.status === 'aprovado') {
        try {
            console.log(`📄 Gerando PDF do selo com QR Code para a placa ${vehicle.plate}...`);
            pdfBuffer = await pdfService.generateSticker(vehicle, baseUrl);
        } catch (pdfErr) {
            console.error(`❌ Erro ao gerar PDF para placa ${vehicle.plate}:`, pdfErr);
        }
    }
    
    await emailService.sendStatusUpdate(vehicle, pdfBuffer);
}

run();
