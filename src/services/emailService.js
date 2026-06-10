const nodemailer = require('nodemailer');

// Inicializa o transportador SMTP de forma segura
let transporter = null;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

if (smtpUser && smtpPass) {
    transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: smtpUser,
            pass: smtpPass
        },
        family: 4,
        connectionTimeout: 10000, // 10 segundos de limite para conexão
        greetingTimeout: 10000,   // 10 segundos para o greeting SMTP
        socketTimeout: 15000      // 15 segundos de inatividade do socket
    });
} else {
    console.warn('\n⚠️  [EmailService] AVISO: SMTP_USER e/ou SMTP_PASS não foram encontrados nas variáveis de ambiente (.env).');
    console.warn('⚠️  Os disparos de e-mail serão simulados no console.\n');
}

const emailService = {
    /**
     * Retorna o HTML do e-mail de confirmação de recebimento
     */
    getConfirmationHtml(vehicle, baseUrl = process.env.BASE_URL || 'http://localhost:3000') {
        return `
            <div style="font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background-color: #f8f9fa; padding: 24px; text-align: center; border-bottom: 1px solid #eeeeee;">
                    <img src="${baseUrl}/images/ce_logo.png" alt="Hospital Cardoso Fontes" style="height: 48px; width: auto; display: inline-block; object-fit: contain;">
                </div>
                <div style="padding: 24px; color: #333333; line-height: 1.6;">
                    <h2 style="color: #004983; margin-top: 0;">Olá, ${vehicle.full_name}!</h2>
                    <p>Sua solicitação de cadastro de veículo para acesso ao estacionamento do <strong>Hospital Cardoso Fontes</strong> foi registrada com sucesso.</p>
                    
                    <div style="background-color: #f8f9fa; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
                        <h3 style="font-size: 15px; color: #d97706;">Sua solicitação está EM ANÁLISE</h3>
                    </div>

                    <h3 style="color: #004983; border-bottom: 1px solid #eeeeee; padding-bottom: 8px;">Resumo dos Dados:</h3>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold; width: 120px;">Placa:</td>
                            <td style="padding: 6px 0;">${vehicle.plate.toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold;">Veículo:</td>
                            <td style="padding: 6px 0;">${vehicle.brand} ${vehicle.model} (${vehicle.color})</td>
                        </tr>
                    </table>

                    <p style="margin-top: 24px;">O setor responsável está analisando a sua solicitação. Você receberá um novo e-mail assim que a análise for concluída!</p>
                </div>
                <div style="background-color: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0 0 8px 0;">Este é um e-mail automático. Por favor, não responda.</p>
                    <img src="${baseUrl}/images/logo-rodape.png" alt="Hospital Cardoso Fontes" style="height: 36px; width: auto; display: inline-block; object-fit: contain;">
                </div>
            </div>
        `;
    },

    /**
     * Retorna o HTML do e-mail de atualização de status (Aprovado ou Indeferido)
     */
    getStatusUpdateHtml(vehicle, baseUrl = process.env.BASE_URL || 'http://localhost:3000') {
        const isApproved = vehicle.status === 'aprovado';

        let statusBlock = '';
        if (isApproved) {
            statusBlock = `
                <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="font-size: 15px; color: #059669;">Sua solicitação foi APROVADA!</h3>
                </div>
            `;
        } else {
            statusBlock = `
                <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 15px; color: #dc2626;">Sua solicitação foi INDEFERIDA</h3>
                    <p style="margin: 0; font-size: 14px;">
                        <strong>Motivo/Observação:</strong> ${vehicle.admin_notes || 'Sem observações adicionais.'}
                    </p>
                </div>
            `;
        }

        return `
            <div style="font-family: 'Outfit', 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background-color: #f8f9fa; padding: 24px; text-align: center; border-bottom: 1px solid #eeeeee;">
                    <img src="${baseUrl}/images/ce_logo.png" alt="Hospital Cardoso Fontes" style="height: 48px; width: auto; display: inline-block; object-fit: contain;">
                </div>
                <div style="padding: 24px; color: #333333; line-height: 1.6;">
                    <h2 style="color: #004983; margin-top: 0;">Olá, ${vehicle.full_name}!</h2>
                    <p>A análise da sua solicitação de cadastro de veículo para acesso ao estacionamento do <strong>Hospital Cardoso Fontes</strong> foi concluída.</p>
                    
                    ${statusBlock}

                    <h3 style="color: #004983; border-bottom: 1px solid #eeeeee; padding-bottom: 8px;">Dados do Cadastro:</h3>
                    <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold; width: 120px;">Placa:</td>
                            <td style="padding: 6px 0;">${vehicle.plate.toUpperCase()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; font-weight: bold;">Veículo:</td>
                            <td style="padding: 6px 0;">${vehicle.brand} ${vehicle.model} (${vehicle.color})</td>
                        </tr>
                    </table>

                    ${isApproved ? '<p style="margin-top: 24px;">A placa em anexo no e-mail possui um <strong>Código QR</strong> exclusivo que permite à equipe de segurança escanear e validar a liberação. Por favor, imprima-o e coloque-o em local visível no painel/para-brisa do seu veículo.</p>' : '<p style="margin-top: 24px;">Caso queira regularizar a situação ou contestar a análise, entre em contato com o setor de <strong>Hotelaria</strong> do <strong>Hospital Cardoso Fontes</strong>.</p>'}
                </div>
                <div style="background-color: #f8f9fa; padding: 16px; text-align: center; font-size: 12px; color: #666666; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0 0 8px 0;">Este é um e-mail automático. Por favor, não responda.</p>
                    <img src="${baseUrl}/images/logo-rodape.png" alt="Hospital Cardoso Fontes" style="height: 36px; width: auto; display: inline-block; object-fit: contain;">
                </div>
            </div>
        `;
    },

    /**
     * Envia e-mail de confirmação após a abertura da solicitação
     * @param {Object} vehicle - Dados da solicitação do veículo
     */
    async sendSubmissionConfirmation(vehicle) {
        const subject = '🏥 HCF - Solicitação de Estacionamento Recebida';
        const html = this.getConfirmationHtml(vehicle);

        if (transporter) {
            try {
                console.log(`📨 [EmailService] Tentando enviar e-mail de confirmação via SMTP para: ${vehicle.email}...`);
                await transporter.sendMail({
                    from: `"Estacionamento HCF" <${smtpUser}>`,
                    to: vehicle.email,
                    subject: subject,
                    html: html
                });
                console.log(`✉️  E-mail de confirmação de cadastro enviado para: ${vehicle.email}`);
            } catch (error) {
                console.error(`❌  Erro ao enviar e-mail de confirmação via SMTP para ${vehicle.email}:`, error);
            }
        } else {
            console.log(`[SIMULAÇÃO E-MAIL] Confirmação enviada para ${vehicle.email} | Placa: ${vehicle.plate}`);
        }
    },

    /**
     * Envia e-mail de atualização de status (Aprovado ou Indeferido)
     * @param {Object} vehicle - Dados da solicitação do veículo
     * @param {Buffer|null} pdfBuffer - Buffer do PDF do selo (somente se aprovado)
     */
    async sendStatusUpdate(vehicle, pdfBuffer = null) {
        const isApproved = vehicle.status === 'aprovado';
        const statusLabel = isApproved ? 'APROVADA' : 'INDEFERIDA';
        const subject = `🏥 HCF - Solicitação de Estacionamento: ${statusLabel}`;
        const html = this.getStatusUpdateHtml(vehicle);

        if (transporter) {
            try {
                const mailOptions = {
                    from: `"Estacionamento HCF" <${smtpUser}>`,
                    to: vehicle.email,
                    subject: subject,
                    html: html
                };

                if (isApproved && pdfBuffer) {
                    mailOptions.attachments = [
                        {
                            filename: `selo_${vehicle.plate.toUpperCase()}.pdf`,
                            content: pdfBuffer
                        }
                    ];
                }

                console.log(`📨 [EmailService] Tentando enviar e-mail de status (${statusLabel}) via SMTP para: ${vehicle.email}...`);
                await transporter.sendMail(mailOptions);
                console.log(`✉️  E-mail de atualização de status (${statusLabel}) enviado para: ${vehicle.email}`);
            } catch (error) {
                console.error(`❌  Erro ao enviar e-mail de atualização via SMTP para ${vehicle.email}:`, error);
            }
        } else {
            console.log(`[SIMULAÇÃO E-MAIL] Status ${statusLabel} enviado para ${vehicle.email} | Anexo: ${isApproved && pdfBuffer ? 'Sim' : 'Não'}`);
        }
    }
};

module.exports = emailService;
