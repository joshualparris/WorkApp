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

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function summarizeError(error) {
  if (!error) return 'Unknown error';
  const status = error.statusCode ? `HTTP ${error.statusCode}: ` : '';
  return `${status}${error.message || 'Adzuna request failed'}`;
}

async function runQuery(item, location, radiusKm) {
  try {
    const jobs = await searchAdzuna({
      query: item.query,
      location,
      profileTarget: item.profileTarget,
      radiusKm,
      resultsPerPage: 10,
    });
    return {
      query: item.query,
      profileTarget: item.profileTarget,
      status: 'ok',
      count: jobs.length,
      jobs,
    };
  } catch (firstError) {
    await wait(1200);
    try {
      const jobs = await searchAdzuna({
        query: item.query,
        location,
        profileTarget: item.profileTarget,
        radiusKm,
        resultsPerPage: 10,
      });
      return {
        query: item.query,
        profileTarget: item.profileTarget,
        status: 'ok-after-retry',
        count: jobs.length,
        jobs,
      };
    } catch (secondError) {
      return {
        query: item.query,
        profileTarget: item.profileTarget,
        status: 'failed',
        count: 0,
        error: summarizeError(secondError || firstError),
        jobs: [],
      };
    }
  }
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

    const resultsByQuery = [];
    for (const item of queries) {
      resultsByQuery.push(await runQuery(item, location, radiusKm));
      await wait(350);
    }

    const jobs = dedupeJobs(resultsByQuery.flatMap((item) => item.jobs));
    const failures = resultsByQuery.filter((item) => item.status === 'failed').length;
    const zeroes = resultsByQuery.filter((item) => item.status !== 'failed' && item.count === 0).length;
    const detailParts = [];
    if (failures) detailParts.push(`${failures} failed`);
    if (zeroes) detailParts.push(`${zeroes} empty`);

    res.statusCode = 200;
    res.end(
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        queryCount: queries.length,
        failureCount: failures,
        emptyQueryCount: zeroes,
        resultsByQuery: resultsByQuery.map(({ jobs: _jobs, ...item }) => item),
        jobs,
        summary: `${jobs.length} unique leads from ${queries.length} saved searches${detailParts.length ? ` (${detailParts.join(', ')})` : ''}.`,
      })
    );
  } catch (error) {
    res.statusCode = error.code === 'ADZUNA_NOT_CONFIGURED' ? 501 : error.statusCode || 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected refresh-pack error.' }));
  }
}
