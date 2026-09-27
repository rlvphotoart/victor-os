import type { SheetBudget } from "../types";

export function sheetMoneySummary(sheet: SheetBudget | undefined) {
  if (!sheet) return null;
  const spent = sheet.categories.reduce((sum, row) => sum + row.spent, 0);
  const planned = sheet.categories.reduce((sum, row) => sum + row.planned, 0);
  const valuedPositions = sheet.xtb?.positions.filter(
    (row) => row.current !== null && row.fxRon !== null,
  ) ?? [];
  const holdings = valuedPositions.reduce(
    (sum, row) => sum + (row.current ?? 0) * (row.fxRon ?? 0), 0,
  );
  const investedPositions = sheet.xtb?.positions.filter(
    (row) => row.invested !== null && row.fxRon !== null,
  ) ?? [];
  const invested = investedPositions.reduce(
    (sum, row) => sum + (row.invested ?? 0) * (row.fxRon ?? 0), 0,
  );
  const allValued = valuedPositions.length === (sheet.xtb?.positions.length ?? 0);
  const allInvested = investedPositions.length === (sheet.xtb?.positions.length ?? 0);
  const positionValue = allValued && valuedPositions.length ? holdings : null;
  const computedValue =
    sheet.xtb && allValued && (sheet.xtb.cashRon !== null || valuedPositions.length)
      ? holdings + (sheet.xtb.cashRon ?? 0)
      : null;
  const reported = sheet.xtb?.reported;
  const xtbValue = reported?.totalRon ?? computedValue;
  const fundGap = reported?.fundRon != null && positionValue !== null
    ? reported.fundRon - positionValue : null;
  const accountGap = reported?.totalRon != null && reported.fundRon != null && reported.pendingWithdrawalRon != null
    ? reported.totalRon - reported.fundRon - reported.pendingWithdrawalRon : null;
  return {
    spent,
    planned,
    remaining: sheet.salary - spent,
    xtbValue,
    positionValue,
    fundGap,
    accountGap,
    invested: allInvested && investedPositions.length ? invested : null,
    unrealized: allValued && allInvested && valuedPositions.length ? holdings - invested : null,
    spentPercent:
      sheet.salary > 0 ? Math.min(100, (spent / sheet.salary) * 100) : 0,
  };
}
