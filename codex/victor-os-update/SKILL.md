---
name: victor-os-update
description: Save or change tasks, payments, projects, notes, and prompts in Victor OS live when the user asks Codex to remember, add, or update them there.
---

# Update Victor OS from a conversation

Victor OS is the user's private, cloud-backed workspace at https://your-worker.example/. Use this skill when the user asks to put information in Victor OS, including a conversational request such as “ține minte în Victor OS că...” or “adaugă plata asta.” A mention of a payment or task while seeking advice is not by itself an instruction to save it.

## Choose the record

- An action, deadline, reminder, or future payment belongs in **Tasks** (`/tasks`). Link an existing project when relevant.
- A completed payment or received income belongs in **Money → Transactions** (`/money`). Recording a transaction does not change an account balance. Change balances or debts only when the user asks for that separately.
- A sustained outcome with status, progress, and next action belongs in **Projects** (`/projects`).
- Reference information or continuing personal context belongs in **Notes** (`/notes`).
- Reusable AI instructions belong in **AI Lab** (`/ai-lab`).
- When one request contains several distinct facts, create the smallest set of records that preserves them without duplicating the same action.

## Save reliably

1. Read the user's wording carefully. Determine whether to create, update, complete, or delete. Inspect the corresponding live page for an existing record before writing; update it when the request refers to that record.
2. Preserve supplied names, dates, amounts, and meaning. For transactions, require a known amount and date, and check the workspace display currency: Victor OS stores a number without currency conversion. Do not guess an amount, silently convert currencies, or treat a planned payment as a completed expense. Ask only for a missing fact needed to make the intended record accurate.
3. Use an authenticated Victor OS browser session or an available, authorized connector to make the live change. If sign-in is needed, have the user enter the key in the app. Never ask for the key in chat, read it from a password field, or place it in files, commands, or logs. Do not edit repository files as a substitute for updating live records.
4. After saving, refresh or revisit the destination and verify the record and its important fields. Then tell the user what changed and link to the relevant live page. If verification fails, report the uncertainty. Data changes in Victor OS are live immediately and do not require a Git commit or code deployment.

Handle explicit user-requested changes without an extra approval step. Use a confirmation only when the request itself is ambiguous in a way that could change financial meaning or affect the wrong existing record.
