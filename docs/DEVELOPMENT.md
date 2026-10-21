# Development guide

## Request paths

The browser calls relative `/api/...` URLs. Vite forwards them to the loopback API in both development and preview mode. Credentials remain in Node.

- `GET /api/health`: reports whether provider credentials are configured. It does not make a paid call or verify that a key is valid.
- `POST /api/agent/assist`: validated structured typing suggestions and photo-to-listing drafts.
- `POST /api/agent/run`: bounded agent execution, returning NDJSON tool events, questions, patches, answer text and sources.
- `/api/listings`: seeded demo catalog and validated updates.
- `/api/messages`: local conversation preview, isolated by browser workspace identifier.

`server/service.ts` validates supplied seller facts before accepting a structured draft. `server/runtime.ts` coordinates the agent loop and streaming; `server/agent-tools.ts` registers tools with their descriptions, schemas and execution functions. `shared/actions.ts`, `shared/runs.ts` and `shared/negotiation.ts` describe the data crossing those boundaries. `src/api/runs.ts` validates the streamed events again before the UI applies them.

## Adding a feature

| Change                               | Start here                                                                                                      | Also check                                                              |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A listing field or search constraint | `shared/marketplace.ts`, `shared/actions.ts`                                                                    | Server validation, browser form, persistence and migrations             |
| An agent tool                        | `server/agent-tools.ts` for registration, `server/actions.ts` or `server/negotiation-tools.ts` for domain logic | Registration in `agent-tools.ts`, typed stream event, frontend handling |
| A question or chat control           | `AgentActionControls.tsx`, `AgentComposer.tsx`, `useAgentRun.ts`                                                | Free-text answers, Stop, stale responses and manual edit preservation   |
| A provider or external source        | `deepseek.ts`, `web-search.ts`, `marketplace-policy.ts`                                                         | Cancellation, response bounds, URL validation and honest error states   |
| An inbox feature                     | `shared/messages.ts`, `server/messages.ts`, `src/api/messages.ts`, `MessagesPage.tsx`                           | Workspace isolation and idempotent sends; this is still a local demo    |
| Persistence changes                  | `server/database.ts`, browser storage hooks/repositories                                                        | Existing records, defaults and non-destructive migration tests          |

Do not put provider credentials or server imports in `src/`. Do not let an agent tool bypass user confirmation for saving or sending. Price research should remain a proposal the user can accept or change.

## UI conventions

Page components in `src/components/` own their markup; `App.tsx` connects navigation, storage and workflows. `AgentRunPanel.tsx` handles run status, `AgentActionControls.tsx` handles questions and changes, and `AgentAnswerContent.tsx` renders text and citations.

Use the existing CSS tokens and DM Sans typography: paper backgrounds, dark text and cobalt-blue actions. Keep chat scrolling contained, account for fixed mobile navigation and respect reduced-motion preferences. Dialogs must trap focus, support Escape and restore focus when closed.

Keep generated drafts editable and preserve manual corrections. Missing provider configuration and failed requests must stay visible. The current buyer proposal tools prepare terms and messages; sending remains an explicit action in the local demo inbox.

## Tests

`npm test` discovers `*.test.ts` and `*.test.mjs` below `src`, `shared`, `server` and `scripts`. The script passes explicit filenames to Node, so it does not depend on Unix shell globs.

Tests inject provider responses and use temporary databases. No real keys are required. Use a fixed reference date for calendar assertions. `parseSearch(text, criteria, today)` and `parsePickupDate(text, today)` accept an explicit date, so tests should not depend on the day CI runs.

### Where a test belongs

| Behavior                                                             | Test location                                                                                 |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Search parsing, filtering, saved criteria and listing titles         | `shared/marketplace.test.ts`                                                                  |
| Structured provider output, seller facts, photos and bounded retries | `server/service.test.ts`                                                                      |
| HTTP origins, request limits, streaming and disconnects              | `server/http.test.ts`                                                                         |
| Agent orchestration                                                  | `server/runtime-tests/`: inventory, web search, listing, questions, negotiation and lifecycle |
| Individual tools and persistence                                     | Beside their modules, e.g. `server/actions.test.ts` and `server/database.test.ts`             |
| Browser event validation, edits and saved state                      | Beside the relevant module in `src/api/`, `src/hooks/` or `src/`                              |

