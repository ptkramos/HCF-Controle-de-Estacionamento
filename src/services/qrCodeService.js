const QRCode = require('qrcode');

const qrCodeService = {
    async generateDataUrl(url) {
        try {
            const dataUrl = await QRCode.toDataURL(url, {
                width: 300,
                margin: 2,
                color: {
                    dark: '#003D5B',
                    light: '#FFFFFF'
                },
                errorCorrectionLevel: 'M'
            });
            return dataUrl;
        } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
            throw error;
        }
    }
};

module.exports = qrCodeService;
