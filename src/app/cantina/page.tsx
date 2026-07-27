import { redirect } from "next/navigation";
import { OrderStatus, UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Panel, StatCard, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  cancelOrderAction,
  confirmCounterPaymentAction,
} from "@/lib/actions";
import { SubmitButton } from "@/components/ui";

export default async function CantinaDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [pendingCount, deliveringCount, deliveredToday, productCount, recent] =
    await Promise.all([
      prisma.order.count({ where: { status: OrderStatus.PENDENTE } }),
      prisma.order.count({
        where: {
          status: { in: [OrderStatus.PAGO, OrderStatus.EM_ENTREGA] },
        },
      }),
      prisma.order.count({
        where: {
          status: OrderStatus.ENTREGUE,
          deliveredAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.product.count({ where: { active: true } }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: "desc" },
        include: {
          student: { include: { user: true } },
          items: { include: { product: true } },
        },
      }),
    ]);

  return (
    <AppShell
      title="Painel da Cantina"
      userName={session.user.name}
      roleLabel={
        session.user.role === UserRole.ADMIN ? "Administrador" : "Operador"
      }
      mode="staff"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pendentes" value={String(pendingCount)} hint="Aguardando pagamento" />
        <StatCard label="Na fila do robô" value={String(deliveringCount)} hint="Pago / em entrega" />
        <StatCard label="Entregues hoje" value={String(deliveredToday)} />
        <StatCard label="Produtos ativos" value={String(productCount)} />
      </div>

      <Panel
        className="mt-6"
        title="Pedidos recentes"
        description="Confirme pagamento no balcão para liberar o braço robótico."
      >
        <div className="space-y-3">
          {recent.map((order) => (
            <div
              key={order.id}
              className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-zinc-50/70 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={order.status} />
                  <span className="text-sm font-semibold">
                    {order.student.user.name}
                  </span>
                  <span className="text-xs text-zinc-500">
                    matrícula {order.student.matricula}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-700">
                  {order.items
                    .map((item) => `${item.product.name} (slot ${item.slot})`)
                    .join(", ")}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDateTime(order.createdAt)} · {formatCurrency(order.total)}
                </p>
              </div>
              <div className="flex gap-2">
                {order.status === OrderStatus.PENDENTE ? (
                  <>
                    <form action={confirmCounterPaymentAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton>Confirmar pagamento</SubmitButton>
                    </form>
                    <form action={cancelOrderAction}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton variant="secondary">Cancelar</SubmitButton>
                    </form>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {recent.length === 0 ? (
            <p className="text-sm text-zinc-500">Nenhum pedido ainda.</p>
          ) : null}
        </div>
      </Panel>
    </AppShell>
  );
}
