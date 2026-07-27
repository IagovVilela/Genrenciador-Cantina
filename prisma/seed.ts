import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@cantina.local" },
    update: {},
    create: {
      email: "admin@cantina.local",
      name: "Administrador",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const operator = await prisma.user.upsert({
    where: { email: "cantina@cantina.local" },
    update: {},
    create: {
      email: "cantina@cantina.local",
      name: "Operador Cantina",
      passwordHash,
      role: UserRole.OPERATOR,
    },
  });

  const studentUser = await prisma.user.upsert({
    where: { email: "aluno@cantina.local" },
    update: {},
    create: {
      email: "aluno@cantina.local",
      name: "Iago Aluno",
      passwordHash,
      role: UserRole.STUDENT,
      student: {
        create: {
          matricula: "2026001",
          saldo: 50,
        },
      },
    },
    include: { student: true },
  });

  const products = [
    {
      name: "Suco de Uva",
      description: "Caixinha 200ml",
      price: 4.5,
      stock: 20,
      slot: 1,
    },
    {
      name: "Salgado Assado",
      description: "Coxinha ou esfiha do dia",
      price: 6.0,
      stock: 15,
      slot: 2,
    },
    {
      name: "Chocolate",
      description: "Barra 40g",
      price: 3.5,
      stock: 30,
      slot: 3,
    },
    {
      name: "Água Mineral",
      description: "Garrafa 500ml",
      price: 2.5,
      stock: 25,
      slot: 4,
    },
  ];

  for (const product of products) {
    const existing = await prisma.product.findUnique({
      where: { slot: product.slot },
    });
    if (existing) {
      await prisma.product.update({
        where: { id: existing.id },
        data: product,
      });
    } else {
      await prisma.product.create({ data: product });
    }
  }

  console.log("Seed OK");
  console.log({
    admin: admin.email,
    operator: operator.email,
    student: studentUser.email,
    matricula: studentUser.student?.matricula,
    saldo: studentUser.student?.saldo,
    senha: "123456",
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
