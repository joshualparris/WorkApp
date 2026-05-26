import { DEFAULT_REFRESH_QUERIES, searchAdzuna } from './_adzuna.js';

function dedupeJobs(jobs) {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = job.url || `${job.profileTarget}|${job.title}|${job.employer}|${job.location}|${job.postedDate}`;
    const normalised = key.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (seen.has(normalised)) return false;
    seen.add(normalised);
    return true;
  });
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Use GET or POST for refresh packs.' }));
    return;
  }

  try {
    const target = req.query?.target === 'josh' || req.query?.target === 'kristy' ? req.query.target : 'all';
    const location = String(req.query?.location || 'Dubbo NSW').slice(0, 80);
    const radiusKm = Math.max(1, Math.min(50, Number(req.query?.radiusKm || 25)));
    const queries = DEFAULT_REFRESH_QUERIES.filter((item) => target === 'all' || item.profileTarget === target);

    const settled = await Promise.allSettled(
      queries.map((item) =>
        searchAdzuna({
          query: item.query,
          location,
          profileTarget: item.profileTarget,
          radiusKm,
          resultsPerPage: 6,
        })
      )
    );

    const jobs = dedupeJobs(settled.flatMap((item) => (item.status === 'fulfilled' ? item.value : [])));
    const failures = settled.filter((item) => item.status === 'rejected').length;

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        queryCount: queries.length,
        jobs,
        summary: `${jobs.length} unique leads from ${queries.length} saved searches${failures ? ` (${failures} failed)` : ''}.`,
      })
    );
  } catch (error) {
    res.statusCode = error.code === 'ADZUNA_NOT_CONFIGURED' ? 501 : error.statusCode || 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected refresh-pack error.' }));
  }
}
