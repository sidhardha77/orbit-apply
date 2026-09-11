const byId = (id) => document.getElementById(id);
const modal = byId('searchModal');

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((item) => item.classList.remove('active'));
    const nav = document.querySelector(`.nav-item[data-view="${button.dataset.view}"]`);
    if (nav) nav.classList.add('active');
    const labels = { queue: 'Review queue will contain verified roles only.', answers: 'Application answers are ready to manage.', settings: 'Connections will be available after you authorize a provider.', dashboard: 'Mission control' };
    if (button.dataset.view !== 'dashboard') alert(labels[button.dataset.view]);
  });
});

byId('searchNow').addEventListener('click', () => modal.showModal());
document.querySelectorAll('.close').forEach((button) => button.addEventListener('click', () => modal.close()));

const escapeHTML = (value) => { const div = document.createElement('div'); div.textContent = value || ''; return div.innerHTML; };
const dateLabel = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

byId('jobSearchForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const output = byId('jobResults');
  output.innerHTML = '<p class="loading">Searching the public feed…</p>';
  try {
    const response = await fetch(`/api/jobs?q=${encodeURIComponent(byId('query').value.trim())}&limit=9`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    output.innerHTML = payload.jobs.length ? payload.jobs.map((job) => `<article class="job-result"><div><p>${escapeHTML(job.company)}</p><h3>${escapeHTML(job.title)}</h3><small>${escapeHTML(job.location)} · ${dateLabel(job.publication_date)} · ${escapeHTML(job.salary)}</small></div><a href="${encodeURI(job.url)}" target="_blank" rel="noreferrer">Open posting ↗</a></article>`).join('') : '<p class="loading">No suitable results. Try broader skills.</p>';
  } catch (error) { output.innerHTML = `<p class="loading error">${escapeHTML(error.message || 'Unable to reach the public feed.')}</p>`; }
});

document.querySelector('.hero-card').addEventListener('pointermove', (event) => {
  if (matchMedia('(pointer: coarse)').matches) return;
  const card = event.currentTarget, box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width - .5;
  const y = (event.clientY - box.top) / box.height - .5;
  card.style.transform = `perspective(900px) rotateY(${x * 2}deg) rotateX(${y * -2}deg)`;
});
document.querySelector('.hero-card').addEventListener('pointerleave', (event) => event.currentTarget.style.transform = '');
