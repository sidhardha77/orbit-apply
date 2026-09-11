const REMOTIVE_ENDPOINT = 'https://remotive.com/api/remote-jobs';

function clean(value, max = 120) {
  return String(value || '').replace(/[<>]/g, '').trim().slice(0, max);
}

function score(job, query) {
  const haystack = `${job.title} ${job.description} ${(job.tags || []).join(' ')}`.toLowerCase();
  return query.split(/\s+/).filter(Boolean).reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
}

export default async function handler(request, response) {
  const query = clean(request.query.q || 'machine learning ai data', 80).toLowerCase();
  const limit = Math.min(Math.max(Number(request.query.limit) || 9, 1), 20);

  try {
    const upstream = await fetch(`${REMOTIVE_ENDPOINT}?search=${encodeURIComponent(query)}&limit=100`, {
      headers: { accept: 'application/json' },
    });
    if (!upstream.ok) throw new Error(`Job feed returned ${upstream.status}`);
    const payload = await upstream.json();
    const jobs = (payload.jobs || [])
      .map((job) => ({
        id: job.id,
        title: clean(job.title),
        company: clean(job.company_name),
        location: clean(job.candidate_required_location || 'Remote'),
        publication_date: job.publication_date,
        url: job.url,
        salary: clean(job.salary || 'Not disclosed'),
        category: clean(job.category || 'Software Development'),
        tags: (job.tags || []).slice(0, 5).map((tag) => clean(tag, 30)),
        source: 'Remotive',
        source_url: 'https://remotive.com/remote-jobs/api',
        relevance: score(job, query),
      }))
      .sort((a, b) => b.relevance - a.relevance || new Date(b.publication_date) - new Date(a.publication_date))
      .slice(0, limit);

    // Remotive requests attribution and low refresh frequency. Cache at the edge for one hour.
    response.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    response.status(200).json({ jobs, source: 'Remotive', attribution: 'Jobs supplied by Remotive. Open the original posting to apply.' });
  } catch (error) {
    response.status(502).json({ error: 'The public job feed is temporarily unavailable. Try again later.' });
  }
}
