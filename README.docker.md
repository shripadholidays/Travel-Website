# Wandeazy — Run with Docker

This runs the **entire stack** (frontend + API + database) with one command. No need to install Node or a database locally — just Docker.

## Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

## Quick start

```bash
# 1. From the project root (the folder containing docker-compose.yml):
cp .env.example .env

# 2. Open .env and fill in at least JWT_SECRET and SESSION_SECRET.
#    Generate a secret with:
#    node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Build and start everything:
docker compose up --build
```

Then open:

| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3000        |
| API       | http://localhost:8080        |
| API health| http://localhost:8080/health |

To stop: `Ctrl+C`, then `docker compose down`.
To wipe the database too: `docker compose down -v`.

## What's included
- **database** — a SQLite file in the `db-data` volume, or your Turso database when `TURSO_DATABASE_URL` is set. Tables are created on start.
- **server** — the Node/Express API on port `8080`.
- **client** — the React app built by Vite and served by nginx on port `3000`.

The services talk to each other over Docker's internal network. Uploaded images go to the `uploads` volume, or to Cloudflare R2 when the R2 variables are set.

## Optional features (all work without them, just disabled)
Fill these in `.env` to enable:
- **Google login** → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VITE_GOOGLE_OAUTH_CLIENT_ID`
- **Razorpay payments** → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- **Stripe payments** → `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
  (all server-side; with both set, pick one in Admin → Settings → Payments)
- **Email** → the `MAILGUN_*` vars

> ⚠️ The frontend `VITE_*` values are baked in at **build** time. If you change them, rebuild the client:
> `docker compose up --build client`

## Common commands
```bash
docker compose up --build        # build + start (foreground)
docker compose up -d --build     # start in background
docker compose logs -f server    # follow API logs
docker compose ps                # see running containers
docker compose down              # stop and remove containers
docker compose down -v           # also delete the database and uploads volumes
```
