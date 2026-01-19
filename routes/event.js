const express = require("express");
const router = express.Router();
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Konfigurasi penyimpanan lokal
const upload = multer({ dest: "uploads/" });

// 1. AMBIL SEMUA EVENT (Untuk List Card di Home Page)
router.get("/", async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: { participants: true }, // Menghitung jumlah pendaftar per event
        },
      },
      orderBy: { date: "asc" }, // Urutkan berdasarkan tanggal terdekat
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. AMBIL DETAIL SATU EVENT (Untuk Landing Page Pendaftaran)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: {
          select: { participants: true }, // Untuk cek sisa kuota di landing page
        },
      },
    });

    if (!event) {
      return res.status(404).json({ message: "Event tidak ditemukan" });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. TAMBAH EVENT BARU
router.post(
  "/",
  upload.fields([
    { name: "flyer", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        title,
        location,
        date,
        description,
        quota,
        formSchema,
        whatsappTemplate,
      } = req.body;

      const newEvent = await prisma.event.create({
        data: {
          title,
          location,
          date: new Date(date),
          description,
          quota: parseInt(quota),
          formSchema,
          whatsappTemplate, // Template pesan custom
          flyerUrl: req.files["flyer"]
            ? `/uploads/${req.files["flyer"][0].filename}`
            : null,
          bannerUrl: req.files["banner"]
            ? `/uploads/${req.files["banner"][0].filename}`
            : null,
        },
      });
      res.status(201).json(newEvent);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// 4. UPDATE EVENT
router.put(
  "/:id",
  upload.fields([
    { name: "flyer", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const {
        title,
        location,
        date,
        description,
        quota,
        formSchema,
        whatsappTemplate,
        isActive,
      } = req.body;
      const id = parseInt(req.params.id);

      const updateData = {
        title,
        location,
        date: new Date(date),
        description,
        quota: parseInt(quota),
        formSchema,
        whatsappTemplate,
        isActive: isActive === "true",
      };

      if (req.files["flyer"])
        updateData.flyerUrl = `/uploads/${req.files["flyer"][0].filename}`;
      if (req.files["banner"])
        updateData.bannerUrl = `/uploads/${req.files["banner"][0].filename}`;

      const updatedEvent = await prisma.event.update({
        where: { id },
        data: updateData,
      });
      res.json(updatedEvent);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// 5. HAPUS EVENT
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Gunakan delete (bukan deleteMany) agar melempar error jika ID tidak ada
    await prisma.event.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Event berhasil dihapus" });
  } catch (error) {
    console.error("Error backend:", error);
    res.status(500).json({ message: "Gagal menghapus data dari server" });
  }
});

module.exports = router;
