# Victor OS

A private personal command center for projects, tasks, finances, prompts, notes, playbooks, and browser utilities. The interface is a React progressive web app. Data is stored in Cloudflare D1 and is available in every browser after signing in with the same access key.

## What is included

- Home dashboard with priorities, financial position, projects, and quick access to playbooks.
- Tasks with Today and board views, filters, sorting, drag and drop, and editing.
- Projects with status, priority, progress, notes, next action, and links.
- Money with manual accounts, debts, investments, transactions, budgets, goals, and monthly charts. There is no bank connection.
- AI Lab with 22 reusable prompts, search, favorites, duplication, version history, and an editable model cost calculator.
- Model cost reference with researched, dated source links, provider filters, and explicit unpriced entries for Paperclip and Hermès. Estimates use standard direct API text-token rates in USD and exclude caching, long context, tools, tax, and subscription billing.
- Playbooks with reusable checklists for weekly planning, release readiness, validation evidence, defect triage, and AI pilots.
- Markdown notes with autosave, pins, and search.
- Browser-only utilities for JSON, Base64, URL encoding, timestamps, UUIDs, text diff, regex, counting, token estimates, and requirement/test ID reconciliation.
- Global command palette, responsive mobile navigation, dark/light theme, and installable PWA.
- Complete JSON backup and restore, demo-data removal, and a strongly confirmed reset.
- A private ChatGPT MCP connection that classifies conversational updates and writes supported records directly to D1.

The interface design rationale is in [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md). All fonts are self-hosted. No analytics, ad trackers, paid AI APIs, or bank APIs are used.

## Architecture

| Layer          | Implementation                                              |
| -------------- | ----------------------------------------------------------- |
| UI             | React 19, TypeScript, Vite, Tailwind, Lucide                |
| Hosting        | Cloudflare Worker with static assets and an API             |
| Storage        | Cloudflare D1, EU jurisdiction                              |
| Authentication | One private Worker secret, signed HttpOnly browser sessions |
| Validation     | Zod on both the client and the Worker                       |
| PWA            | Vite PWA service worker and web manifest                    |
| Backups        | Versioned JSON export/import                                |
| ChatGPT bridge | MCP over HTTPS with OAuth 2.1 authorization code + PKCE     |

Normal app data flows through [src/data/repository.ts](src/data/repository.ts), including appearance, dock layout, recent contexts, and command history. The repository serializes writes, refreshes when the app regains focus and every minute while open, and rejects stale edits to the same record rather than silently overwriting them. [worker/index.ts](worker/index.ts) validates requests and writes to D1. [migrations/0001_records.sql](migrations/0001_records.sql) defines the database table. Records are partitioned by a single private workspace owner.

The first authenticated visit seeds clearly marked demo records. Settings has a one-time **Apply personal workspace** action: it downloads a backup, removes example records outside Money and Notes, and adds curated projects, Sunday tasks, prompts, model rates, and playbooks. It leaves the Money and Notes collections untouched. Afterward, Settings can clear remaining nonfinancial examples, and a reset does not seed examples again. If the workspace is empty later, Settings can load them again.

The deployed app does not use IndexedDB or localStorage for application data. The PWA shell can be cached, but cloud data requires an internet connection. The service worker does not cache API responses.

### Access key

The Worker expects an encrypted secret named ACCESS_KEY. Choose at least 32 **random** characters and keep it in a password manager. Do not put it in Git, a URL, or a backup file. The sign-in form sends it to this Worker's same-origin API over HTTPS. A successful sign-in creates an HttpOnly, Secure, SameSite=Strict cookie for 30 days. The key is never stored in the browser's JavaScript storage. Rotating the Worker secret invalidates existing sessions without deleting D1 data.

The public static files contain no personal records. The API refuses data access when ACCESS_KEY is missing or invalid. For local development only, a gitignored .dev.vars file may set DEV_OWNER; this bypass is restricted to localhost and must never be configured on the deployed Worker.

## Update Victor OS from a ChatGPT conversation

The Worker now serves a private MCP endpoint at `https://your-worker.example/mcp`. It gives ChatGPT focused tools to read limited workspace context and to create or update tasks, projects, and notes; record completed income/expenses; and save prompts. The model interprets the conversation and selects the tool. Each successful tool call writes directly to D1, so the change appears in the live app without a Git commit or code deployment.

The connection uses OAuth 2.1 authorization code with PKCE. During setup, Victor OS asks for the existing access key **on the Victor OS domain**. ChatGPT receives a scoped, revocable token; it never receives the access key. Access tokens expire after one hour, refresh tokens rotate and expire after 30 days, and Settings shows connected sessions with a **Revoke** action. Rotating ACCESS_KEY also invalidates all connections. The OAuth state is stored separately from normal app records, so backups do not export connection tokens; resetting the database revokes every connection.

### Connect in ChatGPT Work

1. In ChatGPT, open Settings → Security and login and enable Developer mode.
2. Open ChatGPT Plugins, create a personal plugin using the MCP URL above, then install it.
3. In a Work chat, select the Victor OS plugin and ask it to read the workspace or save a change.
4. When ChatGPT opens the Victor OS authorization page, check the domain and enter your access key there. Authorize the read/write connection.
5. Return to Settings → ChatGPT connection in Victor OS to see or revoke the connection.

