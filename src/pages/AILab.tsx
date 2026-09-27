import { useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Heart,
  History,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { AppData, CostModel, Prompt } from "../types";
import { repository } from "../data/repository";
import { copyText, dateLabel, nowISO, tagList, today, uid } from "../lib/utils";
import {
  Badge,
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
  Textarea,
} from "../components/ui";
import { useToast } from "../components/toast";
import { Datum, Metric, StatusSignal } from "../components/OS";

const tools = ["Codex", "ChatGPT", "Hermès", "Claude", "Other"];

export function AILabPage({ data }: { data: AppData }) {
  const [tab, setTab] = useState<"Prompts" | "Model Costs">("Prompts");
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState("all");
  const [category, setCategory] = useState("all");
  const [favorites, setFavorites] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const notify = useToast();
  const editing = data.prompts.find((item) => item.id === params.get("open"));
  const creating = params.get("new") === "1";
  const close = () => setParams({});
  const categories = [
    ...new Set(data.prompts.map((item) => item.category).filter(Boolean)),
  ];
  const filtered = useMemo(
    () =>
      data.prompts
        .filter((item) => {
          if (tool !== "all" && item.tool !== tool) return false;
          if (category !== "all" && item.category !== category) return false;
          if (favorites && !item.favorite) return false;
          return `${item.title} ${item.description} ${item.prompt} ${item.tags.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase());
        })
        .sort(
          (a, b) =>
            Number(b.favorite) - Number(a.favorite) ||
            b.updatedAt.localeCompare(a.updatedAt),
        ),
    [data.prompts, query, tool, category, favorites],
  );
  const duplicate = async (prompt: Prompt) => {
    const timestamp = nowISO();
    await repository.prompts.save({
      ...prompt,
      id: uid(),
      title: `${prompt.title} copy`,
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      versions: [{ version: 1, content: prompt.prompt, date: timestamp }],
      demo: false,
    });
    notify("Prompt duplicated");
  };
  const copyPrompt = async (prompt: Prompt) => {
    try {
      await copyText(prompt.prompt);
      setCopiedId(prompt.id);
      window.setTimeout(
        () => setCopiedId((value) => (value === prompt.id ? null : value)),
        1600,
      );
    } catch {
      notify("Clipboard is unavailable", "error");
    }
  };
  return (
    <div className="page-stack">
      <section className="vos-ai-register" aria-label="AI Lab register">
        <div className="vos-ai-register-lead">
          <Datum number="04.A" label="Working intelligence" />
          <h2>
            Prompt register<span aria-hidden="true">.</span>
          </h2>
          <p>Instructions, revisions, and rates kept within reach.</p>
          <StatusSignal label="SYNCED LIBRARY" tone="active" />
        </div>
        <div className="vos-ai-register-readings">
          <Metric
            label="PROMPTS"
            value={String(data.prompts.length).padStart(2, "0")}
            annotation="Saved instructions"
          />
          <Metric
            label="FAVOURITES"
            value={String(
              data.prompts.filter((item) => item.favorite).length,
            ).padStart(2, "0")}
            annotation="Pinned for reuse"
          />
          <Metric
            label="COST MODELS"
            value={String(data.costModels.length).padStart(2, "0")}
            annotation="Editable rates"
          />
        </div>
      </section>
      <div className="section-toolbar">
        <div className="segmented">
          <button
            className={tab === "Prompts" ? "active" : ""}
            onClick={() => setTab("Prompts")}
          >
            Prompt library
          </button>
          <button
            className={tab === "Model Costs" ? "active" : ""}
            onClick={() => setTab("Model Costs")}
          >
            Model costs
          </button>
        </div>
        {tab === "Prompts" && (
          <Button onClick={() => setParams({ new: "1" })}>
            <Plus size={16} /> New prompt
          </Button>
        )}
      </div>
      {tab === "Prompts" ? (
        <>
          <div className="filter-row">
            <div className="filter-search">
              <Search size={16} />
              <input
                aria-label="Search prompts"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search titles, tags, or prompt text"
              />
            </div>
            <div className="filter-selects">
              <Select
                aria-label="Filter prompt tool"
                value={tool}
                onChange={(event) => setTool(event.target.value)}
              >
                <option value="all">All tools</option>
                {tools.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
              <Select
                aria-label="Filter prompt category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </Select>
              <button
                className={`filter-toggle ${favorites ? "active" : ""}`}
                onClick={() => setFavorites((value) => !value)}
              >
                <Heart size={15} fill={favorites ? "currentColor" : "none"} />{" "}
                Favorites
              </button>
            </div>
          </div>
          {filtered.length ? (
            <div className="prompt-grid">
              {filtered.map((item) => (
                <Card key={item.id} className="prompt-card">
                  <div className="prompt-card-top">
                    <div>
                      <Badge tone="purple">{item.tool}</Badge>
                      <DemoTag demo={item.demo} />
                    </div>
                    <IconButton
                      label={
                        item.favorite
                          ? `Remove ${item.title} from favorites`
                          : `Favorite ${item.title}`
                      }
                      onClick={() =>
                        repository.prompts.save({
                          ...item,
                          favorite: !item.favorite,
                          updatedAt: nowISO(),
                        })
                      }
                    >
                      <Heart
                        size={17}
                        fill={item.favorite ? "currentColor" : "none"}
                        className={item.favorite ? "text-accent" : ""}
                      />
                    </IconButton>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description || item.prompt}</p>
                  <div className="tag-row">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span key={tag}>#{tag}</span>
                    ))}
                  </div>
                  <div className="prompt-card-meta">
                    <span>
                      <History size={14} /> v{item.versions.length}
                    </span>
                    <span>{dateLabel(item.updatedAt)}</span>
                  </div>
                  <div className="prompt-card-actions">
                    <Button
                      variant="secondary"
                      className={copiedId === item.id ? "copied" : ""}
                      onClick={() => copyPrompt(item)}
                    >
                      {copiedId === item.id ? (
                        <Check size={15} />
                      ) : (
                        <Copy size={15} />
                      )}
                      {copiedId === item.id ? "Copied" : "Copy prompt"}
                    </Button>
                    <button onClick={() => setParams({ open: item.id })}>
                      Edit
                    </button>
                    <button
                      onClick={() => duplicate(item)}
                      aria-label={`Duplicate ${item.title}`}
                      title="Duplicate"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      aria-label={`Delete ${item.title}`}
                      title="Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                title="No prompts found"
                text="Create a prompt or adjust your filters."
                action={
                  <Button onClick={() => setParams({ new: "1" })}>
                    <Plus size={16} /> New prompt
                  </Button>
                }
              />
            </Card>
          )}
        </>
      ) : (
        <CostCalculator data={data} />
      )}
      {(creating || editing) && (
        <PromptForm
          key={editing?.id ?? "new"}
          prompt={editing}
          onClose={close}
        />
      )}
      {deleteId && (
        <ConfirmDialog
          title="Delete prompt?"
          message="This prompt and its version history will be deleted."
          confirmLabel="Delete prompt"
          onClose={() => setDeleteId(null)}
          onConfirm={async () => {
            await repository.prompts.remove(deleteId);
            close();
            notify("Prompt deleted");
          }}
        />
      )}
    </div>
  );
}

function PromptForm({
  prompt,
  onClose,
}: {
  prompt?: Prompt;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Prompt>(
    prompt ?? {
      id: uid(),
      title: "",
      tool: "Codex",
      category: "",
      prompt: "",
      description: "",
      tags: [],
      createdAt: nowISO(),
      updatedAt: nowISO(),
      favorite: false,
      versions: [],
    },
  );
  const [tags, setTags] = useState(form.tags.join(", "));
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const notify = useToast();
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const changed = !prompt || prompt.prompt !== form.prompt;
    const timestamp = nowISO();
    const versions = changed
      ? [
          ...(prompt?.versions ?? []),
          {
            version:
              Math.max(
                0,
                ...(prompt?.versions ?? []).map((item) => item.version),
              ) + 1,
            content: form.prompt.trim(),
            date: timestamp,
          },
        ]
      : prompt.versions;
    await repository.prompts.save({
      ...form,
      title: form.title.trim(),
      prompt: form.prompt.trim(),
      tags: tagList(tags),
      updatedAt: timestamp,
      versions,
    });
    notify(prompt ? "Prompt updated" : "Prompt created");
    onClose();
  };
  const selected = prompt?.versions.find(
    (item) => item.version === selectedVersion,
  );
  return (
    <Modal
      title={prompt ? "Edit prompt" : "New prompt"}
      onClose={onClose}
      width="wide"
      mode="focus"
    >
      <form className="form-stack" onSubmit={save}>
        <div className="form-grid">
          <Field label="Title">
            <Input
              required
              autoFocus
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
              placeholder="Give this prompt a clear name"
            />
          </Field>
          <Field label="Tool">
            <Select
              value={form.tool}
              onChange={(event) =>
                setForm({ ...form, tool: event.target.value })
              }
            >
              {tools.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Category">
            <Input
              value={form.category}
              onChange={(event) =>
                setForm({ ...form, category: event.target.value })
              }
              placeholder="Engineering, research..."
            />
          </Field>
          <Field label="Tags" hint="Separate with commas">
            <Input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="code, review"
            />
          </Field>
        </div>
        <Field label="Description">
          <Input
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            placeholder="When should you use this?"
          />
        </Field>
        <Field label="Prompt">
          <Textarea
            required
            rows={10}
            value={form.prompt}
            onChange={(event) =>
              setForm({ ...form, prompt: event.target.value })
            }
            placeholder="Write your reusable prompt here..."
          />
        </Field>
        <label className="check-label">
          <input
            type="checkbox"
            checked={form.favorite}
            onChange={(event) =>
              setForm({ ...form, favorite: event.target.checked })
            }
          />{" "}
          Mark as favorite
        </label>
        {prompt && (
          <div className="history-block">
            <button
              type="button"
              onClick={() => setHistoryOpen((value) => !value)}
            >
              <History size={16} /> Version history · {prompt.versions.length}{" "}
              <ChevronDown size={15} />
            </button>
            {historyOpen && (
              <div className="history-content">
                <div className="version-list">
                  {[...prompt.versions].reverse().map((version) => (
                    <button
                      type="button"
                      key={version.version}
                      className={
                        selectedVersion === version.version ? "active" : ""
                      }
                      onClick={() => setSelectedVersion(version.version)}
                    >
                      v{version.version}{" "}
                      <small>{dateLabel(version.date)}</small>
                    </button>
                  ))}
                </div>
                {selected && (
                  <div className="version-preview">
                    <pre>{selected.content}</pre>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setForm({ ...form, prompt: selected.content });
                        notify("Version loaded into editor");
                      }}
                    >
                      Use this version
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {prompt ? "Save prompt" : "Create prompt"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CostCalculator({ data }: { data: AppData }) {
  const [selectedId, setSelectedId] = useState(data.costModels[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState("all");
  const [inputTokens, setInputTokens] = useState(100000);
  const [outputTokens, setOutputTokens] = useState(25000);
  const [runsPerDay, setRunsPerDay] = useState(1);
  const [editing, setEditing] = useState<CostModel | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const notify = useToast();
  const selected =
    data.costModels.find((item) => item.id === selectedId) ??
    data.costModels[0];
  const priced = (model: CostModel) =>
    model.inputPrice !== null && model.outputPrice !== null;
  const perRun = (model: CostModel) =>
    model.inputPrice === null || model.outputPrice === null
      ? null
      : (inputTokens / 1_000_000) * model.inputPrice +
        (outputTokens / 1_000_000) * model.outputPrice;
  const providers = [
    ...new Set(data.costModels.map((item) => item.provider)),
  ].sort();
  const visible = data.costModels.filter(
    (item) =>
      (provider === "all" || item.provider === provider) &&
      `${item.provider} ${item.model} ${item.pricingNote ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const cost = (value: number) =>
    new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  return (
    <div className="page-stack">
      <Card className="calculator-card">
        <CardHeader
          eyebrow="YOUR RATES"
          title="Model cost calculator"
          subtitle="Dated direct API text-token rates in USD. All rates are editable; verify the source before budgeting."
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus size={16} /> Add model
            </Button>
          }
        />
        <div className="calculator-grid">
          <Field label="Model">
            <Select
              value={selected?.id ?? ""}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              {data.costModels.length ? (
                data.costModels.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.provider} · {item.model}
                  </option>
                ))
              ) : (
                <option value="">Add a model first</option>
              )}
            </Select>
          </Field>
          <Field label="Input tokens / run">
            <Input
              type="number"
              min="0"
              value={inputTokens}
              onChange={(event) =>
                setInputTokens(Math.max(0, Number(event.target.value)))
              }
            />
          </Field>
          <Field label="Output tokens / run">
            <Input
              type="number"
              min="0"
              value={outputTokens}
              onChange={(event) =>
                setOutputTokens(Math.max(0, Number(event.target.value)))
              }
            />
          </Field>
          <Field label="Runs per day">
            <Input
              type="number"
              min="0"
              value={runsPerDay}
              onChange={(event) =>
                setRunsPerDay(Math.max(0, Number(event.target.value)))
              }
            />
          </Field>
        </div>
        <div className="cost-results">
          <div>
            <span>EST. COST / RUN</span>
            <strong>
              {selected && priced(selected) ? cost(perRun(selected)!) : "N/A"}
            </strong>
          </div>
          <div>
            <span>EST. COST / DAY</span>
            <strong>
              {selected && priced(selected)
                ? cost(perRun(selected)! * runsPerDay)
                : "N/A"}
            </strong>
          </div>
          <div>
            <span>EST. COST / MONTH</span>
            <strong>
              {selected && priced(selected)
                ? cost(perRun(selected)! * runsPerDay * 30)
                : "N/A"}
            </strong>
          </div>
        </div>
      </Card>
      <Card>
        <CardHeader
          eyebrow="SIDE BY SIDE"
          title="Compare models"
          subtitle={`${data.costModels.filter(priced).length} priced models · ${data.costModels.length - data.costModels.filter(priced).length} agent platforms without a universal token rate`}
        />
        <div className="filter-row model-filter-row">
          <div className="filter-search">
            <Search size={16} />
            <input
              aria-label="Search model prices"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search models or providers"
            />
          </div>
          <Select
            aria-label="Filter model provider"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          >
            <option value="all">All providers</option>
            {providers.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </Select>
        </div>
        <div className="comparison-table">
          <div className="comparison-head">
            <span>MODEL</span>
            <span>INPUT / 1M</span>
            <span>OUTPUT / 1M</span>
            <span>PER RUN</span>
            <span>PER MONTH</span>
            <span>ACTIONS</span>
          </div>
          {visible.map((item) => (
            <div key={item.id} className="comparison-row">
              <span>
                <strong>
                  {item.model} <DemoTag demo={item.demo} />
                </strong>
                <small>
                  {item.provider}
                  {item.checkedAt
                    ? ` · checked ${item.checkedAt}`
                    : " · custom rate"}
                </small>
                {item.pricingNote && (
                  <small className="model-pricing-note">
                    {item.pricingNote}
                  </small>
                )}
                {item.sourceUrl && (
                  <a
                    className="model-source"
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Official source <ExternalLink size={12} />
                  </a>
                )}
              </span>
              <span>
                {item.inputPrice === null ? "—" : cost(item.inputPrice)}
              </span>
              <span>
                {item.outputPrice === null ? "—" : cost(item.outputPrice)}
              </span>
              <span>
                {perRun(item) === null
                  ? "Depends on model"
                  : cost(perRun(item)!)}
              </span>
              <strong>
                {perRun(item) === null
                  ? "—"
                  : cost(perRun(item)! * runsPerDay * 30)}
              </strong>
              <span className="row-actions">
                <IconButton
                  label={`Edit ${item.model}`}
                  onClick={() => setEditing(item)}
                >
                  <Sparkles size={16} />
                </IconButton>
                <IconButton
                  label={`Delete ${item.model}`}
                  onClick={() => setDeleting(item.id)}
                >
                  <Trash2 size={16} />
                </IconButton>
              </span>
            </div>
          ))}
          {!visible.length && (
            <EmptyState
              title="No models found"
              text="Adjust your search or add a provider and its current rates."
            />
          )}
        </div>
      </Card>
      <p className="helper-line">
        <Check size={14} /> Estimates use standard, uncached text rates and 30
        days. Long context, caching, tools, taxes, regional fees, subscriptions,
        and price changes are excluded.
      </p>
      {editing && (
        <ModelForm
          key={editing === "new" ? "new" : editing.id}
          model={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete model?"
          message="The model rate will be removed from your cloud workspace on every device."
          confirmLabel="Delete model"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await repository.costModels.remove(deleting);
            notify("Model deleted");
          }}
        />
      )}
    </div>
  );
}

function ModelForm({
  model,
  onClose,
}: {
  model?: CostModel;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CostModel>(
    model ?? {
      id: uid(),
      provider: "",
      model: "",
      inputPrice: 0,
      outputPrice: 0,
      sourceUrl: "",
      pricingNote: "",
    },
  );
  const [unpriced, setUnpriced] = useState(form.inputPrice === null);
  const notify = useToast();
  const save = async (event: FormEvent) => {
    event.preventDefault();
    await repository.costModels.save({
      ...form,
      provider: form.provider.trim(),
      model: form.model.trim(),
      inputPrice: unpriced ? null : form.inputPrice,
      outputPrice: unpriced ? null : form.outputPrice,
      sourceUrl: form.sourceUrl?.trim() || undefined,
      pricingNote: form.pricingNote?.trim() || undefined,
      checkedAt: today(),
    });
    notify("Model rates saved");
    onClose();
  };
  return (
    <Modal
      title={model ? "Edit model rates" : "Add model rates"}
      onClose={onClose}
      mode="focus"
    >
      <form className="form-stack" onSubmit={save}>
        <div className="form-grid">
          <Field label="Provider">
            <Input
              required
              autoFocus
              value={form.provider}
              onChange={(event) =>
                setForm({ ...form, provider: event.target.value })
              }
            />
          </Field>
          <Field label="Model">
            <Input
              required
              value={form.model}
              onChange={(event) =>
                setForm({ ...form, model: event.target.value })
              }
            />
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Input price / million tokens">
            <Input
              required={!unpriced}
              disabled={unpriced}
              type="number"
              min="0"
              step="0.0001"
              value={form.inputPrice ?? ""}
              onChange={(event) =>
                setForm({ ...form, inputPrice: Number(event.target.value) })
              }
            />
          </Field>
          <Field label="Output price / million tokens">
            <Input
              required={!unpriced}
              disabled={unpriced}
              type="number"
              min="0"
              step="0.0001"
              value={form.outputPrice ?? ""}
              onChange={(event) =>
                setForm({ ...form, outputPrice: Number(event.target.value) })
              }
            />
          </Field>
        </div>
        <label className="check-label">
          <input
            type="checkbox"
            checked={unpriced}
            onChange={(event) => setUnpriced(event.target.checked)}
          />{" "}
          No universal token rate (agent platform or variable provider)
        </label>
        <Field label="Official source URL">
          <Input
            type="url"
            value={form.sourceUrl ?? ""}
            onChange={(event) =>
              setForm({ ...form, sourceUrl: event.target.value })
            }
            placeholder="https://provider.example/pricing"
          />
        </Field>
        <Field label="Pricing note">
          <Textarea
            rows={3}
            value={form.pricingNote ?? ""}
            onChange={(event) =>
              setForm({ ...form, pricingNote: event.target.value })
            }
            placeholder="Long-context thresholds, promotional expiry, or why no rate exists"
          />
        </Field>
        <p className="muted text-sm">
          Enter USD rates for standard direct API text tokens. Check the
          provider for updates.
        </p>
        <div className="modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save model</Button>
        </div>
      </form>
    </Modal>
  );
}
