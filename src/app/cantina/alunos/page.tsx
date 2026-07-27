import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { auth } from "@/auth";
import { AppShell } from "@/components/app-shell";
import { Field, Panel, SubmitButton } from "@/components/ui";
import { registerStudentAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

export default async function CantinaAlunosPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const students = await prisma.student.findMany({
    orderBy: { matricula: "asc" },
    include: { user: true },
  });

  return (
    <AppShell
      title="Alunos"
      userName={session.user.name}
      roleLabel={
        session.user.role === UserRole.ADMIN ? "Administrador" : "Operador"
      }
      mode="staff"
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel title="Cadastrar aluno" description="Cria login e saldo inicial.">
          <form action={registerStudentAction} className="space-y-3">
            <Field label="Nome" name="name" required />
            <Field label="Email" name="email" type="email" required />
            <Field label="Matrícula" name="matricula" required />
            <Field label="Senha inicial" name="password" type="password" required defaultValue="123456" />
            <Field label="Saldo inicial" name="saldo" type="number" step="0.01" min="0" defaultValue={0} />
            <SubmitButton>Cadastrar</SubmitButton>
          </form>
        </Panel>

        <Panel title="Lista de alunos">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-2 py-3">Matrícula</th>
                  <th className="px-2 py-3">Nome</th>
                  <th className="px-2 py-3">Email</th>
                  <th className="px-2 py-3">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-zinc-100">
                    <td className="px-2 py-3 font-medium">{student.matricula}</td>
                    <td className="px-2 py-3">{student.user.name}</td>
                    <td className="px-2 py-3">{student.user.email}</td>
                    <td className="px-2 py-3">{formatCurrency(student.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
