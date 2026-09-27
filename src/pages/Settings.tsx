import { useEffect, useRef, useState } from "react";
import {
  Check,
  Cloud,
  Copy,
  Download,
  FileJson,
  LogOut,
  Moon,
  PlugZap,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
  WandSparkles,
} from "lucide-react";
import type { AppData, WidgetId } from "../types";
import {
  backupCounts,
  makeBackup,
  MAX_IMPORT_BYTES,
  parseBackup,
  type BackupFile,
} from "../data/backup";
import { repository } from "../data/repository";
import { makeDemoData } from "../data/demo";
import {
  curatedCostModels,
  curatedPlaybooks,
  curatedProjects,
  curatedPrompts,
} from "../data/workspace";
import { downloadText, today } from "../lib/utils";
import { appsScriptForBudget, BUDGET_SHEET_URL } from "../lib/sheet-sync";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Field,
  Input,
  Select,
} from "../components/ui";
import { useToast } from "../components/toast";

const widgetOptions: { id: WidgetId; label: string; description: string }[] = [
  {
    id: "daily",
    label: "Daily overview",
    description: "Priorities, overdue items, and reminders",
  },
  {
    id: "finance",
    label: "Financial snapshot",
    description: "Net position and monthly figures",
  },
  {
    id: "projects",
    label: "Project overview",
    description: "Progress and next actions",
  },
  {
    id: "quickLinks",
    label: "Quick access",
    description: "Your repeatable playbooks",
  },
];

type ChatConnection = { id: string; createdAt: number; scopes: string[] };

