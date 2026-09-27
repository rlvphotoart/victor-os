import {
  parseAppData,
  parseRecord,
  recordSchemas,
  MAX_IMPORT_BYTES,
  type CollectionName,
} from "../src/data/backup";
import { makeDemoData } from "../src/data/demo";
import type { AppData, AppSettings } from "../src/types";
import {
  chatRoute,
  chatSystemOwner,
  listChatConnections,
  revokeChatConnection,
} from "./chat-bridge";

interface Env {
  DB: D1Database;
  ACCESS_KEY?: string;
  DEV_OWNER?: string;
}

type Row = {
  collection: CollectionName;
  id: string;
  payload: string;
  revision: number;
};

const collections = Object.keys(recordSchemas) as CollectionName[];
const defaultSettings: AppSettings = {
  id: "app",
  name: "Victor",
  theme: "dark",
  currency: "EUR",
  widgets: ["daily", "finance", "projects", "quickLinks"],
  initialized: true,
  dockExpanded: false,
  recentContexts: [],
  recentCommands: [],
};

const encoder = new TextEncoder();
const sessionCookie = "victor_os_session";

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    },
  });
}

function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function sameKey(candidate: string, expected: string) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let index = 0; index < a.length; index++)
    difference |= a[index] ^ b[index];
  return difference === 0;
}

async function issueSession(secret: string) {
  const expires = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload = base64url(
    encoder.encode(JSON.stringify({ expires, nonce: crypto.randomUUID() })),
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await hmacKey(secret),
    encoder.encode(payload),
  );
  return payload + "." + base64url(new Uint8Array(signature));
}

async function validSession(request: Request, secret: string) {
  const cookie = request.headers
    .get("Cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(sessionCookie + "="))
    ?.slice(sessionCookie.length + 1);
  if (!cookie) return false;
  const [payload, signature, extra] = cookie.split(".");
  if (!payload || !signature || extra) return false;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await hmacKey(secret),
      decodeBase64url(signature),
      encoder.encode(payload),
    );
    if (!valid) return false;
    const decoded = JSON.parse(
      new TextDecoder().decode(decodeBase64url(payload)),
    ) as { expires?: number };
    return typeof decoded.expires === "number" && decoded.expires > Date.now();
  } catch {
    return false;
  }
}

function cookieHeader(request: Request, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return (
    sessionCookie +
    "=" +
    value +
    "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" +
    maxAge +
    secure
  );
}

async function authenticate(
  request: Request,
  env: Env,
): Promise<string | null> {
  const url = new URL(request.url);
  if (env.DEV_OWNER && ["localhost", "127.0.0.1"].includes(url.hostname)) {
    return env.DEV_OWNER.trim().toLowerCase();
  }
  if (!env.ACCESS_KEY || env.ACCESS_KEY.length < 32) return null;
  return (await validSession(request, env.ACCESS_KEY)) ? "victor" : null;
}

function safeMutation(request: Request, env: Env) {
  const origin = request.headers.get("Origin");
  const url = new URL(request.url);
  const localProxy =
    Boolean(env.DEV_OWNER) &&
    ["localhost", "127.0.0.1"].includes(url.hostname) &&
    ["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin ?? "");
  return (
    (origin === url.origin || localProxy) &&
    request.headers.get("X-Victor-Request") === "1" &&
    request.headers.get("Content-Type")?.startsWith("application/json")
  );
}

async function body(request: Request): Promise<unknown> {
  const text = await request.text();
  if (encoder.encode(text).byteLength > MAX_IMPORT_BYTES)
    throw new Error("Request exceeds the 10 MB import limit.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON request.");
  }
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid request body.");
  }
  return value as Record<string, unknown>;
}

function revision(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new Error("Invalid record revision.");
  }
  return value as number;
}

async function ensureSettings(db: D1Database, owner: string) {
  const existing = await db
    .prepare("SELECT collection FROM records WHERE owner = ? LIMIT 1")
    .bind(owner)
    .first<{ collection: string }>();
  if (existing?.collection === "settings") return;
  const settings = await db
    .prepare(
      "SELECT 1 FROM records WHERE owner = ? AND collection = 'settings' AND id = 'app'",
    )
    .bind(owner)
    .first();
  if (settings) return;
  if (existing) {
    await db
      .prepare(
        "INSERT OR IGNORE INTO records (owner, collection, id, payload, revision) VALUES (?, 'settings', 'app', ?, 1)",
      )
      .bind(owner, JSON.stringify(defaultSettings))
      .run();
    return;
  }
  const demo = makeDemoData();
  await db.batch(
    collections.flatMap((collection) =>
      (demo[collection] as Array<{ id: string }>).map((value) =>
        db
          .prepare(
            "INSERT INTO records (owner, collection, id, payload, revision) VALUES (?, ?, ?, ?, 1)",
          )
          .bind(owner, collection, value.id, JSON.stringify(value)),
      ),
    ),
  );
}

