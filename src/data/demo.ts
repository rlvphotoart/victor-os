import { addDays, format, subMonths } from "date-fns";
import type { AppData, Task } from "../types";
import { monthKey, nowISO, today, uid } from "../lib/utils";

export function makeDemoData(): AppData {
  const createdAt = nowISO();
  const date = (offset: number) =>
    format(addDays(new Date(), offset), "yyyy-MM-dd");
  const projects = [
    {
      id: uid(),
      name: "TrustCue",
      summary: "Build a clearer trust signal for digital products.",
      status: "ACTIVE" as const,
      priority: "High" as const,
      progress: 68,
      nextAction: "Review onboarding flow",
      notes: "Focus on launch quality and first-use clarity.",
      links: ["https://github.com"],
      demo: true,
    },
    {
      id: uid(),
      name: "RetroClick",
      summary: "A tactile photo experience with a nostalgic edge.",
      status: "PLANNING" as const,
      priority: "Normal" as const,
      progress: 32,
      nextAction: "Finalize visual direction",
      notes: "Explore compact interactions and camera feel.",
      links: [],
      demo: true,
    },
    {
      id: uid(),
      name: "Personal Finance",
      summary: "Build a reliable monthly money routine.",
      status: "ACTIVE" as const,
      priority: "High" as const,
      progress: 54,
      nextAction: "Review September budget",
      notes: "Keep the process simple and repeatable.",
      links: [],
      demo: true,
    },
    {
      id: uid(),
      name: "AI Agents",
      summary: "Explore useful automations and agent workflows.",
      status: "IDEA" as const,
      priority: "Normal" as const,
      progress: 12,
      nextAction: "Capture three useful experiments",
      notes: "Prefer practical tasks over demos.",
      links: [],
      demo: true,
    },
  ];
  const task = (
    title: string,
    projectId: string,
    priority: Task["priority"],
    dueDate: string,
    status: Task["status"],
    order: number,
  ): Task => ({
    id: uid(),
    title,
    projectId,
    priority,
    dueDate,
    status,
    notes: "",
    order,
    createdAt,
    updatedAt: createdAt,
    demo: true,
  });
  const tasks = [
    task(
      "Review TrustCue onboarding",
      projects[0].id,
      "High",
      today(),
      "Next",
      0,
    ),
    task(
      "Write release checklist",
      projects[0].id,
      "Normal",
      date(1),
      "In Progress",
      1,
    ),
    task(
      "Reconcile monthly expenses",
      projects[2].id,
      "Critical",
      date(-2),
      "Next",
      2,
    ),
    task(
      "Draft RetroClick concept board",
      projects[1].id,
      "Normal",
      date(3),
      "Waiting",
      3,
    ),
    task(
      "List useful AI agent experiments",
      projects[3].id,
      "Low",
      date(5),
      "Inbox",
      4,
    ),
    task(
      "Archive last month receipts",
      projects[2].id,
      "Low",
      date(-5),
      "Done",
      5,
    ),
  ];
  const accounts = [
    {
      id: uid(),
      name: "Current account",
      type: "Current" as const,
      balance: 2450,
      demo: true,
    },
    {
      id: uid(),
      name: "Emergency fund",
      type: "Savings" as const,
      balance: 8200,
      demo: true,
    },
    {
      id: uid(),
      name: "Everyday cash",
      type: "Cash" as const,
      balance: 180,
      demo: true,
    },
  ];
  const debts = [
    {
      id: uid(),
      creditor: "Personal loan",
      remaining: 4100,
      monthlyPayment: 225,
      interestRate: 5.5,
      dueDate: date(12),
      demo: true,
    },
  ];
  const investments = [
    {
      id: uid(),
      name: "Long-term portfolio",
      kind: "ETF",
      value: 12500,
      demo: true,
    },
  ];
  const categories = [
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
  const limits = [850, 420, 180, 160, 75, 200, 225, 500, 350, 150];
  const budgets = categories.map((category, i) => ({
    id: uid(),
    category,
    limit: limits[i],
    month: monthKey(),
    demo: true,
  }));
  const transactions = [
    {
      id: uid(),
      title: "Salary",
      amount: 3900,
      category: "Income",
      date: date(-18),
      type: "Income" as const,
      demo: true,
    },
    {
      id: uid(),
      title: "Rent",
      amount: 850,
      category: "Housing",
      date: date(-15),
      type: "Expense" as const,
      demo: true,
    },
    {
      id: uid(),
      title: "Groceries",
      amount: 214,
      category: "Food",
      date: date(-8),
      type: "Expense" as const,
      demo: true,
    },
    {
      id: uid(),
      title: "Utilities",
      amount: 142,
      category: "Utilities",
      date: date(-5),
      type: "Expense" as const,
      demo: true,
    },
    {
      id: uid(),
      title: "Salary",
      amount: 3900,
      category: "Income",
      date: format(subMonths(new Date(), 1), "yyyy-MM-10"),
      type: "Income" as const,
      demo: true,
    },
    {
      id: uid(),
      title: "Living costs",
      amount: 2140,
      category: "Other",
      date: format(subMonths(new Date(), 1), "yyyy-MM-15"),
      type: "Expense" as const,
      demo: true,
    },
    {
      id: uid(),
      title: "Salary",
      amount: 3800,
      category: "Income",
      date: format(subMonths(new Date(), 2), "yyyy-MM-10"),
      type: "Income" as const,
      demo: true,
    },
    {
      id: uid(),
      title: "Living costs",
      amount: 2270,
      category: "Other",
      date: format(subMonths(new Date(), 2), "yyyy-MM-15"),
      type: "Expense" as const,
      demo: true,
    },
  ];
  const goals = [
    {
      id: uid(),
      name: "Emergency fund",
      target: 10000,
      current: 8200,
      dueDate: date(180),
      demo: true,
    },
  ];
  const promptContent =
    "Act as a thoughtful product reviewer. Evaluate the flow for clarity, speed, and user trust. Return the three highest-impact improvements with concrete examples.";
  const prompts = [
    {
      id: uid(),
      title: "Product flow review",
      tool: "Codex",
      category: "Product",
      prompt: promptContent,
      description: "A focused review of a product flow.",
      tags: ["product", "review"],
      createdAt,
      updatedAt: createdAt,
      favorite: true,
      versions: [{ version: 1, content: promptContent, date: createdAt }],
      demo: true,
    },
    {
      id: uid(),
      title: "Research synthesis",
      tool: "ChatGPT",
      category: "Research",
      prompt:
        "Summarize these findings into themes, open questions, and practical next steps. Distinguish evidence from inference.",
      description: "Turn messy notes into a decision-ready summary.",
      tags: ["research"],
      createdAt,
      updatedAt: createdAt,
      favorite: false,
      versions: [
        {
          version: 1,
          content:
            "Summarize these findings into themes, open questions, and practical next steps. Distinguish evidence from inference.",
          date: createdAt,
        },
      ],
      demo: true,
    },
    {
      id: uid(),
      title: "Codebase orientation",
      tool: "Claude",
      category: "Engineering",
      prompt:
        "Map this codebase: entry points, main data flows, and the safest place to implement the requested change.",
      description: "Start work in an unfamiliar repository.",
      tags: ["code"],
      createdAt,
      updatedAt: createdAt,
      favorite: false,
      versions: [
        {
          version: 1,
          content:
            "Map this codebase: entry points, main data flows, and the safest place to implement the requested change.",
          date: createdAt,
        },
      ],
      demo: true,
    },
  ];
  const notes = [
    {
      id: uid(),
      title: "Weekly review",
      content:
        "## Focus\n- Ship the TrustCue onboarding review\n- Keep the money routine simple\n\n## Ideas\nCapture AI agent experiments that save real time.",
      tags: ["review", "weekly"],
      pinned: true,
      createdAt,
      updatedAt: createdAt,
      demo: true,
    },
  ];
  const links = [
    {
      id: uid(),
      name: "GitHub",
      url: "https://github.com",
      category: "Build",
      icon: "code",
      order: 0,
      demo: true,
    },
    {
      id: uid(),
      name: "ChatGPT",
      url: "https://chatgpt.com",
      category: "AI",
      icon: "sparkles",
      order: 1,
      demo: true,
    },
    {
      id: uid(),
      name: "Google Drive",
      url: "https://drive.google.com",
      category: "Work",
      icon: "folder",
      order: 2,
      demo: true,
    },
    {
      id: uid(),
      name: "XTB",
      url: "https://www.xtb.com",
      category: "Money",
      icon: "chart",
      order: 3,
      demo: true,
    },
  ];
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
    costModels: [
      {
        id: uid(),
        provider: "Example provider",
        model: "Editable example",
        inputPrice: 1,
        outputPrice: 4,
        demo: true,
      },
    ],
    notes,
    links,
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
}
