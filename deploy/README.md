# Putting PixelPatch online (Azure for Students)

One small Azure server runs everything in Docker:

| Container | What it does |
|---|---|
| `db` | MariaDB database. Data is kept in a Docker volume, so it survives restarts and updates. |
| `api` | The backend (`server/`), including live chat. Uploaded photos are kept in a volume. |
| `web` | Caddy: serves the website, gets the HTTPS certificate automatically, and forwards `/api`, `/socket.io` and `/uploads` to the backend. |

Everything is reached through one address, e.g. `https://pixelpatch.southeastasia.cloudapp.azure.com`.

---

## 1. Create the Azure account

1. Go to <https://azure.microsoft.com/free/students> and sign up. Verify your student status with your **school email** (if Microsoft blocks creating an account with it, sign in with a personal Microsoft account and verify the school email during sign-up). No credit card is needed for Azure for Students.
2. You get about **$100 of credit for 12 months**. Check what's left any time in the Azure portal under **Cost Management**.

## 2. Create the server (virtual machine)

In the Azure portal: **Create a resource → Virtual machine**.

| Setting | Choose |
|---|---|
| Subscription | Azure for Students |
| Region | **(Asia Pacific) Southeast Asia** — closest to the Philippines |
| Image | **Ubuntu Server 24.04 LTS** |
| Size | **B1s** (1 vCPU, 1 GB) if it's offered. If not, **B2ats_v2** (2 vCPU, 1 GB, x64 image) or **B2pts_v2** (Arm64 — pick the *Ubuntu Server 24.04 LTS – Arm64* image). Or try another region (East Asia, Japan East, Korea Central). Avoid bigger sizes: they use credit much faster. |
| Authentication | SSH public key (recommended) or password |
| Username | `azureuser` |
| Inbound ports | **SSH (22), HTTP (80), HTTPS (443)** |

Create it, then on the VM's **Overview** page, next to **DNS name**, click **Not configured** → set a **DNS name label** (e.g. `pixelpatch`) → **Save**.
Your site address is now something like `pixelpatch.southeastasia.cloudapp.azure.com`. Write it down — it's your `SITE_ADDRESS`.

## 3. Connect to the server

From a terminal on your laptop (Windows Terminal / PowerShell has `ssh` built in):

```bash
ssh azureuser@pixelpatch.southeastasia.cloudapp.azure.com
```

Everything below runs **on the server**.

## 4. Prepare the server (once)

```bash
# Extra memory for building the website on a 1 GB server
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
exit   # log out and back in so the docker group applies
```

Reconnect with `ssh` again.

## 5. Get the code

```bash
git clone https://github.com/Eds-cs/PixelPatch.git
cd PixelPatch/deploy
```

If the repository is private, GitHub will ask for a username and a **personal access token** (GitHub → Settings → Developer settings → Personal access tokens) instead of your password.

## 6. Fill in the settings

```bash
cp .env.example .env
nano .env
```

- `SITE_ADDRESS` — your DNS name from step 2, **without** `https://`.
- `DB_PASS`, `DB_ROOT_PASS`, `JWT_SECRET` — new long random values. Generate each with `openssl rand -hex 24`.
- `XENDIT_SUCCESS_URL` = `https://<SITE_ADDRESS>/payment-success`, `XENDIT_FAILURE_URL` = `https://<SITE_ADDRESS>/payment-failed`.
- The rest (OpenAI, Gmail, Xendit, Google) — use **new** keys, not the ones that were shared during development.

Save with `Ctrl+O`, `Enter`, then exit with `Ctrl+X`.

## 7. Start it

```bash
docker compose up -d --build
```

The first build takes a while (often 10–20 minutes on B1s). Then open `https://<SITE_ADDRESS>`.

Useful commands (run in `PixelPatch/deploy`):

```bash
docker compose ps                # what's running
docker compose logs -f api       # backend logs (Ctrl+C to stop watching)
docker compose logs -f web       # website / HTTPS logs
docker compose restart api       # restart the backend
```

## 8. After it's running

- **Make an admin account:** sign up on the website, then:
  ```bash
  docker compose exec db mariadb -u root -p pixelpatchdb \
    -e "UPDATE users SET role_id = 2 WHERE email = 'you@example.com';"
  ```
  (Enter your `DB_ROOT_PASS` when asked.)
- **Xendit:** set the webhook URL in the Xendit dashboard to `https://<SITE_ADDRESS>/api/webhooks/xendit`, with the same token as `XENDIT_WEBHOOK_TOKEN`.
- **Google sign-in:** in Google Cloud → Credentials, add `https://<SITE_ADDRESS>` to the web client's authorized JavaScript origins.
- **Phone app:** set `EXPO_PUBLIC_API_URL=https://<SITE_ADDRESS>` in the project's root `.env` before building or running the app.

## Updating the live site

After changes are merged into `main` on GitHub:

```bash
cd ~/PixelPatch && git pull
cd deploy && docker compose up -d --build
```

If the update includes a new file in `server/sql/`, back up first, then apply it:

```bash
docker compose exec db mariadb-dump -u root -p pixelpatchdb > ~/backup-$(date +%F).sql
docker compose exec -T db mariadb -u root -p<DB_ROOT_PASS> pixelpatchdb < ../server/sql/<new-file>.sql
```

## Backups

```bash
docker compose exec db mariadb-dump -u root -p pixelpatchdb > ~/backup-$(date +%F).sql
```

Copy backups to your laptop with `scp azureuser@<SITE_ADDRESS>:~/backup-*.sql .` from a laptop terminal.

## Saving credit

**Stop** the VM in the portal when you don't need it online (stopped VMs don't use compute credit; the disk still costs a little). Start it again from the portal; everything comes back as it was.

## Notes

- `deploy/db/01-schema.sql` creates the tables and roles on the **first** start only. It has no data and no test accounts.
- Verification and password-reset codes are kept in the server's memory: a restart clears codes that were sent but not used yet.
- Times are stored in Philippine time (`Asia/Manila`).
