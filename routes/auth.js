const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey123";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const admin = await prisma.admin.findUnique({
      where: { email: email },
    });

    if (!admin) {
      return res.status(401).json({ message: "Email tidak terdaftar" });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Password salah" });
    }

    const token = jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, {
      expiresIn: "24h",
    });

    res.json({
      success: true,
      token,
      admin: { name: admin.name, email: admin.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
