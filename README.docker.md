# Wandeazy — Run with Docker

This runs the **entire stack** (frontend + API + MongoDB) with one command. No need to install Node or MongoDB locally — just Docker.

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
| MongoDB   | mongodb://localhost:27017    |

To stop: `Ctrl+C`, then `docker compose down`.
To wipe the database too: `docker compose down -v`.

## What's included
- **mongo** — MongoDB 7 with a persistent volume (`mongo-data`).
- **server** — the Node/Express API on port `8080`.
- **client** — the React app built by Vite and served by nginx on port `3000`.

The services talk to each other over Docker's internal network; the API connects to Mongo at `mongodb://mongo:27017/wandeazy` automatically.

## Optional features (all work without them, just disabled)
Fill these in `.env` to enable:
- **Google login** → `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `VITE_GOOGLE_OAUTH_CLIENT_ID`
- **Stripe payments** → `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLISHABLE_KEY`
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
docker compose down -v           # also delete the Mongo volume
```
