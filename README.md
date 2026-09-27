# Victor OS

A private, local-first personal command center for tasks, projects, money, prompts, notes, links, and small utilities. It is a static progressive web app (PWA) designed for Cloudflare Pages.

## What is included

- **Home:** a Now, Attention, and Recent operating view with the next action, financial reading, project runway, and configurable quick access.
- **Tasks:** Today, board, and all-task views; quick add; project/priority/status filters; sorting; search; completion; editing; deletion; desktop drag between status columns. On touch screens, change status with the selector on each task.
- **Projects:** status, priority, progress, next action, notes, links, and related task counts.
- **Money:** manually entered accounts, debt, investments, transactions, monthly category budgets, goals, financial ratios, and a six-month income/expense chart. There are no bank connections.
- **AI Lab:** searchable prompt library for Codex, ChatGPT, Hermès, Claude, and other tools; favorites, copying, duplication, editing, deletion, and version history. The model cost calculator uses rates you enter and supports side-by-side comparisons.
- **Notes:** Markdown editor and preview, tags, pins, search, and autosave.
- **Toolbox:** JSON formatting/validation, Base64, URL encoding, timestamp conversion in both directions, UUID generation, line diff, regex testing, character counting, and rough token estimates. Processing stays in the browser.
- **Links:** categorized bookmarks with drag ordering on desktop and move buttons on touch screens.
- **Settings:** appearance, currency display, dashboard widgets, complete JSON backup/restore, clear demo records, and reset.
- **Victor Command:** `⌘ K` on Mac or `Ctrl K` on Windows to search pages, records, links, and tools or create a task, project, prompt, or note. `N` starts a task when focus is outside a text field.

The Meridian interface uses a numbered desktop navigation spine, persistent system strip, contextual focus planes, and a five-position mobile dock. Recent contexts and dock expansion are small browser-local UI preferences; the repository's domain data and backup format are unchanged. Project and task objects also expose contextual right-click actions on desktop.

The included sample records carry a **DEMO** marker. **Settings → Clear demo data** removes them. Editing a demo record does not remove its DEMO marker, so it will still be cleared; duplicate or create a new record to keep a personal copy.

## Stack and architecture

| Layer      | Choice                                                                             |
| ---------- | ---------------------------------------------------------------------------------- |
| UI         | React 19, TypeScript, Vite, Tailwind CSS, custom reusable components, Lucide icons |
| Routing    | React Router                                                                       |
| Data       | IndexedDB through Dexie                                                            |
| Validation | Zod for import schema validation                                                   |
| PWA        | `vite-plugin-pwa` with a generated service worker and app manifest                 |
| Hosting    | Static Cloudflare Pages site; no server functions                                  |

The visual system uses self-hosted Inter Variable and IBM Plex Mono font files. `src/os.css` owns Meridian's semantic dark/light tokens, shell, surfaces, motion, and responsive rules. `src/styles.css` retains component anatomy, while `src/redesign.css` holds earlier component refinements still used by the app. The rationale and visual audit are in [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md); prior research is in [DESIGN_RESEARCH.md](DESIGN_RESEARCH.md). No font or analytics request is sent to a third-party domain.

`src/data/repository.ts` is the only data access surface used by the UI. It wraps Dexie tables, initialization, snapshots, settings, and atomic full-data replacement. The database schema lives in `src/data/db.ts`; the versioned backup schema lives in `src/data/backup.ts`. A future sync provider can implement the same repository operations without changing page components. Routes are loaded on demand to keep the initial download smaller.

There is no account, analytics, tracking script, external telemetry, server database, paid API, or AI API. Opening an external quick link is an explicit user action. The Content Security Policy in `public/_headers` allows application assets from this origin only.

### Important storage behavior

IndexedDB is **per browser and per origin**. Your iPhone, MacBook, and Windows browser can all open the same deployed URL, but their records will be separate until optional sync is implemented. Use Settings → Export all data and Settings → Import data to move records between devices. Regular backups also protect you if a browser profile or site storage is cleared. Private browsing is not suitable for durable storage.