async function loadChatConnections(): Promise<ChatConnection[]> {
  const response = await fetch("/api/chat-connections", {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not check ChatGPT connections.");
  const body = (await response.json()) as { connections: ChatConnection[] };
  return body.connections;
}

export function SettingsPage({ data }: { data: AppData }) {
  const settings = data.settings[0];
  const [name, setName] = useState(settings?.name ?? "Victor");
  const [preview, setPreview] = useState<BackupFile | null>(null);
  const [importError, setImportError] = useState("");
  const [personalizing, setPersonalizing] = useState(false);
  const [chatConnections, setChatConnections] = useState<
    ChatConnection[] | null
  >(null);
  const [chatConnectionError, setChatConnectionError] = useState("");
  const [revokingChat, setRevokingChat] = useState<string | null>(null);
  const [sheetPaired, setSheetPaired] = useState(false);
  const [sheetScript, setSheetScript] = useState("");
  const [sheetBusy, setSheetBusy] = useState(false);
  const [confirm, setConfirm] = useState<
    "import" | "reset" | "demo" | "seed" | "money" | null
  >(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const notify = useToast();
  useEffect(() => {
    let active = true;
    void loadChatConnections()
      .then((connections) => {
        if (active) setChatConnections(connections);
      })
      .catch((issue: unknown) => {
        if (active)
          setChatConnectionError(
            issue instanceof Error ? issue.message : "Connection check failed.",
          );
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    void fetch("/api/sheet-sync/status", {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not check sheet connection.");
        return response.json() as Promise<{ paired: boolean }>;
      })
      .then((status) => setSheetPaired(status.paired))
      .catch(() => notify("Could not check sheet connection", "error"));
  }, [notify]);
  const demoCount = [
    "projects",
    "tasks",
    "prompts",
    "costModels",
    "links",
    "playbooks",
  ]
    .flatMap((name) => data[name as keyof AppData] as Array<{ demo?: boolean }>)
    .flat()
    .filter(
      (row: unknown) =>
        typeof row === "object" &&
        row !== null &&
        "demo" in row &&
        row.demo === true,
    ).length;
  const showSetup =
    curatedProjects.some(
      (row) => !data.projects.some((item) => item.id === row.id),
    ) ||
    curatedPrompts.some(
      (row) => !data.prompts.some((item) => item.id === row.id),
    ) ||
    curatedCostModels.some(
      (row) => !data.costModels.some((item) => item.id === row.id),
    ) ||
    curatedPlaybooks.some(
      (row) => !data.playbooks.some((item) => item.id === row.id),
    );
  const recordCount = Object.values(backupCounts(data)).reduce(
    (sum, value) => sum + value,
    0,
  );
  const moneyCount =
    data.accounts.length +
    data.debts.length +
    data.investments.length +
    data.budgets.length +
    data.transactions.length +
    data.goals.length +
    data.sheetBudgets.length;
  const exportAll = () => {
    downloadText(
      `victor-os-backup-${today()}.json`,
      JSON.stringify(makeBackup(data), null, 2),
    );
    notify("Backup exported");
  };
  const importFile = async (file?: File) => {
    setImportError("");
    setPreview(null);
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) {
      setImportError("This backup is larger than 10 MB.");
      return;
    }
    try {
      setPreview(parseBackup(await file.text()));
    } catch (issue) {
      setImportError(
        issue instanceof Error ? issue.message : "Unable to read this backup.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  };
  const toggleWidget = (id: WidgetId) => {
    const current = settings?.widgets ?? [];
    void repository.saveSettings({
      widgets: current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    });
  };
  return (
    <div className="settings-layout">
      <div className="settings-main">
        {showSetup && (
          <Card className="workspace-setup-card">
            <CardHeader
              eyebrow="PERSONAL WORKSPACE"
              title="Make Victor OS yours"
              subtitle={`Add ${curatedProjects.length} relevant projects, six Sunday tasks, ${curatedPrompts.length} reusable prompts, ${curatedCostModels.length} researched model entries, and ${curatedPlaybooks.length} playbooks.`}
            />
            <p className="helper-line">
              A dated backup downloads first. Existing personal records remain;
              marked examples outside Money and Notes are removed. Money and
              Notes data are untouched.
            </p>
            <Button
              disabled={personalizing}
              onClick={async () => {
                setPersonalizing(true);
                downloadText(
                  `victor-os-before-personalize-${today()}.json`,
                  JSON.stringify(makeBackup(data), null, 2),
                );
                try {
                  await repository.personalizeWorkspace();
                  notify("Workspace personalized and synced");
                } catch (issue) {
                  notify(
                    issue instanceof Error
                      ? issue.message
                      : "Could not personalize workspace",
                    "error",
                  );
                } finally {
                  setPersonalizing(false);
                }
              }}
            >
              <WandSparkles size={16} />{" "}
              {personalizing ? "Personalizing…" : "Apply personal workspace"}
            </Button>
          </Card>
        )}
        <Card>
          <CardHeader eyebrow="IDENTITY" title="Your workspace" />
          <div className="settings-fields">
            <Field label="Your name">
              <div className="inline-field">
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  onBlur={() => {
                    if (name.trim() !== settings?.name)
                      void repository.saveSettings({
                        name: name.trim() || "Victor",
                      });
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
                <span>Shown in your Home greeting</span>
              </div>
            </Field>
            <div className="form-grid">
              <Field label="Appearance">
                <Select
                  value={settings?.theme ?? "dark"}
                  onChange={(event) =>
                    void repository.saveSettings({
                      theme: event.target.value as "dark" | "light",
                    })
                  }
                >
                  <option value="dark">Dark Meridian</option>
                  <option value="light">Light Meridian</option>
                </Select>
              </Field>
              <Field label="Currency display">
                <Select
                  value={settings?.currency ?? "EUR"}
                  onChange={(event) =>
                    void repository.saveSettings({
                      currency: event.target.value,
                    })
                  }
                >
                  {["EUR", "RON", "USD", "GBP"].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="helper-line">
              <Moon size={14} />
              <Sun size={14} /> Currency changes the display symbol only;
              entered values are not converted.
            </p>
          </div>
        </Card>
        <Card>
          <CardHeader
            eyebrow="PERSONALIZE"
            title="Dashboard widgets"
            subtitle="Choose what appears on your home dashboard."
          />
          <div className="settings-list">
            {widgetOptions.map((item) => (
              <label key={item.id} className="settings-check">
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <input
                  type="checkbox"
                  checked={settings?.widgets.includes(item.id) ?? false}
                  onChange={() => toggleWidget(item.id)}
                />
              </label>
            ))}
          </div>
        </Card>
        <Card className="chat-connection-card">
          <CardHeader
            eyebrow="CONVERSATIONAL UPDATES"
            title="Update Victor OS with Codex"
            subtitle="Describe a change in ordinary language. Codex chooses the right section and saves it to this live workspace."
          />
          <p className="helper-line">
            A completed payment becomes a transaction; a payment to make later
            becomes a task. Decisions can become notes, and multi-step work can
            become a project. Codex asks for details that are needed to save an
            accurate record.
          </p>
          <div className="chat-endpoint">
            <code>Adaugă în Victor OS: verifică raportul luni.</code>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText("Adaugă în Victor OS: verifică raportul luni.")
                  .then(() => notify("Example copied"))
                  .catch(() => notify("Could not copy the example", "error"));
              }}
            >
              <Copy size={16} /> Copy example
            </Button>
          </div>
          <ol className="chat-steps">
            <li>Open Codex on the Mac with the Victor OS Update skill.</li>
            <li>Ask Codex to add, edit, or complete something in Victor OS.</li>
            <li>
              Codex uses your signed-in Victor OS session and checks that the
              result appears here. Changes sync across your devices.
            </li>
          </ol>
          <p className="helper-line">
            Keep your access key in your password manager. If sign-in expires,
            enter it in Victor OS yourself, never in a conversation. No paid AI
            API or code deployment is needed for data updates.
          </p>
        </Card>
        <Card className="chat-connection-card">
          <CardHeader
            eyebrow="OPTIONAL CONNECTOR"
            title="ChatGPT connection"
            subtitle="Use this MCP connection if your ChatGPT account supports write tools and authorization completes."
          />
          <p className="helper-line">
            Installing a plugin does not grant access on its own. Check the
            active connections below before expecting a ChatGPT conversation to
            save anything here.
          </p>
          <div className="chat-endpoint">
            <code>{window.location.origin + "/mcp"}</code>
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(window.location.origin + "/mcp")
                  .then(() => notify("Connector URL copied"))
                  .catch(() => notify("Could not copy the URL", "error"));
              }}
            >
              <Copy size={16} /> Copy URL
            </Button>
          </div>
          <ol className="chat-steps">
            <li>
              In ChatGPT Work, enable Developer mode in Settings → Security and
              login.
            </li>
            <li>
              Open Plugins, add this MCP URL, and install the private plugin.
            </li>
            <li>
              When prompted, authorize on the Victor OS page with your existing
              access key.
            </li>
            <li>
              In a Work chat, select Victor OS and describe the change in
              ordinary language.
            </li>
          </ol>
          <p className="helper-line">
            No OpenAI API key or paid AI API is required. The access key stays
            with Victor OS; ChatGPT receives a revocable connection. ChatGPT
            only receives the details needed for the action you request.
          </p>
          <div className="chat-connections">
            <strong>
              <PlugZap size={16} /> Active ChatGPT connections
            </strong>
            {chatConnectionError && (
              <span className="form-error">{chatConnectionError}</span>
            )}
            {chatConnections?.length === 0 && (
              <span>None yet. ChatGPT cannot read or write Victor OS.</span>
            )}
            {chatConnections?.map((connection) => (
              <div key={connection.id} className="chat-connection-row">
                <span>
                  Connected{" "}
                  {new Date(connection.createdAt).toLocaleDateString()} · read
                  and write
                </span>
                <Button
                  variant="secondary"
                  disabled={revokingChat === connection.id}
                  onClick={async () => {
                    setRevokingChat(connection.id);
                    try {
                      const response = await fetch("/api/chat-connections", {
                        method: "DELETE",
                        credentials: "same-origin",
                        headers: {
                          "Content-Type": "application/json",
                          "X-Victor-Request": "1",
                        },
                        body: JSON.stringify({ id: connection.id }),
                      });
                      if (!response.ok)
                        throw new Error("Could not revoke connection.");
                      setChatConnections(await loadChatConnections());
                      notify("ChatGPT connection revoked");
                    } catch (issue) {
                      notify(
                        issue instanceof Error
                          ? issue.message
                          : "Revocation failed",
                        "error",
                      );
                    } finally {
                      setRevokingChat(null);
                    }
                  }}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </Card>
        <Card className="sheet-sync-settings">
          <CardHeader
            eyebrow="MONEY / GOOGLE SHEETS"
            title="Sync your monthly budget"
            subtitle="Keep the private spreadsheet as the source. Victor OS receives only the values shown in Money."
          />
          <p className="helper-line">
            Linked tab:{" "}
            <a
              href={BUDGET_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buget lunar — Salariu 10
            </a>
            . Changes appear after an edit, with a five-minute fallback for
            formula or automated changes. Values remain in RON and do not change
            manually entered accounts or transactions.
          </p>
          <p className="helper-line">
            Status: {sheetPaired ? "Pairing key active" : "Not connected"}
            {data.sheetBudgets[0]
              ? ` · Last update ${new Date(data.sheetBudgets[0].syncedAt).toLocaleString()}`
              : " · No sheet data received yet"}
          </p>
          <div className="backup-actions">
            <Button
              disabled={sheetBusy}
              onClick={async () => {
                setSheetBusy(true);
                try {
                  const response = await fetch("/api/sheet-sync/pair", {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                      "Content-Type": "application/json",
                      "X-Victor-Request": "1",
                    },
                    body: "{}",
                  });
                  if (!response.ok)
                    throw new Error("Could not create sheet connection.");
                  const result = (await response.json()) as { key: string };
                  setSheetScript(
                    appsScriptForBudget(window.location.origin, result.key),
                  );
                  setSheetPaired(true);
                  notify(
                    "Connection prepared. Install the script in the spreadsheet.",
                  );
                } catch (issue) {
                  notify(
                    issue instanceof Error
                      ? issue.message
                      : "Connection failed",
                    "error",
                  );
                } finally {
                  setSheetBusy(false);
                }
              }}
            >
              {sheetPaired ? "Generate new setup code" : "Connect Google Sheet"}
            </Button>
            {sheetPaired && (
              <Button
                variant="secondary"
                disabled={sheetBusy}
                onClick={async () => {
                  setSheetBusy(true);
                  try {
                    const response = await fetch("/api/sheet-sync/disconnect", {
                      method: "POST",
                      credentials: "same-origin",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Victor-Request": "1",
                      },
                      body: "{}",
                    });
                    if (!response.ok)
                      throw new Error("Could not disconnect the sheet.");
                    setSheetPaired(false);
                    setSheetScript("");
                    notify(
                      "Sheet connection revoked. Existing snapshot remains visible until Money is cleared.",
                    );
                  } catch (issue) {
                    notify(
                      issue instanceof Error
                        ? issue.message
                        : "Disconnect failed",
                      "error",
                    );
                  } finally {
                    setSheetBusy(false);
                  }
                }}
              >
                Disconnect
              </Button>
            )}
          </div>
          {sheetScript && (
            <div className="sheet-script-setup">
              <ol className="chat-steps">
                <li>
                  In the linked spreadsheet, open Extensions → Apps Script.
                </li>
                <li>
                  Replace the editor contents with the code below and save.
                </li>
                <li>
                  Select <code>setupVictorSync</code> and click Run. Authorize
                  the Google Sheets and external request permissions yourself.
                </li>
                <li>
                  Return to Money and refresh. Edits will then sync
                  automatically.
                </li>
              </ol>
              <Button
                variant="secondary"
                onClick={() =>
                  void navigator.clipboard
                    .writeText(sheetScript)
                    .then(() => notify("Setup code copied"))
                    .catch(() => notify("Could not copy code", "error"))
                }
              >
                <Copy size={16} /> Copy setup code
              </Button>
              <pre>
                <code>{sheetScript}</code>
              </pre>
              <p className="helper-line">
                This code contains a write-only sync key. Keep the Apps Script
                project private. Generating new setup code revokes the old key.
              </p>
            </div>
          )}
        </Card>
        <Card className="backup-card">
          <CardHeader
            eyebrow="YOUR DATA"
            title="Backup & restore"
            subtitle="Your live data is stored in Cloudflare D1. Export a separate copy you control."
          />
          <div className="backup-actions">
            <Button onClick={exportAll}>
              <Download size={17} /> Export all data
            </Button>
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={17} /> Import data
            </Button>
            <input
              ref={fileInput}
              className="sr-only"
              type="file"
              accept=".json,application/json"
              aria-label="Select backup file"
              onChange={(event) => void importFile(event.target.files?.[0])}
            />
          </div>
          {importError && <div className="form-error">{importError}</div>}
          {preview && (
            <div className="import-preview">
              <div className="import-preview-head">
                <FileJson size={20} />
                <div>
                  <strong>Backup ready to restore</strong>
                  <small>
                    Exported {new Date(preview.exportedAt).toLocaleString()}
                  </small>
                </div>
                <Badge tone="green">VALID</Badge>
              </div>
              <div className="preview-counts">
                {Object.entries(backupCounts(preview.data)).map(
                  ([name, count]) => (
                    <span key={name}>
                      {name} <strong>{count}</strong>
                    </span>
                  ),
                )}
              </div>
              <p>
                This will replace the current cloud data on every device. The
                source copy remains available until you remove it.
              </p>
              <div className="import-actions">
                <Button variant="secondary" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
                <Button onClick={() => setConfirm("import")}>
                  Review restore
                </Button>
              </div>
            </div>
          )}
        </Card>
        <Card>
          <CardHeader eyebrow="MAINTENANCE" title="Data controls" />
          <div className="danger-actions">
            <div>
              <strong>Clear demo outside Money & Notes</strong>
              <p>
                Remove {demoCount} example records marked DEMO in Projects,
                Tasks, AI Lab, and legacy Links. Money and Notes stay as they
                are.
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={!demoCount}
              onClick={() => setConfirm("demo")}
            >
              <Trash2 size={16} /> Clear nonfinancial demo
            </Button>
          </div>
          {!recordCount && (
            <div className="danger-actions">
              <div>
                <strong>Load demo data</strong>
                <p>
                  Add the marked example records to this empty cloud workspace.
                </p>
              </div>
              <Button variant="secondary" onClick={() => setConfirm("seed")}>
                Load demo data
              </Button>
            </div>
          )}
          <div className="danger-actions">
            <div>
              <strong>Clear Money</strong>
              <p>
                Remove all {moneyCount} accounts, debts, investments, budgets,
                transactions, goals, and the linked sheet snapshot from the
                cloud. The sheet key is revoked. Other sections stay as they
                are. A complete backup downloads before confirmation.
              </p>
            </div>
            <Button
              variant="danger"
              disabled={!moneyCount}
              onClick={async () => {
                try {
                  const fresh = await repository.refresh();
                  downloadText(
                    `victor-os-before-money-clear-${today()}.json`,
                    JSON.stringify(makeBackup(fresh), null, 2),
                  );
                  setConfirm("money");
                } catch (issue) {
                  notify(
                    issue instanceof Error
                      ? issue.message
                      : "Could not prepare the Money backup.",
                    "error",
                  );
                }
              }}
            >
              <Trash2 size={16} /> Clear Money
            </Button>
          </div>
          <div className="danger-actions">
            <div>
              <strong>Reset database</strong>
              <p>
                Delete all cloud records on every device and return preferences
                to defaults.
              </p>
            </div>
            <Button variant="danger" onClick={() => setConfirm("reset")}>
              <RotateCcw size={16} /> Reset database
            </Button>
          </div>
        </Card>
      </div>
      <aside className="settings-side">
        <Card className="privacy-card">
          <div className="privacy-icon">
            <Cloud size={23} />
          </div>
          <Badge tone="green">
            <span className="local-pulse" /> CLOUD SYNC
          </Badge>
          <h3>Available on your devices.</h3>
          <p>
            Records are stored in Cloudflare D1 and protected by your access
            key. The database is restricted to the EU. No analytics or paid AI
            API is used.
          </p>
          <div className="privacy-facts">
            <span>
              <Check size={15} /> {recordCount} cloud records
            </span>
            <span>
              <Cloud size={15} /> Refreshes when opened and every minute
            </span>
            <span>
              <ShieldCheck size={15} /> Backup is under your control
            </span>
          </div>
          <Button
            variant="secondary"
            onClick={() => {
              void repository
                .signOut()
                .then(() => window.location.reload())
                .catch((issue: unknown) =>
                  notify(
                    issue instanceof Error ? issue.message : "Sign out failed.",
                    "error",
                  ),
                );
            }}
          >
            <LogOut size={16} /> Sign out on this device
          </Button>
        </Card>
        <Card className="install-card">
          <Smartphone size={22} />
          <h3>Take Victor OS with you.</h3>
          <p>
            On iPhone, open your deployed HTTPS URL in Safari, tap Share, then
            Add to Home Screen.
          </p>
          <p>On desktop, use your browser’s Install app option.</p>
        </Card>
      </aside>
      {confirm === "import" && preview && (
        <ConfirmDialog
          title="Restore backup?"
          message="All current cloud data on every device will be replaced by the previewed backup. Export the current cloud data first if you need it."
          phrase="RESTORE"
          confirmLabel="Restore data"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await repository.replaceAll(preview.data);
            setPreview(null);
            setName(preview.data.settings[0].name);
            setSheetPaired(false);
            setSheetScript("");
            notify("Cloud backup restored");
          }}
        />
      )}
      {confirm === "reset" && (
        <ConfirmDialog
          title="Reset Victor OS?"
          message="Every project, task, money record, prompt, note, link, and setting in the cloud will be deleted on every device. ChatGPT connections will be revoked. Export a backup first if you want to keep anything."
          phrase="RESET VICTOR OS"
          confirmLabel="Reset database"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await repository.reset();
            setName("Victor");
            setChatConnections([]);
            setSheetPaired(false);
            setSheetScript("");
            notify("Database reset");
          }}
        />
      )}
      {confirm === "demo" && (
        <ConfirmDialog
          title="Clear nonfinancial demo?"
          message={`This removes ${demoCount} example records outside Money and Notes. Finance and notes records remain untouched.`}
          confirmLabel="Clear demo data"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await repository.clearDemoData();
            notify("Demo data cleared");
          }}
        />
      )}
      {confirm === "money" && (
        <ConfirmDialog
          title="Clear all Money data?"
          message="All accounts, debts, investments, monthly budgets, transactions, financial goals, and the linked sheet snapshot will be removed from every device. The sheet key will be revoked. A complete backup download was started before this confirmation. Projects, tasks, prompts, notes, playbooks, and settings will remain."
          phrase="CLEAR MONEY"
          confirmLabel="Clear Money"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await repository.clearMoney();
            setSheetPaired(false);
            setSheetScript("");
            notify("Money data cleared on every device");
          }}
        />
      )}
      {confirm === "seed" && (
        <ConfirmDialog
          title="Load demo data?"
          message="Add marked example records to this empty cloud workspace."
          confirmLabel="Load examples"
          danger={false}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await repository.replaceAll(makeDemoData());
            notify("Demo data loaded");
          }}
        />
      )}
    </div>
  );
}
