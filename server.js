import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 10000);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon' };

const clean = (value, max = 80) => String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
const score = (job, query) => {
  const text = `${job.title} ${job.description} ${(job.tags || []).join(' ')}`.toLowerCase();
  return query.split(/\s+/).filter(Boolean).reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0);
};
const sendJSON = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': status === 200 ? 'public, max-age=3600, s-maxage=3600' : 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(body));
};

async function getJobs(url, res) {
  const query = clean(url.searchParams.get('q') || 'machine learning AI data').toLowerCase();
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 9, 1), 20);
  try {
    const upstream = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=100`, { headers: { accept: 'application/json' } });
    if (!upstream.ok) throw new Error('upstream unavailable');
    const payload = await upstream.json();
    const jobs = (payload.jobs || []).map((job) => ({
      id: job.id, title: clean(job.title, 140), company: clean(job.company_name, 100),
      location: clean(job.candidate_required_location || 'Remote', 100), publication_date: job.publication_date,
      url: job.url, salary: clean(job.salary || 'Not disclosed', 100), tags: (job.tags || []).slice(0, 5).map((tag) => clean(tag, 30)),
      source: 'Remotive', relevance: score(job, query),
    })).sort((a, b) => b.relevance - a.relevance || new Date(b.publication_date) - new Date(a.publication_date)).slice(0, limit);
    sendJSON(res, 200, { jobs, source: 'Remotive', attribution: 'Jobs supplied by Remotive. Open the original posting to apply.' });
  } catch { sendJSON(res, 502, { error: 'The public job feed is temporarily unavailable. Try again later.' }); }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') return sendJSON(res, 200, { ok: true });
  if (url.pathname === '/api/jobs') return getJobs(url, res);
  const requested = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const safePath = normalize(join(root, requested));
  if (!safePath.startsWith(root) || requested.startsWith('api/')) return sendJSON(res, 404, { error: 'Not found' });
  try {
    const file = await readFile(safePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(safePath)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin' });
    res.end(file);
  } catch { sendJSON(res, 404, { error: 'Not found' }); }
}).listen(port, '0.0.0.0', () => console.log(`Orbit Apply listening on ${port}`));
