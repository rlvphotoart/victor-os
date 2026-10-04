import { BUDGET_SHEET_ID } from "../src/lib/sheet-config";
import { describe, expect, it, vi } from "vitest";
import worker from "../worker/index";
import { appsScriptForBudget } from "../src/lib/sheet-sync";
import { sheetMoneySummary } from "../src/lib/sheet-finance";
import type { SheetBudget } from "../src/types";

const url = "https://victor-os.example/api/sheet-sync/push";
// Deliberately synthetic fixtures; these are not personal financial records.
const sheetId = BUDGET_SHEET_ID;
const key = "a".repeat(64);
const input = {
  sheetId,
  month: "2026-10",
  salary: 8000,
  categories: [{ name: "Chirie + utilități", planned: 3200, spent: 0 }],
  emergencyTarget: 15000,
  emergencyCurrent: 15000,
  debtRemaining: null,
  history: [
    { month: "2026-09", income: 8000, spent: 5300, remaining: 2700 },
  ],
  xtb: {
    asOf: null,
    cashRon: null,
    positions: [
      {
        instrument: "ETF",
        symbol: "ETF",
        currency: "EUR",
        invested: 100,
        current: 110,
        fxRon: 5,
        updatedAt: null,
      },
    ],
  },
};

async function hash(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function request(value: unknown, credential = key) {
  return new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Victor-Sync-Key": credential,
    },
    body: JSON.stringify(value),
  });
}

