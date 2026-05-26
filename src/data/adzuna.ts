import { JobDraft, ProfileTarget } from '../types';

interface AdzunaSearchResponse {
  jobs?: JobDraft[];
  error?: string;
}

export async function queryAdzunaJobs(query: string, location: string, profileTarget: ProfileTarget, radiusKm: number): Promise<JobDraft[]> {
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
