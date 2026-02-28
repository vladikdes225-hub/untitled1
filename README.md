# RXSEND Market

Production-ready web marketplace with:
- static storefront
- Node.js HTTP API (`server.js`)
- Telegram admin bot (`telegram-bot.js`)

## 1. Environment

Copy `.env.example` to `.env` and set strong values:
- `ADMIN_API_TOKEN`
- `BOT_AUTH_PASSWORD`
- `TELEGRAM_BOT_TOKEN`
- `CORS_ORIGINS`
- `DATABASE_URL` (recommended in production / Render)

## 2. Install and build

```bash
npm install
npm run build
```

## 3. Run in production mode

```bash
# API + static site
NODE_ENV=production node server.js

# Telegram bot (separate process)
NODE_ENV=production node telegram-bot.js
```

## 4. Health check

```bash
curl http://localhost:3001/api/health
```

Expected response: `{"ok":true,...}`.

## Security Notes

- Admin endpoints require `X-API-Token`/`Authorization: Bearer ...`.
- Support visitor endpoints require `X-Visitor-Id`.
- Public static file access is restricted to whitelisted paths.
- File-mode JSON storage writes are atomic (`tmp + rename`).

## Render Notes

- To avoid rollback on Manual Deploy, set external PostgreSQL:
  - `DATABASE_URL=postgres://...`
  - `DATABASE_SSL=auto`
- With `DATABASE_URL`, ads/sellers/support are stored in Postgres (auto table init on startup).
- If you do not use persistent disk, uploaded local files in `uploads/` can still disappear after redeploy.
- Keep frontend fallback API disabled by default (`data-api-fallback-base=""` on `<html>`), otherwise data can appear to "rollback" to another API instance during outages.
