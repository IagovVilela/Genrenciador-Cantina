import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { OrderStatus } from "@prisma/client";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDateTime(value: Date | string) {
  return new Date(value).toLocaleString("pt-BR");
}

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  EM_ENTREGA: "Em entrega",
  ENTREGUE: "Entregue",
  CANCELADO: "Cancelado",
  FALHA: "Falha",
};

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  PENDENTE: "bg-amber-100 text-amber-800",
  PAGO: "bg-sky-100 text-sky-800",
  EM_ENTREGA: "bg-indigo-100 text-indigo-800",
  ENTREGUE: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-zinc-100 text-zinc-600",
  FALHA: "bg-rose-100 text-rose-800",
};
