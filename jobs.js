const clean = (value, max = 120) => String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
const score = (job, query) => {
  const text = `${job.title} ${job.description || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  return query.split(/\s+/).filter(Boolean).reduce((total, word) => total + (text.includes(word) ? 1 : 0), 0);
};

/* ---------- Same sources and India-scoping logic as server.js — keep both in sync. ---------- */

async function fetchRemotive(query, signal) {
  const upstream = await fetch(`https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=100`, { headers: { accept: 'application/json' }, signal });
  if (!upstream.ok) throw new Error('remotive unavailable');
  const payload = await upstream.json();
  return (payload.jobs || []).map((job) => ({
    id: `remotive-${job.id}`, title: clean(job.title, 140), company: clean(job.company_name, 100),
    location: clean(job.candidate_required_location || 'Remote', 100), publication_date: job.publication_date || '',
    url: job.url, salary: clean(job.salary || 'Not disclosed', 100),
    tags: (job.tags || []).slice(0, 5).map((t) => clean(t, 30)), source: 'Remotive', description: job.description || '',
  }));
}

async function fetchRemoteOK(query, signal) {
  const upstream = await fetch('https://remoteok.com/api', { headers: { accept: 'application/json', 'User-Agent': 'orbit-apply (job dashboard; contact via github.com/sidhardha77/orbit-apply)' }, signal });
  if (!upstream.ok) throw new Error('remoteok unavailable');
  const payload = await upstream.json();
  const rows = Array.isArray(payload) ? payload.slice(1) : [];
  return rows.map((job) => ({
    id: `remoteok-${job.id || job.slug}`, title: clean(job.position, 140), company: clean(job.company, 100),
    location: clean(job.location || 'Remote', 100),
    publication_date: job.date || (job.epoch ? new Date(job.epoch * 1000).toISOString() : ''),
    url: job.url || job.apply_url || (job.id ? `https://remoteok.com/remote-jobs/${job.id}` : '#'),
    salary: job.salary_min && job.salary_max ? `$${job.salary_min}–$${job.salary_max}` : 'Not disclosed',
    tags: (job.tags || []).slice(0, 5).map((t) => clean(t, 30)), source: 'RemoteOK', description: job.description || '',
  }));
}

