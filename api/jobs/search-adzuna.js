const ADZUNA_URL = 'https://api.adzuna.com/v1/api/jobs/au/search/1';

function stripHtml(value = '') {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function normalizeJob(result, profileTarget, sourceDetail) {
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
    description: stripHtml(result.description || ''),
    requirements: stripHtml(result.description || ''),
    importedText: stripHtml([result.title, company, location, result.description].filter(Boolean).join('\n')),
  };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Use POST for Adzuna searches.' }));
    return;
  }

  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) {
    res.statusCode = 501;
    res.end(
      JSON.stringify({
        error: 'Adzuna is not configured. Add ADZUNA_APP_ID and ADZUNA_APP_KEY as Vercel environment variables.',
      })
    );
    return;
  }

  try {
    const body = await readBody(req);
    const query = String(body.query || '').trim().slice(0, 120);
    const location = String(body.location || 'Dubbo NSW').trim().slice(0, 80);
    const profileTarget = body.profileTarget === 'kristy' ? 'kristy' : 'josh';
    const radiusKm = Math.max(1, Math.min(50, Number(body.radiusKm || 25)));

    if (!query) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'Search query is required.' }));
      return;
    }

    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: query,
      where: location,
      distance: String(radiusKm),
      results_per_page: '20',
      sort_by: 'date',
      'content-type': 'application/json',
    });

    const adzunaResponse = await fetch(`${ADZUNA_URL}?${params.toString()}`);
    const payload = await adzunaResponse.json();

    if (!adzunaResponse.ok) {
      res.statusCode = adzunaResponse.status;
      res.end(JSON.stringify({ error: payload?.error || 'Adzuna request failed.' }));
      return;
    }

    const sourceDetail = `${query} near ${location}, ${radiusKm}km`;
    const jobs = Array.isArray(payload.results)
      ? payload.results.map((result) => normalizeJob(result, profileTarget, sourceDetail))
      : [];

    res.statusCode = 200;
    res.end(JSON.stringify({ jobs }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected Adzuna error.' }));
  }
}
