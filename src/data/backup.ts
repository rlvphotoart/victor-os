import { z } from "zod";
import type { AppData } from "../types";

const id = z.string().min(1);
const text = z.string();
const amount = z.number().finite();
const demo = { demo: z.boolean().optional() };
const priority = z.enum(["Low", "Normal", "High", "Critical"]);
const project = z.object({
  id,
  name: text,
  summary: text,
  status: z.enum(["IDEA", "PLANNING", "ACTIVE", "BLOCKED", "PAUSED", "DONE"]),
  priority,
  progress: amount,
  nextAction: text,
  notes: text,
  links: z.array(text),
  ...demo,
});
const task = z.object({
  id,
  title: text,
  projectId: text,
  priority,
  dueDate: text,
  status: z.enum(["Inbox", "Next", "In Progress", "Waiting", "Done"]),
  notes: text,
  order: amount,
  createdAt: text,
  updatedAt: text,
  ...demo,
});
const account = z.object({
  id,
  name: text,
  type: z.enum(["Current", "Savings", "Cash", "Investment", "Credit Card"]),
  balance: amount,
  ...demo,
});
const debt = z.object({
  id,
  creditor: text,
  remaining: amount,
  monthlyPayment: amount,
  interestRate: amount,
  dueDate: text,
  ...demo,
});
const investment = z.object({
  id,
  name: text,
  kind: text,
  value: amount,
  ...demo,
});
const transaction = z.object({
  id,
  title: text,
  amount,
  category: text,
  date: text,
  type: z.enum(["Income", "Expense"]),
  ...demo,
});
const budget = z.object({
  id,
  category: text,
  limit: amount,
  month: text,
  ...demo,
});
const goal = z.object({
  id,
  name: text,
  target: amount,
  current: amount,
  dueDate: text,
  ...demo,
});
const promptVersion = z.object({
  version: z.number().int().positive(),
  content: text,
  date: text,
});
const prompt = z.object({
  id,
  title: text,
  tool: text,
  category: text,
  prompt: text,
  description: text,
  tags: z.array(text),
  createdAt: text,
  updatedAt: text,
  favorite: z.boolean(),
  versions: z.array(promptVersion),
  ...demo,
});
const costModel = z.object({
  id,
  provider: text,
  model: text,
  inputPrice: amount,
  outputPrice: amount,
  ...demo,
});
const note = z.object({
  id,
  title: text,
  content: text,
  tags: z.array(text),
  pinned: z.boolean(),
  createdAt: text,
  updatedAt: text,
  ...demo,
});
const link = z.object({
  id,
  name: text,
  url: text,
  category: text,
  icon: text,
  order: amount,
  ...demo,
});
const settings = z.object({
  id: z.literal("app"),
  name: text,
  theme: z.enum(["dark", "light"]),
  currency: text,
  widgets: z.array(z.enum(["daily", "finance", "projects", "quickLinks"])),
  initialized: z.boolean(),
});

const schema = z.object({
  format: z.literal("victor-os"),
  schemaVersion: z.literal(1),
  exportedAt: text,
  data: z.object({
    projects: z.array(project),
    tasks: z.array(task),
    accounts: z.array(account),
    debts: z.array(debt),
    investments: z.array(investment),
    transactions: z.array(transaction),
    budgets: z.array(budget),
    goals: z.array(goal),
    prompts: z.array(prompt),
    costModels: z.array(costModel),
    notes: z.array(note),
    links: z.array(link),
    settings: z.tuple([settings]),
  }),
});

export type BackupFile = {
  format: "victor-os";
  schemaVersion: 1;
  exportedAt: string;
  data: AppData;
};

export function makeBackup(data: AppData): BackupFile {
  return {
    format: "victor-os",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export function parseBackup(json: string): BackupFile {
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(
      `Backup validation failed at ${issue.path.join(".") || "root"}: ${issue.message}`,
    );
  }
  const data = result.data.data;
  for (const [name, rows] of Object.entries(data)) {
    const ids = rows.map((row) => row.id);
    if (new Set(ids).size !== ids.length)
      throw new Error(`Backup has duplicate IDs in ${name}.`);
  }
  for (const item of data.links) {
    try {
      if (!["http:", "https:"].includes(new URL(item.url).protocol))
        throw new Error();
    } catch {
      throw new Error(`Backup contains an invalid link URL: ${item.name}.`);
    }
  }
  for (const project of data.projects) {
    for (const link of project.links) {
      try {
        if (!["http:", "https:"].includes(new URL(link).protocol))
          throw new Error();
      } catch {
        throw new Error(
          `Backup contains an invalid project URL: ${project.name}.`,
        );
      }
    }
  }
  return result.data as BackupFile;
}

export function backupCounts(data: AppData) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([name]) => name !== "settings")
      .map(([name, rows]) => [name, rows.length]),
  ) as Record<Exclude<keyof AppData, "settings">, number>;
}
