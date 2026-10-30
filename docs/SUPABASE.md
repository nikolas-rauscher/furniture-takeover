# Supabase implementation plan

## Scope and architecture

The Supabase integration connects accounts to the existing MVP interface. Search, seller chat, navigation and listing pages retain the original design. Account settings have a dedicated page accessible through the profile icon. Without Supabase configuration the existing local demo continues to work. With configuration, the application uses Auth, PostgreSQL and Storage; local demo records are never uploaded automatically. Public browsing is anonymous. Publishing, editing, messaging and AI requests require a verified session.

The browser uses only the publishable key and the user's access token. PostgreSQL row-level security (RLS) enforces ownership and conversation membership independently of UI controls. No service-role key is needed. Node validates bearer tokens with Supabase Auth before paid AI calls. The cloud catalog supplies the agent's inventory. Old SQLite mutation endpoints are disabled in cloud mode.

## Delivery sequence

1. Database: listings, conversations, messages, per-user archived threads; constraints, indexes and RLS. Conversation participants are derived from the listing through an RPC, not accepted from the client.
2. Auth: email/password registration, confirmation, login/logout, password reset and session recovery. Private screens remount on account changes.
3. Listings: public browsing/search, owner dashboard, explicit publication, editing, status changes and withdrawal; maximum six JPEG/PNG/WebP photos stored under the owner's UUID. No invented distance or exact private address.
4. Inbox: one conversation per listing/buyer, participant-only reads, immutable sender identity, idempotent message UUID, incremental refresh and realtime subscription, personal archive rather than deleting another user's messages.
5. AI: authenticated seller draft assistance; retain editable fields and explicit publication. Protect existing AI endpoints and enforce a per-user request budget.
6. Verification: existing regression suite/build, real PostgreSQL policy tests using PGlite, browser desktop/mobile smoke; then hosted two-account Auth/Storage/Realtime verification when project access exists.

## Data and permissions

- `listings`: owner UUID references Auth; active/reserved rows public; sold/withdrawn only visible to owner and existing chat participants. Only owner can insert/update. Ownership cannot be transferred.
- `conversations`: UUID, listing UUID, buyer UUID, seller UUID; only participants can read. Only `start_conversation` can create it, with current listing owner and authenticated buyer.
- `messages`: immutable UUID, conversation UUID, sender UUID, trimmed 1–4000 character body and server timestamp. Only members can read/insert, and sender must equal `auth.uid()`.
- `conversation_archives`: each user controls only their archive records. Sending a message reopens their thread.
- `listing-photos`: public product photos; authenticated users upload/remove only within their own UUID directory. Maximum 5 MB each, supported MIME types enforced by bucket settings. Photos are public; UI explains this before publication.

## Configuration and deployment

Create a Supabase project and apply all SQL files in `supabase/migrations/` in filename order in its SQL editor (or through Supabase CLI migrations). Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the Node environment. The browser obtains these public values from `/api/config`; never expose DeepSeek, Brave or a service-role key. Enable email confirmation and configure Auth Site URL / redirect allowlist for the actual app origin. Configure SMTP before inviting real users. Start with `npm run dev`; production needs an HTTPS host serving the Vite build and forwarding `/api` to Node.

The public image bucket deliberately makes listing photos readable by URL. Withdrawing a listing removes it from discovery, not all cached photo copies. Private messages are not sent to the AI automatically. Clicking **Suggest replies** sends the listing and up to 12 recent messages to DeepSeek to generate editable suggestions; it never sends a message to the other participant. The Node rate limit is per process; multi-instance public hosting needs a shared limiter at the gateway. Do not claim a production launch until hosted two-account tests, email delivery, monitoring/backups and abuse handling have been verified.

## Accounts and moderation

`profiles` stores a public display name and optional bio. `account_preferences` (town, postal code, country and handover preference), `saved_listings`, `blocked_users` and `reports` are private to their owner. A database trigger rejects new messages and conversations when either participant blocks the other. Reports are available to the team in the Supabase table editor; no notification or automatic moderation is implemented. Assign a team member to review them before a public launch.

`account_api_keys` stores provider keys encrypted with AES-256-GCM, a random nonce and an owner/provider binding. RLS permits only the owner to access even the ciphertext. The 32-byte `ACCOUNT_KEYS_ENCRYPTION_KEY` stays in the Node environment, separate from Supabase and the browser; do not regenerate it on restart or redeployment. No service-role key is needed. The app API returns saved status and the last four characters only. Keys are excluded from exports and cascade-delete with the account. Each authenticated AI request resolves that user's keys, falling back to server defaults when none are saved. Deleting a key restores that default. Saving does not prove the provider accepts a key or that it has credit. Use HTTPS when deploying.

Users can change their email (confirmation required), update passwords, invalidate other refresh sessions, export account data and permanently delete their account. Access tokens on other devices remain valid until expiry. Deletion removes uploaded photos first, then the account, listings and all conversations involving that account, including the other participant's copies; the UI explicitly explains this and requires typing DELETE. A failed cleanup leaves the account available for retry. Storage paths may still be present in caches after removal.

Uploaded photos removed from a draft can remain in the user's storage folder until account deletion. No automatic retention cleanup is implemented. Published descriptions and display names are public; email addresses are not in public tables.

## Verified on the development project

All four migrations, including pickup dates, profile details and encrypted API keys, were applied through the SQL Editor. SQL Editor execution does not populate the Supabase CLI migration history; record/repair migration history before using CLI db push against this existing project. The project uses the Free plan in West EU (Ireland). Email confirmation is enabled. Local redirects allow http://127.0.0.1:5173 and http://localhost:5173; add your deployed HTTPS URL or phone origin explicitly when needed.

PostgreSQL tests exercise three identities, ownership, anonymous reads, conversation privacy, sender spoofing, duplicate IDs, photo paths, private settings/saved items, blocking, reporting and deletion. Hosted transaction tests confirmed participant isolation and blocking; all test data was rolled back. These do not test email delivery or real user sessions. Complete registration/email confirmation, two-account Storage/Realtime/browser checks before inviting users.

## Acceptance checks

Anonymous: browse public listings, cannot mutate records or read inboxes. Alice: publishes with photos, edits and withdraws own listing. Bob: starts conversation, sends message; Alice receives and replies. Eve: cannot read either conversation, forge sender, alter owner or upload into Alice's folder. Retries do not duplicate a message. Reload/sign-out/account switch do not leak cached inbox state. Failed requests preserve form text and display errors. Realtime reconnect has polling recovery.

References: https://supabase.com/docs/guides/database/postgres/row-level-security ; https://supabase.com/docs/guides/storage/security/access-control ; https://supabase.com/docs/guides/auth

The original interface has been restored and checked on desktop and mobile. The hosted signed-in agent successfully searched another seller's seeded listing. Messaging, archive and owner-status flows were checked with disposable local fixtures; this does not replace the remaining hosted two-account messaging test. `npm run check` passes 298 tests and the production build succeeds.
