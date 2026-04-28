# Finalive Production Deploy Checklist

## Pre-deploy

- [ ] Database migrated (`pnpm db:migrate`)
- [ ] Seed data applied if first deploy (`pnpm seed`)
- [ ] All env vars configured in Vercel dashboard

## Required Environment Variables

| Variable | Source | Example |
|----------|--------|---------|
| `DATABASE_URL` | Postgres provider | `postgres://...` |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` | `abc123...` |
| `BETTER_AUTH_URL` | Vercel URL | `https://finalive.vercel.app` |
| `GOOGLE_CLIENT_ID` | Google Cloud Console | `...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console | `GOCSPX-...` |
| `SMTP_HOST` | Gmail / Resend / SES | `smtp.gmail.com` |
| `SMTP_PORT` | Provider | `587` or `465` |
| `SMTP_USER` | SMTP account | `...` |
| `SMTP_PASS` | App password | `...` |
| `EMAIL_FROM` | Sender address | `Finalive <no-reply@finalive.dev>` |
| `S3_ENDPOINT` | R2 / S3 | `https://...r2.cloudflarestorage.com` |
| `S3_REGION` | R2 = `auto` | `auto` |
| `S3_ACCESS_KEY_ID` | R2 token | `...` |
| `S3_SECRET_ACCESS_KEY` | R2 token | `...` |
| `S3_BUCKET_PRIVATE` | Bucket name | `finalive-private` |
| `S3_BUCKET_PUBLIC` | Bucket name | `finalive-public` |
| `S3_PUBLIC_BASE_URL` | Custom domain or R2 | `https://cdn.finalive.dev` |
| `BUNNY_LIBRARY_ID` | Bunny Stream | `123456` |
| `BUNNY_API_KEY` | Bunny Stream | `...` |
| `BUNNY_CDN_HOSTNAME` | Bunny CDN | `vz-....b-cdn.net` |
| `BUNNY_CDN_TOKEN_SECRET` | Bunny CDN pull zone | `...` |
| `BUNNY_STREAM_TOKEN_SECRET` | Bunny Stream library | `...` |
| `BUNNY_WEBHOOK_SECRET` | Self-generated | `...` |
| `ADMIN_NOTIFY_EMAIL` | Admin inbox | `admin@finalive.dev` |
| `CRON_SECRET` | `openssl rand -hex 16` | `...` |

## Post-deploy Verification

1. `curl https://<host>/api/config/oauth` → `{"google":true/false}`
2. `curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/expire-pending` → `{"ok":true,"expired":0}`
3. Register → verify email → login flows
4. Upload slip → admin accept → enrolled
5. Watch lesson → progress saved
6. Complete course → certificate issued
7. `/legal/terms` and `/legal/privacy` render
