# EcoTrace India

EcoTrace India is a working Next.js / React full-stack e-waste collection, traceability, and recycling management platform for citizens, collection partners, center managers, recyclers, organizations, and administrators.

## Quick start

```bash
npm install

# Create .env with DATABASE_URL for your PostgreSQL database.
# Optional live AI: OPENROUTER_API_KEY and OPENROUTER_MODEL=openrouter/free

npx drizzle-kit push --force
npm run dev
```

Open `http://localhost:3000`. The first dynamic request seeds the demonstration records.

## Useful routes

- `/` — public homepage
- `/marketplace` — product studio and sample journey
- `/collection-centers` — Punjab sample collection points
- `/impact` — database-backed analytics
- `/journey/tablet` — public end-to-end sample timeline
- `/dashboards` — protected role portal directory
- `/login` — manual sign-in/registration
- `/docs` — architecture, API, academic report, and presentation links

Development account IDs, roles, emails, and the shared course password are kept in the separate local file `config/development-accounts.json`. That file is gitignored. Copy `config/development-accounts.example.json` when cloning.

## Verification

```bash
npx next typegen
npm exec tsc -- --noEmit --pretty false
npm run lint
npm run build
node scripts/verify-end-to-end.mjs
node scripts/verify-portal-browser.mjs   # requires Playwright Chromium
```

See `DEPLOYMENT.md` for GitHub, Vercel, Netlify, database, environment, and troubleshooting steps.
