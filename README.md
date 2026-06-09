# Dubbo Job Radar

Dubbo Job Radar is a local-first React app for Josh and Kristy Parris. It helps turn job ads into calmer decisions by importing leads, scoring fit, explaining concerns, tracking applications, and drafting enquiry/application notes.

## What Works Now

- Josh Job Radar for Thursday/Friday Dubbo work that protects Monday/Wednesday Avance IT.
- Kristy Nursing Radar for part-time/casual nursing, with aged care/RACF/nursing-home exclusions by default.
- Manual job paste/import with structured field extraction and field-confidence warnings.
- CSV import for spreadsheet job leads.
- Adzuna live search through Vercel serverless endpoints when credentials are configured.
- Vercel refresh pack that runs the curated Josh/Kristy search set and returns importable leads.
- Application tracker, follow-up queue, email helper, cashflow comparison, agency leads tracker, and exports.
- Portable backup and restore for jobs, profile settings, and agency leads.
- LocalStorage persistence in the browser. No API keys are stored in browser code.

## What "Live" Means Today

Adzuna search and refresh-pack requests are live API calls when the app is deployed on Vercel with server-side environment variables. Manual paste, CSV imports, application statuses, notes, and agency leads are stored locally in the browser.

Vercel cron can call `/api/jobs/refresh`, but those cron results do not automatically appear in a user's browser because there is no durable shared database yet. True background updates need backend storage, scheduled ingestion into that storage, and notification/report delivery.

## Not Built Yet

- Durable cloud storage or cross-device sync.
- Gmail job-alert ingestion from a `Job Leads` label.
- Email notifications or automatic daily reports.
- Automatic saving of cron refresh results into the app.
- Auto-apply or job-board scraping. The app intentionally avoids unlawful scraping, login bypassing, and automatic submissions.

## Run Locally

```bash
npm install
npm run dev
```

## QA

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Adzuna API Setup

The Adzuna importer only works on a host that supports the `/api/jobs/search-adzuna` and `/api/jobs/refresh` serverless functions, such as Vercel.

Set these environment variables in Vercel:

```env
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
```

Do not create `VITE_` Adzuna credentials. Anything prefixed with `VITE_` is exposed to the browser. GitHub Pages can still run the static app, but serverless API search will not work there.

`vercel.json` includes cron schedules for 7:00am and 12:30pm Sydney time during AEST:

- `0 21 * * *`
- `30 2 * * *`

Vercel cron is UTC-based, so these times may need adjustment during daylight saving.

## Future Gmail Ingestion

The safe path for SEEK, Jora, Indeed, LinkedIn, Workforce Australia, NSW Health, I Work for NSW, TAFE NSW, Dubbo Council, recruiters, schools, and local employers is saved-search email ingestion. A future backend can read Gmail messages labelled `Job Leads`, extract title/employer/location/pay/roster/link/source, dedupe them, score them, and save them into durable storage.

## Privacy

Current app data stays in browser LocalStorage unless a backend is added. Resume documents, API keys, contact details, and referee details should not be committed to the repo.
