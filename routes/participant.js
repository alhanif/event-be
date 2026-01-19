const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

module.exports = (waClient) => {
  // Helper: Normalisasi Nomor WA
  const formatChatId = (phone) => {
    let cleanNumber = phone.replace(/[^0-9]/g, "");
    if (cleanNumber.startsWith("0")) {
      cleanNumber = "62" + cleanNumber.slice(1);
    }
    return cleanNumber.includes("@c.us") ? cleanNumber : `${cleanNumber}@c.us`;
  };

  // 1. Endpoint: Register (Simpan ke DB & Kirim WA)
  router.post("/register", async (req, res) => {
    const { name, whatsapp, eventId, customData } = req.body;

    try {
      // Simpan ke Database
      const participant = await prisma.participant.create({
        data: {
          name,
          whatsapp,
          eventId: parseInt(eventId),
          customData: customData,
          waStatus: "PENDING",
          isAttended: false,
        },
        include: { event: true },
      });

      // --- PROSES FORMAT PESAN WHATSAPP ---

      // 1. Parsing data kustom (Domisili, Jumlah Orang, dll)
      const parsedCustom = customData ? JSON.parse(customData) : {};
      const customInfo = Object.entries(parsedCustom)
        .map(([key, val]) => `✅ ${key}: ${val}`)
        .join("\n");

      // 2. Format Waktu ke Asia/Jakarta (WIB)
      const eventDateWIB = participant.event?.date
        ? new Intl.DateTimeFormat("id-ID", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "Asia/Jakarta",
          }).format(new Date(participant.event.date))
        : "-";

      // 3. Draft Pesan Sesuai Permintaan
      const message = `🙏 *Assalamualaikum pak/bu ${name}*
_Jazakallah Khairan_ telah mengisi form kehadiran, dan berikut detil form yang kami terima:

✅ Nama Lengkap: ${name}
✅ No WA Aktif: ${whatsapp}
${customInfo}

📑 *DETAIL ACARA*
📌 Event: ${participant.event?.title || "-"}
📅 Waktu: ${eventDateWIB} WIB
📍 Lokasi: ${participant.event?.location || "-"}

*Harap simpan pesan ini sebagai bukti pendaftaran.*
Sampai jumpa di lokasi!`;

      // --- KIRIM WA ---
      try {
        if (waClient) {
          await waClient.sendMessage(formatChatId(whatsapp), message);
          await prisma.participant.update({
            where: { id: participant.id },
            data: { waStatus: "SENT" },
          });
        }
      } catch (waErr) {
        console.error("WA Send Error:", waErr);
        await prisma.participant.update({
          where: { id: participant.id },
          data: { waStatus: "FAILED" },
        });
      }

      res.status(201).json({ success: true, data: participant });
    } catch (error) {
      console.error("Register Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // 2. Endpoint: List Peserta
  router.get("/list", async (req, res) => {
    try {
      const { eventId } = req.query;
      const data = await prisma.participant.findMany({
        where:
          eventId && eventId !== "all" ? { eventId: parseInt(eventId) } : {},
        include: { event: true },
        orderBy: { createdAt: "desc" },
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post("/resend/:id", async (req, res) => {
    const { id } = req.params;

    try {
      // Cari data peserta dan detail eventnya
      const participant = await prisma.participant.findUnique({
        where: { id: parseInt(id) },
        include: { event: true },
      });

      if (!participant) {
        return res
          .status(404)
          .json({ success: false, message: "Peserta tidak ditemukan" });
      }

      // Parsing data kustom (sama dengan logika di register)
      let parsedCustom = {};
      try {
        parsedCustom =
          typeof participant.customData === "string"
            ? JSON.parse(participant.customData)
            : participant.customData;
      } catch (e) {
        parsedCustom = {};
      }

      const customInfo =
        parsedCustom && typeof parsedCustom === "object"
          ? Object.entries(parsedCustom)
              .map(([key, val]) => `✅ ${key}: ${val}`)
              .join("\n")
          : "";

      const eventDateWIB = participant.event?.date
        ? new Intl.DateTimeFormat("id-ID", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "Asia/Jakarta",
          }).format(new Date(participant.event.date))
        : "-";

      // Draft Pesan
      const message = `🙏 *Assalamualaikum pak/bu ${participant.name}*
  _Jazakallah Khairan_ telah mengisi form kehadiran, dan berikut detil form yang kami terima:

  ✅ Nama Lengkap: ${participant.name}
  ✅ No WA Aktif: ${participant.whatsapp}
  ${customInfo ? customInfo + "\n" : ""}
  📑 *DETAIL ACARA*
  📌 Event: ${participant.event?.title || "-"}
  📅 Waktu: ${eventDateWIB} WIB
  📍 Lokasi: ${participant.event?.location || "-"}

  *Harap simpan pesan ini sebagai bukti pendaftaran.*
  Sampai jumpa di lokasi!`;

      // Kirim WA
      if (waClient) {
        await waClient.sendMessage(formatChatId(participant.whatsapp), message);

        // Update status di DB
        await prisma.participant.update({
          where: { id: participant.id },
          data: { waStatus: "SENT" },
        });

        res.json({ success: true, message: "WhatsApp berhasil dikirim ulang" });
      } else {
        throw new Error("WhatsApp client belum siap");
      }
    } catch (error) {
      console.error("Resend Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
