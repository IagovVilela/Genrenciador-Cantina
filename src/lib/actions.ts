"use server";

import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  BalanceTxType,
  OrderStatus,
  PaymentSource,
  UserRole,
} from "@prisma/client";
import { auth, signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createStudentOrder, markOrderPaid } from "@/lib/orders";

async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Não autenticado");
  }
  return session;
}

async function requireStaff() {
  const session = await requireSession();
  if (
    session.user.role !== UserRole.ADMIN &&
    session.user.role !== UserRole.OPERATOR
  ) {
    throw new Error("Acesso negado");
  }
  return session;
}

export async function loginAction(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Email ou senha inválidos" };
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createProductAction(formData: FormData) {
  await requireStaff();

  const schema = z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    price: z.coerce.number().positive(),
    stock: z.coerce.number().int().min(0),
    slot: z.coerce.number().int().positive(),
  });

  const parsed = schema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    stock: formData.get("stock"),
    slot: formData.get("slot"),
  });

  await prisma.product.create({
    data: {
      name: parsed.name,
      description: parsed.description,
      price: parsed.price,
      stock: parsed.stock,
      slot: parsed.slot,
      active: true,
    },
  });

  revalidatePath("/cantina/produtos");
}

export async function updateProductStockAction(formData: FormData) {
  await requireStaff();
  const id = String(formData.get("id"));
  const stock = Number(formData.get("stock"));
  const active = formData.get("active") === "on";

  await prisma.product.update({
    where: { id },
    data: { stock, active },
  });

  revalidatePath("/cantina/produtos");
}

export async function rechargeStudentAction(formData: FormData) {
  const session = await requireStaff();

  const schema = z.object({
    matricula: z.string().min(1),
    amount: z.coerce.number().positive(),
    note: z.string().optional(),
  });

  const parsed = schema.parse({
    matricula: formData.get("matricula"),
    amount: formData.get("amount"),
    note: formData.get("note") || undefined,
  });

  await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { matricula: parsed.matricula },
    });
    if (!student) {
      throw new Error("Aluno não encontrado");
    }

    const balanceAfter = Number((student.saldo + parsed.amount).toFixed(2));
    await tx.student.update({
      where: { id: student.id },
      data: { saldo: balanceAfter },
    });
    await tx.balanceTransaction.create({
      data: {
        studentId: student.id,
        type: BalanceTxType.RECARGA,
        amount: parsed.amount,
        balanceAfter,
        note: parsed.note ?? "Recarga no balcão",
        operatorId: session.user.id,
      },
    });
  });

  revalidatePath("/cantina/recargas");
  revalidatePath("/cantina/alunos");
}

export async function registerStudentAction(formData: FormData) {
  await requireStaff();

  const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    matricula: z.string().min(1),
    password: z.string().min(4),
    saldo: z.coerce.number().min(0).default(0),
  });

  const parsed = schema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
    matricula: formData.get("matricula"),
    password: formData.get("password"),
    saldo: formData.get("saldo") || 0,
  });

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email.toLowerCase(),
      passwordHash,
      role: UserRole.STUDENT,
      student: {
        create: {
          matricula: parsed.matricula,
          saldo: parsed.saldo,
        },
      },
    },
  });

  revalidatePath("/cantina/alunos");
}

export async function confirmCounterPaymentAction(formData: FormData) {
  const session = await requireStaff();
  const orderId = String(formData.get("orderId"));

  await markOrderPaid({
    orderId,
    paymentSource: PaymentSource.BALCAO,
    confirmedById: session.user.id,
  });

  revalidatePath("/cantina/pedidos");
  revalidatePath("/cantina");
}

export async function cancelOrderAction(formData: FormData) {
  await requireStaff();
  const orderId = String(formData.get("orderId"));

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== OrderStatus.PENDENTE) {
    throw new Error("Somente pedidos pendentes podem ser cancelados");
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.CANCELADO },
  });

  revalidatePath("/cantina/pedidos");
}

export async function placeOrderAction(formData: FormData) {
  const session = await requireSession();
  if (session.user.role !== UserRole.STUDENT || !session.user.studentId) {
    throw new Error("Apenas alunos podem pedir");
  }

  const productId = String(formData.get("productId"));
  const payWithBalance = formData.get("payWithBalance") === "on";

  await createStudentOrder({
    studentId: session.user.studentId,
    productId,
    payWithBalance,
  });

  revalidatePath("/aluno");
  revalidatePath("/aluno/pedidos");
  revalidatePath("/cantina/pedidos");
}
