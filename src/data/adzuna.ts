import { JobDraft, ProfileTarget } from '../types';

type RefreshTarget = 'all' | ProfileTarget;

interface AdzunaSearchResponse {
  jobs?: JobDraft[];
  error?: string;
}

interface RefreshResponse extends AdzunaSearchResponse {
  summary?: string;
  generatedAt?: string;
  queryCount?: number;
}

export interface JobIntegrationStatus {
  adzunaConfigured: boolean;
  hasAppId: boolean;
  hasAppKey: boolean;
  checkedAt: string;
}

async function readJsonResponse<T extends { error?: string }>(response: Response, fallbackError: string): Promise<T> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return { error: fallbackError } as T;
  }
  return (await response.json()) as T;
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

  const payload = await readJsonResponse<AdzunaSearchResponse>(
    response,
    'Adzuna search is only available when deployed with the Vercel serverless API.'
  );

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to fetch Adzuna results.');
  }

  return payload.jobs ?? [];
}

export async function refreshJobPack(target: RefreshTarget, location: string, radiusKm: number): Promise<RefreshResponse> {
  const params = new URLSearchParams({
    target,
    location,
    radiusKm: String(radiusKm),
  });
  const response = await fetch(`/api/jobs/refresh?${params.toString()}`);
  const payload = await readJsonResponse<RefreshResponse>(
    response,
    'Refresh pack is only available when deployed with the Vercel serverless API.'
  );

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to run the Vercel refresh pack.');
  }

  return payload;
}

export async function checkJobIntegrations(): Promise<JobIntegrationStatus> {
  const response = await fetch('/api/jobs/status');
  const payload = await readJsonResponse<JobIntegrationStatus & { error?: string }>(
    response,
    'Integration status is only available when deployed with the Vercel serverless API.'
  );

  if (!response.ok) {
    throw new Error(payload.error ?? 'Unable to check job integrations.');
  }

  return payload;
}
