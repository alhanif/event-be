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
      email: "dev@selatour.com",
      password: hashedPassword,
      name: "Super Admin",
    },
  });

  console.log("Seed data berhasil dibuat!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
