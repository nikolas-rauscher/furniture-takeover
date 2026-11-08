# Deploying on a homelab (self-hosted Supabase behind nginx)

This guide connects three machines (containers or VMs):

| Machine      | Runs                                               | Example address |
| ------------ | -------------------------------------------------- | --------------- |
| **Supabase** | Supabase in Docker (database, auth, storage, Kong) | `192.168.1.46`  |
| **App**      | This repository (`npm start`, port 8787)           | `192.168.1.48`  |
| **nginx**    | Your reverse proxy and certbot                     | your own        |

The app may share a machine with Supabase. Where the guide says "app machine", use that machine; the only differences are marked **(same machine)**.

Machines: Supabase runs on Debian 13 and the app on Ubuntu 26.04. Public names used below: **`aipm.deyan.ch`** is the app and **`supabase.deyan.ch`** is Supabase. Replace the example LAN addresses with yours.

## How the pieces connect

```
browser ──https──> nginx ──> app machine :8787     aipm.deyan.ch (pages, the assistant)
browser ──https──> nginx ──> Supabase :8000        supabase.deyan.ch (sign-in, listings, photos, messages)
app server ───────────────> Supabase :8000         (checks logins and AI quotas, by LAN address)
```

- **Browsers talk to Supabase directly** for sign-in, listings, photos and messages. That is why `SUPABASE_URL` is a public HTTPS name, `https://supabase.deyan.ch`. A page served over HTTPS cannot call a plain `http://192.168…` address, because browsers block it.
- The **app server** uses a separate LAN address (`SUPABASE_INTERNAL_URL`). It is never sent to browsers, and the server does not need to go out through the internet to reach Supabase.
- nginx forwards only four Supabase paths (`/auth/v1/`, `/rest/v1/`, `/storage/v1/`, `/realtime/v1/`). Studio, the database admin and every other Supabase path return a 404 from the internet.

> **What is exposed.** `supabase.deyan.ch` is reachable from the internet, but only those four API paths, which the app needs. Access control is then Supabase's own: every request needs the public key, signups are disabled (invitation-only), and the database security rules decide who can see what. Studio, the database and Kong's own port stay on your LAN.

## Ports

Only **80 and 443** are forwarded from the internet to the nginx machine. Port 80 is needed for certbot to issue and renew certificates.

Between your machines (LAN only, never forwarded):

| From          | To               | Port | Why                                    |
| ------------- | ---------------- | ---- | -------------------------------------- |
| nginx machine | app machine      | 8787 | The app and the assistant              |
| nginx machine | Supabase machine | 8000 | Kong, Supabase's API gateway           |
| app machine   | Supabase machine | 8000 | Logins and AI quotas                   |
| app machine   | internet (out)   | 443  | DeepSeek, Brave and OpenStreetMap      |

Do not forward 8000, 8787, 5432, 6543, 3000 or 4000. Limit port 8787 to the nginx machine and port 8000 to the nginx and app machines, using your firewall (for example the Proxmox firewall).

## Before you start

- Node.js **22.18 or newer** on the app machine (`node --version`).
- DNS records for `aipm.deyan.ch` and `supabase.deyan.ch` pointing at your public IP, and your router forwarding 80 and 443 to the nginx machine.
- Your DeepSeek and Brave keys.
- The three machines can reach each other by LAN address (check with `ping`).

## Step 1. Supabase machine

1. Open the `.env` file next to Supabase's `docker-compose.yml` and set:

   ```dotenv
   SITE_URL=https://aipm.deyan.ch
   ADDITIONAL_REDIRECT_URLS=https://aipm.deyan.ch
   API_EXTERNAL_URL=https://supabase.deyan.ch
   SUPABASE_PUBLIC_URL=https://supabase.deyan.ch
   DISABLE_SIGNUP=true
   ```

   These names are from the official compose file; check yours uses the same ones. Keep `ENABLE_EMAIL_AUTOCONFIRM=false`.

2. Apply the change and make sure everything is healthy:

   ```sh
   docker compose up -d
   docker compose ps
   ```

