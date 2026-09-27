import { useMemo, useState, type FormEvent } from "react";
import { format, subMonths } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  Plus,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import type {
  Account,
  AppData,
  Debt,
  Goal,
  Investment,
  Transaction,
} from "../types";
import { BUDGET_CATEGORIES } from "../types";
import { repository } from "../data/repository";
import { financeSummary } from "../lib/finance";
import {
  dateLabel,
  debtFreeDate,
  money,
  monthKey,
  today,
  uid,
} from "../lib/utils";
import {
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  DemoTag,
  EmptyState,
  Field,
  IconButton,
  Input,
  Modal,
  Select,
} from "../components/ui";
import { useToast } from "../components/toast";

type Kind = "account" | "debt" | "investment" | "transaction" | "goal";
type Entity = Account | Debt | Investment | Transaction | Goal;
const tabs = [
  "Overview",
  "Accounts",
  "Debts",
  "Investments",
  "Budget",
  "Transactions",
  "Goals",
] as const;

export function MoneyPage({ data }: { data: AppData }) {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  const [form, setForm] = useState<{ kind: Kind; entity?: Entity } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<{ kind: Kind; id: string } | null>(
    null,
  );
  const [month, setMonth] = useState(monthKey());
  const [chartActive, setChartActive] = useState(5);
  const notify = useToast();
  const summary = financeSummary(data, month);
  const currency = data.settings[0]?.currency ?? "EUR";
  const fmt = (value: number) => money(value, currency);
  const budgetRows = BUDGET_CATEGORIES.map((category) => {
    const budget = data.budgets.find(
      (item) => item.category === category && item.month === month,
    );
    return {
      category,
      planned: budget?.limit ?? 0,
      demo: budget?.demo,
      spent: data.transactions
        .filter(
          (item) =>
            item.type === "Expense" &&
            item.category === category &&
            item.date.startsWith(month),
        )
        .reduce((sum, item) => sum + item.amount, 0),
    };
  });
  const chart = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const key = format(subMonths(new Date(), 5 - i), "yyyy-MM");
        const item = financeSummary(data, key);
        return {
          key,
          label: format(subMonths(new Date(), 5 - i), "MMM"),
          income: item.income,
          expenses: item.expenses,
        };
      }),
    [data],
  );
  const chartMax = Math.max(
    1,
    ...chart.flatMap((item) => [item.income, item.expenses]),
  );
  const edit = (kind: Kind, entity?: Entity) => setForm({ kind, entity });
  const deleteEntity = async (kind: Kind, id: string) => {
    switch (kind) {
      case "account":
        await repository.accounts.remove(id);
        break;
      case "debt":
        await repository.debts.remove(id);
        break;
      case "investment":
        await repository.investments.remove(id);
        break;
      case "transaction":
        await repository.transactions.remove(id);
        break;
      case "goal":
        await repository.goals.remove(id);
        break;
    }
    notify("Item deleted");
  };
  const saveBudget = async (category: string, limit: number) => {
    const existing = data.budgets.find(
      (item) => item.category === category && item.month === month,
    );
    await repository.budgets.save({
      id: existing?.id ?? uid(),
      category,
      month,
      limit: Math.max(0, limit),
      demo: existing?.demo,
    });
    notify(`${category} budget saved`);
  };
  return (
    <div className="page-stack">
      <div className="money-hero">
        <div className="vos-money-hero-reading">
          <span className="eyebrow">03 / FINANCIAL POSITION</span>
          <div className="vos-money-number">
            <strong>
              {new Intl.NumberFormat("en-IE", {
                maximumFractionDigits: 0,
              }).format(summary.net)}
            </strong>
            <span>{currency}</span>
          </div>
          <p>
            <span>ASSETS</span> {fmt(summary.assets)} <i /> <span>DEBT</span>{" "}
            {fmt(summary.debt)}
          </p>
        </div>
        <div className="vos-money-hero-axis">
          <span>POSITION / LIVE</span>
          <div aria-hidden="true">
            {Array.from({ length: 16 }, (_, index) => (
              <i
                key={index}
                className={
                  index <
                  Math.round(
                    (Math.max(0, Math.min(100, summary.savingsRate)) / 100) *
                      16,
                  )
                    ? "filled"
                    : ""
                }
              />
            ))}
          </div>
          <strong>
            {Math.round(summary.savingsRate)}% <small>SAVINGS RATE</small>
          </strong>
        </div>
      </div>
      <div className="money-metrics">
        <Card>
          <span>MONTHLY INCOME</span>
          <strong>{fmt(summary.income)}</strong>
          <small>
            <ArrowUpRight size={14} /> This month
          </small>
        </Card>
        <Card>
          <span>MONTHLY EXPENSES</span>
          <strong>{fmt(summary.expenses)}</strong>
          <small>
            <ArrowDownRight size={14} /> This month
          </small>
        </Card>
        <Card>
          <span>SAVINGS RATE</span>
          <strong>{Math.round(summary.savingsRate)}%</strong>
          <small>Income less expenses</small>
        </Card>
        <Card>
          <span>DEBT RATIO</span>
          <strong>{Math.round(summary.debtRatio)}%</strong>
          <small>Payments / income</small>
        </Card>
      </div>
      <div className="section-toolbar money-toolbar">
        <div className="tab-scroll">
          <div className="segmented">
            {tabs.map((item) => (
              <button
                key={item}
                className={tab === item ? "active" : ""}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <Input
          type="month"
          aria-label="Selected month"
          className="month-input"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </div>

      {tab === "Overview" && (
        <div className="money-overview-grid">
          <Card className="chart-card">
            <CardHeader
              eyebrow="CASH FLOW"
              title="Monthly comparison"
              subtitle="Income and expenses over the last six months"
            />
            <div className="chart-legend">
              <span>
                <i className="legend-income" /> Income
              </span>
              <span>
                <i className="legend-expense" /> Expenses
              </span>
            </div>
            <div className="chart-readout" aria-live="polite">
              <span>
                {format(
                  new Date(`${chart[chartActive].key}-01T12:00:00`),
                  "MMMM yyyy",
                )}
              </span>
              <strong>
                {fmt(chart[chartActive].income)} <small>in</small>
              </strong>
              <strong>
                {fmt(chart[chartActive].expenses)} <small>out</small>
              </strong>
            </div>
            <div
              className="bar-chart"
              aria-label="Income and expenses over the last six months"
            >
              {chart.map((item, index) => (
                <button
                  key={item.key}
                  type="button"
                  className={`bar-group ${chartActive === index ? "active" : ""}`}
                  title={`${item.label}: income ${fmt(item.income)}, expenses ${fmt(item.expenses)}`}
                  aria-label={`${item.label}: income ${fmt(item.income)}, expenses ${fmt(item.expenses)}`}
                  aria-pressed={chartActive === index}
                  onMouseEnter={() => setChartActive(index)}
                  onFocus={() => setChartActive(index)}
                  onClick={() => setChartActive(index)}
                >
                  <div className="bars">
                    <div
                      className="bar bar-income"
                      style={{
                        height: `${Math.max(2, (item.income / chartMax) * 100)}%`,
                      }}
                    />
                    <div
                      className="bar bar-expense"
                      style={{
                        height: `${Math.max(2, (item.expenses / chartMax) * 100)}%`,
                      }}
                    />
                  </div>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader
              eyebrow="FINANCIAL POSITION"
              title="Where things stand"
            />
            <div className="snapshot-list">
              <div>
                <span>Current account</span>
                <strong>{fmt(summary.current)}</strong>
              </div>
              <div>
                <span>Emergency fund</span>
                <strong>{fmt(summary.emergency)}</strong>
              </div>
              <div>
                <span>Investments</span>
                <strong>{fmt(summary.investments)}</strong>
              </div>
              <div>
                <span>Remaining debt</span>
                <strong className="text-danger">{fmt(summary.debt)}</strong>
              </div>
              <div>
                <span>Available this month</span>
                <strong>{fmt(summary.available)}</strong>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "Accounts" && (
        <Card>
          <CardHeader
            eyebrow="ASSETS & CASH"
            title="Accounts"
            action={
              <Button onClick={() => edit("account")}>
                <Plus size={16} /> Add account
              </Button>
            }
          />
          {data.accounts.length ? (
            <div className="data-list">
              {data.accounts.map((item) => (
                <div key={item.id} className="data-row">
                  <span className="entity-icon">
                    <Wallet size={18} />
                  </span>
                  <div className="data-primary">
                    <strong>
                      {item.name} <DemoTag demo={item.demo} />
                    </strong>
                    <small>{item.type}</small>
                  </div>
                  <strong className="data-amount">{fmt(item.balance)}</strong>
                  <RowActions
                    onEdit={() => edit("account", item)}
                    onDelete={() =>
                      setDeleting({ kind: "account", id: item.id })
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No accounts yet"
              text="Add a current account, savings account, or cash balance."
            />
          )}
        </Card>
      )}

      {tab === "Debts" && (
        <div className="page-stack">
          <div className="stat-strip">
            <div>
              <span>TOTAL REMAINING</span>
              <strong>{fmt(summary.debt)}</strong>
            </div>
            <div>
              <span>MONTHLY PAYMENTS</span>
              <strong>{fmt(summary.payments)}</strong>
            </div>
            <div>
              <span>EST. DEBT FREE</span>
              <strong className="small-stat">{debtFreeDate(data.debts)}</strong>
            </div>
          </div>
          <Card>
            <CardHeader
              eyebrow="LIABILITIES"
              title="Debt tracker"
              action={
                <Button onClick={() => edit("debt")}>
                  <Plus size={16} /> Add debt
                </Button>
              }
            />
            {data.debts.length ? (
              <div className="data-list">
                {data.debts.map((item) => (
                  <div key={item.id} className="data-row">
                    <span className="entity-icon">
                      <CircleDollarSign size={18} />
                    </span>
                    <div className="data-primary">
                      <strong>
                        {item.creditor} <DemoTag demo={item.demo} />
                      </strong>
                      <small>
                        {item.interestRate}% interest · Due{" "}
                        {dateLabel(item.dueDate, "d MMM")}
                      </small>
                    </div>
                    <div className="data-amount">
                      <strong>{fmt(item.remaining)}</strong>
                      <small>{fmt(item.monthlyPayment)} / month</small>
                    </div>
                    <RowActions
                      onEdit={() => edit("debt", item)}
                      onDelete={() =>
                        setDeleting({ kind: "debt", id: item.id })
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No debts recorded"
                text="Add a debt to track payments and the estimated payoff date."
              />
            )}
          </Card>
        </div>
      )}

      {tab === "Investments" && (
        <Card>
          <CardHeader
            eyebrow="LONG TERM"
            title="Investments"
            action={
              <Button onClick={() => edit("investment")}>
                <Plus size={16} /> Add investment
              </Button>
            }
          />
          {data.investments.length ? (
            <div className="data-list">
              {data.investments.map((item) => (
                <div key={item.id} className="data-row">
                  <span className="entity-icon">
                    <ArrowUpRight size={18} />
                  </span>
                  <div className="data-primary">
                    <strong>
                      {item.name} <DemoTag demo={item.demo} />
                    </strong>
                    <small>{item.kind}</small>
                  </div>
                  <strong className="data-amount">{fmt(item.value)}</strong>
                  <RowActions
                    onEdit={() => edit("investment", item)}
                    onDelete={() =>
                      setDeleting({ kind: "investment", id: item.id })
                    }
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No investments yet"
              text="Track portfolio values manually here."
            />
          )}
        </Card>
      )}

      {tab === "Budget" && (
        <Card>
          <CardHeader
            eyebrow={month.toUpperCase()}
            title="Monthly budget"
            subtitle="Edit planned amounts directly. Actual spending comes from transactions."
          />
          <div className="budget-header">
            <span>CATEGORY</span>
            <span>PLANNED</span>
            <span>SPENT</span>
            <span>PROGRESS</span>
          </div>
          <div className="budget-list">
            {budgetRows.map((item) => (
              <BudgetRow
                key={`${month}-${item.category}`}
                {...item}
                currency={currency}
                onSave={(value) => saveBudget(item.category, value)}
              />
            ))}
          </div>
          <div className="budget-total">
            <strong>Total planned</strong>
            <strong>
              {fmt(budgetRows.reduce((sum, item) => sum + item.planned, 0))}
            </strong>
            <strong>
              {fmt(budgetRows.reduce((sum, item) => sum + item.spent, 0))} spent
            </strong>
          </div>
        </Card>
      )}

      {tab === "Transactions" && (
        <Card>
          <CardHeader
            eyebrow="ACTIVITY"
            title="Transactions"
            subtitle="Enter income and expenses manually."
            action={
              <Button onClick={() => edit("transaction")}>
                <Plus size={16} /> Add transaction
              </Button>
            }
          />
          {data.transactions.length ? (
            <div className="data-list">
              {[...data.transactions]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map((item) => (
                  <div key={item.id} className="data-row">
                    <span
                      className={`entity-icon ${item.type === "Income" ? "income-icon" : ""}`}
                    >
                      {item.type === "Income" ? (
                        <ArrowUpRight size={18} />
                      ) : (
                        <ArrowDownRight size={18} />
                      )}
                    </span>
                    <div className="data-primary">
                      <strong>
                        {item.title} <DemoTag demo={item.demo} />
                      </strong>
                      <small>
                        {item.category} · {dateLabel(item.date)}
                      </small>
                    </div>
                    <strong
                      className={`data-amount ${item.type === "Income" ? "text-positive" : ""}`}
                    >
                      {item.type === "Income" ? "+" : "−"}
                      {fmt(item.amount)}
                    </strong>
                    <RowActions
                      onEdit={() => edit("transaction", item)}
                      onDelete={() =>
                        setDeleting({ kind: "transaction", id: item.id })
                      }
                    />
                  </div>
                ))}
            </div>
          ) : (
            <EmptyState
              title="No transactions yet"
              text="Start with your latest income or expense."
            />
          )}
        </Card>
      )}

      {tab === "Goals" && (
        <Card>
          <CardHeader
            eyebrow="MILESTONES"
            title="Financial goals"
            action={
              <Button onClick={() => edit("goal")}>
                <Plus size={16} /> Add goal
              </Button>
            }
          />
          {data.goals.length ? (
            <div className="goal-grid">
              {data.goals.map((item) => (
                <div key={item.id} className="goal-item">
                  <div className="goal-top">
                    <span className="entity-icon">
                      <Target size={18} />
                    </span>
                    <div>
                      <IconButton
                        label={`Edit ${item.name}`}
                        onClick={() => edit("goal", item)}
                      >
                        <ArrowUpRight size={17} />
                      </IconButton>
                      <IconButton
                        label={`Delete ${item.name}`}
                        onClick={() =>
                          setDeleting({ kind: "goal", id: item.id })
                        }
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </div>
                  <h3>
                    {item.name} <DemoTag demo={item.demo} />
                  </h3>
                  <p>
                    {fmt(item.current)} <span>of {fmt(item.target)}</span>
                  </p>
                  <div className="progress-track">
                    <div
                      style={{
                        width: `${Math.min(100, item.target > 0 ? (item.current / item.target) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                  <small>
                    <CalendarDays size={13} /> Target {dateLabel(item.dueDate)}
                  </small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No goals yet"
              text="Add something you are working toward."
            />
          )}
        </Card>
      )}

      {form && (
        <MoneyForm
          key={`${form.kind}-${form.entity?.id ?? "new"}`}
          kind={form.kind}
          entity={form.entity}
          onClose={() => setForm(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this item?"
          message="This entry will be permanently removed from your cloud workspace on every device."
          confirmLabel="Delete item"
          onClose={() => setDeleting(null)}
          onConfirm={() => deleteEntity(deleting.kind, deleting.id)}
        />
      )}
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="row-actions">
      <Button variant="ghost" onClick={onEdit}>
        Edit
      </Button>
      <IconButton label="Delete" onClick={onDelete}>
        <Trash2 size={16} />
      </IconButton>
    </div>
  );
}

function BudgetRow({
  category,
  planned,
  spent,
  demo,
  currency,
  onSave,
}: {
  category: string;
  planned: number;
  spent: number;
  demo?: boolean;
  currency: string;
  onSave: (value: number) => void;
}) {
  const [value, setValue] = useState(String(planned));
  return (
    <div className="budget-row">
      <strong>
        {category} <DemoTag demo={demo} />
      </strong>
      <div className="budget-input">
        <input
          aria-label={`${category} planned amount`}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => {
            if (Number(value) !== planned) onSave(Number(value) || 0);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
        />
      </div>
      <span>{money(spent, currency)}</span>
      <div className="budget-progress">
        <div className="progress-track">
          <div
            className={spent > planned && planned > 0 ? "over-budget" : ""}
            style={{
              width: `${Math.min(100, planned > 0 ? (spent / planned) * 100 : 0)}%`,
            }}
          />
        </div>
        <small>{planned > 0 ? Math.round((spent / planned) * 100) : 0}%</small>
      </div>
    </div>
  );
}

function MoneyForm({
  kind,
  entity,
  onClose,
}: {
  kind: Kind;
  entity?: Entity;
  onClose: () => void;
}) {
  const [fields, setFields] = useState<Record<string, string>>(() => ({
    ...(kind === "transaction" && !entity ? { date: today() } : {}),
    ...Object.fromEntries(
      Object.entries(entity ?? {}).map(([key, value]) => [key, String(value)]),
    ),
  }));
  const notify = useToast();
  const get = (name: string) => fields[name] ?? "";
  const set = (name: string, value: string) =>
    setFields((current) => ({ ...current, [name]: value }));
  const number = (name: string) => Number(get(name)) || 0;
  const input = (
    label: string,
    name: string,
    type = "text",
    required = false,
  ) => (
    <Field label={label}>
      <Input
        required={required}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "0.01" : undefined}
        value={get(name)}
        onChange={(event) => set(name, event.target.value)}
      />
    </Field>
  );
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const id = entity?.id ?? uid();
    const demo = entity?.demo;
    switch (kind) {
      case "account":
        await repository.accounts.save({
          id,
          name: get("name").trim(),
          type: (get("type") || "Current") as Account["type"],
          balance: number("balance"),
          demo,
        });
        break;
      case "debt":
        await repository.debts.save({
          id,
          creditor: get("creditor").trim(),
          remaining: number("remaining"),
          monthlyPayment: number("monthlyPayment"),
          interestRate: number("interestRate"),
          dueDate: get("dueDate"),
          demo,
        });
        break;
      case "investment":
        await repository.investments.save({
          id,
          name: get("name").trim(),
          kind: get("kind").trim(),
          value: number("value"),
          demo,
        });
        break;
      case "transaction":
        await repository.transactions.save({
          id,
          title: get("title").trim(),
          amount: number("amount"),
          category: get("category") || "Other",
          date: get("date") || today(),
          type: (get("type") || "Expense") as Transaction["type"],
          demo,
        });
        break;
      case "goal":
        await repository.goals.save({
          id,
          name: get("name").trim(),
          target: number("target"),
          current: number("current"),
          dueDate: get("dueDate"),
          demo,
        });
        break;
    }
    notify(`${kind[0].toUpperCase()}${kind.slice(1)} saved`);
    onClose();
  };
  return (
    <Modal
      title={`${entity ? "Edit" : "Add"} ${kind}`}
      onClose={onClose}
      mode="focus"
    >
      <form className="form-stack" onSubmit={save}>
        {kind === "account" && (
          <>
            {input("Account name", "name", "text", true)}
            <Field label="Account type">
              <Select
                value={get("type") || "Current"}
                onChange={(event) => set("type", event.target.value)}
              >
                {(
                  [
                    "Current",
                    "Savings",
                    "Cash",
                    "Investment",
                    "Credit Card",
                  ] as const
                ).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
            </Field>
            {input("Balance", "balance", "number", true)}
          </>
        )}
        {kind === "debt" && (
          <>
            {input("Creditor", "creditor", "text", true)}
            <div className="form-grid">
              {input("Remaining amount", "remaining", "number", true)}
              {input("Monthly payment", "monthlyPayment", "number", true)}
            </div>
            <div className="form-grid">
              {input("Interest rate (%)", "interestRate", "number")}
              {input("Next due date", "dueDate", "date")}
            </div>
          </>
        )}
        {kind === "investment" && (
          <>
            {input("Investment name", "name", "text", true)}
            <div className="form-grid">
              {input("Type", "kind")}
              {input("Current value", "value", "number", true)}
            </div>
          </>
        )}
        {kind === "transaction" && (
          <>
            {input("Description", "title", "text", true)}
            <div className="form-grid">
              <Field label="Type">
                <Select
                  value={get("type") || "Expense"}
                  onChange={(event) => set("type", event.target.value)}
                >
                  <option>Expense</option>
                  <option>Income</option>
                </Select>
              </Field>
              {input("Amount", "amount", "number", true)}
            </div>
            <div className="form-grid">
              <Field label="Category">
                <Select
                  value={
                    get("category") ||
                    (get("type") === "Income" ? "Income" : "Other")
                  }
                  onChange={(event) => set("category", event.target.value)}
                >
                  <option>Income</option>
                  {BUDGET_CATEGORIES.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </Field>
              {input("Date", "date", "date", true)}
            </div>
          </>
        )}
        {kind === "goal" && (
          <>
            {input("Goal name", "name", "text", true)}
            <div className="form-grid">
              {input("Target amount", "target", "number", true)}
              {input("Current amount", "current", "number", true)}
            </div>
            {input("Target date", "dueDate", "date")}
          </>
        )}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save {kind}</Button>
        </div>
      </form>
    </Modal>
  );
}
