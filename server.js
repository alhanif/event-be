const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initWhatsApp } = require('./whatsapp');
const participantRoutes = require('./routes/participant');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { origin: "http://localhost:3000" } // Sesuaikan port Next.js
});

app.use(cors());
app.use(express.json());

// Inisialisasi WhatsApp
const waClient = initWhatsApp(io);

// Gunakan Routes dan kirim waClient ke dalamnya
app.use('/api/participants', participantRoutes(waClient));

const PORT = 5500;
server.listen(PORT, () => {
    console.log(`🚀 Backend ready on http://localhost:${PORT}`);
});
