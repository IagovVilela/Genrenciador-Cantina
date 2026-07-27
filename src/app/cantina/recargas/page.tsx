import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Field, Panel, SubmitButton } from "@/components/ui";
import { rechargeStudentAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function CantinaRecargasPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const transactions = await prisma.balanceTransaction.findMany({
    where: { type: "RECARGA" },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      student: { include: { user: true } },
      operator: true,
    },
  });

  return (
    <AppShell
      title="Recargas"
      userName={session.user.name}
      roleLabel={
        session.user.role === UserRole.ADMIN ? "Administrador" : "Operador"
      }
      mode="staff"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel
          title="Recarregar saldo"
          description="O aluno usa esse saldo para pagar e liberar o robô automaticamente."
        >
          <form action={rechargeStudentAction} className="space-y-3">
            <Field label="Matrícula" name="matricula" required placeholder="2026001" />
            <Field label="Valor" name="amount" type="number" step="0.01" min="0.01" required />
            <Field label="Observação" name="note" placeholder="PIX / dinheiro" />
            <SubmitButton>Confirmar recarga</SubmitButton>
          </form>
        </Panel>

        <Panel title="Últimas recargas">
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{tx.student.user.name}</p>
                  <p className="font-semibold text-emerald-800">
                    +{formatCurrency(tx.amount)}
                  </p>
                </div>
                <p className="text-xs text-zinc-500">
                  {tx.student.matricula} · saldo após {formatCurrency(tx.balanceAfter)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  {formatDateTime(tx.createdAt)}
                  {tx.operator ? ` · por ${tx.operator.name}` : ""}
                </p>
              </div>
            ))}
            {transactions.length === 0 ? (
              <p className="text-sm text-zinc-500">Nenhuma recarga registrada.</p>
            ) : null}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
