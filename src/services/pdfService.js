const PDFDocument = require('pdfkit');

class PdfService {
    async generateSticker(vehicle) {
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
                   .fontSize(20)
                   .text('HOSPITAL CARDOSO FONTES', { align: 'center' });
                
                doc.moveDown(0.5);
                
                doc.font('Helvetica')
                   .fontSize(14)
                   .text('CONTROLE DE ESTACIONAMENTO', { align: 'center' });

                doc.moveDown(1);

                // Dados do veículo em destaque
                doc.font('Helvetica-Bold')
                   .fontSize(36)
                   .text(vehicle.plate.toUpperCase(), { align: 'center' });

                doc.moveDown(0.5);

                doc.font('Helvetica')
                   .fontSize(14)
                   .text(`${vehicle.brand} ${vehicle.model} - ${vehicle.color}`, { align: 'center' });

                doc.moveDown(1);

                // Linha divisória
                doc.moveTo(30, doc.y).lineTo(389, doc.y).stroke('#ccc');
                doc.moveDown(0.5);

                // Dados do colaborador
                doc.font('Helvetica')
                   .fontSize(10)
                   .text(`Colaborador: ${vehicle.full_name}`, { align: 'left' });
                
                doc.text(`Setor: ${vehicle.sector || 'N/A'}`, { align: 'left' });

                if (vehicle.needs_special_spot) {
                    doc.moveDown(0.5);
                    doc.font('Helvetica-Bold')
                       .fillColor('red')
                       .text(`VAGA ESPECIAL: ${vehicle.special_spot_details}`, { align: 'center' });
                }

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
