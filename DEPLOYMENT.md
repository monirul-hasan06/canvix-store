# Deployment

The frontend and API are configured for Vercel and Netlify. Both platforms use the same Express API routes.

## Environment variables

Set these as server-side environment variables in the deployment dashboard. Do not expose them as `VITE_*` variables.

- `OWNER_EMAIL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

`SESSION_SECRET` must be a long random value. Use a Gmail app password for `SMTP_PASS`, not the Gmail account password.

## Vercel

- Import the repository.
- Keep the build command as `npm run build`.
- Keep the output directory as `dist`.
- Add the environment variables for Production, Preview, and Development as needed.
- Deploy. `api/[...path].ts` handles the `/api/*` routes.

## Netlify

- Import the repository.
- The `netlify.toml` file supplies the build command, `dist` publish directory, function directory, API redirect, and SPA fallback.
- Add the environment variables in Site configuration > Environment variables.
- Secret scanning omits `ADMIN_EMAIL` and `OWNER_EMAIL` because those configured values may intentionally match the public contact address in the site source. Passwords and other credentials remain covered by secret scanning.
- Deploy. `netlify/functions/api.ts` handles the `/api/*` routes.

## Persistent data requirement

The current content store writes to `server/data/content.json` and cover uploads to `public/covers`. Serverless filesystems are not durable, so admin edits and uploaded covers can be lost after a new deployment or instance restart.

Before using the admin panel in production, replace `server/contentStore.ts` filesystem writes with a durable database and object storage, or run the existing Express server on a persistent Node host. The included files are enough for the seeded catalog and read-only browsing, but they do not make serverless admin changes durable.

## Local development

```text
npm run dev
```

This starts Vite on its normal port and the Express API on port 3001. Vite proxies `/api` requests to the API during development.

Rotate any credentials that were previously committed, pasted into chat, or shared in screenshots before deploying.
