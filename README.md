# Dubbo Job Radar

Dubbo Job Radar is a local-first React app for Josh and Kristy Parris. It scores Dubbo job leads against practical availability, family sustainability, income, commute, role fit, and long-term pathway rules.

## Current MVP

- Josh Job Radar scoring for Thursday/Friday Dubbo work that protects Monday/Wednesday Avance IT.
- Kristy Nursing Radar scoring with a hard aged-care exclusion by default.
- Manual job paste/import with structured field extraction.
- CSV import for spreadsheet job leads.
- Adzuna import through a Vercel serverless endpoint when credentials are configured.
- Vercel refresh pack that runs the saved query set in one batch.
- Deduplication by URL or title/employer/location/date.
- Morning briefing with copy/download actions.
- Follow-up queue for older questions, applications, and interviews.
- Application tracker with statuses from New through Accepted/Archived.
- Email/contact prompt generator for enquiries and applications.
- Weekly cashflow comparison against Josh's replacement-income target.
- JSON, CSV, and Markdown evidence-pack exports.
- Settings for radius, cashflow mode, afternoon-shift approval, and Kristy's aged-care override.
- LocalStorage persistence for the app data. No API keys are stored in browser code.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The app is static and can deploy to Vercel or GitHub Pages. Vite is configured with a relative base path so the built assets work from a project subpath such as `/WorkApp/`.

## Adzuna API Setup

The Adzuna importer is optional and only works on a host that supports the `/api/jobs/search-adzuna` serverless function, such as Vercel.

Set these environment variables in Vercel:

```env
ADZUNA_APP_ID=your_adzuna_app_id
ADZUNA_APP_KEY=your_adzuna_app_key
```

Do not create `VITE_` Adzuna credentials. Anything prefixed with `VITE_` is exposed to the browser. GitHub Pages will still run the app, but API search will show a configuration message because Pages does not run serverless functions.

The Vercel refresh pack uses `/api/jobs/refresh`, which runs the curated Josh and Kristy search set and returns normalised job leads for the app to import. `vercel.json` also includes cron schedules for 7:00am and 12:30pm Sydney time during AEST:

- `0 21 * * *`
- `30 2 * * *`

Vercel cron is UTC-based, so these times may need adjustment during daylight saving.

## Data Source Plan

Phase 1 is local-first: manual paste, CSV import, scoring, tracker, and application helper.

Phase 2 has started with Adzuna search and refresh-pack endpoints on Vercel. The next backend work is durable database storage, email alert ingestion, and actual notification delivery.

Future phases should use lawful and stable sources only:

- Adzuna API through serverless/backend endpoints with secrets kept off the browser.
- Saved job-alert emails imported from a Gmail label such as `Job Leads`.
- Manual imports from SEEK, Jora, Indeed, Workforce Australia, LinkedIn, recruiters, NSW Health, I Work for NSW, TAFE NSW, Dubbo Regional Council, schools, and local employers.
- No login bypassing, aggressive scraping, or automatic application submission.