3. Note two values from the same `.env`, needed in step 3:
   - `ANON_KEY` (the public key; never use `SERVICE_ROLE_KEY` in this app).
   - Kong's port, `KONG_HTTP_PORT` (default `8000`).

4. Make sure the nginx machine and the app machine can open `http://192.168.1.46:8000`, and that nothing else can.

## Step 2. Create the database tables (once)

Run the five migrations **once, in filename order**. They run through Docker, so do it on the Supabase machine. Copy the folder there first, from the machine that has the repository:

```sh
scp -r supabase <your user>@192.168.1.46:~/
```

Then on the Supabase machine (the first file is not repeatable: running it twice fails):

```sh
cd ~ && for f in supabase/migrations/*.sql; do
  echo "Applying $f"
  docker exec -i supabase-db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f" || break
done
```

`supabase-db` is the default container name (`docker ps` shows yours). If you prefer, paste each file into Studio's SQL Editor, in order.

Optional demo listings: review `supabase/seed-demo.sql`, then run it the same way. It adds three fictional sellers who cannot log in.

## Step 3. App machine

1. Install Node.js and check its version. The app needs **22.18 or newer**:

   ```sh
   sudo apt update && sudo apt install -y nodejs npm git
   node --version
   ```

   If it prints an older version, install Node 22 from NodeSource instead (`https://deb.nodesource.com/setup_22.x`, then `sudo apt install -y nodejs`). The service file below expects Node at `/usr/bin/node`, so avoid a per-user install such as nvm for the service.

2. Get the code, install and build:

   ```sh
   sudo mkdir -p /opt/takeover && sudo chown "$USER" /opt/takeover
   git clone <your repository URL> /opt/takeover && cd /opt/takeover
   npm ci
   npm run build
   ```

3. Create `/opt/takeover/.env` with:

   ```dotenv
   # Browsers: the public Supabase name
   SUPABASE_URL=https://supabase.deyan.ch
   # This server: the LAN address of Supabase's Kong port
   SUPABASE_INTERNAL_URL=http://192.168.1.46:8000
   SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from step 1>
   ACCOUNT_KEYS_ENCRYPTION_KEY=<see below>

   DEEPSEEK_API_KEY=<your key>
   BRAVE_SEARCH_API_KEY=<your key>

   # Let nginx on another machine reach this app (this machine's LAN IP)
   API_HOST=192.168.1.48
   API_ALLOWED_ORIGINS=https://aipm.deyan.ch
   ```

   **(same machine as Supabase)** use `SUPABASE_INTERNAL_URL=http://127.0.0.1:8000` and keep `API_HOST` as this machine's LAN IP, so nginx can still reach the app.

4. Generate the encryption key **once** and store a copy somewhere safe:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
   ```

   If it is lost or changed, personal API keys that users saved become unreadable.

5. Test by hand first:

   ```sh
   npm start
   ```

   You should see `Agent API listening at http://192.168.1.48:8787`. Stop it with Ctrl+C.

   If it stops with `API_HOST can only be set beyond this machine when Supabase accounts are configured`, the two Supabase variables are missing or empty. That check is deliberate: without accounts, the app has no sign-in and must not listen on the network.

6. Run it as a service under its own user. The `.env` holds your keys, so only that user may read it:

   ```sh
   sudo useradd --system --no-create-home --shell /usr/sbin/nologin takeover
   sudo chown root:takeover /opt/takeover/.env && sudo chmod 640 /opt/takeover/.env
   sudo cp /opt/takeover/deploy/takeover.service.example /etc/systemd/system/takeover.service
   sudo systemctl daemon-reload
   sudo systemctl enable --now takeover
   sudo systemctl status takeover
   ```

## Step 4. nginx machine

1. Copy `deploy/nginx-takeover.conf.example` to `/etc/nginx/conf.d/takeover.conf`. The two names (`aipm.deyan.ch`, `supabase.deyan.ch`) and the two upstream addresses (app `192.168.1.48:8787`, Supabase `192.168.1.46:8000`) are already filled in, so just check them.

2. Check and reload:

   ```sh
   sudo nginx -t && sudo systemctl reload nginx
   ```

