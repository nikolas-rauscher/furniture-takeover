# takeover

takeover is a second-hand marketplace web app made by students for students. It serves the EPFL and UNIL campuses and the FMEL residences around Lausanne. Students buy and sell furniture, books, bikes and other things they no longer need, and hand them over in person at a campus meeting point. A small assistant called Pako, a moving box, does the tedious parts: searching, writing listings, researching prices and reading replies. The student always decides what to publish, send or agree to.

## What it does

- **Search with Pako.** A student describes what they need. Pako shows matching listings from other students first, then results from the web. Web results are search snippets, so their prices and availability may be wrong.
- **Sell from a photo.** The student adds photos. Pako drafts the listing, asks short questions one at a time, and researches a price. The student edits the draft and the suggested price before saving.
- **Messages.** Pako reads the other student's replies and suggests answers. The student taps one into the composer and sends it. Pako can also prepare an offer from a listing page.
- **Deal card.** A tap-based offer card holds the price, the pickup time and the meeting point. Both students confirm. After both confirm, the listing is reserved for the buyer.
- **Pickup day.** Once a pickup is booked, the card guides both students: a reminder two hours before, "on my way", "running late" (10, 20 or 30 minutes), change the time, report a no-show, and "picked up".
- **Admin area.** Admins see an overview, edit the demo listings and sellers, and moderate: hide listings, handle reports, block and unblock students. Moderation actions need a reason and are logged.
- **Demo listings.** The app ships with 40 illustrated listings from six fictional student sellers, so it is useful without any data. Names and details are fictional.

Also included: saved listings, saved searches, side-by-side comparison, selling several items from one photo set, and a short intro with Pako for first-time visitors.

## Two modes

| | Local demo | Account mode |
| --- | --- | --- |
| Sign-in | None | Supabase accounts, self sign-up with @epfl.ch or @unil.ch |
| Data | SQLite file `data/marketplace.sqlite`, browser storage | Supabase Postgres and Storage |
| Other students | Fictional demo sellers only | Real students, real messages |
| Admin area | Settings, then Developer mode | Accounts listed in `public.admins` |
| Turned on by | Leaving the Supabase variables empty | Setting `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` |

The local demo is for development and presentations. Do not expose it to a network: it has no sign-in. Account mode is the one to deploy.

## Quick start (local demo)

You need Node.js 22.18 or newer and npm. `.nvmrc` pins the version used in CI: run `nvm install && nvm use`.

```sh
npm ci
npm run setup
npm run dev
```

`npm run setup` copies `.env.example` to `.env` and never overwrites an existing `.env`. Open http://localhost:5173. The API runs on port 8787. Ctrl+C stops both.

Browsing the demo listings needs no keys. To let Pako search, draft and read replies, add a DeepSeek key to `.env`. To add web results, add a Brave Search key. Restart `npm run dev` after editing `.env`. Without a key, an AI request shows a setup error.

## Account mode

1. Create a Supabase project, hosted or self-hosted.
2. Apply every file in `supabase/migrations/` once, in filename order. The list is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
3. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and `ACCOUNT_KEYS_ENCRYPTION_KEY` in `.env`.
4. In Supabase Auth, keep signups on with email confirmation and configure SMTP. Students register in the app; the database accepts only `@epfl.ch` and `@unil.ch` addresses.
5. Optional: run `supabase/seed-demo.sql` for the 40 demo listings.
6. To make yourself an admin, add your user to `public.admins`. The SQL is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

AI use is limited per UTC day: 50 requests per student and 500 across the app. Reading replies has its own allowance of 150 per student and 1,500 across the app.

## Environment variables

Names and purpose only. Never commit values. The full list with comments is in [.env.example](.env.example).

| Variable | Purpose |
| --- | --- |
| `DEEPSEEK_API_KEY` | Key for Pako's language model |
| `DEEPSEEK_BASE_URL` | Address of the DeepSeek API |
| `DEEPSEEK_MODEL` | Model name Pako uses |
| `BRAVE_SEARCH_API_KEY` | Key for web search |
| `API_PORT` | Port of the API |
| `APP_PORT` | Port of the dev frontend |
| `PREVIEW_PORT` | Port of the preview of the built frontend |
| `DATABASE_PATH` | SQLite file of the local demo |
| `API_HOST` | Address the API listens on. Beyond this machine only with Supabase accounts |
| `APP_HOST` | Address the dev frontend listens on, for phone testing |
| `APP_ALLOWED_HOSTS` | Extra host names the dev frontend accepts |
| `API_ALLOWED_ORIGINS` | Exact browser origins the API accepts |
| `SUPABASE_URL` | Supabase address that browsers use |
| `SUPABASE_INTERNAL_URL` | Supabase address that only the server uses. Optional |
| `SUPABASE_PUBLISHABLE_KEY` | Public anon key. Never the service key |
| `SUPABASE_SECRET_KEY` | Server-only `sb_secret_` key, required in account mode. Never in the browser or a `VITE_` variable |
| `ACCOUNT_KEYS_ENCRYPTION_KEY` | Encrypts the personal API keys students save. Back it up and keep it unchanged |
| `STUDY_CONTACT`, `STUDY_DELETE_BY` | Contact address and deletion date (`YYYY-MM-DD`) shown in the study's consent text. Both together open the user study on `/tour?s=<channel>` (version 3, `docs/STUDY.md`) and `/tour?s=<channel>&v=1` (version 1, `docs/STUDY-v1.md`); without them it stays closed. From the deletion date on the study collects nothing; the app still starts |
| `LOCAL_AI_TEST_EMAIL`, `LOCAL_AI_TEST_UNTIL` | Optional temporary test allowance for one account, local development only |

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Frontend and API with reload |
| `npm run typecheck` | TypeScript check |
| `npm test` | All tests. No API keys needed |
| `npm run check` | Typecheck, lint, format check, import cycles, unused code and tests |
| `npm run build` | Typecheck and build into `dist/` |
| `npm start` | Serve the built app and the API on port 8787 |
| `npm run format` | Format the source |