`server/testing/runtime.ts` builds deterministic SDK streams: `toolCall(name, input, id)` is one tool step, `toolStep(call(...), call(...))` emits parallel calls, and `answer(...chunks)` streams an answer. `eventsFor` collects the actual runtime events. Keep the scenario inputs and assertions in the test itself. Tests that need real translation wiring import the runtime directly instead of the helper's identity translator.

`server/testing/provider.ts` contains the fake provider configuration and JSON response envelope shared by service and HTTP tests. Each test creates its own service/model; helpers do not keep mutable state across tests.

### Keeping tests maintainable

- Put input variations with the same expected behavior in a table. Give each case a descriptive name so a failure identifies its input.
- Add a regression at the boundary that owns the behavior. Add a second layer only when it catches a distinct failure, such as a correct tool patch being dropped during streaming.
- Keep assertions about observable results: emitted patches, preserved edits, stored records, cancellation and errors. Avoid asserting incidental wording or private implementation details.
- Prompt assertions are reserved for grounding and language rules that must reach the provider. They verify instruction delivery, not the quality of a live model's answer.
- Use cleanup hooks for temporary servers and wait for actual events instead of sleeping for a guessed duration.
- Reuse a small helper for repeated setup; keep unusual failure and retry scenarios explicit. Do not build a second test framework around Node's runner.

Run one module directly when iterating:

```sh
node --experimental-strip-types --test server/config.test.ts
node --experimental-strip-types --test server/runtime-tests/listing.test.ts
```

Before a pull request, run `npm run check` and `npm run build`.

## Data

The API seeds `data/marketplace.sqlite` when it does not exist. Catalog edits and inbox previews survive API restarts. Personal listings and saved browser state use the browser's local storage. Neither store is a production multi-user database.

Set `DATABASE_PATH` to a separate file for experiments. Stop all processes using a SQLite database before moving or resetting it. Keep the current database and uploaded photos out of Git.

Archived presentation material outside the app is not required for development and is excluded from Git.

## Phone testing

For a trusted LAN demo, set the following in `.env`, using your computer's real LAN IP:

```dotenv
APP_HOST=0.0.0.0
API_ALLOWED_ORIGINS=http://192.168.1.10:5173
```

Restart `npm run dev`, connect the phone to the same network and open that exact URL. The OS firewall must permit the connection. Some browser features such as camera/geolocation need HTTPS on a phone.

For Tailscale Serve, keep `APP_HOST=127.0.0.1`, proxy port 5173 with Tailscale, and set the exact hostname and origin:

```dotenv
APP_ALLOWED_HOSTS=laptop.example-tailnet.ts.net
API_ALLOWED_ORIGINS=http://laptop.example-tailnet.ts.net:5173
```

These are placeholders, not working addresses. Use your own device hostname. If Serve uses HTTPS, put that HTTPS origin in `API_ALLOWED_ORIGINS`. Both devices must be connected to the intended tailnet. Do not use wildcard origins to work around a configuration error.

## Manual smoke check

1. Start from a fresh install and open the app. The demo catalog should load without keys.
2. Confirm `/api/health` returns JSON. With no key, an AI request should show a setup error.
3. With your own keys, run a buyer search, answer a follow-up and cancel/retry a run. Preserve typed edits.
4. Upload a test photo, add seller details and review the draft. Save a test listing, reload and verify it persists.
5. Prepare a seller message and send it only to the local demo inbox. Verify its thread appears and can be deleted.
6. Build and preview the frontend. Check an API request from port 4173, not only the page load.

Live-provider checks may incur costs. Automated test success does not establish that every generated claim or external listing is correct.

## team

Create a focused feature/fix branch. Update shared contracts before their server producers and browser consumers. Prefer focused modules over adding unrelated behavior to `App.tsx` or `runtime.ts`. For another input variant, extend an existing test table; add a regression at the boundary that owns the behavior. Run `npm run check` and `npm run build` before a pull request, and check desktop/mobile flows for UI changes.

Commit `package-lock.json` with dependency changes. Keep credentials, databases, local uploads, provider responses and recordings out of Git. Retain image-source attribution and keep demo records explicitly fictional. Mention storage migrations or configuration changes in the pull request. CI at the repository root checks Node 22 and 24.
