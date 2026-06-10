const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const path = require('path');

class PdfService {
    async generateSticker(vehicle, baseUrl = 'http://localhost:3000') {
        const verificationUrl = `${baseUrl}/validar/${vehicle.id}`;
        
        // Gerar QR Code
        const qrBuffer = await QRCode.toBuffer(verificationUrl, {
            margin: 1,
            width: 80,
            errorCorrectionLevel: 'M'
        });

        // Caminhos das imagens (Convertidos para PNG porque o pdfkit não suporta WebP nativamente)
        const logoPath = path.join(__dirname, '..', '..', 'public', 'images', 'ce_logo.png');
        const footerLogoPath = path.join(__dirname, '..', '..', 'public', 'images', 'logo-rodape.png');

        return new Promise((resolve, reject) => {
            try {
                // Tamanho de um crachá/selo (ex: 85mm x 55mm ou A6)
                // Vamos usar A6 landscape (aprox 419 x 297 points) para selo de para-brisa
                const doc = new PDFDocument({ 
                    size: 'A6',
                    layout: 'landscape',
                    margin: 30 
                });

                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('end', () => resolve(Buffer.concat(buffers)));

                // Título
                doc.font('Helvetica-Bold')
                   .fontSize(18)
                   .fillColor('#004983')
                   .text('HOSPITAL CARDOSO FONTES', { align: 'center' });
                
                doc.moveDown(0.6);

                // Dados do veículo em destaque
                doc.font('Helvetica-Bold')
                   .fontSize(36)
                   .fillColor('#000000')
                   .text(vehicle.plate.toUpperCase(), { align: 'center' });

                doc.moveDown(0.3);

                doc.font('Helvetica')
                   .fontSize(12)
                   .fillColor('#555555')
                   .text(`${vehicle.brand} ${vehicle.model} - ${vehicle.color}`, { align: 'center' });

                doc.moveDown(0.5);

                // Linha divisória
                const dividerY = doc.y;
                doc.moveTo(30, dividerY).lineTo(389, dividerY).stroke('#ccc');
                
                // Dados do colaborador e QR Code em 2 colunas
                const bottomY = dividerY + 6;

                // Coluna esquerda (textos)
                doc.font('Helvetica-Bold')
                   .fontSize(8)
                   .fillColor('#004983')
                   .text('COLABORADOR:', 30, bottomY);
                
                doc.font('Helvetica')
                   .fontSize(9)
                   .fillColor('#333333')
                   .text(vehicle.full_name, 30, bottomY + 10, { width: 260 });

                doc.font('Helvetica-Bold')
                   .fontSize(8)
                   .fillColor('#004983')
                   .text('SETOR:', 30, bottomY + 23);
                
                doc.font('Helvetica')
                   .fontSize(9)
                   .fillColor('#333333')
                   .text(vehicle.sector || 'N/A', 30, bottomY + 33, { width: 260 });

                // Vaga Especial
                doc.font('Helvetica-Bold')
                   .fontSize(8)
                   .fillColor('#004983')
                   .text('VAGA ESPECIAL:', 30, bottomY + 46);

                if (vehicle.needs_special_spot) {
                    doc.font('Helvetica-Bold')
                       .fontSize(9)
                       .fillColor('red')
                       .text((vehicle.special_spot_details || 'SIM').toUpperCase(), 30, bottomY + 56, { width: 260 });
                } else {
                    doc.font('Helvetica')
                       .fontSize(9)
                       .fillColor('#333333')
                       .text('NÃO', 30, bottomY + 56, { width: 260 });
                }

                // Logo do rodapé (Prefeitura/HCF) centralizado no canto inferior
                const footerLogoWidth = 120;
                const footerLogoX = (419 - footerLogoWidth) / 2;
                doc.image(footerLogoPath, footerLogoX, 252, { width: footerLogoWidth });

                // Coluna direita (QR Code)
                doc.image(qrBuffer, 314, bottomY - 3, { width: 75, height: 75 });

                // Finalizar o documento
                doc.end();

            } catch (error) {
                console.error('Erro na geração do PDF (Selo):', error);
                reject(error);
            }
        });
    }
}

module.exports = new PdfService();