3. Issue one certificate for both names. certbot adds the HTTPS blocks and the redirects to the same file:

   ```sh
   sudo certbot --nginx -d aipm.deyan.ch -d supabase.deyan.ch
   ```

   Afterwards, open the file and check that each `listen 443 ssl` block kept its settings: `client_max_body_size`, the streaming block for `/api/agent/run` in the app server, and the WebSocket headers in the Supabase server.

## Step 5. Create your first user

The app needs a user with a confirmed email. Without an email server, create users by hand:

1. Open Studio on your LAN: `http://192.168.1.46:8000`. Log in with `DASHBOARD_USERNAME` and `DASHBOARD_PASSWORD` from the Supabase `.env`.
2. Authentication → Users → **Add user** → **Create new user**.
3. Enter an email and a password and tick **Auto Confirm User**.

Invitation and password-reset emails only work once you configure SMTP for Supabase (`SMTP_*` in the Supabase `.env`).

## Step 6. Check that it works

Run these from any machine that resolves both names. Use your own `ANON_KEY`.

```sh
# Config sent to browsers: must show https://supabase.deyan.ch and NOT a 192.168… address
curl -s https://aipm.deyan.ch/api/config

# The server and its keys
curl -s https://aipm.deyan.ch/api/health

# Supabase through nginx: expect [] (or your listings), not an error
curl -s -H "apikey: <ANON_KEY>" \
  "https://supabase.deyan.ch/rest/v1/listings?select=id&limit=1"

# Other Supabase paths must not be reachable: expect 404, never the Studio login
curl -si https://supabase.deyan.ch/ | head -n 1
```

Then in a browser:

1. Open `https://aipm.deyan.ch` and sign in with the user from step 5.
2. Create a listing with a photo, then reload and check that it persists.
3. Sign in on a second device (a phone) and check that the listing is visible.
4. Ask the assistant a question and check that the answer streams in word by word.
5. Open the same listing as a second user and send a message. It should appear on the first user's screen without a refresh, which tests the WebSocket.

## Troubleshooting

| Symptom                                                            | Likely cause                                                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| The app refuses to start: `requires HTTPS, or HTTP on localhost…`  | `SUPABASE_URL` is an `http://` address that is not localhost or a private LAN IP. Use the HTTPS address.                                      |
| Sign-in page says it cannot connect                                | The browser cannot reach `https://supabase.deyan.ch/auth/v1/`. Check DNS, the certificate and the nginx Supabase block.                        |
| The browser console shows a CORS error for `supabase.deyan.ch`     | nginx is adding its own CORS headers, or the request is not reaching Kong. Remove any `add_header Access-Control-…` lines; Kong sends them.   |
| `403 ORIGIN_NOT_ALLOWED` when asking the assistant                 | `API_ALLOWED_ORIGINS` does not contain the exact address in the browser bar, including `https://`.                                            |
| Photo upload fails with `413`                                      | `client_max_body_size` is missing in the HTTPS server block of that name.                                                                     |
| The assistant's answer appears all at once, or stops after a while | `proxy_buffering off` or the long `proxy_read_timeout` is missing for `/api/agent/run`.                                                       |
| Messages only appear after a refresh                               | WebSocket headers (`Upgrade`, `Connection`) are missing in the Supabase server block.                                                         |
| `Sign in with a confirmed email address`                           | The user was not auto-confirmed. Edit the user in Studio, or recreate it with **Auto Confirm User** ticked.                                   |
| Invitation or reset emails never arrive                            | Supabase has no SMTP configured. Create users by hand (step 5) or set `SMTP_*`.                                                               |
| Photos show as broken images                                       | `SUPABASE_URL` is wrong, or the nginx Supabase block does not forward `storage`.                                                              |

## Backups and updates

- **Back up** the Supabase database volume, the Supabase `.env` (its keys and secrets), and `ACCOUNT_KEYS_ENCRYPTION_KEY`.
- **Update the app:** `git pull && npm ci && npm run build && sudo systemctl restart takeover`. Check the release for new files in `supabase/migrations/` and apply any new ones once, in order, as in step 2.
