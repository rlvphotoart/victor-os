import type { AppData } from "../types";
import { monthKey } from "./utils";

export function financeSummary(data: AppData, month = monthKey()) {
  const accounts = data.accounts
    .filter((account) => account.type !== "Credit Card")
    .reduce((sum, account) => sum + account.balance, 0);
  const investments =
    data.investments.reduce((sum, item) => sum + item.value, 0) +
    data.accounts
      .filter((account) => account.type === "Investment")
      .reduce((sum, account) => sum + account.balance, 0);
  const current = data.accounts
    .filter((account) => account.type === "Current")
    .reduce((sum, account) => sum + account.balance, 0);
  const emergency = data.accounts
    .filter((account) => account.type === "Savings")
    .reduce((sum, account) => sum + account.balance, 0);
  const debt =
    data.debts.reduce((sum, item) => sum + item.remaining, 0) +
    data.accounts
      .filter((account) => account.type === "Credit Card")
      .reduce((sum, account) => sum + Math.abs(account.balance), 0);
  const monthTransactions = data.transactions.filter((item) =>
    item.date.startsWith(month),
  );
  const income = monthTransactions
    .filter((item) => item.type === "Income")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenses = monthTransactions
    .filter((item) => item.type === "Expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const payments = data.debts.reduce(
    (sum, item) => sum + item.monthlyPayment,
    0,
  );
  return {
    current,
    emergency,
    investments,
    debt,
    assets:
      accounts + data.investments.reduce((sum, item) => sum + item.value, 0),
    net:
      accounts +
      data.investments.reduce((sum, item) => sum + item.value, 0) -
      debt,
    income,
    expenses,
    savings: income - expenses,
    available: income - expenses,
    savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
    debtRatio: income > 0 ? (payments / income) * 100 : 0,
    payments,
  };
}
