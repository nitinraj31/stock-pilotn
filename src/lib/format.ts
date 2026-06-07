export const CURRENCY = "INR";
export const CURRENCY_SYMBOL = "₹";

export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format(v);
}

export function fmtNumber(n: number | null | undefined): string {
  return new Intl.NumberFormat("en-IN").format(Number(n ?? 0));
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(date);
}

export function fmtDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
