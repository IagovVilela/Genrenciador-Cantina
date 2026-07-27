import Link from "next/link";
import { logoutAction } from "@/lib/actions";

const staffLinks = [
  { href: "/cantina", label: "Dashboard" },
  { href: "/cantina/pedidos", label: "Pedidos" },
  { href: "/cantina/produtos", label: "Produtos" },
  { href: "/cantina/alunos", label: "Alunos" },
  { href: "/cantina/recargas", label: "Recargas" },
  { href: "/cantina/robo", label: "Robô" },
];

const studentLinks = [
  { href: "/aluno", label: "Cardápio" },
  { href: "/aluno/pedidos", label: "Meus pedidos" },
];

type AppShellProps = {
  title: string;
  userName: string;
  roleLabel: string;
  mode: "staff" | "student";
  children: React.ReactNode;
};

export function AppShell({
  title,
  userName,
  roleLabel,
  mode,
  children,
}: AppShellProps) {
  const links = mode === "staff" ? staffLinks : studentLinks;

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#f0f7f4_0%,_#e8eef2_45%,_#f7f3ea_100%)] text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-7xl gap-6 px-4 py-6 md:px-8">
        <aside className="hidden w-56 shrink-0 flex-col rounded-2xl border border-emerald-900/10 bg-white/70 p-4 shadow-sm backdrop-blur md:flex">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Cantina Robô
            </p>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">{title}</h1>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-emerald-50 hover:text-emerald-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 border-t border-zinc-200 pt-4">
            <p className="text-sm font-medium">{userName}</p>
            <p className="text-xs text-zinc-500">{roleLabel}</p>
            <form action={logoutAction} className="mt-3">
              <button
                type="submit"
                className="text-sm text-emerald-800 underline-offset-2 hover:underline"
              >
                Sair
              </button>
            </form>
          </div>
        </aside>

        <main className="flex-1">
          <div className="mb-4 flex items-center justify-between rounded-2xl border border-emerald-900/10 bg-white/70 px-4 py-3 shadow-sm backdrop-blur md:hidden">
            <div>
              <p className="text-xs uppercase tracking-wider text-emerald-700">
                Cantina Robô
              </p>
              <p className="font-semibold">{title}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="text-sm text-emerald-800">
                Sair
              </button>
            </form>
          </div>
          <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-full border border-emerald-900/10 bg-white/80 px-3 py-1.5 text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
