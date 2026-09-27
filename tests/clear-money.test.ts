import { describe, expect, it, vi } from "vitest";
import { handleApiForOwner } from "../worker/index";

function request(origin: string) {
  return new Request("https://victor-os.example/api/clear-money", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "X-Victor-Request": "1",
    },
    body: "{}",
  });
}

describe("clear Money API", () => {
  it("deletes only the six financial collections for the signed-in owner", async () => {
    const run = vi.fn(async () => ({ meta: { changes: 24 } }));
    const bind = vi.fn(() => ({ run }));
    const prepare = vi.fn(() => ({ bind }));
    const env = { DB: { prepare } } as unknown as Parameters<
      typeof handleApiForOwner
    >[1];

    const response = await handleApiForOwner(
      request("https://victor-os.example"),
      env,
      "victor",
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, removed: 24 });
    expect(prepare).toHaveBeenCalledWith(
      "DELETE FROM records WHERE owner = ? AND collection IN ('accounts','debts','investments','budgets','transactions','goals')",
    );
    expect(bind).toHaveBeenCalledWith("victor");
    expect(run).toHaveBeenCalledOnce();
  });

  it("rejects cross-origin deletion before touching the database", async () => {
    const prepare = vi.fn();
    const env = { DB: { prepare } } as unknown as Parameters<
      typeof handleApiForOwner
    >[1];

    const response = await handleApiForOwner(
      request("https://another.example"),
      env,
      "victor",
    );

    expect(response.status).toBe(403);
    expect(prepare).not.toHaveBeenCalled();
  });
});
