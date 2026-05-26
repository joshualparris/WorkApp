import { SearchQuery } from '../types';

export const joshStrengths = [
  'Level 1 ICT / MSP support',
  'Microsoft 365',
  'service desk and ticketing',
  'school ICT and classroom technology',
  'documentation and process improvement',
  'training non-technical users',
  'admin, library, and customer support',
];

export const joshGoodCategories = [
  'ICT support',
  'help desk',
  'service desk',
  'school ICT support',
  'administration officer',
  'customer service officer',
  'library/admin',
  'digital literacy trainer',
  'workplace trainer',
  'Microsoft 365 support',
  'AV/classroom tech support',
  'operations/admin support',
];

export const joshAvoid = [
  'night shift',
  '3pm-11pm without approval',
  'Monday/Wednesday required',
  'full random availability',
  'long commute',
  'work that undermines Avance IT',
  'physically or emotionally unsustainable work',
];

export const kristyPreferred = [
  'GP practice nurse',
  'immunisation nurse',
  'child and family health',
  'community nursing',
  'school nursing',
  'outpatient clinics',
  'hospital casual pool',
  'family-friendly rosters',
];

export const kristyAvoid = [
  'aged care',
  'residential aged care',
  'nursing home',
  'elderly care',
  'dementia unit',
  'RACF',
  'heavy night shift',
  'full-time inflexible work',
];

export const sourcePipeline = [
  {
    name: 'Manual paste',
    status: 'Live in MVP',
    detail: 'Paste job ads from SEEK, Jora, Workforce Australia, employer sites, recruiters, or emails.',
  },
  {
    name: 'CSV import',
    status: 'Live in MVP',
    detail: 'Import spreadsheet rows with title, employer, location, pay, roster, URL, and profile target.',
  },
  {
    name: 'Adzuna API',
    status: 'Live on Vercel',
    detail: 'Serverless endpoint with API keys kept off the browser. GitHub Pages keeps using manual and CSV imports.',
  },
  {
    name: 'Gmail Job Leads label',
    status: 'Phase 3',
    detail: 'Import saved-search alert emails labelled Job Leads after explicit connection.',
  },
  {
    name: 'Job-board scraping',
    status: 'Excluded',
    detail: 'No login bypassing, aggressive scraping, or terms-of-service workarounds.',
  },
];

export const searchQueries: SearchQuery[] = [
  { profileTarget: 'josh', priority: 'High', query: '"ICT support" Dubbo part time' },
  { profileTarget: 'josh', priority: 'High', query: '"IT support" Dubbo casual' },
  { profileTarget: 'josh', priority: 'High', query: '"helpdesk" Dubbo' },
  { profileTarget: 'josh', priority: 'High', query: '"service desk" Dubbo' },
  { profileTarget: 'josh', priority: 'High', query: '"school ICT" Dubbo' },
  { profileTarget: 'josh', priority: 'High', query: '"technology support officer" Dubbo' },
  { profileTarget: 'josh', priority: 'High', query: '"administration officer" Dubbo part time' },
  { profileTarget: 'josh', priority: 'High', query: '"customer service officer" Dubbo part time' },
  { profileTarget: 'josh', priority: 'Medium', query: '"library assistant" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"digital literacy trainer" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"trainer assessor" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"TAE" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"workplace trainer" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"Microsoft 365" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"AV technician" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"education support" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"operations assistant" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"data entry" Dubbo part time' },
  { profileTarget: 'josh', priority: 'Medium', query: '"Programmed" Dubbo casual' },
  { profileTarget: 'josh', priority: 'Medium', query: '"Spinifex" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"Haynes" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"registered nurse" Dubbo part time' },
  { profileTarget: 'kristy', priority: 'High', query: '"registered nurse" Dubbo casual' },
  { profileTarget: 'kristy', priority: 'High', query: '"practice nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"GP nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"immunisation nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"child and family health nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"community nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"school nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"clinic nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"outpatients nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"NSW Health registered nurse Dubbo casual"' },
  { profileTarget: 'kristy', priority: 'High', query: '"I Work for NSW registered nurse Dubbo"' },
  { profileTarget: 'kristy', priority: 'High', query: '"medical centre nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"primary health nurse" Dubbo' },
];
