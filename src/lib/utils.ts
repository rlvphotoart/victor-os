import { format, isValid, parseISO } from "date-fns";
import type { Debt, Priority } from "../types";

export const uid = () => crypto.randomUUID();
export const today = () => format(new Date(), "yyyy-MM-dd");
export const monthKey = (date = new Date()) => format(date, "yyyy-MM");
export const nowISO = () => new Date().toISOString();
export const dateLabel = (value: string, pattern = "d MMM yyyy") => {
  const parsed = parseISO(value);
  return isValid(parsed) ? format(parsed, pattern) : "—";
};
export const money = (value: number, currency = "EUR") =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
export const percent = (value: number) => `${Math.round(value)}%`;
export const priorityRank: Record<Priority, number> = {
  Low: 0,
  Normal: 1,
  High: 2,
  Critical: 3,
};
export const classNames = (...values: Array<string | false | undefined>) =>
  values.filter(Boolean).join(" ");
export const tagList = (input: string) =>
  input
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
export const safeUrl = (input: string) => {
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    return ["https:", "http:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
};
export const debtFreeDate = (debts: Debt[]) => {
  if (!debts.length || debts.every((d) => d.remaining <= 0)) return "Debt free";
  let maxMonths = 0;
  for (const debt of debts) {
    if (debt.remaining <= 0) continue;
    const monthlyRate = debt.interestRate / 1200;
    if (
      debt.monthlyPayment <= debt.remaining * monthlyRate ||
      debt.monthlyPayment <= 0
    )
      return "Payment too low";
    const months =
      monthlyRate === 0
        ? debt.remaining / debt.monthlyPayment
        : -Math.log(1 - (debt.remaining * monthlyRate) / debt.monthlyPayment) /
          Math.log(1 + monthlyRate);
    maxMonths = Math.max(maxMonths, months);
  }
  const date = new Date();
  date.setMonth(date.getMonth() + Math.ceil(maxMonths));
  return format(date, "MMM yyyy");
};
export const downloadText = (
  filename: string,
  content: string,
  type = "application/json",
) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
export const copyText = async (value: string) => {
  await navigator.clipboard.writeText(value);
};
