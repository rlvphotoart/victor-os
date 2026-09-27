import Dexie, { type Table } from "dexie";
import type {
  Account,
  AppSettings,
  Budget,
  CostModel,
  Debt,
  Goal,
  Investment,
  Note,
  Project,
  Prompt,
  QuickLink,
  Task,
  Transaction,
} from "../types";

export class VictorDatabase extends Dexie {
  projects!: Table<Project, string>;
  tasks!: Table<Task, string>;
  accounts!: Table<Account, string>;
  debts!: Table<Debt, string>;
  investments!: Table<Investment, string>;
  transactions!: Table<Transaction, string>;
  budgets!: Table<Budget, string>;
  goals!: Table<Goal, string>;
  prompts!: Table<Prompt, string>;
  costModels!: Table<CostModel, string>;
  notes!: Table<Note, string>;
  links!: Table<QuickLink, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super("VictorOS");
    this.version(1).stores({
      projects: "id, name, status, priority, demo",
      tasks: "id, projectId, status, dueDate, priority, order, demo",
      accounts: "id, type, demo",
      debts: "id, demo",
      investments: "id, demo",
      transactions: "id, date, type, category, demo",
      budgets: "id, month, category, demo",
      goals: "id, demo",
      prompts: "id, tool, category, favorite, updatedAt, demo",
      costModels: "id, provider, demo",
      notes: "id, pinned, updatedAt, demo",
      links: "id, category, order, demo",
      settings: "id",
    });
  }
}

export const db = new VictorDatabase();
