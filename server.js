const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { initWhatsApp } = require("./whatsapp");
const participantRoutes = require("./routes/participant");
const authRoutes = require("./routes/auth"); // Import auth routes
const eventRoutes = require("./routes/event");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000" },
});

app.use(cors());
app.use(express.json());

// Inisialisasi WhatsApp
const waClient = initWhatsApp(io);

// Middleware Auth (Opsional: pasang jika ingin melindungi route tertentu)
// const verifyToken = require('./middleware/auth');

// ROUTING
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes); // Route untuk login
app.use("/api/events", eventRoutes);
app.use("/api/participants", participantRoutes(waClient)); // Existing

const PORT = 5500;
server.listen(PORT, () => {
  console.log(`🚀 Backend ready on http://localhost:${PORT}`);
});
