# Takeover

A second-hand marketplace MVP for Lausanne. Buyers describe what they need and compare listings. Sellers turn photos and details into an editable listing draft. The assistant researches items and prepares messages; users decide what to publish or send.

React · TypeScript · Vite · Node.js · Supabase · DeepSeek · Brave Search

## Run locally

Use **Node.js 22.18+** and npm. With nvm, run `nvm install && nvm use` to use the version in `.nvmrc`. Run all commands from this repository's root.

```sh
npm ci
npm run setup
```

Add your [DeepSeek API key](https://platform.deepseek.com/api_keys) and [Brave Search API key](https://api-dashboard.search.brave.com/app/keys) to `.env`, then start the app:

```sh
npm run dev
```

Open **http://localhost:5173**. The API runs on port **8787**. Ctrl+C stops both servers. `setup` preserves an existing `.env`; restart the server after changing it. Keep credentials local and server-side. Available settings are in [`.env.example`](.env.example).

Without Supabase configuration, the app uses local demo mode. SQLite creates `data/marketplace.sqlite` automatically; no database installation is needed. Demo listings and messages stay local, and browser storage is specific to each browser. Demo sellers cannot receive external messages.

## Supabase accounts

1. Create a [Supabase project](https://supabase.com/dashboard) and apply the files in [`supabase/migrations/`](supabase/migrations/) in filename order.
2. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env`. Use the public publishable/anon key, never a service-role key.
3. In Supabase Auth, disable public signups, configure the app's URL and allowed redirect URLs, and invite testers through **Users → Add user → Send invitation**. Configure [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp) for invitations and password resets outside your Supabase team.

Restart the app. Supabase mode enables accounts, shared listings, photo uploads, private messages, favourites and profile settings. AI access requires sign-in. Local demo data is not imported automatically.

Users can store personal provider keys under **Account settings → API keys**. Set `ACCOUNT_KEYS_ENCRYPTION_KEY` as described in `.env.example`; back it up and keep it unchanged across deployments. Personal keys override server defaults for that user.

AI usage is limited to **50 requests per user and 500 across the app per UTC day**, including typing suggestions. One request can make several model/tool calls, so this is a request limit rather than a spending cap. Minute, concurrency and timeout limits also apply.

## Development

| Command          | Purpose                                      |
| ---------------- | -------------------------------------------- |
| `npm run dev`    | Start frontend and API                       |
| `npm run check`  | TypeScript and all tests; no API keys needed |
| `npm run build`  | Type-check and build into `dist/`            |
| `npm start`      | Serve the built app and API on port 8787     |
| `npm run format` | Format application source                    |

Additional scripts are in [`package.json`](package.json). GitHub Actions runs checks and builds on Node 22 and 24.

### Code layout

| Location                 | Responsibility                                                |
| ------------------------ | ------------------------------------------------------------- |
| `src/components/`        | Screens and shared UI controls                                |
| `src/components/ui/`     | Reusable shadcn/Base UI components                            |
| `src/cloud/`             | Supabase accounts and data access                             |
| `src/hooks/`, `src/api/` | Client state, API calls and streaming                         |
| `src/App.tsx`            | Navigation and workflow coordination                          |
| `server/`                | API, agent runtime, tools, providers and local SQLite storage |
| `shared/`                | Domain types, validation and shared contracts                 |
| `supabase/migrations/`   | Database schema and access rules                              |

### UI components

AI interfaces follow [shadcn AI Elements](https://ui.shadcn.com/docs/ai-elements): Message Scroller and Bubble for chat, Input Group for prompts, Trace for activity, sources and the listing checklist, Hover Card for citations, Item for confirmations, and Attachment for photos. Compositions live in `src/components/`; shared primitives live in `src/components/ui/`. Activity steps and expandable provider reasoning are shown separately from the answer.

Use the shared **shadcn/ui components with Base UI**, styled for Takeover. Tailwind Preflight is omitted to preserve existing page styles. Design values live in `src/styles.css`, Tailwind mappings in `src/tailwind.css`, and shared control styles in `src/components/ui/ui.css`.

```sh
npm run ui:add -- tooltip
npm run ui:animate -- tabs
npm run ui:check
```

Add `--dry-run` to `ui:add` or `ui:animate` to preview changes before replacing customized components. `ui:check` inventories animations; validate changes with `npm run check`, `npm run build`, and desktop/mobile interaction checks.

Import icons through `src/components/icons.ts`. Add individual animated Lucide icons with `npm run ui:add -- @animate-ui/icons-lucide-bell`, then export them from that file. The existing Lucide symbols remain as fallbacks where Animate UI has no equivalent. Set `animateIcon` on a shared `Button` to animate its icons on hover and tap; keep passive icons still. Animate UI respects reduced-motion preferences.

[`components.json`](components.json) configures shadcn and the Animate UI registry. Both are available through the shadcn MCP server. In VS Code, start it from [`.vscode/mcp.json`](.vscode/mcp.json). For Codex, run once from the repository root, then restart Codex:

```sh
codex mcp add takeover-ui -- npx --yes shadcn@4.23.0 mcp --cwd "$PWD"
```

## Hosting

```sh
npm run build
npm start
```

Forward your HTTPS tunnel to `http://127.0.0.1:8787`. To host on a private network behind your own nginx with a self-hosted Supabase, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md): `SUPABASE_URL` is the address browsers use, `SUPABASE_INTERNAL_URL` is the LAN address the server uses, and `API_HOST` lets a proxy on another machine reach the API. Set its exact public origin in `API_ALLOWED_ORIGINS` and configure the same URL in Supabase Auth. Keep `.env` and `ACCOUNT_KEYS_ENCRYPTION_KEY` on the server. For LAN development, see `APP_HOST`, `APP_ALLOWED_HOSTS` and port settings in `.env.example`.

Payments and background alerts are not implemented. Web results are search snippets; prices, availability and pickup distances may be unverified. Demo catalogue details are fictional.
