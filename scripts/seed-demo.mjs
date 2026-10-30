import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

const fixtureUrl = new URL("./fixtures/ebay-research.json", import.meta.url);
const namespace = "a242d50ba8735a99a3395dd97af0c19d";
const demoName = /^(?:Demo\b|\[Demo\])/i;
const notice =
  "SYNTHETIC DEMO — fictional listing; CHF price, location and details are examples. Source availability is not implied.";
const productDescriptions = {
  "retro-reading-lamp":
    "A warm reading corner accessory with a compact footprint.",
  "shared-flat-dining-set":
    "A solid-wood dining table with four chairs for a shared kitchen.",
  "grey-two-seat-sofa": "A grey two-seat sofa for a small living room.",
  "white-bookshelf-pair":
    "One wide and one narrow white bookshelf for a study corner.",
  "white-study-desk": "A compact white study desk for a laptop and notebooks.",
  "anthracite-storage-cabinet":
    "An anthracite cabinet for books, crockery and everyday storage.",
};

function uuidFor(ownerId, slug) {
  const bytes = createHash("sha1")
    .update(Buffer.from(namespace, "hex"))
    .update(`${ownerId}:${slug}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createDemoListings(fixture, ownerId) {
  if (
    fixture.schemaVersion !== 1 ||
    !Array.isArray(fixture.items) ||
    !fixture.items.length
  ) {
    throw new Error(
      "Expected schemaVersion 1 and a non-empty items array in the research fixture.",
    );
  }
  const slugs = new Set();
  return fixture.items.map(({ source, syntheticDemo: demo }) => {
    if (!demo || !/^[a-z0-9-]+$/.test(demo.slug) || slugs.has(demo.slug)) {
      throw new Error("Each fixture item needs a unique syntheticDemo.slug.");
    }
    slugs.add(demo.slug);
    const url = new URL(source?.url);
    if (
      url.protocol !== "https:" ||
      !/(^|\.)ebay\.(com|co\.uk|de|fr|it|ch)$/.test(url.hostname)
    ) {
      throw new Error("Fixture provenance must point to an HTTPS eBay page.");
    }
    for (const key of [
      "title",
      "description",
      "demoLocation",
      "condition",
      "dimensions",
      "pickup",
    ]) {
      if (typeof demo[key] !== "string" || !demo[key].trim())
        throw new Error(`Missing syntheticDemo.${key}.`);
    }
    if (
      !Number.isFinite(demo.demoPriceChf) ||
      demo.demoPriceChf < 0 ||
      demo.demoPriceChf > 1000000
    ) {
      throw new Error("Each synthetic demo price must be a valid CHF amount.");
    }
    const row = {
      id: uuidFor(ownerId, demo.slug),
      owner_id: ownerId,
      title: `[Demo] ${demo.title.replace(/^(?:\[Demo\]|DEMO\s*·)\s*/i, "")}`,
      description: `${productDescriptions[demo.slug] || demo.description}\n\n${notice}\nInspiration: ${url.href}`,
      price: demo.demoPriceChf,
      location: demo.demoLocation.replace(
        /\s*\(fictional demo location\)/i,
        "",
      ),
      condition: demo.condition.replace(/\s*— demo condition$/i, ""),
      dimensions: demo.dimensions.replace(
        /\s*— fictional demo dimensions$/i,
        "",
      ),
      pickup: demo.pickup
        .replace(/^Demo pickup:\s*/i, "")
        .replace(/\s*No real appointment\.$/i, ""),
      images: [],
      tags: ["Demo"],
      status: "active",
    };
    for (const [key, max] of Object.entries({
      title: 180,
      description: 4000,
      location: 180,
      condition: 180,
      dimensions: 180,
      pickup: 300,
    })) {
      if ([...row[key]].length > max)
        throw new Error(
          `Demo ${demo.slug} exceeds the database limit for ${key}.`,
        );
    }
    return row;
  });
}

// Administrator-reviewed sandbox alternative: inert owners cannot sign in.
export function renderSqlSeed(fixture) {
  const owners = [
    {
      id: "df5ead21-cb17-52ad-af2d-b6b167100001",
      email: "takeover-demo-lea@example.invalid",
      name: "Demo Seller — Léa",
    },
    {
      id: "df5ead21-cb17-52ad-af2d-b6b167100002",
      email: "takeover-demo-noe@example.invalid",
      name: "Demo Seller — Noé",
    },
    {
      id: "df5ead21-cb17-52ad-af2d-b6b167100003",
      email: "takeover-demo-mila@example.invalid",
      name: "Demo Seller — Mila",
    },
  ];
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
  const rows = fixture.items.map(
    (item, index) =>
      createDemoListings(
        { ...fixture, items: [item] },
        owners[index % owners.length].id,
      )[0],
  );
  return `-- OPTIONAL SANDBOX DEMO SEED. Review before executing in the SQL Editor.
-- Generated from scripts/fixtures/ebay-research.json; regenerate with --sql.
-- This is not an application migration and must not run automatically.
-- No passwords, confirmed emails, identities or login-capable demo accounts.
-- Source items are references only. All local CHF offers below are synthetic.
begin;
create temporary table demo_seed_owners(id uuid primary key,email text,name text) on commit drop;
insert into demo_seed_owners values
${owners.map((owner) => `(${quote(owner.id)},${quote(owner.email)},${quote(owner.name)})`).join(",\n")};
create temporary table demo_seed_listings(id uuid primary key,owner_id uuid,title text,description text,price numeric,location text,condition text,dimensions text,pickup text) on commit drop;
insert into demo_seed_listings values
${rows.map((row) => `(${[row.id, row.owner_id, row.title, row.description, row.price, row.location, row.condition, row.dimensions, row.pickup].map(quote).join(",")})`).join(",\n")};
do $$
begin
 if exists(select 1 from auth.users u join demo_seed_owners d on u.id=d.id
  where u.email is distinct from d.email or u.raw_app_meta_data->>'demo_seed' is distinct from 'takeover-ebay-v1'
    or u.encrypted_password is not null or u.email_confirmed_at is not null
    or u.banned_until is distinct from 'infinity'::timestamptz) then
  raise exception 'Reserved demo owner ID belongs to a different or login-capable account';
 end if;
 if exists(select 1 from auth.users u join demo_seed_owners d on lower(u.email)=d.email where u.id<>d.id) then
  raise exception 'Reserved demo email already belongs to another account';
 end if;
 if exists(select 1 from public.profiles p join demo_seed_owners d on p.id=d.id where p.display_name not like 'Demo %') then
  raise exception 'Reserved demo profile ID contains non-demo data';
 end if;
 if exists(select 1 from public.listings l join demo_seed_listings d on l.id=d.id
  where l.owner_id<>d.owner_id or l.title not like '[Demo] %' or position('SYNTHETIC DEMO' in l.description)=0) then
  raise exception 'Reserved demo listing ID contains non-demo data';
 end if;
end $$;
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,banned_until,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
select id,'00000000-0000-0000-0000-000000000000'::uuid,'authenticated','authenticated',email,null,null,'infinity'::timestamptz,
 '{"demo_seed":"takeover-ebay-v1","synthetic":true}'::jsonb,jsonb_build_object('display_name',name),now(),now()
from demo_seed_owners on conflict(id) do nothing;
insert into public.profiles(id,display_name) select id,name from demo_seed_owners on conflict(id) do nothing;
insert into public.listings(id,owner_id,title,description,price,location,condition,dimensions,pickup,images,status,tags)
select id,owner_id,title,description,price,location,condition,dimensions,pickup,'{}'::text[],'active',array['Demo']
from demo_seed_listings on conflict(id) do nothing;
-- Readback before commit: three inert owners and six seeded listings.
select d.name,u.email,u.encrypted_password is null as no_password,u.email_confirmed_at is null as unconfirmed,u.banned_until from demo_seed_owners d join auth.users u using(id) order by d.name;
select l.id,l.title,l.price,l.status,p.display_name from public.listings l join demo_seed_listings d using(id) join public.profiles p on p.id=l.owner_id order by l.title;
commit;
`;
}

function checked(result, stage) {
  if (result.error) {
    const code = String(result.error.code || result.status || "unknown");
    throw new Error(
      `${stage} failed (code ${/^[a-z0-9_-]+$/i.test(code) ? code : "unknown"}). Check credentials, applied migrations and RLS. No credential values were logged.`,
    );
  }
  return result.data;
}

export async function seedDemo(
  client,
  fixture,
  { userId, displayName, profileOnly = false },
) {
  if (!demoName.test(displayName) || [...displayName].length > 80) {
    throw new Error(
      "DEMO_SEED_DISPLAY_NAME must start with Demo or [Demo] and be at most 80 characters.",
    );
  }
  const listings = createDemoListings(fixture, userId);
  const [profileResult, existingResult] = await Promise.all([
    client
      .from("profiles")
      .select("id,display_name")
      .eq("id", userId)
      .maybeSingle(),
    client.from("listings").select("id,title").eq("owner_id", userId),
  ]);
  const profile = checked(profileResult, "Reading demo profile");
  const existing = checked(existingResult, "Reading owned listings");
  if (profile?.display_name?.trim() && !demoName.test(profile.display_name)) {
    throw new Error(
      "This account has a non-demo public profile. Use a dedicated demo account; its profile was not changed.",
    );
  }
  if (existing.some((row) => !/^\[Demo\]/i.test(row.title))) {
    throw new Error(
      "This account owns non-demo listings. Use a dedicated demo account; nothing was changed.",
    );
  }
  if (!profile) {
    checked(
      await client
        .from("profiles")
        .insert({ id: userId, display_name: displayName }),
      "Creating demo profile",
    );
  } else if (!profile.display_name.trim()) {
    checked(
      await client
        .from("profiles")
        .update({ display_name: displayName })
        .eq("id", userId)
        .eq("display_name", profile.display_name),
      "Naming demo profile",
    );
  }
  const existingIds = new Set(existing.map((row) => row.id));
  const missing = profileOnly
    ? []
    : listings.filter((row) => !existingIds.has(row.id));
  if (missing.length)
    checked(
      await client.from("listings").insert(missing),
      "Inserting demo listings",
    );
  if (!profileOnly) {
    const verified = checked(
      await client
        .from("listings")
        .select("id")
        .eq("owner_id", userId)
        .in(
          "id",
          listings.map((row) => row.id),
        ),
      "Verifying demo listings",
    );
    if (verified.length !== listings.length)
      throw new Error(
        "Readback did not find all demo listings. Rerun safely after checking project configuration.",
      );
  }
  return {
    inserted: missing.length,
    skipped: profileOnly ? 0 : listings.length - missing.length,
    profileOnly,
  };
}

function publicKeyOnly(key) {
  if (key.startsWith("sb_publishable_")) return;
  try {
    const payload = JSON.parse(
      Buffer.from(key.split(".")[1], "base64url").toString(),
    );
    if (payload.role === "anon") return;
  } catch {
    /* Report only the setting name, never its value. */
  }
  throw new Error(
    "SUPABASE_PUBLISHABLE_KEY must be a publishable key or legacy anon key. Secret/service-role keys are not allowed.",
  );
}

export async function main(args = process.argv.slice(2), env = process.env) {
  if (
    args.some(
      (arg) => !["--apply", "--profile-only", "--help", "--sql"].includes(arg),
    )
  )
    throw new Error("Unknown flag. Use --help.");
  if (args.includes("--help")) {
    console.log(
      "Preview: node --env-file=.env scripts/seed-demo.mjs\nSeed:    node --env-file=.env scripts/seed-demo.mjs --apply\nProfile: add --profile-only for a dedicated demo buyer.\nSQL: use --sql alone to print the optional sandbox seed.",
    );
    return;
  }
  const fixture = JSON.parse(await readFile(fixtureUrl, "utf8"));
  if (args.includes("--sql")) {
    if (args.includes("--apply") || args.includes("--profile-only"))
      throw new Error(
        "Use --sql alone to print the optional administrator-reviewed SQL; it performs no network requests.",
      );
    process.stdout.write(renderSqlSeed(fixture));
    return;
  }
  const preview = createDemoListings(
    fixture,
    "00000000-0000-0000-0000-000000000000",
  );
  if (!args.includes("--apply")) {
    console.log(
      JSON.stringify(
        {
          mode: "preview — no network requests or writes",
          profileOnly: args.includes("--profile-only"),
          listings: preview.map(({ title, price, location, description }) => ({
            title,
            priceChf: price,
            location,
            description,
          })),
        },
        null,
        2,
      ),
    );
    return;
  }
  for (const name of [
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "DEMO_SEED_DISPLAY_NAME",
  ]) {
    if (!env[name]?.trim())
      throw new Error(`Set ${name} before applying.`);
  }
  if (
    !demoName.test(env.DEMO_SEED_DISPLAY_NAME) ||
    [...env.DEMO_SEED_DISPLAY_NAME].length > 80
  ) {
    throw new Error(
      "DEMO_SEED_DISPLAY_NAME must start with Demo or [Demo] and be at most 80 characters.",
    );
  }
  publicKeyOnly(env.SUPABASE_PUBLISHABLE_KEY);
  const token = env.DEMO_SEED_ACCESS_TOKEN;
  if (token && (env.DEMO_SEED_EMAIL || env.DEMO_SEED_PASSWORD))
    throw new Error("Use either an access token or email/password, not both.");
  if (!token && (!env.DEMO_SEED_EMAIL || !env.DEMO_SEED_PASSWORD))
    throw new Error(
      "Set DEMO_SEED_EMAIL and DEMO_SEED_PASSWORD for an existing confirmed demo account, or DEMO_SEED_ACCESS_TOKEN. No accounts were created.",
    );
  const client = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(token
      ? { global: { headers: { Authorization: `Bearer ${token}` } } }
      : {}),
  });
  try {
    const auth = token
      ? checked(await client.auth.getUser(token), "Validating demo session")
      : checked(
          await client.auth.signInWithPassword({
            email: env.DEMO_SEED_EMAIL,
            password: env.DEMO_SEED_PASSWORD,
          }),
          "Signing in to confirmed demo account",
        );
    if (!auth.user?.id)
      throw new Error("No authenticated demo user was returned.");
    const result = await seedDemo(client, fixture, {
      userId: auth.user.id,
      displayName: env.DEMO_SEED_DISPLAY_NAME,
      profileOnly: args.includes("--profile-only"),
    });
    console.log(JSON.stringify({ mode: "applied", ...result }));
  } finally {
    // Local cleanup only: do not revoke other sessions belonging to the demo account.
    if (!token) await client.auth.signOut({ scope: "local" });
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
