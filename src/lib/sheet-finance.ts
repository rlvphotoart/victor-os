import type { SheetBudget } from "../types";

export function sheetMoneySummary(sheet: SheetBudget | undefined) {
  if (!sheet) return null;
  const spent = sheet.categories.reduce((sum, row) => sum + row.spent, 0);
  const planned = sheet.categories.reduce((sum, row) => sum + row.planned, 0);
  const holdings =
    sheet.xtb?.positions.reduce(
      (sum, row) => sum + row.current * row.fxRon,
      0,
    ) ?? 0;
  const invested =
    sheet.xtb?.positions.reduce(
      (sum, row) => sum + row.invested * row.fxRon,
      0,
    ) ?? 0;
  const xtbValue =
    sheet.xtb && (sheet.xtb.cashRon !== null || sheet.xtb.positions.length)
      ? holdings + (sheet.xtb.cashRon ?? 0)
      : null;
  return {
    spent,
    planned,
    remaining: sheet.salary - spent,
    xtbValue,
    invested,
    unrealized: holdings - invested,
    spentPercent:
      sheet.salary > 0 ? Math.min(100, (spent / sheet.salary) * 100) : 0,
  };
}
