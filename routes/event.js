const express = require("express");
const router = express.Router();
const multer = require("multer");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Konfigurasi penyimpanan lokal
const upload = multer({ dest: "uploads/" });

// Ambil semua event
router.get("/", async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: { participants: true }, // Menghitung jumlah pendaftar
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handler POST harus sesuai dengan URL /api/events
router.post(
  "/",
  upload.fields([
    { name: "flyer", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, location, date, description, quota, formSchema } =
        req.body;

      const newEvent = await prisma.event.create({
        data: {
          title,
          location,
          date: new Date(date),
          description,
          quota: parseInt(quota),
          formSchema, // Data JSON dari form builder
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

// Ambil detail satu event berdasarkan ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id: parseInt(id) },
    });

    if (!event) {
      return res.status(404).json({ message: "Event tidak ditemukan" });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update event (Mendukung upload file baru)
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
        isActive,
      } = req.body;
      const id = parseInt(req.params.id);

      // Siapkan data update
      const updateData = {
        title,
        location,
        date: new Date(date),
        description,
        quota: parseInt(quota),
        formSchema,
        isActive: isActive === "true",
      };

      // Jika ada file baru yang diunggah, update URL-nya
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

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Contoh Logika (Sesuaikan dengan Database Anda, misal: Prisma, Sequelize, atau Query Mentah)
    const deletedEvent = await prisma.event.deleteMany({
      where: { id: parseInt(id) },
    });

    if (!deletedEvent) {
      return res.status(404).json({ message: "Event tidak ditemukan" });
    }

    res.status(200).json({ message: "Event berhasil dihapus" });
  } catch (error) {
    console.error("Error backend:", error);
    res.status(500).json({ message: "Gagal menghapus data dari server" });
  }
});

module.exports = router;
