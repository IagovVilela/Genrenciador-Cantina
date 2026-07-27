import { redirect } from "next/navigation";
import { OrderStatus, UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge, SubmitButton } from "@/components/ui";
import {
  cancelOrderAction,
  confirmCounterPaymentAction,
} from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function CantinaPedidosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      student: { include: { user: true } },
      items: { include: { product: true } },
    },
  });

  return (
    <AppShell
      title="Pedidos"
      userName={session.user.name}
      roleLabel={
        session.user.role === UserRole.ADMIN ? "Administrador" : "Operador"
      }
      mode="staff"
    >
      <Panel
        title="Fila de pedidos"
        description="Pedidos pendentes aguardam saldo ou confirmação no balcão. Ao ficar PAGO, o sistema envia o comando MQTT."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-2 py-3">Status</th>
                <th className="px-2 py-3">Aluno</th>
                <th className="px-2 py-3">Itens</th>
                <th className="px-2 py-3">Total</th>
                <th className="px-2 py-3">Quando</th>
                <th className="px-2 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-zinc-100 align-top">
                  <td className="px-2 py-3">
                    <StatusBadge status={order.status} />
                    {order.robotMessage ? (
                      <p className="mt-1 max-w-[180px] text-xs text-zinc-500">
                        {order.robotMessage}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-2 py-3">
                    <p className="font-medium">{order.student.user.name}</p>
                    <p className="text-xs text-zinc-500">
                      {order.student.matricula}
                    </p>
                  </td>
                  <td className="px-2 py-3">
                    {order.items.map((item) => (
                      <p key={item.id}>
                        {item.product.name} · slot {item.slot}
                      </p>
                    ))}
                  </td>
                  <td className="px-2 py-3">{formatCurrency(order.total)}</td>
                  <td className="px-2 py-3">{formatDateTime(order.createdAt)}</td>
                  <td className="px-2 py-3">
                    {order.status === OrderStatus.PENDENTE ? (
                      <div className="flex flex-col gap-2">
                        <form action={confirmCounterPaymentAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <SubmitButton>Confirmar pagamento</SubmitButton>
                        </form>
                        <form action={cancelOrderAction}>
                          <input type="hidden" name="orderId" value={order.id} />
                          <SubmitButton variant="secondary">Cancelar</SubmitButton>
                        </form>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
