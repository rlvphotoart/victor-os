import { useRef, useState } from "react";
import {
  Check,
  CloudOff,
  Download,
  FileJson,
  HardDrive,
  Moon,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import type { AppData, WidgetId } from "../types";
import {
  backupCounts,
  makeBackup,
  parseBackup,
  type BackupFile,
} from "../data/backup";
import { repository } from "../data/repository";
import { downloadText, today } from "../lib/utils";
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
    label: "Quick links",
    description: "Your most used destinations",
  },
];

export function SettingsPage({ data }: { data: AppData }) {
  const settings = data.settings[0];
  const [name, setName] = useState(settings?.name ?? "Victor");
  const [preview, setPreview] = useState<BackupFile | null>(null);
  const [importError, setImportError] = useState("");
  const [confirm, setConfirm] = useState<"import" | "reset" | "demo" | null>(
    null,
  );
  const fileInput = useRef<HTMLInputElement>(null);
  const notify = useToast();
  const demoCount = Object.values(data)
    .flat()
    .filter(
      (row: unknown) =>
        typeof row === "object" &&
        row !== null &&
        "demo" in row &&
        row.demo === true,
    ).length;
  const recordCount = Object.values(backupCounts(data)).reduce(
    (sum, value) => sum + value,
    0,
  );
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
    if (file.size > 25 * 1024 * 1024) {
      setImportError("This backup is larger than 25 MB.");
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
        <Card className="backup-card">
          <CardHeader
            eyebrow="YOUR DATA"
            title="Backup & restore"
            subtitle="Keep a copy somewhere you control. Backups include every project, task, finance record, prompt, note, link, and setting."
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
              <p>This will replace all current local data on this device.</p>
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
              <strong>Clear demo data</strong>
              <p>
                Remove {demoCount} example records marked DEMO. Your own records
                stay.
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={!demoCount}
              onClick={() => setConfirm("demo")}
            >
              <Trash2 size={16} /> Clear demo data
            </Button>
          </div>
          <div className="danger-actions">
            <div>
              <strong>Reset database</strong>
              <p>
                Delete all records on this device and return preferences to
                defaults.
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
            <HardDrive size={23} />
          </div>
          <Badge tone="green">
            <span className="local-pulse" /> LOCAL DATA
          </Badge>
          <h3>Private by default.</h3>
          <p>
            Your information is stored in this browser’s IndexedDB. No account,
            server, analytics, or cloud sync is used.
          </p>
          <div className="privacy-facts">
            <span>
              <Check size={15} /> {recordCount} local records
            </span>
            <span>
              <CloudOff size={15} /> No automatic uploads
            </span>
            <span>
              <ShieldCheck size={15} /> Backup is under your control
            </span>
          </div>
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
          message="All current local data on this device will be replaced by the previewed backup. Export your current data first if you need it."
          phrase="RESTORE"
          confirmLabel="Restore data"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await repository.replaceAll(preview.data);
            setPreview(null);
            setName(preview.data.settings[0].name);
            notify("Backup restored");
          }}
        />
      )}
      {confirm === "reset" && (
        <ConfirmDialog
          title="Reset Victor OS?"
          message="Every project, task, money record, prompt, note, link, and setting on this device will be deleted. Export a backup first if you want to keep anything."
          phrase="RESET VICTOR OS"
          confirmLabel="Reset database"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await repository.reset();
            setName("Victor");
            notify("Database reset");
          }}
        />
      )}
      {confirm === "demo" && (
        <ConfirmDialog
          title="Clear demo data?"
          message={`This removes ${demoCount} records marked DEMO. Edited examples still marked DEMO will also be removed.`}
          confirmLabel="Clear demo data"
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            await repository.clearDemoData();
            notify("Demo data cleared");
          }}
        />
      )}
    </div>
  );
}
