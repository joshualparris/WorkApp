import { searchAdzuna } from './_adzuna.js';

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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Use POST for Adzuna searches.' }));
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

    const jobs = await searchAdzuna({ query, location, profileTarget, radiusKm });
    res.statusCode = 200;
    res.end(JSON.stringify({ jobs }));
  } catch (error) {
    res.statusCode = error.code === 'ADZUNA_NOT_CONFIGURED' ? 501 : error.statusCode || 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected Adzuna error.' }));
  }
}
