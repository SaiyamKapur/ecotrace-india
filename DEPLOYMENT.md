# EcoTrace India — download, run, GitHub, and hosting guide

This project is fully working in the current sandbox. The temporary platform preview URL is token-gated, so for a permanent public link, deploy the source yourself.

## 1. Download the project

Use the provided source ZIP, or clone your GitHub repository after pushing it.

```bash
unzip EcoTrace-India-Complete-Source.zip -d EcoTrace-India
cd EcoTrace-India
npm install
```

Node.js 22+ and PostgreSQL 15+ are required.

## 2. Create local environment and database

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
# Optional live AI:
# OPENROUTER_API_KEY=your_own_openrouter_key
# OPENROUTER_MODEL=openrouter/free
# Course sample access:
ECOTRACE_SAMPLE_ACCESS=enabled
```

Create the database and tables:

```bash
createdb app_db        # if the database does not already exist
npx drizzle-kit push --force
```

The first dynamic page/API request runs the idempotent seed process.

## 3. Run and test locally

```bash
npm run dev
# or production:
npm run build
npm run start
```

Check:

```bash
curl http://127.0.0.1:3000/api/health
```

Run the full project checks:

```bash
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run lint
npm run build
node scripts/verify-end-to-end.mjs
node scripts/verify-portal-browser.mjs   # install Playwright Chromium first
```

Expected current evidence: 74/74 end-to-end checks and 40/40 browser portal checks.

## 4. Development accounts

The real course account file is `config/development-accounts.json`. It is **gitignored** and must not be pushed to public GitHub. A safe template is `config/development-accounts.example.json`.

Sign in manually at `/login` with the email and shared development password from that separate file. Protected dashboards redirect to `/login?redirect=...` and return to the requested route after successful authentication.

Before any public production deployment, change or delete all sample accounts and remove `ECOTRACE_SAMPLE_ACCESS=enabled`.

## 5. Push to GitHub

1. Create an **empty private** repository on GitHub. Do not initialize it with README/license/.gitignore if you want to push this folder directly.
2. In the project root:

```bash
git init -b main
git add .
git commit -m "EcoTrace India: working Next.js e-waste traceability platform"
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

3. Confirm `.env`, `.env.local`, `node_modules/`, `.next/`, and `config/development-accounts.json` are not uploaded. The repository already contains `.gitignore` rules for these.

If you must make the repository public, keep `config/development-accounts.json` out of Git and create it only on your machine/deployment.

## 6. Deploy on Vercel (recommended for Next.js)

1. Go to `vercel.com/new` and import the GitHub repository.
2. Keep framework preset **Next.js**; Vercel detects build command `npm run build` and output `.next`.
3. In **Settings → Environment Variables**, add for Production/Preview/Development:
   - `DATABASE_URL` from managed PostgreSQL (Vercel Postgres, Neon, Supabase, Render, etc.)
   - `OPENROUTER_API_KEY` only if you want live AI
   - `OPENROUTER_MODEL=openrouter/free`
   - `ECOTRACE_SAMPLE_ACCESS=enabled` only for course evaluation
4. Deploy. Every push to main redeploys; pull requests get preview URLs.
5. Apply schema to the production database:

```bash
vercel env pull .env.production.local
npx drizzle-kit push --force
```

Or run a one-off release/preview job with the production `DATABASE_URL`.
6. Verify in order:
   - `https://your-domain.vercel.app/api/health`
   - `/login`
   - `/dashboards`
   - manual sign-in with a development account
   - `/journey/tablet`
   - `/collection-centers`
   - `/impact`
   - one protected dashboard

## 7. Netlify alternative

Netlify can host this Next.js App Router project using the Netlify Next.js runtime/plugin. Create a new site from GitHub, set the build command to `npm run build` and publish directory to `.next`, add the same environment variables, and deploy. Vercel is simpler for Next.js because it is the framework’s native host.

## 8. Troubleshooting

- **Login says successful but dashboard does not open:** allow first-party cookies; clear site data/service workers for the origin; use HTTPS; confirm `/api/auth/me` returns a user; confirm the deployment uses the same database where the account exists.
- **Build fails with module/database errors:** do not run `next typegen`, `tsc`, and `next build` concurrently; run them sequentially. Ensure `DATABASE_URL` is available during build if a route is evaluated.
- **403 on the E2B preview URL:** that gateway requires a platform traffic-access token. Use the provided source/deployment steps instead; the app health check is local/managed and passing.
- **Sample login disabled:** create `config/development-accounts.json` from the example or set `ECOTRACE_SAMPLE_ACCESS=enabled` only in course environments.
- **No live AI:** scanner/chatbot use clearly labeled guided/demo fallbacks. Add your own OpenRouter key for live model responses.

## Accuracy boundaries

Sample collection points are not government-authorized facilities. The wallet credit is simulated and not a real payment. Internal recycling/EPR records are not statutory credits. AI image results do not measure exact physical weight.
