import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function AlunoPedidosPage() {
  const session = await auth();
  if (!session?.user.studentId) redirect("/login");

  const student = await prisma.student.findUnique({
    where: { id: session.user.studentId },
  });
  if (!student) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { product: true } },
    },
  });

  return (
    <AppShell
      title="Meus pedidos"
      userName={session.user.name}
      roleLabel={`Saldo ${formatCurrency(student.saldo)}`}
      mode="student"
    >
      <Panel
        title="Histórico"
        description="Acompanhe pagamento e entrega do braço robótico."
      >
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <StatusBadge status={order.status} />
                <span className="text-sm font-semibold">
                  {formatCurrency(order.total)}
                </span>
              </div>
              <p className="mt-2 text-sm">
                {order.items
                  .map((item) => `${item.product.name} (slot ${item.slot})`)
                  .join(", ")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {formatDateTime(order.createdAt)}
                {order.paymentSource ? ` · pagamento ${order.paymentSource}` : ""}
              </p>
              {order.robotMessage ? (
                <p className="mt-1 text-xs text-emerald-800">{order.robotMessage}</p>
              ) : null}
            </div>
          ))}
          {orders.length === 0 ? (
            <p className="text-sm text-zinc-500">Você ainda não fez pedidos.</p>
          ) : null}
        </div>
      </Panel>
    </AppShell>
  );
}
