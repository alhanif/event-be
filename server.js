const express = require("express");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fs = require("fs");
const { initWhatsApp } = require("./whatsapp");
const participantRoutes = require("./routes/participant");
const authRoutes = require("./routes/auth");
const eventRoutes = require("./routes/event");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000" },
});

app.use(cors());
app.use(express.json());

// 1. VARIABLE GLOBAL waClient
// Kita gunakan 'let' agar bisa di-assign ulang saat re-inisialisasi
let waClient = initWhatsApp(io);

// 2. LOGIKA SOCKET.IO
io.on("connection", (socket) => {
  console.log("🔗 Client terhubung ke Dashboard WhatsApp:", socket.id);

  // Fungsi: Memberikan status saat diminta
  socket.on("get_status", async () => {
    let isConnected = false;
    let message = "WhatsApp belum terhubung.";

    try {
      const state = await waClient.getState().catch(() => null);
      if (state === "CONNECTED" || (waClient.info && waClient.info.wid)) {
        isConnected = true;
        message = "WhatsApp siap digunakan.";
      }
    } catch (e) {
      isConnected = false;
    }
    socket.emit("wa_status", { isConnected, message });
  });

  // Fungsi: Tes kirim pesan manual
  socket.on("test_send_message", async (data) => {
    try {
      const { phone } = data;
      let formattedPhone = phone.startsWith("0")
        ? "62" + phone.slice(1)
        : phone;
      const chatId = formattedPhone.includes("@c.us")
        ? formattedPhone
        : `${formattedPhone}@c.us`;

      const testMessage =
        "*TEST KONEKSI ADMIN*\n\nSistem notifikasi WhatsApp Anda sudah terhubung dengan benar! ✅";

      await waClient.sendMessage(chatId, testMessage);
      console.log(`✅ Pesan tes terkirim ke: ${formattedPhone}`);
    } catch (err) {
      console.error("❌ Gagal mengirim pesan tes:", err.message);
      socket.emit("wa_error", {
        message: "Gagal mengirim pesan: " + err.message,
      });
    }
  });

  // Fungsi: Logout dan Hapus Sesi
  socket.on("logout_whatsapp", async () => {
    try {
      console.log("⚠️ Memproses pemutusan sesi...");

      if (waClient) {
        waClient.removeAllListeners();
        try {
          await waClient.logout();
          await waClient.destroy();
        } catch (e) {
          console.log("Session already destroyed or logged out");
        }
      }

      const pathsToDelete = [
        path.join(__dirname, ".wwebjs_auth"),
        path.join(__dirname, ".wwebjs_cache"),
      ];

      pathsToDelete.forEach((p) => {
        if (fs.existsSync(p)) {
          fs.rmSync(p, { recursive: true, force: true });
          console.log(`🗑️ Berhasil menghapus: ${p}`);
        }
      });

      socket.emit("wa_status", {
        isConnected: false,
        message: "Sesi dihapus. Menyiapkan QR baru...",
      });

      // Re-inisialisasi waClient baru
      console.log("🔄 Re-initializing WhatsApp Client...");
      waClient = initWhatsApp(io);
    } catch (err) {
      console.error("❌ Error Logout:", err);
      socket.emit("wa_error", { message: "Gagal logout sepenuhnya." });
    }
  });
}); // <--- PENUTUP io.on("connection") YANG TADI HILANG

// 3. ROUTING API
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/auth", authRoutes);
app.use("/api/events", eventRoutes);

// Inject waClient ke route participant
// Gunakan middleware agar route selalu mendapatkan instance waClient terbaru
app.use(
  "/api/participants",
  (req, res, next) => {
    req.waClient = waClient;
    next();
  },
  participantRoutes(waClient),
);

const PORT = 5500;
server.listen(PORT, () => {
  console.log(`🚀 Backend Admin Ready on http://localhost:${PORT}`);
});
