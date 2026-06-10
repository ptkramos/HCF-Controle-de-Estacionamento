const nodemailer = require('nodemailer');
const dns = require('dns');
const MailComposer = require('nodemailer/lib/mail-composer');

// Forçar a resolução de DNS do Node.js a priorizar IPv4 para evitar erros ENETUNREACH de IPv6
if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
}

let transporter = null;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

// Variáveis para Gmail API via REST (OAuth2)
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRefreshToken = process.env.GOOGLE_REFRESH_TOKEN;

const isOAuth2Configured = !!(smtpUser && googleClientId && googleClientSecret && googleRefreshToken);

// Cache do token de acesso do Google OAuth2
let cachedAccessToken = null;
let tokenExpiryTime = 0;

async function getGmailAccessToken() {
    if (cachedAccessToken && Date.now() < tokenExpiryTime) {
        return cachedAccessToken;
    }

    console.log('🔑 [EmailService] Solicitando novo access token via OAuth2 para o Gmail...');
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            client_id: googleClientId,
            client_secret: googleClientSecret,
            refresh_token: googleRefreshToken,
            grant_type: 'refresh_token'
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha ao obter access token do Gmail: ${errorText}`);
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    // Expira em 55 minutos (margem de segurança dos 60 minutos do Google)
    tokenExpiryTime = Date.now() + (data.expires_in - 300) * 1000;
    
    return cachedAccessToken;
}

async function sendMailViaGmailApi(mailOptions) {
    const accessToken = await getGmailAccessToken();

    // Compilar a mensagem MIME bruta usando o MailComposer do nodemailer
    const mail = new MailComposer(mailOptions).compile();
    const rawMime = await new Promise((resolve, reject) => {
        mail.build((err, message) => {
            if (err) reject(err);
            else resolve(message);
        });
    });

    // Formatar como Base64URL segura
    const base64UrlMessage = Buffer.from(rawMime)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            raw: base64UrlMessage
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(JSON.stringify(errorData));
    }

    console.log(`✉️  E-mail enviado com sucesso via Gmail REST API para: ${mailOptions.to}`);
}

async function resolveSmtpHost() {
    try {
        const addresses = await dns.promises.resolve4('smtp.gmail.com');
        if (addresses && addresses.length > 0) {
            const ip = addresses[Math.floor(Math.random() * addresses.length)];
            return ip;
        }
    } catch (err) {
        // Ignora silenciosamente
    }
    return 'smtp.gmail.com';
}

async function getTransporter() {
    if (!smtpUser || !smtpPass) {
        return null;
    }
    if (transporter) {
        return transporter;
    }

    const ipHost = await resolveSmtpHost();

    transporter = nodemailer.createTransport({
        host: ipHost,
        port: 465,
        secure: true,
        auth: {
            user: smtpUser,
            pass: smtpPass
        },
        tls: {
            servername: 'smtp.gmail.com'
        },
        connectionTimeout: 10000, // 10 segundos de limite para conexão
        greetingTimeout: 10000,   // 10 segundos para o greeting SMTP
        socketTimeout: 15000      // 15 segundos de inatividade do socket
    });

    return transporter;
}

if (!isOAuth2Configured) {
    if (!smtpUser || !smtpPass) {
        console.warn('\n⚠️  [EmailService] AVISO: SMTP_USER e/ou SMTP_PASS não foram encontrados nas variáveis de ambiente (.env).');
        console.warn('⚠️  Os disparos de e-mail serão simulados no console.\n');
    } else {
        console.log('ℹ️  [EmailService] Configurado com SMTP do Gmail (desenvolvimento local).');
    }
} else {
    console.log('🌐 [EmailService] Configurado via Gmail REST API com OAuth2 (produção).');
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

        const mailOptions = {
            from: `"Estacionamento HCF" <${smtpUser}>`,
            to: vehicle.email,
            subject: subject,
            html: html
        };

        if (isOAuth2Configured) {
            try {
                console.log(`📨 [EmailService] Tentando enviar e-mail de confirmação via Gmail REST API para: ${vehicle.email}...`);
                await sendMailViaGmailApi(mailOptions);
            } catch (error) {
                console.error(`❌  Erro ao enviar e-mail de confirmação via Gmail REST API para ${vehicle.email}:`, error);
            }
        } else {
            const activeTransporter = await getTransporter();
            if (activeTransporter) {
                try {
                    console.log(`📨 [EmailService] Tentando enviar e-mail de confirmação via SMTP para: ${vehicle.email}...`);
                    await activeTransporter.sendMail(mailOptions);
                    console.log(`✉️  E-mail de confirmação de cadastro enviado via SMTP para: ${vehicle.email}`);
                } catch (error) {
                    console.error(`❌  Erro ao enviar e-mail de confirmação via SMTP para ${vehicle.email}:`, error);
                }
            } else {
                console.log(`[SIMULAÇÃO E-MAIL] Confirmação enviada para ${vehicle.email} | Placa: ${vehicle.plate}`);
            }
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

        if (isOAuth2Configured) {
            try {
                console.log(`📨 [EmailService] Tentando enviar e-mail de status (${statusLabel}) via Gmail REST API para: ${vehicle.email}...`);
                await sendMailViaGmailApi(mailOptions);
            } catch (error) {
                console.error(`❌  Erro ao enviar e-mail de status via Gmail REST API para ${vehicle.email}:`, error);
            }
        } else {
            const activeTransporter = await getTransporter();
            if (activeTransporter) {
                try {
                    console.log(`📨 [EmailService] Tentando enviar e-mail de status (${statusLabel}) via SMTP para: ${vehicle.email}...`);
                    await activeTransporter.sendMail(mailOptions);
                    console.log(`✉️  E-mail de atualização de status (${statusLabel}) enviado via SMTP para: ${vehicle.email}`);
                } catch (error) {
                    console.error(`❌  Erro ao enviar e-mail de atualização via SMTP para ${vehicle.email}:`, error);
                }
            } else {
                console.log(`[SIMULAÇÃO E-MAIL] Status ${statusLabel} enviado para ${vehicle.email} | Anexo: ${isApproved && pdfBuffer ? 'Sim' : 'Não'}`);
            }
        }
    }
};

module.exports = emailService;
