import { JobDraft, ProfileTarget } from '../types';

interface AdzunaResult {
  title: string;
  company: { display_name: string } | null;
  location: { display_name: string };
  description: string;
  redirect_url: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_is_predicted: boolean;
  contract_time: string | null;
  contract_type: string | null;
  created: string;
}

interface AdzunaResponse {
  results: AdzunaResult[];
}

const compact = (value: string) => value.trim().replace(/\s+/g, ' ');

const formatSalary = (min: number | null, max: number | null, predicted: boolean): string => {
  if (min && max) {
    return `$${min.toLocaleString()} - $${max.toLocaleString()}${predicted ? ' (predicted)' : ''}`;
  }
  if (min) return `$${min.toLocaleString()}${predicted ? ' (predicted)' : ''}`;
  if (max) return `$${max.toLocaleString()}${predicted ? ' (predicted)' : ''}`;
  return '';
};

const extractLocation = (location: AdzunaResult['location']): string => compact(location?.display_name || 'Dubbo NSW');

const mapAdzunaResult = (item: AdzunaResult, profileTarget: ProfileTarget = 'josh'): JobDraft => {
  const title = compact(item.title || 'Imported Adzuna job');
  const employer = compact(item.company?.display_name || 'Unknown employer');
  const location = extractLocation(item.location);
  const salaryText = formatSalary(item.salary_min, item.salary_max, item.salary_is_predicted);
  const workType = compact(item.contract_time || '');
  const daysRequired = compact(item.contract_type || '');

  return {
    profileTarget,
    source: 'Adzuna API',
    sourceDetail: 'Adzuna search',
    title,
    employer,
    location,
    workType,
    hours: '',
    daysRequired,
    shiftPattern: '',
    payRate: salaryText,
    salaryText,
    url: item.redirect_url,
    postedDate: item.created ? item.created.slice(0, 10) : '',
    closingDate: '',
    description: compact(item.description || ''),
    requirements: '',
    importedText: item.description || '',
  };
};

const buildDirectAdzunaUrl = (query: string, location: string, radiusKm: number, appId: string, appKey: string) => {
  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    where: location,
    results_per_page: '20',
    content_type: 'application/json',
  });

  if (radiusKm > 0) {
    params.set('distance', radiusKm.toString());
  }

  return `https://api.adzuna.com/v1/api/jobs/au/search/1?${params.toString()}`;
};

async function queryAdzunaDirect(query: string, location: string, profileTarget: ProfileTarget, radiusKm: number, appId: string, appKey: string): Promise<JobDraft[]> {
  const response = await fetch(buildDirectAdzunaUrl(query, location, radiusKm, appId, appKey));

  if (!response.ok) {
    throw new Error(`Adzuna API error: ${response.status}`);
  }

  const payload = (await response.json()) as AdzunaResponse;
  return payload.results.map((item) => mapAdzunaResult(item, profileTarget));
}

interface AdzunaSearchResponse {
  jobs?: JobDraft[];
  error?: string;
}

export async function queryAdzunaJobs(query: string, location: string, profileTarget: ProfileTarget, radiusKm: number): Promise<JobDraft[]> {
  const appId = import.meta.env.VITE_ADZUNA_APP_ID;
  const appKey = import.meta.env.VITE_ADZUNA_API_KEY;

  if (appId && appKey) {
    return queryAdzunaDirect(query, location, profileTarget, radiusKm, appId, appKey);
  }

  const response = await fetch('/api/jobs/search-adzuna', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      location,
      profileTarget,
      radiusKm,
    }),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? ((await response.json()) as AdzunaSearchResponse)
    : ({ error: 'Adzuna search is only available when deployed with the serverless API.' } satisfies AdzunaSearchResponse);

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to fetch Adzuna results.');
  }

  return payload.jobs ?? [];
}
