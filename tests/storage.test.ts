import { describe, expect, it } from "vitest";
import { makeBackup, parseBackup } from "../src/data/backup";
import { makeDemoData } from "../src/data/demo";
import { uid } from "../src/lib/utils";

describe("data migration and backup safety", () => {
  it("round-trips every cloud collection and accepts older settings", () => {
    const demo = makeDemoData();
    expect(parseBackup(JSON.stringify(makeBackup(demo))).data).toEqual(demo);
    const oldSettings = { ...demo.settings[0] };
    delete oldSettings.dockExpanded;
    delete oldSettings.recentContexts;
    delete oldSettings.recentCommands;
    const oldBackup = makeBackup({
      ...demo,
      settings: [oldSettings],
    });
    expect(parseBackup(JSON.stringify(oldBackup)).data.settings[0]).toEqual(
      oldSettings,
    );
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