async function snapshot(db: D1Database, owner: string) {
  await ensureSettings(db, owner);
  const result = await db
    .prepare(
      "SELECT collection, id, payload, revision FROM records WHERE owner = ?",
    )
    .bind(owner)
    .all<Row>();
  const data = Object.fromEntries(
    collections.map((name) => [name, []]),
  ) as unknown as AppData;
  const revisions: Record<string, number> = {};
  for (const row of result.results) {
    if (!collections.includes(row.collection)) continue;
    const parsed = parseRecord(row.collection, JSON.parse(row.payload));
    (data[row.collection] as Array<typeof parsed>).push(parsed);
    revisions[row.collection + ":" + row.id] = row.revision;
  }
  return { data: parseAppData(data), revisions };
}

async function saveRecord(
  db: D1Database,
  owner: string,
  collection: CollectionName,
  id: string,
  requestBody: unknown,
) {
  const input = asObject(requestBody);
  const value = parseRecord(collection, input.value);
  if (value.id !== id || (collection === "settings" && id !== "app")) {
    throw new Error("Record ID does not match its URL.");
  }
  const expected = revision(input.revision);
  const payload = JSON.stringify(value);
  if (expected === 0) {
    const result = await db
      .prepare(
        "INSERT OR IGNORE INTO records (owner, collection, id, payload, revision) VALUES (?, ?, ?, ?, 1)",
      )
      .bind(owner, collection, id, payload)
      .run();
    return result.meta.changes === 1 ? 1 : null;
  }
  const result = await db
    .prepare(
      "UPDATE records SET payload = ?, revision = revision + 1 WHERE owner = ? AND collection = ? AND id = ? AND revision = ?",
    )
    .bind(payload, owner, collection, id, expected)
    .run();
  return result.meta.changes === 1 ? expected + 1 : null;
}

async function removeRecord(
  db: D1Database,
  owner: string,
  collection: CollectionName,
  id: string,
  requestBody: unknown,
) {
  if (collection === "settings") throw new Error("Settings cannot be deleted.");
  const expected = revision(asObject(requestBody).revision);
  if (expected === 0) return false;
  const result = await db
    .prepare(
      "DELETE FROM records WHERE owner = ? AND collection = ? AND id = ? AND revision = ?",
    )
    .bind(owner, collection, id, expected)
    .run();
  return result.meta.changes === 1;
}

async function replaceAll(db: D1Database, owner: string, requestBody: unknown) {
  const data = parseAppData(asObject(requestBody).data);
  const rows = collections.flatMap((collection) =>
    (data[collection] as Array<{ id: string }>).map((value) =>
      db
        .prepare(
          "INSERT INTO records (owner, collection, id, payload, revision) VALUES (?, ?, ?, ?, 1)",
        )
        .bind(owner, collection, value.id, JSON.stringify(value)),
    ),
  );
  await db.batch([
    db.prepare("DELETE FROM records WHERE owner = ?").bind(owner),
    ...rows,
  ]);
}

