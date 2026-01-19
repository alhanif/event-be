const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcrypt");

async function main() {
  // 1. Buat Admin Pertama
  const hashedPassword = await bcrypt.hash("admin123", 10);
  await prisma.admin.upsert({
    where: { email: "dev@selatour.com" },
    update: {},
    create: {
      email: "admin@selatour.com",
      password: hashedPassword,
      name: "Super Admin",
    },
  });

  // 2. Buat Event Pertama
  await prisma.event.create({
    data: {
      title: "Menyambut Ramadhan 1447H",
      location: "Hotel Axana, Padang",
      date: new Date("2026-02-01T08:00:00Z"),
      description: "Kajian eksklusif bersama Buya Muhammad Elvi Syam",
      quota: 150,
    },
  });

  console.log("Seed data berhasil dibuat!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
