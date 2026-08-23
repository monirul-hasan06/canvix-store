# Deployment

The frontend and API are configured for Vercel and Netlify. Both platforms use the same Express API routes.

## Environment variables

Set these as server-side environment variables in the deployment dashboard. Do not expose them as `VITE_*` variables.

- `ORDER_RECIPIENT`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `MAIL_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

The server accepts `MAIL_HOST` and `ORDER_RECIPIENT`. It also temporarily accepts the older names `SMTP_HOST` and `OWNER_EMAIL`, so existing deployments continue working while their variables are renamed.

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
- Deploy. `netlify/functions/api.ts` handles the `/api/*` routes.

## Persistent data requirement

On Netlify, catalog edits are stored in Netlify Blobs (`canvix-content`), so updates remain available across function instances and deployments. Netlify Blobs is enabled automatically for the site’s functions; no client-side environment variable is needed.

Cover uploads are written to `public/covers` for local development. Vercel function filesystems are ephemeral, so production uploads must be committed to the repository or moved to durable object storage before they are used in the catalog. The included `book1_cover.png` is deployed as a static asset.

## Local development

```text
npm run dev
```

This starts Vite on its normal port and the Express API on port 3001. Vite proxies `/api` requests to the API during development.

Rotate any credentials that were previously committed, pasted into chat, or shared in screenshots before deploying.
