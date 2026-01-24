const { Client, LocalAuth } = require("whatsapp-web.js");

const initWhatsApp = (io) => {
  const client = new Client({
    authStrategy: new LocalAuth({
      // Path default tetap di folder root project
      dataPath: "./.wwebjs_auth",
    }),
    puppeteer: {
      // PENTING: Gunakan Chromium sistem di Docker
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium",
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Mencegah crash karena memori /dev/shm terbatas
        "--disable-gpu",
        "--no-zygote",
        // Mencegah error SingletonLock jika profil bentrok
        "--disable-infobars",
        "--window-position=0,0",
        "--ignore-certificate-errors",
        "--ignore-certificate-errors-spki-list",
      ],
    },
  });

  client.on("qr", (qr) => {
    console.log("QR Received - Silakan scan di Dashboard");
    io.emit("qr_code", qr);
    io.emit("wa_status", {
      isConnected: false,
      message: "Silakan scan QR Code",
    });
  });

  client.on("ready", () => {
    console.log("WhatsApp is ready!");
    io.emit("wa_ready", { message: "WhatsApp Terhubung!" });
    io.emit("wa_status", {
      isConnected: true,
      message: "WhatsApp Siap digunakan",
    });
  });

  client.on("authenticated", () => {
    console.log("WhatsApp Authenticated");
  });

  client.on("auth_failure", (msg) => {
    console.error("Authentication failure:", msg);
    io.emit("wa_error", { message: "Gagal autentikasi, silakan refresh." });
  });

  client.on("disconnected", (reason) => {
    console.log("WhatsApp Disconnected:", reason);
    io.emit("wa_status", { isConnected: false, message: "WhatsApp Terputus" });
    // Coba inisialisasi ulang jika terputus tiba-tiba
    client.initialize();
  });

  client.initialize().catch((err) => {
    console.error("Initial Initialize Error:", err);
  });

  return client;
};

module.exports = { initWhatsApp };
