import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Panel, SubmitButton } from "@/components/ui";
import { placeOrderAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function AlunoCardapioPage() {
  const session = await auth();
  if (!session?.user.studentId) redirect("/login");

  const [student, products] = await Promise.all([
    prisma.student.findUnique({
      where: { id: session.user.studentId },
      include: { user: true },
    }),
    prisma.product.findMany({
      where: { active: true, stock: { gt: 0 } },
      orderBy: { slot: "asc" },
    }),
  ]);

  if (!student) redirect("/login");

  return (
    <AppShell
      title="Cardápio"
      userName={session.user.name}
      roleLabel={`Saldo ${formatCurrency(student.saldo)}`}
      mode="student"
    >
      <Panel
        title={`Olá, ${student.user.name.split(" ")[0]}`}
        description="Escolha o lanche. Com saldo suficiente, o pagamento libera o braço na hora. Sem saldo, o pedido fica pendente para o balcão."
      >
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          Matrícula <strong>{student.matricula}</strong> · saldo disponível{" "}
          <strong>{formatCurrency(student.saldo)}</strong>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {products.map((product) => {
            const canPay = student.saldo >= product.price;
            return (
              <article
                key={product.id}
                className="rounded-2xl border border-emerald-900/10 bg-gradient-to-br from-white to-emerald-50/40 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    {product.description ? (
                      <p className="mt-1 text-sm text-zinc-600">
                        {product.description}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800">
                    Slot {product.slot}
                  </span>
                </div>
                <p className="mt-3 text-xl font-semibold">
                  {formatCurrency(product.price)}
                </p>
                <p className="text-xs text-zinc-500">{product.stock} em estoque</p>

                <form action={placeOrderAction} className="mt-4 space-y-3">
                  <input type="hidden" name="productId" value={product.id} />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="payWithBalance"
                      defaultChecked={canPay}
                      disabled={!canPay}
                    />
                    Pagar com saldo
                    {!canPay ? " (insuficiente)" : ""}
                  </label>
                  <SubmitButton>
                    {canPay ? "Pedir e pagar" : "Pedir (pagar no balcão)"}
                  </SubmitButton>
                </form>
              </article>
            );
          })}
        </div>

        {products.length === 0 ? (
          <p className="text-sm text-zinc-500">Nenhum produto disponível agora.</p>
        ) : null}
      </Panel>
    </AppShell>
  );
}
