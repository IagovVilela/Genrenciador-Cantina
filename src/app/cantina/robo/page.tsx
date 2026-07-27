import { redirect } from "next/navigation";
import { OrderStatus, UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Panel, StatusBadge } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/utils";

export default async function CantinaRoboPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const queue = await prisma.order.findMany({
    where: {
      status: {
        in: [OrderStatus.PAGO, OrderStatus.EM_ENTREGA, OrderStatus.FALHA],
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
    include: {
      items: { include: { product: true } },
      student: { include: { user: true } },
    },
  });

  return (
    <AppShell
      title="Status do robô"
      userName={session.user.name}
      roleLabel={
        session.user.role === UserRole.ADMIN ? "Administrador" : "Operador"
      }
      mode="staff"
    >
      <Panel
        title="Integração MQTT"
        description="Quando o pedido fica PAGO, o backend publica em cantina/robo/comando. O ESP32 responde em cantina/robo/status."
      >
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
              Broker
            </p>
            <p className="mt-1 font-mono text-xs break-all">
              {process.env.MQTT_URL ?? "mqtt://localhost:1883"}
            </p>
          </div>
          <div className="rounded-xl bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">
              Tópicos
            </p>
            <p className="mt-1 font-mono text-xs">
              {process.env.MQTT_TOPIC_COMMAND ?? "cantina/robo/comando"}
            </p>
            <p className="font-mono text-xs">
              {process.env.MQTT_TOPIC_STATUS ?? "cantina/robo/status"}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-zinc-600">
          Rode o simulador com <code className="rounded bg-zinc-100 px-1">npm run robot:sim</code>{" "}
          ou o bridge contínuo com{" "}
          <code className="rounded bg-zinc-100 px-1">npm run robot:bridge</code>.
        </p>
      </Panel>

      <Panel className="mt-6" title="Fila / histórico do braço">
        <div className="space-y-3">
          {queue.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={order.status} />
                <span className="text-sm font-semibold">
                  {order.student.user.name}
                </span>
                <span className="text-xs text-zinc-500">
                  comando enviado: {order.robotCommandSent ? "sim" : "não"}
                </span>
              </div>
              <p className="mt-1 text-sm">
                {order.items
                  .map((item) => `${item.product.name} → slot ${item.slot}`)
                  .join(", ")}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                {formatDateTime(order.updatedAt)}
                {order.robotMessage ? ` · ${order.robotMessage}` : ""}
              </p>
            </div>
          ))}
          {queue.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Nenhum pedido na fila do robô no momento.
            </p>
          ) : null}
        </div>
      </Panel>
    </AppShell>
  );
}
