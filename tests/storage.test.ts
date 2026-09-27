import "fake-indexeddb/auto";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "../src/data/db";
import { legacyRepository as repository } from "../src/data/localRepository";
import { makeBackup, parseBackup } from "../src/data/backup";
import { uid } from "../src/lib/utils";

describe("local data safety", () => {
  afterAll(async () => {
    await db.delete();
  });

  it("seeds once, exports every table, restores atomically, and preserves user data when clearing demo records", async () => {
    await repository.initialize();
    const demo = await repository.snapshot();
    expect(demo.projects).toHaveLength(4);
    expect(demo.prompts.length).toBeGreaterThan(0);
    expect(demo.settings[0].initialized).toBe(true);
    await repository.initialize();
    expect((await repository.snapshot()).projects).toHaveLength(4);

    const backup = parseBackup(JSON.stringify(makeBackup(demo)));
    expect(backup.data).toEqual(demo);
    const customId = uid();
    await repository.projects.save({
      id: customId,
      name: "My project",
      summary: "",
      status: "ACTIVE",
      priority: "Normal",
      progress: 10,
      nextAction: "",
      notes: "",
      links: [],
    });
    await repository.clearDemoData();
    const cleared = await repository.snapshot();
    expect(cleared.projects.map((item) => item.id)).toEqual([customId]);
    expect(cleared.tasks).toHaveLength(0);
    expect(cleared.settings).toEqual(demo.settings);

    await repository.replaceAll(backup.data);
    expect(await repository.snapshot()).toEqual(demo);
    await repository.reset();
    const reset = await repository.snapshot();
    expect(reset.projects).toHaveLength(0);
    expect(reset.prompts).toHaveLength(0);
    expect(reset.settings[0]).toMatchObject({
      name: "Victor",
      theme: "dark",
      currency: "EUR",
    });
    await repository.initialize();
    expect((await repository.snapshot()).projects).toHaveLength(0);
  });

  it("rejects invalid and unsafe backup files before touching storage", () => {
    expect(() => parseBackup("{bad")).toThrow("not valid JSON");
    const backup = makeBackup({
      projects: [],
      tasks: [],
      accounts: [],
      debts: [],
      investments: [],
      transactions: [],
      budgets: [],
      goals: [],
      prompts: [],
      costModels: [],
      notes: [],
      links: [],
      settings: [
        {
          id: "app",
          name: "Victor",
          theme: "dark",
          currency: "EUR",
          widgets: [],
          initialized: true,
        },
      ],
    });
    expect(() =>
      parseBackup(JSON.stringify({ ...backup, schemaVersion: 99 })),
    ).toThrow("Backup validation failed");
    backup.data.links.push({
      id: uid(),
      name: "Unsafe",
      url: "javascript:alert(1)",
      category: "Test",
      icon: "link",
      order: 0,
    });
    expect(() => parseBackup(JSON.stringify(backup))).toThrow(
      "invalid link URL",
    );
  });
});
