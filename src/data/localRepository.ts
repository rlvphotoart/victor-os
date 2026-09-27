import type { Table } from "dexie";
import { db } from "./db";
import { makeDemoData } from "./demo";
import type { AppData, AppSettings } from "../types";

function collection<T extends { id: string }>(table: Table<T, string>) {
  return {
    list: () => table.toArray(),
    get: (id: string) => table.get(id),
    save: (value: T) => table.put(value),
    remove: (id: string) => table.delete(id),
  };
}

const dataTables = [
  db.projects,
  db.tasks,
  db.accounts,
  db.debts,
  db.investments,
  db.transactions,
  db.budgets,
  db.goals,
  db.prompts,
  db.costModels,
  db.notes,
  db.links,
] as const;

export const legacyRepository = {
  projects: collection(db.projects),
  tasks: collection(db.tasks),
  accounts: collection(db.accounts),
  debts: collection(db.debts),
  investments: collection(db.investments),
  transactions: collection(db.transactions),
  budgets: collection(db.budgets),
  goals: collection(db.goals),
  prompts: collection(db.prompts),
  costModels: collection(db.costModels),
  notes: collection(db.notes),
  links: collection(db.links),

  async initialize() {
    await db.transaction("rw", [...dataTables, db.settings], async () => {
      if (await db.settings.get("app")) return;
      const demo = makeDemoData();
      await Promise.all([
        db.projects.bulkPut(demo.projects),
        db.tasks.bulkPut(demo.tasks),
        db.accounts.bulkPut(demo.accounts),
        db.debts.bulkPut(demo.debts),
        db.investments.bulkPut(demo.investments),
        db.transactions.bulkPut(demo.transactions),
        db.budgets.bulkPut(demo.budgets),
        db.goals.bulkPut(demo.goals),
        db.prompts.bulkPut(demo.prompts),
        db.costModels.bulkPut(demo.costModels),
        db.notes.bulkPut(demo.notes),
        db.links.bulkPut(demo.links),
        db.settings.bulkPut(demo.settings),
      ]);
    });
  },

  async snapshot(): Promise<AppData> {
    const [
      projects,
      tasks,
      accounts,
      debts,
      investments,
      transactions,
      budgets,
      goals,
      prompts,
      costModels,
      notes,
      links,
      settings,
    ] = await Promise.all([
      db.projects.toArray(),
      db.tasks.toArray(),
      db.accounts.toArray(),
      db.debts.toArray(),
      db.investments.toArray(),
      db.transactions.toArray(),
      db.budgets.toArray(),
      db.goals.toArray(),
      db.prompts.toArray(),
      db.costModels.toArray(),
      db.notes.toArray(),
      db.links.toArray(),
      db.settings.toArray(),
    ]);
    return {
      projects,
      tasks,
      accounts,
      debts,
      investments,
      transactions,
      budgets,
      goals,
      prompts,
      costModels,
      notes,
      links,
      settings,
    };
  },

  async saveSettings(changes: Partial<Omit<AppSettings, "id">>) {
    const current = await db.settings.get("app");
    await db.settings.put({
      id: "app",
      name: "Victor",
      theme: "dark",
      currency: "EUR",
      widgets: ["daily", "finance", "projects", "quickLinks"],
      initialized: true,
      ...current,
      ...changes,
    });
  },

  async clearDemoData() {
    await db.transaction("rw", dataTables, async () => {
      for (const table of dataTables) {
        const rows = await table.toArray();
        await table.bulkDelete(
          rows.filter((row) => row.demo).map((row) => row.id),
        );
      }
    });
  },

  async replaceAll(data: AppData) {
    await db.transaction("rw", [...dataTables, db.settings], async () => {
      for (const table of [...dataTables, db.settings]) await table.clear();
      await Promise.all([
        db.projects.bulkPut(data.projects),
        db.tasks.bulkPut(data.tasks),
        db.accounts.bulkPut(data.accounts),
        db.debts.bulkPut(data.debts),
        db.investments.bulkPut(data.investments),
        db.transactions.bulkPut(data.transactions),
        db.budgets.bulkPut(data.budgets),
        db.goals.bulkPut(data.goals),
        db.prompts.bulkPut(data.prompts),
        db.costModels.bulkPut(data.costModels),
        db.notes.bulkPut(data.notes),
        db.links.bulkPut(data.links),
        db.settings.bulkPut(data.settings),
      ]);
    });
  },

  async reset() {
    const empty: AppData = {
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
          widgets: ["daily", "finance", "projects", "quickLinks"],
          initialized: true,
        },
      ],
    };
    await this.replaceAll(empty);
  },
};