The finance module stores only manual values. Changing the display currency changes the symbol/format; it does not convert balances. Cost calculator prices are editable examples, not live provider quotes.

## Local development

Use Node.js 22.16 or newer. A `.node-version` file pins 22.16.0 for Cloudflare Pages builds.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

Run checks and preview the production output:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run preview
```

`dist/` is the complete static site. Meridian PNG icons are committed in `public/`; `scripts/generate-icons.swift` is the source for regenerating them on macOS. The PWA manifest and service worker are generated during the build.

## Backups

**Export all data** downloads `victor-os-backup-YYYY-MM-DD.json`. It contains every table: projects, tasks, accounts, debts, investments, transactions, budgets, goals, prompts (including versions), cost models, notes, links, and settings.

**Import data** checks JSON syntax, the `victor-os` format marker, schema version, all record structures, duplicate IDs, and saved link URLs. It then shows record counts and asks for the typed confirmation `RESTORE`. Import replaces the current database in one IndexedDB transaction. Export your current records first if you need them.

**Reset database** asks for `RESET VICTOR OS`, deletes all records, and restores default preferences. Demo data does not reappear after clearing or resetting; it is seeded only in a new browser database.

Backup schema version is currently `1`. A later app version should add an explicit migration before accepting another version.

## Deploy free on Cloudflare Pages

This is a static Pages project with no Functions, D1, Workers, or paid services. Cloudflare says static asset requests are [free and unlimited](https://developers.cloudflare.com/pages/functions/pricing/) on free and paid plans; the current Free plan includes [500 builds per month](https://developers.cloudflare.com/pages/platform/limits/), well above ordinary personal development usage. Check Cloudflare’s current terms and limits if that changes.

1. Create a GitHub repository for this project and push the `main` branch. The repository may be private.
2. In Cloudflare, open **Workers & Pages → Create application → Pages → Import an existing Git repository** and authorize/select the repository.
3. Set **Production branch:** `main`; **Build command:** `npm run build`; **Build output directory:** `dist`; **Root directory:** `/` (repository root). No environment variables or paid plan are needed. `.node-version` selects Node 22.16.0.
4. Choose **Save and Deploy**. Open the assigned `*.pages.dev` HTTPS URL. Every later push to `main` triggers a new deployment.

These values follow Cloudflare’s [React Pages guide](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/) and [Git integration guide](https://developers.cloudflare.com/pages/get-started/git-integration/). Cloudflare Pages automatically serves the root app for client-side routes when no top-level `404.html` exists, as documented under [SPA rendering](https://developers.cloudflare.com/pages/configuration/serving-pages/). The `public/_headers` file is copied into `dist/` and applied by Pages.

For a first push from this existing local Git repository, after creating the empty GitHub repository:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Replace the example GitHub URL with your repository. Do not commit personal backup files; they contain your local data.

## Install as an app

- **iPhone:** Open the deployed HTTPS URL in Safari → Share → **Add to Home Screen**. Launch Victor OS from the new icon for standalone display.
- **Mac/Windows:** Open the deployed HTTPS URL in a browser that supports PWA installation and choose its **Install app** option.

The service worker precaches the built application shell for repeat visits and offline use after the first successful load. Local records remain in IndexedDB. PWA installation and storage belong to the specific browser/origin, so keep the deployment URL stable.

## Optional future cloud sync

Sync is intentionally absent. A future Supabase Free Tier or Cloudflare D1 adapter could implement the repository operations, add identity and per-record conflict handling, and migrate local records after explicit user opt-in. This would change the privacy model, so keep local storage and backups available even if sync is added.

## Project layout

```text
src/
  components/     shell, command palette, UI primitives
  data/           Dexie database, repository, demo seed, backup schema
  lib/            finance calculations and browser utilities
  pages/          dashboard and each module
  types.ts        shared domain types
public/           icons and Cloudflare Pages headers
tests/            IndexedDB backup/restore safety test
```
