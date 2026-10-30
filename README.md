# Takeover

A local marketplace MVP for finding and selling second-hand items around Lausanne. Buyers describe what they need in chat and compare listings. Sellers upload photos, add details and review an editable listing draft. The assistant can research comparable offers and prepare a message, while the user chooses what to save or send.

Built with React, TypeScript and Vite, a Node.js API, SQLite, DeepSeek and Brave Search.

## Quick start

Use **Node.js 22.18 or newer** and npm. The tested Node 22 version is pinned in `.nvmrc`. If you use nvm, run `nvm install` and `nvm use` in this folder.

```sh
npm ci
npm run setup
npm run dev
```

Open **http://localhost:5173**. Run every command from the folder containing this `package.json`. The launcher starts the frontend on port 5173 and the API on port 8787. Stop both with Ctrl+C.

`npm run setup` creates `.env` only if it does not exist. It never overwrites your keys. In demo mode, SQLite creates and seeds `data/marketplace.sqlite` on first startup. No separate database installation or database download is needed.

### API keys

Create keys at [DeepSeek](https://platform.deepseek.com/api_keys) and [Brave](https://api-dashboard.search.brave.com/app/keys), then add them to `.env`:

```dotenv
DEEPSEEK_API_KEY=your-own-key
BRAVE_SEARCH_API_KEY=your-own-key
```

Restart `npm run dev`. Keep `.env` local. Tests run without API keys.

## Real user accounts (Supabase)

Create a project at [Supabase](https://supabase.com/dashboard), run all SQL migrations from `supabase/migrations/` in order, then set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env` and restart. Use the public publishable/anon key, never a service-role key.

This enables email-confirmed accounts, shared listings and photo uploads, private conversations, saved listings, profile settings, blocking/reporting, data export and account deletion. The assistant requires sign-in. Without these two settings the original local demo runs as before. Demo data is not copied into Supabase automatically.

Users can save personal DeepSeek and Brave keys under **Account settings → API keys**. Apply migration `202610300004_profile_and_api_keys.sql` and configure `ACCOUNT_KEYS_ENCRYPTION_KEY` using `.env.example`. Keep that server encryption key backed up and unchanged across redeployments. Personal keys override the server defaults for that user; providers bill their usage. Payments are marked **Coming soon** and collect no payment data.

## Commands

| Command                 | Purpose                                                     |
| ----------------------- | ----------------------------------------------------------- |
| `npm run setup`         | Create a local `.env`, preserving any existing file         |
| `npm run dev`           | Start frontend and API together                             |
| `npm run dev:frontend`  | Start only Vite                                             |
| `npm run dev:backend`   | Start only the API with automatic reload                    |
| `npm run check`         | Check TypeScript and run all tests                          |
| `npm test`              | Discover and run tests, including tests in new subfolders   |
| `npm run build`         | Check types and build the frontend into `dist/`             |
| `npm run start:backend` | Run the API without a file watcher                          |
| `npm run preview`       | Preview the built frontend, with an API proxy, on port 4173 |
| `npm run format`        | Format application source with Prettier                     |

For a local build preview, run `npm run build`, then keep `npm run start:backend` in one terminal and `npm run preview` in another. This is a local verification workflow, not a production deployment.

## Where to make changes

```text
src/components/    Screens, chat controls, listing forms and galleries
src/hooks/         Agent state, cancellation, local storage and listing sync
src/api/           Browser clients and streamed-event validation
src/App.tsx        Shared app navigation and workflow coordination
src/cloud/         Supabase data adapters and account controls
supabase/migrations/ Database schema, ownership rules and account functions
shared/            Domain types, validated action/event contracts and demo catalog
server/config.ts   Ports, credentials, database path and allowed origins
server/http.ts     HTTP routing, request limits and stream delivery
server/runtime.ts  Agent loop and streaming
server/agent-tools.ts Tool registration and execution
server/service.ts  Structured assistance and seller-fact grounding
server/deepseek.ts DeepSeek transport for suggestions and photo drafts
server/web-search.ts Brave adapter and result validation
server/database.ts SQLite demo catalog
server/messages.ts SQLite local conversation demo
scripts/           Development, setup and test discovery
```

The repository-level `.github/workflows/ci.yml` checks the app on Node 22 and 24.

## Configuration and phone access

Optional settings are documented in [`.env.example`](.env.example). `APP_PORT`, `API_PORT` and `PREVIEW_PORT` let you avoid port conflicts. Relative `DATABASE_PATH` values resolve from the project folder.

The API validates exact origins, so a working homepage alone does not prove that agent requests from a phone work.

## Local demo boundaries

- Demo listings and local message threads live in SQLite. Personal listings, saved searches, favourites and offer drafts use browser storage. Browser data does not automatically move between computers or browsers.
- Sending a message writes to the local demo inbox. Seller preview mode is not a real seller account. No external seller receives a message.
- Demo mode has no authentication. Supabase mode adds real accounts and shared data; neither mode includes payments or background alerts.
- Web results are search snippets. Prices, availability and pickup distances may be unverified. Demo catalog prices and details are fictional.
