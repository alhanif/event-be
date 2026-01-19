const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Fungsi ini akan menerima objek 'client' WhatsApp dari server.js
module.exports = (waClient) => {
    
    // Endpoint: Simpan Peserta & Kirim WA
    router.post('/register', async (req, res) => {
        const { name, phone, domicile, attendees } = req.body;

        try {
            // 1. Simpan ke Database
            const participant = await prisma.participant.create({
                data: { name, phone, domicile, attendees }
            });

            // 2. Kirim WA
            const message = `*KONFIRMASI PENDAFTARAN*\n\nHalo *${name}*,\nTerima kasih sudah mendaftar.\n\nDetail:\n- Domisili: ${domicile}\n- Jumlah: ${attendees}\n\nSampai jumpa!`;
            
            const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
            
            try {
                await waClient.sendMessage(chatId, message);
                await prisma.participant.update({
                    where: { id: participant.id },
                    data: { status: 'SENT' }
                });
            } catch (waErr) {
                console.error("Gagal kirim WA:", waErr);
                await prisma.participant.update({
                    where: { id: participant.id },
                    data: { status: 'FAILED' }
                });
            }

            res.status(201).json({ success: true, data: participant });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // Endpoint: Ambil Semua Peserta (untuk Admin)
    router.get('/list', async (req, res) => {
        const data = await prisma.participant.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(data);
    });

    return router;
};
