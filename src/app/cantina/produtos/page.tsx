import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Field, Panel, SubmitButton } from "@/components/ui";
import {
  createProductAction,
  updateProductStockAction,
} from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function CantinaProdutosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const products = await prisma.product.findMany({
    orderBy: { slot: "asc" },
  });

  return (
    <AppShell
      title="Produtos e slots"
      userName={session.user.name}
      roleLabel={
        session.user.role === UserRole.ADMIN ? "Administrador" : "Operador"
      }
      mode="staff"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel
          title="Novo produto"
          description="O slot é a posição física que o braço robótico vai buscar."
        >
          <form action={createProductAction} className="space-y-3">
            <Field label="Nome" name="name" required />
            <Field label="Descrição" name="description" />
            <Field label="Preço" name="price" type="number" step="0.01" min="0" required />
            <Field label="Estoque" name="stock" type="number" min="0" required defaultValue={0} />
            <Field label="Slot do robô" name="slot" type="number" min="1" required />
            <SubmitButton>Salvar produto</SubmitButton>
          </form>
        </Panel>

        <Panel title="Cardápio / estoque">
          <div className="space-y-3">
            {products.map((product) => (
              <form
                key={product.id}
                action={updateProductStockAction}
                className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4"
              >
                <input type="hidden" name="id" value={product.id} />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="text-sm text-zinc-600">
                      Slot {product.slot} · {formatCurrency(product.price)}
                    </p>
                    {product.description ? (
                      <p className="text-xs text-zinc-500">{product.description}</p>
                    ) : null}
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={product.active}
                    />
                    Ativo
                  </label>
                </div>
                <div className="mt-3 flex items-end gap-3">
                  <label className="block text-sm">
                    <span className="font-medium text-zinc-700">Estoque</span>
                    <input
                      name="stock"
                      type="number"
                      min={0}
                      defaultValue={product.stock}
                      className="mt-1 w-28 rounded-xl border border-zinc-200 bg-white px-3 py-2"
                    />
                  </label>
                  <SubmitButton variant="secondary">Atualizar</SubmitButton>
                </div>
              </form>
            ))}
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
