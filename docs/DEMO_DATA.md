# eBay-inspired demo catalogue

Six fictional furniture listings draw on the references in [`scripts/fixtures/ebay-research.json`](../scripts/fixtures/ebay-research.json). Stored titles and tags identify the seed records. The app displays clean product titles and one short sample-data note in the description. CHF prices, local locations and item details are invented; source availability is not implied. Seller identities are fictional.

## Preview

```sh
node scripts/seed-demo.mjs
```

No credentials, network calls or writes are needed. This validates and prints the six examples.

## Development-project SQL seed

Apply all migrations first, then review and run [`supabase/seed-demo.sql`](../supabase/seed-demo.sql) in the intended development project's SQL Editor. This optional file is separate from automatic migrations.

The transaction adds three public personas—Demo Seller Léa, Noé and Mila—and two listings per persona. Their Auth owner placeholders have `example.invalid` emails, no password or confirmed email, no Auth identity, and an infinite login ban. They cannot log in or reply to messages. Existing real accounts stay separate. No service-role API key is required.

Reserved IDs are checked for collisions before insertion. Reruns insert only missing records; edited prices and withdrawn/sold status remain unchanged. Readback shows the three blocked owners and six listings. The seed has no delete/reset operation.

Regenerate the SQL from the fixture after deliberate changes:

```sh
node scripts/seed-demo.mjs --sql > supabase/seed-demo.sql
```

This generates a local file without executing it. Keep owner IDs and fixture slugs stable.

## Optional interactive demo accounts

For two-way messaging, use dedicated accounts registered through the app with controlled email inboxes. Complete email confirmation and choose a public name starting with `Demo`. The Node path uses ordinary public-client permissions and does not create or confirm accounts.

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DEMO_SEED_EMAIL`, `DEMO_SEED_PASSWORD` and `DEMO_SEED_DISPLAY_NAME` in your ignored `.env` or secret-manager environment, then run:

```sh
node --env-file=.env scripts/seed-demo.mjs --apply
```

An explicitly supplied `DEMO_SEED_ACCESS_TOKEN` can replace both email/password variables. Credentials are not printed or persisted by the client. The script refuses non-demo profiles/listings and rejects secret/service-role keys. Without credentials, use the offline preview or reviewed SQL seed.

For a second confirmed demo buyer, switch credentials and use `--apply --profile-only` to create its public profile without another catalogue. Test messages manually through the app. Reruns preserve existing listing content and status.

## Images and verification

The six known seed IDs display externally hosted product photos through `shared/sampleListingPresentation.ts`. Photo URLs and source pages are recorded in the research fixture. The bookshelf uses a same-model illustration because the original page is unavailable. Uploaded photos take precedence; ordinary listings are unaffected. Storage paths remain empty for these seed records, and storage ownership checks are unchanged.

Local validation covers fixture fields, deterministic IDs, public-client guards, SQL insertion, reruns, preserved edits and collision rollback. Hosted verification is separate: check the six public Demo listings and their seller names after applying the SQL. The inert SQL personas do not support two-way messaging; use confirmed test accounts for that check.

Development project checked: three inert demo sellers and six listings are present, anonymous reads succeed, and the signed-in agent finds the shared demo desk.