The current setup follows the [official ChatGPT plugin quickstart](https://developers.openai.com/plugins/quickstart) and [OAuth guidance](https://developers.openai.com/plugins/build/auth). Availability of the Plugins and Work interface depends on the ChatGPT account and workspace. This is a personal connection; it does not require an OpenAI API key or paid model API calls from Victor OS. Conversation content is still processed by ChatGPT under the account's privacy settings.

Examples:

- “Adaugă un task important: verific raportul de validare luni.” → task.
- “Am plătit 40 EUR pentru transport astăzi.” → expense transaction dated today.
- “Trebuie să plătesc factura vineri.” → task, because the payment has not happened.
- “Ține minte decizia din ședință…” → note.
- “Proiectul Victor OS este blocat până la testul pe iPhone.” → project update after resolving the project ID.

For finance, the connector only records completed transactions. It never moves money, changes balances, updates debts, or converts currencies. A transaction in another currency is rejected until the user provides an amount in the workspace currency. Missing amounts, dates, project IDs, or other consequential details should be clarified in the conversation. Duplicate task and transaction checks reduce accidental repeats. Read-only context is limited to project names/status, open task summaries, note titles, the date/timezone, and workspace currency; full financial data is not returned by that tool.

## Run locally

Use Node.js 22.16 or later. The repository has a .node-version file.

    npm ci
    cp .dev.vars.example .dev.vars
    npm run migrate:local
    npm run build
    npm run dev:worker

Open http://localhost:8787. The local Worker uses a separate local D1 database in .wrangler and a localhost-only development identity. For hot reload, keep the Worker running in one terminal and run npm run dev in another; Vite proxies /api to port 8787.

Run release checks:

    npm run lint
    npm run typecheck
    npm test
    npm run build
    npx wrangler deploy --dry-run

## Deploy on Cloudflare for €0/month

The repository is connected to the existing Cloudflare Worker named victor-os. Its Git integration uses the main branch, build command npm run build, and deploy command npx wrangler deploy. Pushing main triggers deployment. [wrangler.jsonc](wrangler.jsonc) configures static assets, the SPA fallback, API routing, and D1 binding.

One-time setup for this account:

1. In Cloudflare D1, use the existing victor-os-data database. It was created with the EU jurisdiction. The committed Wrangler file contains its database ID. The records table and index have been created. For a new database or another account, create a D1 database, update its ID in wrangler.jsonc, then apply migrations with npx wrangler d1 migrations apply DB --remote.
2. In Cloudflare Workers & Pages → victor-os → Settings → Variables and secrets, add ACCESS_KEY as an **encrypted secret** for Production. Use a random value of at least 32 characters from your password manager. Keep a copy in that password manager. Never add it as a plain-text variable or commit it.
3. Push main (or allow the existing Git integration to deploy it). The wrangler.jsonc setting enables the production workers.dev route. Open the assigned HTTPS URL and enter the same access key.
4. Open that URL on iPhone, MacBook, and Windows. Each browser signs in once per session; all records then come from the same D1 database.

Cloudflare Zero Trust Access was not used: its activation flow in this account requested a payment method and authorization for overage charges. The private Worker key avoids that requirement.

Cloudflare's published free allowances currently include [D1 storage and daily row operations](https://developers.cloudflare.com/d1/platform/pricing/) and [free Worker requests](https://developers.cloudflare.com/workers/platform/pricing/). The personal dashboard uses these free services and has no paid API or database. Free-tier limits can change, so review Cloudflare's current plan before adding heavy automated traffic.

## Moving existing browser data

IndexedDB belongs to a specific browser and URL origin. A new workers.dev URL cannot read data saved by localhost or another origin.

1. Open the previous local Victor OS version in the browser that contains your data.
2. Go to Settings → Export all data and save the JSON file.
3. Open the new cloud URL, sign in, then go to Settings → Import data.
4. Review the record counts and confirm RESTORE. This replaces the cloud workspace, so export any new cloud records first.
5. Reload on another browser and verify the same records appear before deleting any old local copy.

The older browser data remains in its original browser until you choose to remove it. The new app cannot access it directly because browser storage is isolated by URL origin.

## Backup and recovery

Settings → Export all data downloads victor-os-backup-YYYY-MM-DD.json. It includes every record and setting, including prompt versions, model source metadata, legacy links, and playbooks. Imports accept both schema v1 and v2, validate format, IDs, record structures, and URLs, show a preview, then require RESTORE. The replacement runs as one D1 transaction. Reset database requires RESET VICTOR OS and applies to every device. Clear demo data deliberately excludes Money and Notes.

Backups contain financial and other private information. Store them privately. D1 Time Travel may provide additional recovery, but regular JSON exports remain the portable backup.

## Install as a PWA

- iPhone: open the HTTPS URL in Safari → Share → Add to Home Screen. Open from the new icon and sign in there if asked.
- Mac or Windows: use the browser's Install app action.

The app shell loads from the PWA cache after a successful visit. Reading or changing personal records requires a connection to D1.

## Future improvements

The repository abstraction can later support multi-user accounts, passkeys, or an OAuth provider without rewriting page components. A per-record revision prevents silent same-record overwrites; collaborative editing and offline write queues are intentionally outside the scope of this private single-user version.
