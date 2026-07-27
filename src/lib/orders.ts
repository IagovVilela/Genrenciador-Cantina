import {
  BalanceTxType,
  OrderStatus,
  PaymentSource,
  type Order,
  type Prisma,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { publishRobotCommand } from "@/lib/mqtt";

type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: { include: { product: true } };
    student: { include: { user: true } };
  };
}>;

async function sendRobotCommandForOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!order || order.robotCommandSent) {
    return;
  }

  if (order.status !== OrderStatus.PAGO && order.status !== OrderStatus.EM_ENTREGA) {
    return;
  }

  const firstItem = order.items[0];
  if (!firstItem) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.FALHA,
        robotMessage: "Pedido sem itens para o robô",
      },
    });
    return;
  }

  const result = await publishRobotCommand({
    pedidoId: order.id,
    slot: firstItem.slot,
    produto: firstItem.product.name,
    acao: "ENTREGAR",
  });

  if (!result.ok) {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        // Mantém PAGO para permitir reenvio quando o broker voltar
        status: OrderStatus.PAGO,
        robotMessage: `Aguardando robô (MQTT): ${result.error}`,
      },
    });
    return;
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      robotCommandSent: true,
      status: OrderStatus.EM_ENTREGA,
      robotMessage: "Comando enviado ao braço robótico",
    },
  });
}

export async function markOrderPaid(params: {
  orderId: string;
  paymentSource: PaymentSource;
  confirmedById?: string;
}): Promise<OrderWithItems> {
  const order = await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({
      where: { id: params.orderId },
      include: {
        items: { include: { product: true } },
        student: { include: { user: true } },
      },
    });

    if (!current) {
      throw new Error("Pedido não encontrado");
    }

    if (
      current.status === OrderStatus.PAGO ||
      current.status === OrderStatus.EM_ENTREGA ||
      current.status === OrderStatus.ENTREGUE
    ) {
      return current;
    }

    if (current.status !== OrderStatus.PENDENTE) {
      throw new Error(`Pedido não pode ser pago no status ${current.status}`);
    }

    if (params.paymentSource === PaymentSource.SALDO) {
      const student = await tx.student.findUnique({
        where: { id: current.studentId },
      });
      if (!student) {
        throw new Error("Aluno não encontrado");
      }
      if (student.saldo < current.total) {
        throw new Error("Saldo insuficiente");
      }

      const newBalance = Number((student.saldo - current.total).toFixed(2));
      await tx.student.update({
        where: { id: student.id },
        data: { saldo: newBalance },
      });
      await tx.balanceTransaction.create({
        data: {
          studentId: student.id,
          type: BalanceTxType.DEBITO,
          amount: -current.total,
          balanceAfter: newBalance,
          note: `Débito do pedido ${current.id}`,
          orderId: current.id,
        },
      });
    }

    for (const item of current.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });
      if (!product || product.stock < item.quantity) {
        throw new Error(`Estoque insuficiente: ${item.product.name}`);
      }
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    return tx.order.update({
      where: { id: current.id },
      data: {
        status: OrderStatus.PAGO,
        paymentSource: params.paymentSource,
        confirmedById: params.confirmedById,
        paidAt: new Date(),
      },
      include: {
        items: { include: { product: true } },
        student: { include: { user: true } },
      },
    });
  });

  await sendRobotCommandForOrder(order.id);

  const refreshed = await prisma.order.findUnique({
    where: { id: order.id },
    include: {
      items: { include: { product: true } },
      student: { include: { user: true } },
    },
  });

  if (!refreshed) {
    throw new Error("Pedido não encontrado após pagamento");
  }

  return refreshed;
}

export async function createStudentOrder(params: {
  studentId: string;
  productId: string;
  quantity?: number;
  payWithBalance: boolean;
}): Promise<OrderWithItems> {
  const quantity = params.quantity ?? 1;
  if (quantity < 1) {
    throw new Error("Quantidade inválida");
  }

  const product = await prisma.product.findUnique({
    where: { id: params.productId },
  });

  if (!product || !product.active) {
    throw new Error("Produto indisponível");
  }
  if (product.stock < quantity) {
    throw new Error("Estoque insuficiente");
  }

  const total = Number((product.price * quantity).toFixed(2));

  const order = await prisma.order.create({
    data: {
      studentId: params.studentId,
      status: OrderStatus.PENDENTE,
      total,
      items: {
        create: {
          productId: product.id,
          quantity,
          unitPrice: product.price,
          slot: product.slot,
        },
      },
    },
    include: {
      items: { include: { product: true } },
      student: { include: { user: true } },
    },
  });

  if (params.payWithBalance) {
    return markOrderPaid({
      orderId: order.id,
      paymentSource: PaymentSource.SALDO,
    });
  }

  return order;
}

export async function applyRobotStatus(payload: {
  pedidoId: string;
  status: "ACEITO" | "CONCLUIDO" | "FALHA";
  mensagem?: string;
}): Promise<Order | null> {
  const order = await prisma.order.findUnique({
    where: { id: payload.pedidoId },
  });
  if (!order) {
    return null;
  }

  if (payload.status === "ACEITO") {
    return prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.EM_ENTREGA,
        robotMessage: payload.mensagem ?? "Robô aceitou o comando",
      },
    });
  }

  if (payload.status === "CONCLUIDO") {
    if (order.status === OrderStatus.ENTREGUE) {
      return order;
    }
    return prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.ENTREGUE,
        deliveredAt: new Date(),
        robotMessage: payload.mensagem ?? "Entrega concluída",
      },
    });
  }

  return prisma.order.update({
    where: { id: order.id },
    data: {
      status: OrderStatus.FALHA,
      robotMessage: payload.mensagem ?? "Falha reportada pelo robô",
    },
  });
}