CI runs `check` and `build` on Node 22 and 24.

## Architecture

- **Client** (`src/`). A React and Vite app. Screens are in `src/shell/`, their building blocks in `src/components/`, client state in `src/hooks/`, the data seam in `src/api/` (demo) and `src/cloud/` (account mode, Supabase).
- **Server** (`server/`). A Node.js API that checks every request. It runs Pako: the agent loop, its tools and prompts (`runtime.ts`, `agent-tools.ts`), the DeepSeek and Brave Search calls, and the local SQLite store. In account mode it also checks logins and daily AI limits through Supabase. It runs TypeScript directly, so Node 22.18 or newer is required.
- **Shared contracts** (`shared/`). Types and validation used by both sides: listings, deals, pickup rules, messages, admin actions and the demo catalog. The server and the client both validate against them.
- **Migrations** (`supabase/migrations/`). The database schema, row-level security and the deal, pickup and admin functions for account mode.

Keep provider keys on the server. The browser never receives them.

## Project structure

Tests sit next to the module they test (`name.test.ts`).

```text
src/
  main.tsx, bootstrap.tsx     entry: app-wide styles, then the demo or the account app
  App.tsx, screens.ts         the shell and its lazily loaded screens
  shell/                      one file per screen or app region (header, footer, sell, messages, settings)
  components/                 building blocks and their CSS; admin/ and onboarding/ have their own folders
  components/ui, animate-ui/  generated shadcn and Animate UI parts (not linted)
  hooks/                      client state, one hook per concern
  api/                        demo transport: local API calls and the demo providers
  cloud/                      account mode: Supabase session, providers and screens (loaded only there)
  alerts/, availability/      feature folders: logic, UI, CSS and tests together
  *.ts                        pure rules and wording (deals, listings, search, Pako)
  styles.css, experience.css, responsive.css   app-wide sheets, loaded once and last (globalStyles.ts)

server/
  index.ts, config.ts         composition root and environment
  http.ts, http-*.ts          server, headers, auth throttling, body reading, error responses
  routes/                     one handler per API area: agent, listings, messages, admin, account keys, location, quota
  runtime.ts, run-*.ts        search and sell agent loop: tool policy per step, stream events, result and errors
  agent-tools.ts              the agent's tools; agent-instructions.ts and agent-skills.ts are its prompts
  action-schemas.ts           what a proposed listing or search change may contain
  action-evidence.ts          whether a change quotes the student or a source
  listing-action.ts           checks a proposed listing change field by field
  preferences-action.ts       checks a proposed search filter change
  price-research.ts           asking prices from marketplace offers, and the median proposal
  thread-agent.ts             Pako reading a conversation (model call, repair step)
  thread-proposal.ts          what that reading may propose
  thread-grounding.ts         checks the reading's facts and agreement against the conversation
  thread-options.ts           checks each suggested reply; thread-draft-wording.ts its wording
  thread-conversation.ts      which amounts, times and places the conversation allows
  thread-safe-text.ts         no contact details, payment methods or stray placeholders
  service.ts, deepseek.ts     listing assist and photo grouping
  web-search.ts               Brave Search with a shared queue and offer filtering
  database.ts, messages.ts    local demo store: listings, conversations, deals (SQLite)
  demo-admin.ts               admin actions for the local demo
  cloud.ts, account-keys.ts   account mode: Supabase sessions, daily limits, personal API keys
  testing/, runtime-tests/    fake model provider and scripted agent runs

shared/                       zod contracts and rules, no Node or browser APIs
  deal*.ts, pickupTime.ts     deal and pickup state machine, its wording and errors
  dealScenarios.ts            scenario table run against TypeScript, SQLite and SQL
  runs.ts, threadTurn.ts      agent request, stream and reading contracts
  actions.ts, negotiation*.ts proposed changes and negotiation terms
  marketplace.ts              search parsing and listing types
  admin.ts                    admin action contract
  demoListings.ts, demoSellers.ts   the demo catalogue

scripts/                      dev, setup and test runners, demo seed rendering
supabase/                     migrations and the rendered demo seed
```

Each component imports its own sheet, and those sheets load in whatever order screens open. Component sheets must not override each other on equal specificity; only the app-wide sheets, loaded last, may override a component sheet.

## Documentation

- [docs/FEATURES.md](docs/FEATURES.md): what each feature does, with screenshots.
- [docs/WORKFLOWS.md](docs/WORKFLOWS.md): the main paths through the app as step sequences, and the deal states.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): run account mode on your own server with Supabase and nginx, including the migration list.
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md): request paths, adding features, tests, phone testing and UI components.

## Limits

Payments are not implemented. Pako reads replies and prepares messages, but he does not send anything himself.