describe("Google Sheet sync", () => {
  it("generates valid bound Apps Script with a scoped endpoint", () => {
    const script = appsScriptForBudget("https://victor-os.example");
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain("https://victor-os.example/api/sheet-sync/push");
    expect(script).toContain("function setupVictorSync()");
    expect(script).toContain("everyMinutes(5)");
    expect(script).toContain("getProperty('VICTOR_SYNC_KEY')");
    expect(script).toContain("Investiții XTB");
    expect(script).toContain("Istoric 12 luni");
    expect(script).not.toContain(key);
  });
  it("accepts the paired key and stores a validated RON snapshot", async () => {
    const run = vi.fn(async () => ({ meta: { changes: 1 } }));
    const first = vi.fn(async () => ({
      payload: JSON.stringify({ hash: await hash(key) }),
    }));
    const prepare = vi.fn((sql: string) => ({
      bind: vi.fn(() => (sql.startsWith("SELECT") ? { first } : { run })),
    }));
    const env = {
      DB: { prepare },
      ACCESS_KEY: "x".repeat(32),
    } as unknown as Parameters<typeof worker.fetch>[1];

    const response = await worker.fetch(request(input), env);

    expect(response.status, await response.clone().text()).toBe(200);
    expect(((await response.json()) as { ok: boolean }).ok).toBe(true);
    expect(run).toHaveBeenCalledOnce();
    expect(prepare.mock.calls[1][0]).toContain("'sheetBudgets'");
  });

  it("keeps identified XTB instruments without inventing a portfolio value", async () => {
    const run = vi.fn(async () => ({ meta: { changes: 1 } }));
    const first = vi.fn(async () => ({ payload: JSON.stringify({ hash: await hash(key) }) }));
    const prepare = vi.fn((sql: string) => ({
      bind: vi.fn(() => (sql.startsWith("SELECT") ? { first } : { run })),
    }));
    const env = { DB: { prepare }, ACCESS_KEY: "x".repeat(32) } as unknown as Parameters<typeof worker.fetch>[1];
    const partial = { ...input.xtb, positions: [{ instrument: "Synthetic ETF A", symbol: "SYNTH_A", currency: "", invested: null, current: null, fxRon: null, updatedAt: null }] };
    const response = await worker.fetch(request({ ...input, xtb: partial }), env);
    expect(response.status, await response.clone().text()).toBe(200);
    expect(sheetMoneySummary({ ...input, id: "google-budget", xtb: partial, syncedAt: new Date().toISOString() } as SheetBudget)?.xtbValue).toBeNull();
  });

  it("keeps the XTB account total separate from positions and pending orders", async () => {
    const run = vi.fn(async () => ({ meta: { changes: 1 } }));
    const first = vi.fn(async () => ({ payload: JSON.stringify({ hash: await hash(key) }) }));
    const prepare = vi.fn((sql: string) => ({ bind: vi.fn(() => sql.startsWith("SELECT") ? { first } : { run }) }));
    const env = { DB: { prepare }, ACCESS_KEY: "x".repeat(32) } as unknown as Parameters<typeof worker.fetch>[1];
    const xtb = {
      asOf: "27.09.2026",
      cashRon: null,
      reported: { budgetRon: 20000, totalRon: 17000, fundRon: 12000, pendingWithdrawalRon: 7000, pendingBuyRon: 1400, pendingSellRon: 2800 },
      positions: [
        { instrument: "Synthetic ETF A", symbol: "SYNTH_A", currency: "RON", invested: null, current: 1100, fxRon: 1, updatedAt: null },
        { instrument: "Synthetic ETF B", symbol: "SYNTH_B", currency: "RON", invested: null, current: 2200, fxRon: 1, updatedAt: null },
        { instrument: "Synthetic ETF C", symbol: "SYNTH_C", currency: "RON", invested: null, current: 3300, fxRon: 1, updatedAt: null },
      ],
    };
    const response = await worker.fetch(request({ ...input, xtb }), env);
    expect(response.status, await response.clone().text()).toBe(200);
    const summary = sheetMoneySummary({ ...input, id: "google-budget", xtb, syncedAt: new Date().toISOString() } as SheetBudget);
    expect(summary?.xtbValue).toBe(17000);
    expect(summary?.positionValue).toBeCloseTo(6600, 2);
    expect(summary?.fundGap).toBeCloseTo(5400, 2);
    expect(summary?.accountGap).toBeCloseTo(-2000, 2);
    expect(summary?.invested).toBeNull();
    expect(summary?.unrealized).toBeNull();
  });

  it("rejects invalid values without overwriting the last good snapshot", async () => {
    const run = vi.fn();
    const first = vi.fn(async () => ({
      payload: JSON.stringify({ hash: await hash(key) }),
    }));
    const prepare = vi.fn((sql: string) => ({
      bind: vi.fn(() => (sql.startsWith("SELECT") ? { first } : { run })),
    }));
    const env = {
      DB: { prepare },
      ACCESS_KEY: "x".repeat(32),
    } as unknown as Parameters<typeof worker.fetch>[1];

    const response = await worker.fetch(request({ ...input, salary: -1 }), env);
    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects invalid XTB conversion rates", async () => {
    const run = vi.fn();
    const first = vi.fn(async () => ({
      payload: JSON.stringify({ hash: await hash(key) }),
    }));
    const prepare = vi.fn((sql: string) => ({
      bind: vi.fn(() => (sql.startsWith("SELECT") ? { first } : { run })),
    }));
    const env = {
      DB: { prepare },
      ACCESS_KEY: "x".repeat(32),
    } as unknown as Parameters<typeof worker.fetch>[1];
    const xtb = {
      ...input.xtb,
      positions: [{ ...input.xtb.positions[0], fxRon: 0 }],
    };
    const response = await worker.fetch(request({ ...input, xtb }), env);
    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects a wrong key before reading financial payload", async () => {
    const first = vi.fn(async () => ({
      payload: JSON.stringify({ hash: await hash(key) }),
    }));
    const bind = vi.fn(() => ({ first }));
    const prepare = vi.fn(() => ({ bind }));
    const env = {
      DB: { prepare },
      ACCESS_KEY: "x".repeat(32),
    } as unknown as Parameters<typeof worker.fetch>[1];

    const response = await worker.fetch(request(input, "b".repeat(64)), env);
    expect(response.status).toBe(401);
    expect(prepare).toHaveBeenCalledOnce();
  });
});
