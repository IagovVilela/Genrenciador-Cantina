import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_#dff3ea_0%,_#e7eef5_50%,_#f6f1e6_100%)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-emerald-900/10 bg-white/85 p-8 shadow-lg backdrop-blur">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">
          TCC SENAI
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-900">
          Cantina Robô
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Peça o lanche, pague com saldo ou no balcão, e o braço robótico
          entrega automaticamente.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
        <div className="mt-6 rounded-2xl bg-emerald-50/80 p-4 text-xs text-emerald-950">
          <p className="font-semibold">Contas de demonstração (senha 123456)</p>
          <ul className="mt-2 space-y-1">
            <li>aluno@cantina.local</li>
            <li>cantina@cantina.local</li>
            <li>admin@cantina.local</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