export async function handleApiForOwner(
  request: Request,
  env: Env,
  owner: string,
): Promise<Response> {
  if (!env.DB) return json({ error: "Cloud database is not configured." }, 503);
  const url = new URL(request.url);
  const path = url.pathname;
  try {
    if (request.method === "GET" && path === "/api/data") {
      return json(await snapshot(env.DB, owner));
    }
    if (request.method === "GET" && path === "/api/health") {
      await env.DB.prepare("SELECT 1 FROM records LIMIT 1").first();
      return json({ status: "ready" });
    }
    if (request.method === "GET" && path === "/api/chat-connections") {
      return json({ connections: await listChatConnections(env.DB) });
    }
    if (!safeMutation(request, env))
      return json({ error: "Request origin or content type rejected." }, 403);
    const input = await body(request);
    if (request.method === "DELETE" && path === "/api/chat-connections") {
      const id = asObject(input).id;
      if (typeof id !== "string" || !id)
        return json({ error: "Invalid connection ID." }, 400);
      const removed = await revokeChatConnection(env.DB, id);
      return json({ ok: true, removed });
    }
    if (path.startsWith("/api/records/")) {
      const parts = path.split("/");
      if (parts.length !== 5)
        return json({ error: "Invalid record path." }, 404);
      const collection = parts[3] as CollectionName;
      const id = decodeURIComponent(parts[4]);
      if (!collections.includes(collection) || !id || id.length > 200) {
        return json({ error: "Invalid record path." }, 404);
      }
      if (request.method === "PUT") {
        const next = await saveRecord(env.DB, owner, collection, id, input);
        return next === null
          ? json(
              {
                error:
                  "This record changed in another browser. The latest data has been loaded; review and retry.",
              },
              409,
            )
          : json({ revision: next });
      }
      if (request.method === "DELETE") {
        const removed = await removeRecord(
          env.DB,
          owner,
          collection,
          id,
          input,
        );
        return removed
          ? json({ ok: true })
          : json(
              {
                error:
                  "This record changed in another browser. The latest data has been loaded; review and retry.",
              },
              409,
            );
      }
    }
    if (request.method === "POST" && path === "/api/clear-demo") {
      await env.DB.prepare(
        "DELETE FROM records WHERE owner = ? AND collection IN ('projects','tasks','prompts','costModels','links','playbooks') AND json_extract(payload, '$.demo') = 1",
      )
        .bind(owner)
        .run();
      return json({ ok: true });
    }
    if (request.method === "POST" && path === "/api/replace") {
      await replaceAll(env.DB, owner, input);
      return json({ ok: true });
    }
    if (request.method === "POST" && path === "/api/reset") {
      await env.DB.batch([
        env.DB.prepare("DELETE FROM records WHERE owner = ?").bind(owner),
        env.DB.prepare("DELETE FROM records WHERE owner = ?").bind(
          chatSystemOwner,
        ),
        env.DB.prepare(
          "INSERT INTO records (owner, collection, id, payload, revision) VALUES (?, 'settings', 'app', ?, 1)",
        ).bind(owner, JSON.stringify(defaultSettings)),
      ]);
      return json({ ok: true });
    }
    return json({ error: "Unknown API endpoint." }, 404);
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      error instanceof URIError ||
      (error instanceof Error &&
        /^(Invalid|Record|Data|Backup|Request)/.test(error.message))
    ) {
      return json({ error: error.message }, 400);
    }
    return json(
      { error: "Cloud database request failed. No data was changed." },
      500,
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const chatResponse = await chatRoute(request, env);
    if (chatResponse) return chatResponse;
    if (!new URL(request.url).pathname.startsWith("/api/"))
      return json({ error: "Not found." }, 404);
    const path = new URL(request.url).pathname;
    if (path === "/api/login" && request.method === "POST") {
      if (!safeMutation(request, env))
        return json({ error: "Request origin or content type rejected." }, 403);
      if (!env.ACCESS_KEY || env.ACCESS_KEY.length < 32) {
        return json({ error: "Cloud access key is not configured yet." }, 503);
      }
      let input: Record<string, unknown>;
      try {
        input = asObject(await body(request));
      } catch {
        return json({ error: "Invalid login request." }, 400);
      }
      if (
        typeof input.key !== "string" ||
        !(await sameKey(input.key, env.ACCESS_KEY))
      ) {
        return json({ error: "Access key is incorrect." }, 401);
      }
      const response = json({ ok: true });
      response.headers.set(
        "Set-Cookie",
        cookieHeader(
          request,
          await issueSession(env.ACCESS_KEY),
          30 * 24 * 60 * 60,
        ),
      );
      return response;
    }
    if (path === "/api/logout" && request.method === "POST") {
      if (!safeMutation(request, env))
        return json({ error: "Request origin or content type rejected." }, 403);
      const response = json({ ok: true });
      response.headers.set("Set-Cookie", cookieHeader(request, "", 0));
      return response;
    }
    if (!env.ACCESS_KEY && !env.DEV_OWNER)
      return json({ error: "Cloud access key is not configured yet." }, 503);
    const owner = await authenticate(request, env);
    if (!owner)
      return json({ error: "Sign in with your Victor OS access key." }, 401);
    return handleApiForOwner(request, env, owner);
  },
} satisfies ExportedHandler<Env>;