async function fetchJobicy(query, signal) {
  const tag = encodeURIComponent((query.split(/\s+/)[0] || '').trim());
  const upstream = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50${tag ? `&tag=${tag}` : ''}`, { headers: { accept: 'application/json' }, signal });
  if (!upstream.ok) throw new Error('jobicy unavailable');
  const payload = await upstream.json();
  return (payload.jobs || []).map((job) => ({
    id: `jobicy-${job.id}`, title: clean(job.jobTitle, 140), company: clean(job.companyName, 100),
    location: clean(job.jobGeo || 'Remote', 100), publication_date: job.pubDate ? new Date(job.pubDate).toISOString() : '',
    url: job.url, salary: job.annualSalaryMin ? clean(`${job.salaryCurrency || ''} ${job.annualSalaryMin}–${job.annualSalaryMax}`, 60) : 'Not disclosed',
    tags: [job.jobIndustry, job.jobType, job.jobLevel].filter(Boolean).map((t) => clean(t, 30)), source: 'Jobicy', description: job.jobExcerpt || job.jobDescription || '',
  }));
}

async function fetchArbeitnow(query, signal) {
  const upstream = await fetch('https://www.arbeitnow.com/api/job-board-api', { headers: { accept: 'application/json' }, signal });
  if (!upstream.ok) throw new Error('arbeitnow unavailable');
  const payload = await upstream.json();
  return (payload.data || []).map((job) => ({
    id: `arbeitnow-${job.slug}`, title: clean(job.title, 140), company: clean(job.company_name, 100),
    location: clean(job.location || (job.remote ? 'Remote' : 'On-site'), 100),
    publication_date: job.created_at ? new Date(job.created_at * 1000).toISOString() : '',
    url: job.url, salary: 'Not disclosed', tags: (job.tags || []).slice(0, 5).map((t) => clean(t, 30)),
    source: 'Arbeitnow', description: job.description || '',
  }));
}

async function fetchAdzuna(query, signal, days) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  if (!appId || !appKey) return [];
  const maxDaysOld = days ? `&max_days_old=${days}` : '';
  const upstream = await fetch(`https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=30&what=${encodeURIComponent(query)}${maxDaysOld}&content-type=application/json`, { signal });
  if (!upstream.ok) throw new Error('adzuna unavailable');
  const payload = await upstream.json();
  return (payload.results || []).map((job) => ({
    id: `adzuna-${job.id}`, title: clean(job.title, 140), company: clean(job.company?.display_name, 100),
    location: clean(job.location?.display_name || 'India', 100), publication_date: job.created || '',
    url: job.redirect_url, salary: job.salary_min ? `₹${Math.round(job.salary_min).toLocaleString('en-IN')}–₹${Math.round(job.salary_max || job.salary_min).toLocaleString('en-IN')}` : 'Not disclosed',
    tags: job.category?.label ? [clean(job.category.label, 30)] : [], source: 'Adzuna', description: job.description || '',
  }));
}

const SOURCES = [
  { name: 'Adzuna', run: (q, signal, days) => fetchAdzuna(q, signal, days) },
  { name: 'Remotive', run: (q, signal) => fetchRemotive(q, signal) },
  { name: 'RemoteOK', run: (q, signal) => fetchRemoteOK(q, signal) },
  { name: 'Jobicy', run: (q, signal) => fetchJobicy(q, signal) },
  { name: 'Arbeitnow', run: (q, signal) => fetchArbeitnow(q, signal) },
];
const DATE_WINDOW_DAYS = { today: 1, week: 7, month: 30 };
const INDIA_HINTS = ['india', 'bengaluru', 'bangalore', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai', 'noida', 'gurugram', 'gurgaon', 'kolkata', 'ahmedabad'];
const mentionsIndia = (job) => INDIA_HINTS.some((hint) => `${job.location} ${job.title} ${job.tags.join(' ')} ${job.description || ''}`.toLowerCase().includes(hint));

export default async function handler(request, response) {
  const query = clean(request.query.q || 'machine learning ai data', 80).toLowerCase();
  const limit = Math.min(Math.max(Number(request.query.limit) || 12, 1), 30);
  const postedWithin = request.query.postedWithin || 'any';
  const country = request.query.country || 'in';
  const days = DATE_WINDOW_DAYS[postedWithin];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  const settled = await Promise.allSettled(SOURCES.map((s) => s.run(query, controller.signal, days)));
  clearTimeout(timeout);

  const usedSources = [];
  const merged = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled' && result.value.length) { usedSources.push(SOURCES[i].name); merged.push(...result.value); }
  });

  if (!merged.length) {
    response.status(502).json({ error: 'All public job feeds are temporarily unavailable. Try again shortly.' });
    return;
  }

  const seen = new Set();
  const deduped = merged.filter((job) => {
    const key = `${job.title}|${job.company}`.toLowerCase().replace(/[^a-z0-9|]/g, '');
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  const cutoff = days ? Date.now() - days * 86400000 : null;
  const dated = cutoff
    ? deduped.filter((job) => { const t = new Date(job.publication_date).getTime(); return Number.isFinite(t) && t >= cutoff; })
    : deduped;

  const hasAdzuna = usedSources.includes('Adzuna');
  let scoped = dated;
  let indiaFocused = false;
  if (country === 'in') {
    const indiaOnly = dated.filter((job) => job.source === 'Adzuna' || mentionsIndia(job));
    if (indiaOnly.length) { scoped = indiaOnly; indiaFocused = true; }
  }

  const jobs = scoped
    .map((job) => ({ ...job, relevance: score(job, query) }))
    .sort((a, b) => b.relevance - a.relevance || new Date(b.publication_date) - new Date(a.publication_date))
    .slice(0, limit)
    .map(({ description, ...job }) => job);

  const attribution = indiaFocused
    ? `India-scoped listings from ${usedSources.join(', ')}${hasAdzuna ? '' : ' — add a free Adzuna API key for much fuller India coverage'}. Open the original posting to apply.`
    : `Couldn't narrow to India from the free feeds this time, showing the wider remote feed from ${usedSources.join(', ')} instead${hasAdzuna ? '' : ' — add a free Adzuna API key (developer.adzuna.com) for real India-specific listings'}. Open the original posting to apply.`;

  response.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  response.status(200).json({ jobs, sources: usedSources, indiaFocused, attribution });
}
