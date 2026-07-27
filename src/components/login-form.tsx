"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-zinc-700">Email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue="aluno@cantina.local"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none ring-emerald-600/30 focus:ring-2"
        />
      </label>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-zinc-700">Senha</span>
        <input
          name="password"
          type="password"
          required
          defaultValue="123456"
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 outline-none ring-emerald-600/30 focus:ring-2"
        />
      </label>
      {state?.error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
