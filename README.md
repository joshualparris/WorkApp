# Dubbo Job Radar

Dubbo Job Radar is a local-first React app for Josh and Kristy Parris. It scores Dubbo job leads against practical availability, family sustainability, income, commute, role fit, and long-term pathway rules.

## Current MVP

- Josh Job Radar scoring for Thursday/Friday Dubbo work that protects Monday/Wednesday Avance IT.
- Kristy Nursing Radar scoring with a hard aged-care exclusion by default.
- Manual job paste/import with structured field extraction.
- CSV import for spreadsheet job leads.
- Deduplication by URL or title/employer/location/date.
- Application tracker with statuses from New through Accepted/Archived.
- Email/contact prompt generator for enquiries and applications.
- Weekly cashflow comparison against Josh's replacement-income target.
- Settings for radius, cashflow mode, afternoon-shift approval, and Kristy's aged-care override.
- LocalStorage persistence only. No API keys are stored in browser code.

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

## Data Source Plan

Phase 1 is local-only: manual paste, CSV import, scoring, tracker, and application helper.

Future phases should use lawful and stable sources only:

- Adzuna API through serverless/backend endpoints with secrets kept off the browser.
- Saved job-alert emails imported from a Gmail label such as `Job Leads`.
- Manual imports from SEEK, Jora, Indeed, Workforce Australia, LinkedIn, recruiters, NSW Health, I Work for NSW, TAFE NSW, Dubbo Regional Council, schools, and local employers.
- No login bypassing, aggressive scraping, or automatic application submission.
