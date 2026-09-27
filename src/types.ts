export type ProjectStatus =
  "IDEA" | "PLANNING" | "ACTIVE" | "BLOCKED" | "PAUSED" | "DONE";
export type TaskStatus = "Inbox" | "Next" | "In Progress" | "Waiting" | "Done";
export type Priority = "Low" | "Normal" | "High" | "Critical";

export interface Project {
  id: string;
  name: string;
  summary: string;
  status: ProjectStatus;
  priority: Priority;
  progress: number;
  nextAction: string;
  notes: string;
  links: string[];
  demo?: boolean;
}
export interface Task {
  id: string;
  title: string;
  projectId: string;
  priority: Priority;
  dueDate: string;
  status: TaskStatus;
  notes: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
}
export interface Account {
  id: string;
  name: string;
  type: "Current" | "Savings" | "Cash" | "Investment" | "Credit Card";
  balance: number;
  demo?: boolean;
}
export interface Debt {
  id: string;
  creditor: string;
  remaining: number;
  monthlyPayment: number;
  interestRate: number;
  dueDate: string;
  demo?: boolean;
}
export interface Investment {
  id: string;
  name: string;
  kind: string;
  value: number;
  demo?: boolean;
}
export interface Transaction {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  type: "Income" | "Expense";
  demo?: boolean;
}
export interface Budget {
  id: string;
  category: string;
  limit: number;
  month: string;
  demo?: boolean;
}
export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  dueDate: string;
  demo?: boolean;
}
export interface PromptVersion {
  version: number;
  content: string;
  date: string;
}
export interface Prompt {
  id: string;
  title: string;
  tool: string;
  category: string;
  prompt: string;
  description: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  favorite: boolean;
  versions: PromptVersion[];
  demo?: boolean;
}
export interface CostModel {
  id: string;
  provider: string;
  model: string;
  inputPrice: number;
  outputPrice: number;
  demo?: boolean;
}
export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  demo?: boolean;
}
export interface QuickLink {
  id: string;
  name: string;
  url: string;
  category: string;
  icon: string;
  order: number;
  demo?: boolean;
}
export type WidgetId = "daily" | "finance" | "projects" | "quickLinks";
export interface RecentContext {
  key: string;
  label: string;
  kind: "PROJECT" | "TASK" | "PROMPT" | "NOTE" | "TOOL";
  path: string;
  at: number;
}

export interface AppSettings {
  id: "app";
  name: string;
  theme: "dark" | "light";
  currency: string;
  widgets: WidgetId[];
  initialized: boolean;
  dockExpanded?: boolean;
  recentContexts?: RecentContext[];
  recentCommands?: string[];
}

export interface AppData {
  projects: Project[];
  tasks: Task[];
  accounts: Account[];
  debts: Debt[];
  investments: Investment[];
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  prompts: Prompt[];
  costModels: CostModel[];
  notes: Note[];
  links: QuickLink[];
  settings: AppSettings[];
}

export const PROJECT_STATUSES: ProjectStatus[] = [
  "IDEA",
  "PLANNING",
  "ACTIVE",
  "BLOCKED",
  "PAUSED",
  "DONE",
];
export const TASK_STATUSES: TaskStatus[] = [
  "Inbox",
  "Next",
  "In Progress",
  "Waiting",
  "Done",
];
export const PRIORITIES: Priority[] = ["Low", "Normal", "High", "Critical"];
export const BUDGET_CATEGORIES = [
  "Housing",
  "Food",
  "Transport",
  "Utilities",
  "Subscriptions",
  "Entertainment",
  "Debt",
  "Savings",
  "Investments",
  "Other",
];
export const TOOLS = [
  {
    id: "json",
    name: "JSON Formatter & Validator",
    description: "Format and validate JSON",
  },
  {
    id: "base64",
    name: "Base64 Encode / Decode",
    description: "Convert text to and from Base64",
  },
  {
    id: "url",
    name: "URL Encode / Decode",
    description: "Encode URI components safely",
  },
  {
    id: "timestamp",
    name: "Timestamp Converter",
    description: "Unix and human date conversion",
  },
  { id: "uuid", name: "UUID Generator", description: "Generate random UUIDs" },
  { id: "diff", name: "Text Diff", description: "Compare two blocks of text" },
  {
    id: "regex",
    name: "Regex Tester",
    description: "Test patterns against text",
  },
  {
    id: "counter",
    name: "Character Counter",
    description: "Count words, characters and lines",
  },
  {
    id: "tokens",
    name: "Token Estimate",
    description: "Approximate token usage",
  },
] as const;
