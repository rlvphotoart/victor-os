import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Braces,
  Check,
  Clock3,
  Code2,
  Copy,
  Fingerprint,
  Link2,
  Search,
  TextCursorInput,
  WandSparkles,
} from "lucide-react";
import { TOOLS } from "../types";
import { copyText } from "../lib/utils";
import { Badge, Button, Card, Field, Input, Textarea } from "../components/ui";
import { useToast } from "../components/toast";

const toolIcons = [
  Braces,
  Code2,
  Link2,
  Clock3,
  Fingerprint,
  TextCursorInput,
  Search,
  TextCursorInput,
  WandSparkles,
];
type ToolId = (typeof TOOLS)[number]["id"];

export function ToolboxPage() {
  const [params, setParams] = useSearchParams();
  const selectedId = (TOOLS.find((item) => item.id === params.get("tool"))
    ?.id ?? "json") as ToolId;
  const selected = TOOLS.find((item) => item.id === selectedId)!;
  return (
    <div className="toolbox-layout">
      <div className="tool-menu">
        <div className="eyebrow">LOCAL UTILITIES</div>
        {TOOLS.map((item, index) => {
          const Icon = toolIcons[index];
          return (
            <button
              key={item.id}
              className={selectedId === item.id ? "active" : ""}
              onClick={() => setParams({ tool: item.id })}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </div>
      <Card className="tool-panel">
        <div className="tool-panel-header">
          <div className="tool-big-icon">
            {(() => {
              const Icon =
                toolIcons[TOOLS.findIndex((item) => item.id === selectedId)];
              return <Icon size={24} />;
            })()}
          </div>
          <div>
            <span className="eyebrow">BROWSER ONLY</span>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
          </div>
        </div>
        <ToolContent key={selectedId} id={selectedId} />
      </Card>
    </div>
  );
}

function ToolContent({ id }: { id: ToolId }) {
  const [input, setInput] = useState("");
  const [secondary, setSecondary] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [flags, setFlags] = useState("gi");
  const [uuidCount, setUuidCount] = useState(1);
  const notify = useToast();
  const run = (action: string) => {
    setError("");
    try {
      switch (id) {
        case "json": {
          const parsed = JSON.parse(input);
          setOutput(
            action === "minify"
              ? JSON.stringify(parsed)
              : JSON.stringify(parsed, null, 2),
          );
          break;
        }
        case "base64": {
          if (action === "encode") {
            const bytes = new TextEncoder().encode(input);
            let binary = "";
            for (const byte of bytes) binary += String.fromCharCode(byte);
            setOutput(btoa(binary));
          } else {
            const bytes = Uint8Array.from(atob(input.trim()), (char) =>
              char.charCodeAt(0),
            );
            setOutput(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
          }
          break;
        }
        case "url":
          setOutput(
            action === "encode"
              ? encodeURIComponent(input)
              : decodeURIComponent(input),
          );
          break;
        case "timestamp": {
          if (action === "to-date") {
            const raw = Number(input.trim());
            if (!Number.isFinite(raw))
              throw new Error("Enter a numeric Unix timestamp.");
            const date = new Date(Math.abs(raw) < 1e11 ? raw * 1000 : raw);
            if (Number.isNaN(date.getTime()))
              throw new Error("Timestamp is out of range.");
            setOutput(
              `${date.toLocaleString()}\n${date.toISOString()}\nUnix seconds: ${Math.floor(date.getTime() / 1000)}`,
            );
          } else {
            const date = new Date(secondary);
            if (Number.isNaN(date.getTime()))
              throw new Error("Enter a valid date and time.");
            setOutput(
              `Unix seconds: ${Math.floor(date.getTime() / 1000)}\nUnix milliseconds: ${date.getTime()}\nISO: ${date.toISOString()}`,
            );
          }
          break;
        }
        case "uuid":
          setOutput(
            Array.from({ length: uuidCount }, () => crypto.randomUUID()).join(
              "\n",
            ),
          );
          break;
        case "diff":
          setOutput(makeDiff(input, secondary));
          break;
        case "regex": {
          const uniqueFlags = [
            ...new Set(`${flags.replace(/[^dgimsuvy]/g, "")}g`.split("")),
          ].join("");
          const regex = new RegExp(input, uniqueFlags);
          const matches = [...secondary.matchAll(regex)].slice(0, 100);
          setOutput(
            matches.length
              ? `${matches.length}${matches.length === 100 ? "+" : ""} match(es)\n\n${matches
                  .map(
                    (match, index) =>
                      `${index + 1}. ${JSON.stringify(match[0])} at index ${match.index}${
                        match.length > 1
                          ? ` · groups: ${match
                              .slice(1)
                              .map((value) => JSON.stringify(value))
                              .join(", ")}`
                          : ""
                      }`,
                  )
                  .join("\n")}`
              : "No matches.",
          );
          break;
        }
      }
    } catch (issue) {
      setOutput("");
      setError(
        issue instanceof Error
          ? issue.message
          : "Unable to process this input.",
      );
    }
  };
  const copy = async () => {
    try {
      await copyText(output);
      notify("Output copied");
    } catch {
      notify("Clipboard is unavailable", "error");
    }
  };
  const counter = useMemo(
    () => ({
      characters: input.length,
      noSpaces: input.replace(/\s/g, "").length,
      words: input.trim() ? input.trim().split(/\s+/).length : 0,
      lines: input ? input.split(/\r?\n/).length : 0,
    }),
    [input],
  );
  if (id === "counter" || id === "tokens")
    return (
      <div className="tool-content">
        <Field label="Your text">
          <Textarea
            rows={12}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Paste or type text here..."
          />
        </Field>
        <div className="tool-stats">
          <div>
            <span>CHARACTERS</span>
            <strong>{counter.characters.toLocaleString()}</strong>
          </div>
          <div>
            <span>WORDS</span>
            <strong>{counter.words.toLocaleString()}</strong>
          </div>
          <div>
            <span>LINES</span>
            <strong>{counter.lines.toLocaleString()}</strong>
          </div>
          <div>
            <span>{id === "tokens" ? "EST. TOKENS" : "NO SPACES"}</span>
            <strong>
              {(id === "tokens"
                ? Math.ceil(counter.characters / 4)
                : counter.noSpaces
              ).toLocaleString()}
            </strong>
          </div>
        </div>
        {id === "tokens" && (
          <p className="helper-line">
            This is a rough estimate of one token per four characters. Actual
            token counts vary by model and content.
          </p>
        )}
      </div>
    );
  return (
    <div className="tool-content">
      {id === "json" && (
        <>
          <Field label="JSON input">
            <Textarea
              rows={10}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={'{"hello": "world"}'}
              spellCheck={false}
            />
          </Field>
          <div className="tool-actions">
            <Button onClick={() => run("format")}>Format & validate</Button>
            <Button variant="secondary" onClick={() => run("minify")}>
              Minify
            </Button>
          </div>
        </>
      )}
      {(id === "base64" || id === "url") && (
        <>
          <Field label="Input text">
            <Textarea
              rows={8}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Enter text..."
            />
          </Field>
          <div className="tool-actions">
            <Button onClick={() => run("encode")}>Encode</Button>
            <Button variant="secondary" onClick={() => run("decode")}>
              Decode
            </Button>
          </div>
        </>
      )}
      {id === "timestamp" && (
        <>
          <Field label="Unix timestamp (seconds or milliseconds)">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="1727424000"
            />
          </Field>
          <Button onClick={() => run("to-date")}>Convert to date</Button>
          <div className="tool-divider">OR</div>
          <Field label="Human date and time">
            <Input
              type="datetime-local"
              value={secondary}
              onChange={(event) => setSecondary(event.target.value)}
            />
          </Field>
          <Button variant="secondary" onClick={() => run("to-unix")}>
            Convert to Unix
          </Button>
        </>
      )}
      {id === "uuid" && (
        <>
          <Field label="Number of UUIDs">
            <Input
              type="number"
              min="1"
              max="100"
              value={uuidCount}
              onChange={(event) =>
                setUuidCount(
                  Math.min(100, Math.max(1, Number(event.target.value) || 1)),
                )
              }
            />
          </Field>
          <Button onClick={() => run("generate")}>Generate UUIDs</Button>
        </>
      )}
      {id === "diff" && (
        <>
          <div className="form-grid">
            <Field label="Original text">
              <Textarea
                rows={10}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Original..."
              />
            </Field>
            <Field label="Changed text">
              <Textarea
                rows={10}
                value={secondary}
                onChange={(event) => setSecondary(event.target.value)}
                placeholder="Changed..."
              />
            </Field>
          </div>
          <Button onClick={() => run("compare")}>Compare text</Button>
        </>
      )}
      {id === "regex" && (
        <>
          <div className="form-grid">
            <Field label="Pattern">
              <Input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="\\bword\\b"
              />
            </Field>
            <Field label="Flags">
              <Input
                value={flags}
                onChange={(event) => setFlags(event.target.value)}
                placeholder="gi"
              />
            </Field>
          </div>
          <Field label="Test text">
            <Textarea
              rows={9}
              value={secondary}
              onChange={(event) => setSecondary(event.target.value)}
              placeholder="Text to test..."
            />
          </Field>
          <Button onClick={() => run("test")}>Test regex</Button>
        </>
      )}
      {error && <div className="tool-error">{error}</div>}
      {output && (
        <div className="tool-output">
          <div>
            <Badge tone="green">
              <Check size={12} /> RESULT
            </Badge>
            <Button variant="ghost" onClick={copy}>
              <Copy size={15} /> Copy
            </Button>
          </div>
          <pre>{output}</pre>
        </div>
      )}
    </div>
  );
}

function makeDiff(before: string, after: string) {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  if (a.length > 400 || b.length > 400)
    throw new Error("Compare up to 400 lines on each side.");
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      matrix[i][j] =
        a[i] === b[j]
          ? matrix[i + 1][j + 1] + 1
          : Math.max(matrix[i + 1][j], matrix[i][j + 1]);
  const lines: string[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      lines.push(`  ${a[i]}`);
      i++;
      j++;
    } else if (matrix[i + 1][j] >= matrix[i][j + 1]) lines.push(`- ${a[i++]}`);
    else lines.push(`+ ${b[j++]}`);
  }
  while (i < a.length) lines.push(`- ${a[i++]}`);
  while (j < b.length) lines.push(`+ ${b[j++]}`);
  return lines.join("\n");
}
