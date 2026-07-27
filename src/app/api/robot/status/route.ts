import { applyRobotStatus } from "@/lib/orders";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  pedidoId: z.string().min(1),
  status: z.enum(["ACEITO", "CONCLUIDO", "FALHA"]),
  mensagem: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const order = await applyRobotStatus(parsed);

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, order });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao processar status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
