export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Use GET for integration status.' }));
    return;
  }

  res.statusCode = 200;
  res.end(
    JSON.stringify({
      adzunaConfigured: Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),
      hasAppId: Boolean(process.env.ADZUNA_APP_ID),
      hasAppKey: Boolean(process.env.ADZUNA_APP_KEY),
      checkedAt: new Date().toISOString(),
    })
  );
}
