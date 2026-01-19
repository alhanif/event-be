const { Client, LocalAuth } = require('whatsapp-web.js');

const initWhatsApp = (io) => {
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: { 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        }
    });

    client.on('qr', (qr) => {
        console.log('QR Received');
        io.emit('qr_code', qr);
    });

    client.on('ready', () => {
        console.log('WhatsApp is ready!');
        io.emit('wa_ready', { message: 'WhatsApp Terhubung!' });
    });

    client.initialize();
    return client;
};

module.exports = { initWhatsApp };
