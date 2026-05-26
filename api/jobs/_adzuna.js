export const DEFAULT_REFRESH_QUERIES = [
  { profileTarget: 'josh', query: 'ICT support' },
  { profileTarget: 'josh', query: 'IT support' },
  { profileTarget: 'josh', query: 'help desk' },
  { profileTarget: 'josh', query: 'service desk' },
  { profileTarget: 'josh', query: 'administration officer' },
  { profileTarget: 'josh', query: 'customer service officer' },
  { profileTarget: 'josh', query: 'library assistant' },
  { profileTarget: 'josh', query: 'trainer' },
  { profileTarget: 'josh', query: 'data entry' },
  { profileTarget: 'kristy', query: 'registered nurse' },
  { profileTarget: 'kristy', query: 'practice nurse' },
  { profileTarget: 'kristy', query: 'clinic nurse' },
  { profileTarget: 'kristy', query: 'immunisation nurse' },
  { profileTarget: 'kristy', query: 'community nurse' },
  { profileTarget: 'kristy', query: 'child family health nurse' },
];

const ADZUNA_URL = 'https://api.adzuna.com/v1/api/jobs/au/search/1';

export function stripHtml(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function safeDecode(value = '') {
  return stripHtml(value)
    .replace(/\u00e2\u0080[\u0093\u0094]/g, '-')
    .replace(/\u00e2\u0080\u0099/g, "'")
    .replace(/\u00e2\u0080[\u009c\u009d]/g, '"')
    .replace(/\u00e2\u0080\u00a2/g, '-')
    .replace(/\u00e2\u0080\u00a6/g, '...');
}

export function normalizeJob(result, profileTarget, sourceDetail) {
  const salaryMin = Number(result.salary_min || 0);
  const salaryMax = Number(result.salary_max || 0);
  const salaryText =
    salaryMin && salaryMax
      ? `$${Math.round(salaryMin).toLocaleString()} - $${Math.round(salaryMax).toLocaleString()}`
      : salaryMin
        ? `$${Math.round(salaryMin).toLocaleString()}+`
        : '';
  const location = result.location?.display_name || 'Dubbo NSW';
  const company = result.company?.display_name || 'Unknown employer';
  const workBits = [result.contract_time, result.contract_type, result.category?.label].filter(Boolean);

  return {
    profileTarget,
    source: 'Adzuna API',
    sourceDetail,
    title: result.title || 'Adzuna job lead',
    employer: company,
    location,
    workType: workBits.join(' / '),
    hours: '',
    daysRequired: '',
    shiftPattern: '',
    payRate: salaryText,
    salaryText,
    url: result.redirect_url || result.adref || '',
    postedDate: result.created ? String(result.created).slice(0, 10) : '',
    closingDate: '',
    description: safeDecode(result.description || ''),
    requirements: safeDecode(result.description || ''),
    importedText: safeDecode([result.title, company, location, result.description].filter(Boolean).join('\n')),
  };
}

export function getAdzunaCredentials() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    const error = new Error('Adzuna is not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY as Vercel environment variables.');
    error.code = 'ADZUNA_NOT_CONFIGURED';
    throw error;
  }
  return { appId, appKey };
}

export async function searchAdzuna({ query, location, profileTarget, radiusKm, resultsPerPage = 20 }) {
  const { appId, appKey } = getAdzunaCredentials();
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    where: location,
    distance: String(radiusKm),
    results_per_page: String(resultsPerPage),
    sort_by: 'date',
    'content-type': 'application/json',
  });

  const adzunaResponse = await fetch(`${ADZUNA_URL}?${params.toString()}`);
  const contentType = adzunaResponse.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await adzunaResponse.json() : {};

  if (!adzunaResponse.ok) {
    const error = new Error(payload?.error || `Adzuna request failed for "${query}".`);
    error.statusCode = adzunaResponse.status;
    error.query = query;
    throw error;
  }

  const sourceDetail = `${query} near ${location}, ${radiusKm}km`;
  return Array.isArray(payload.results)
    ? payload.results.map((result) => normalizeJob(result, profileTarget, sourceDetail))
    : [];
}
