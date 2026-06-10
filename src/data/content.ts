import { SearchQuery } from '../types';

export const joshStrengths = [
  'Level 1 ICT / MSP support',
  'Microsoft 365',
  'Google Workspace admin and end-user support',
  'Active Directory password resets',
  'service desk and ticketing',
  'Jira Service Desk and CRM support',
  'school ICT and classroom technology',
  'student services and education administration',
  'scheduling, timetabling, exams, and compliance support',
  'documentation and process improvement',
  'training non-technical users',
  'admin, library, and customer support',
];

export const joshGoodCategories = [
  'ICT support',
  'help desk',
  'service desk',
  'desktop support',
  'school ICT support',
  'student services officer',
  'administration officer',
  'records officer',
  'scheduling/timetabling officer',
  'compliance/admin officer',
  'customer service officer',
  'client services officer',
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
  'paediatric nursing',
  'GP practice nurse',
  'immunisation nurse',
  'child and family health',
  'early parenting / family support',
  'community nursing',
  'school nursing',
  'outpatient clinics',
  'hospital casual pool',
  'acute clinic or short-stay nursing',
  'rehabilitation nursing if hospital/community based',
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

export const joshResumeEvidence = [
  '10 years across education, tertiary, community, customer-care, and administration settings.',
  'Current MSP/Level 1 ICT support experience with phone, email, ticket handling, device setup, and reimaging.',
  'School ICT and library support, including teacher support, classroom technology, cataloguing, and user help.',
  'Strong La Trobe background in student ICT support, student services, CRM, scheduling, exams, and process improvement.',
  'Technical stack includes Microsoft 365, Google Workspace, Active Directory password resets, Windows device onboarding, Oracle CRM, and Jira Service Desk.',
];

export const kristyResumeEvidence = [
  'Registered Nurse with long paediatric children\'s ward experience and recent acute child/adolescent care.',
  'Strong family communication: parent reassurance, medication education, asthma education, and home safety-netting.',
  'Clinical experience with respiratory, neurological, neurovascular observations, dehydration, wound care, IV/NGT rehydration support, and escalation of deterioration.',
  'Experienced with adolescent mental-health presentations, multidisciplinary teamwork, and safe coordinated care.',
  'Also has inpatient rehabilitation, orthopaedic, graduate nurse rotations, and Circle of Security training.',
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
    detail: 'Serverless endpoint and refresh pack with API keys kept off the browser. GitHub Pages keeps using manual and CSV imports.',
  },
  {
    name: 'Scheduled refresh',
    status: 'Vercel cron ready',
    detail: 'Runs the saved-query refresh endpoint at 7:00am and 12:30pm Sydney time during AEST when hosted on Vercel.',
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
  { profileTarget: 'josh', priority: 'High', query: '"desktop support" Dubbo' },
  { profileTarget: 'josh', priority: 'High', query: '"school ICT" Dubbo' },
  { profileTarget: 'josh', priority: 'High', query: '"technology support officer" Dubbo' },
  { profileTarget: 'josh', priority: 'High', query: '"student services" Dubbo part time' },
  { profileTarget: 'josh', priority: 'High', query: '"education administration" Dubbo' },
  { profileTarget: 'josh', priority: 'High', query: '"administration officer" Dubbo part time' },
  { profileTarget: 'josh', priority: 'High', query: '"client services officer" Dubbo' },
  { profileTarget: 'josh', priority: 'High', query: '"customer service officer" Dubbo part time' },
  { profileTarget: 'josh', priority: 'Medium', query: '"records officer" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"scheduling officer" Dubbo' },
  { profileTarget: 'josh', priority: 'Medium', query: '"compliance officer" Dubbo part time' },
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
  { profileTarget: 'kristy', priority: 'High', query: '"paediatric nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"children nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"practice nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"GP nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"immunisation nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"child and family health nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"maternal child health nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"early parenting nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"community nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"school nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"clinic nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"outpatients nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'Medium', query: '"rehabilitation nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'Medium', query: '"hospital nurse" Dubbo casual' },
  { profileTarget: 'kristy', priority: 'High', query: '"NSW Health registered nurse Dubbo casual"' },
  { profileTarget: 'kristy', priority: 'High', query: '"I Work for NSW registered nurse Dubbo"' },
  { profileTarget: 'kristy', priority: 'High', query: '"medical centre nurse" Dubbo' },
  { profileTarget: 'kristy', priority: 'High', query: '"primary health nurse" Dubbo' },
];
