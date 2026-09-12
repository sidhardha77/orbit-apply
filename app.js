const byId = (id) => document.getElementById(id);
const modal = byId('searchModal');
const escapeHTML = (value) => { const div = document.createElement('div'); div.textContent = value || ''; return div.innerHTML; };
const dateLabel = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };

/* ---------- local storage helpers (this is a static prototype, so state lives on-device) ---------- */
const store = {
  get(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable, continue without persistence */ } },
};

/* ---------- 1) NAVIGATION: every data-view button now actually switches a real view ---------- */
function goToView(name) {
  const panel = document.querySelector(`.view[data-view-panel="${name}"]`);
  if (!panel) return;
  document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
  panel.classList.add('active');
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.view === name));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-view]').forEach((button) => {
  button.addEventListener('click', () => goToView(button.dataset.view));
});

byId('searchNow').addEventListener('click', () => modal.showModal());
document.querySelectorAll('.close').forEach((button) => button.addEventListener('click', () => modal.close()));

/* ---------- 2) ORBIT: the globe/orbit scene now turns with the cursor (and with touch-drag on mobile) ---------- */
(function initOrbitControl() {
  const scene = byId('orbitalScene');
  if (!scene) return;
  const MAX_TILT = 22; // degrees
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

  function setTiltFromPoint(clientX, clientY) {
    const box = scene.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const nx = Math.max(-1, Math.min(1, (clientX - cx) / (window.innerWidth / 2)));
    const ny = Math.max(-1, Math.min(1, (clientY - cy) / (window.innerHeight / 2)));
    targetY = nx * MAX_TILT;   // left/right cursor movement -> rotate around Y
    targetX = -ny * MAX_TILT;  // up/down cursor movement -> rotate around X
  }

  function raf() {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    scene.style.transform = `rotateX(${currentX.toFixed(2)}deg) rotateY(${currentY.toFixed(2)}deg)`;
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  window.addEventListener('pointermove', (event) => setTiltFromPoint(event.clientX, event.clientY));
  window.addEventListener('touchmove', (event) => {
    const touch = event.touches[0];
    if (touch) setTiltFromPoint(touch.clientX, touch.clientY);
  }, { passive: true });
  // Also let a direct touch/drag ON the globe itself spin it, for touch-only devices with no mousemove.
  scene.addEventListener('touchstart', (event) => {
    const touch = event.touches[0];
    if (touch) setTiltFromPoint(touch.clientX, touch.clientY);
  }, { passive: true });
})();

document.querySelector('.hero-card').addEventListener('pointermove', (event) => {
  if (matchMedia('(pointer: coarse)').matches) return;
  const card = event.currentTarget, box = card.getBoundingClientRect();
  const x = (event.clientX - box.left) / box.width - .5;
  const y = (event.clientY - box.top) / box.height - .5;
  card.style.transform = `perspective(900px) rotateY(${x * 2}deg) rotateX(${y * -2}deg)`;
});
document.querySelector('.hero-card').addEventListener('pointerleave', (event) => event.currentTarget.style.transform = '');

/* ---------- 3) PROFILE: real, editable, touch-friendly form (was static text before) ---------- */
const LOCATION_LABEL = { bengaluru: 'Bengaluru', remote: 'remote', hybrid: 'hybrid', 'pan-india': 'Pan-India' };
const EXPERIENCE_LABEL = { internship: 'Internship', fresher: 'Fresher', '0-2': '0–2 yrs', '2-5': '2–5 yrs' };

const defaultProfile = {
  name: 'Kovvuru Sidhardha',
  headline: 'AI graduate · NITK',
  location: 'bengaluru',
  experience: 'fresher',
  salary: 7,
  resume: '',
  portfolio: 'https://your-ai-wqku.onrender.com',
  skills: 'Python, YOLO, Random Forest, XGBoost, Llama 3, Whisper, FinBERT, RAG',
};

function loadProfile() { return store.get('orbitApply.profile', defaultProfile); }
function saveProfile(profile) { store.set('orbitApply.profile', profile); }

function initialsOf(name) {
  return (name || '').trim().split(/\s+/).slice(0, 2).map((part) => part[0] || '').join('').toUpperCase() || '·';
}

function renderProfileEverywhere(profile) {
  byId('profileMiniName').textContent = profile.name || 'Your name';
  byId('profileMiniMeta').textContent = [profile.headline, LOCATION_LABEL[profile.location]].filter(Boolean).join(' · ');
  byId('profileAvatar').textContent = initialsOf(profile.name);
  byId('heroLocation').textContent = LOCATION_LABEL[profile.location] || 'your area';

  const checklist = [
    { ok: !!profile.resume, label: profile.resume ? 'Resume attached' : 'Add a resume link' },
    { ok: !!profile.portfolio, label: profile.portfolio ? 'Portfolio linked' : 'Add a portfolio link' },
    { ok: !!profile.skills, label: profile.skills ? 'Skills listed' : 'List your skills' },
  ];
  byId('profileChecklist').innerHTML = checklist.map((item) => `<p class="${item.ok ? '' : 'warn'}"><span>${item.ok ? '✓' : '!'}</span> ${escapeHTML(item.label)}</p>`).join('');
  const pct = Math.round((checklist.filter((c) => c.ok).length / checklist.length) * 100);
  byId('profileCompletePct').textContent = pct;
  byId('profileProgressBar').style.width = `${pct}%`;
}

function fillProfileForm(profile) {
  byId('fieldName').value = profile.name || '';
  byId('fieldHeadline').value = profile.headline || '';
  byId('fieldLocation').value = profile.location || 'bengaluru';
  byId('fieldExperience').value = profile.experience || 'fresher';
  byId('fieldSalary').value = profile.salary ?? '';
  byId('fieldResume').value = profile.resume || '';
  byId('fieldPortfolio').value = profile.portfolio || '';
  byId('fieldSkills').value = profile.skills || '';
}

let profile = loadProfile();
fillProfileForm(profile);
renderProfileEverywhere(profile);

byId('profileForm').addEventListener('submit', (event) => {
  event.preventDefault();
  profile = {
    name: byId('fieldName').value.trim() || defaultProfile.name,
    headline: byId('fieldHeadline').value.trim(),
    location: byId('fieldLocation').value,
    experience: byId('fieldExperience').value,
    salary: Number(byId('fieldSalary').value) || 0,
    resume: byId('fieldResume').value.trim(),
    portfolio: byId('fieldPortfolio').value.trim(),
    skills: byId('fieldSkills').value.trim(),
  };
  saveProfile(profile);
  renderProfileEverywhere(profile);
  // keep queue + search filters in step with the saved profile
  if (byId('filterLocation')) byId('filterLocation').value = profile.location;
  if (byId('filterExperience')) byId('filterExperience').value = profile.experience;
  if (byId('searchLocation') && ['remote', 'bengaluru', 'hybrid'].includes(profile.location)) byId('searchLocation').value = profile.location;
  if (byId('searchExperience')) byId('searchExperience').value = profile.experience === '2-5' ? 'any' : profile.experience;
  renderQueue();
  const note = byId('profileSaveNote');
  note.textContent = 'Saved.';
  setTimeout(() => { note.textContent = ''; }, 2500);
});

/* Connection toggles — real tappable switches (previously nothing here was interactive) */
const connectionState = store.get('orbitApply.connections', {});
document.querySelectorAll('.connection-row .toggle').forEach((toggle) => {
  const row = toggle.closest('.connection-row');
  const source = row.dataset.source;
  const on = !!connectionState[source];
  toggle.classList.toggle('on', on);
  toggle.setAttribute('aria-checked', String(on));
  toggle.addEventListener('click', () => {
    const nowOn = !toggle.classList.contains('on');
    toggle.classList.toggle('on', nowOn);
    toggle.setAttribute('aria-checked', String(nowOn));
    connectionState[source] = nowOn;
    store.set('orbitApply.connections', connectionState);
  });
});

/* ---------- 4) REVIEW QUEUE: selectable, filterable, touch-sized cards (was just a badge number before) ---------- */
const seedQueue = [
  { id: 'q1', title: 'AI Engineer — Computer Vision', company: 'Veyra Robotics', location: 'bengaluru', experience: 'fresher', fit: 8.6, tags: ['YOLO', 'Computer Vision', 'PyTorch'] },
  { id: 'q2', title: 'Data Analyst Intern', company: 'Optimspace', location: 'hybrid', experience: 'internship', fit: 8.1, tags: ['SQL', 'Power BI', 'Excel'] },
  { id: 'q3', title: 'Machine Learning Engineer', company: 'Northwind Analytics', location: 'remote', experience: 'fresher', fit: 7.9, tags: ['Random Forest', 'XGBoost'] },
  { id: 'q4', title: 'LLM/RAG Applications Engineer', company: 'Cursive AI', location: 'remote', experience: '0-2', fit: 8.8, tags: ['Llama 3', 'RAG', 'Whisper'] },
  { id: 'q5', title: 'Cloud & Backend Intern', company: 'Meridian Systems', location: 'bengaluru', experience: 'internship', fit: 7.2, tags: ['Multi-cloud', 'Security'] },
  { id: 'q6', title: 'Data Science Trainee', company: 'FinBERT Labs', location: 'hybrid', experience: 'fresher', fit: 8.3, tags: ['FinBERT', 'NLP'] },
  { id: 'q7', title: 'Software Engineer, AI Platform', company: 'Ridgeline', location: 'pan-india', experience: '0-2', fit: 7.6, tags: ['Python', 'APIs'] },
  { id: 'q8', title: 'Computer Vision Intern', company: 'Sable Vision', location: 'bengaluru', experience: 'internship', fit: 8.0, tags: ['YOLO', 'OpenCV'] },
  { id: 'q9', title: 'Applied ML Engineer', company: 'Loom Analytics', location: 'remote', experience: '0-2', fit: 7.5, tags: ['XGBoost', 'MLOps'] },
];

function loadQueue() { return store.get('orbitApply.queue', seedQueue.map((job) => ({ ...job, selected: false, status: 'pending' }))); }
function saveQueue(queue) { store.set('orbitApply.queue', queue); }
let queue = loadQueue();

function updateQueueBadgesAndMetrics() {
  const pendingCount = queue.filter((job) => job.status === 'pending').length;
  const appliedCount = queue.filter((job) => job.status === 'applied').length;
  byId('queueCount').textContent = pendingCount;
  byId('heroQueueCount').textContent = pendingCount;
  byId('metricFresh').textContent = pendingCount;
  byId('metricApplied').textContent = appliedCount;
}

function renderQueue() {
  const location = byId('filterLocation') ? byId('filterLocation').value : 'any';
  const experience = byId('filterExperience') ? byId('filterExperience').value : 'any';
  const keyword = byId('filterKeyword') ? byId('filterKeyword').value.trim().toLowerCase() : '';

  const visible = queue.filter((job) => {
    if (location !== 'any' && job.location !== location) return false;
    if (experience !== 'any' && job.experience !== experience) return false;
    if (keyword) {
      const haystack = `${job.title} ${job.company} ${job.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  byId('queueList').innerHTML = visible.length ? visible.map((job) => `
    <label class="queue-card ${job.status === 'applied' ? 'is-applied' : ''}" data-id="${job.id}">
      <input type="checkbox" ${job.selected ? 'checked' : ''} ${job.status === 'applied' ? 'disabled' : ''} aria-label="Select ${escapeHTML(job.title)}" />
      <div class="queue-card-body">
        <div class="queue-card-top"><strong>${escapeHTML(job.title)}</strong><span class="fit">${job.fit.toFixed(1)} fit</span></div>
        <p>${escapeHTML(job.company)} · ${escapeHTML(LOCATION_LABEL[job.location] || job.location)} · ${escapeHTML(EXPERIENCE_LABEL[job.experience] || job.experience)}</p>
        <div class="tag-row">${job.tags.map((tag) => `<span>${escapeHTML(tag)}</span>`).join('')}</div>
      </div>
      <span class="queue-status">${job.status === 'applied' ? 'Applied ✓' : 'Pending'}</span>
    </label>
  `).join('') : '<p class="loading">No roles match those filters yet.</p>';

  document.querySelectorAll('.queue-card input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const id = checkbox.closest('.queue-card').dataset.id;
      const job = queue.find((entry) => entry.id === id);
      if (job) job.selected = checkbox.checked;
      saveQueue(queue);
      updateSelectedCount();
    });
  });
  updateSelectedCount();
}

function updateSelectedCount() {
  const count = queue.filter((job) => job.selected && job.status !== 'applied').length;
  byId('queueSelectedCount').textContent = `${count} selected`;
}

['filterLocation', 'filterExperience'].forEach((id) => byId(id).addEventListener('change', renderQueue));
byId('filterKeyword').addEventListener('input', renderQueue);

byId('selectAllQueue').addEventListener('click', () => {
  const anyUnselected = queue.some((job) => job.status !== 'applied' && !job.selected);
  queue.forEach((job) => { if (job.status !== 'applied') job.selected = anyUnselected; });
  saveQueue(queue);
  renderQueue();
});

byId('applySelected').addEventListener('click', () => {
  const chosen = queue.filter((job) => job.selected && job.status !== 'applied');
  if (!chosen.length) return;
  chosen.forEach((job) => { job.status = 'applied'; job.selected = false; });
  saveQueue(queue);
  renderQueue();
  updateQueueBadgesAndMetrics();
});

// apply the saved profile's location/experience as the initial queue filter
byId('filterLocation').value = profile.location in LOCATION_LABEL ? profile.location : 'any';
byId('filterExperience').value = profile.experience in EXPERIENCE_LABEL ? profile.experience : 'any';
renderQueue();
updateQueueBadgesAndMetrics();

/* ---------- 5) APPLICATION ANSWERS: a real, editable auto-answer bank (was just a label before) ---------- */
const defaultAnswers = [
  { id: 'why_role', question: 'Why are you interested in this role?', answer: 'I\u2019m an AI graduate from NITK Surathkal who has worked hands-on with computer vision (YOLO), predictive modelling (Random Forest, XGBoost) and LLM/RAG applications (Llama 3, Whisper, FinBERT). This role lines up with that background and lets me keep building production-grade ML systems.' },
  { id: 'why_you', question: 'Why should we hire you?', answer: 'I combine applied ML project work with a research internship building a secure multi-cloud storage system, so I can move between model-building and the engineering needed to ship it reliably.' },
  { id: 'notice_period', question: 'What is your notice period / availability to join?', answer: 'I can join immediately.' },
  { id: 'expected_salary', question: 'What is your expected salary / CTC?', answer: 'Open to roles starting from 7 LPA, flexible based on the role and growth path.' },
  { id: 'relocation', question: 'Are you open to relocation or remote work?', answer: 'Yes \u2014 open to Bengaluru, hybrid, remote or Pan-India roles.' },
  { id: 'work_auth', question: 'Do you have authorisation to work in India?', answer: 'Yes, I am an Indian citizen and can work anywhere in India without sponsorship.' },
  { id: 'project_highlight', question: 'Describe a project relevant to this role.', answer: 'Built a secure multi-cloud storage system during a research internship, and separately shipped an AI-powered PDF chatbot (RAG over Llama 3 with Whisper for audio input) deployed as a live web app.' },
];

function loadAnswers() { return store.get('orbitApply.answers', defaultAnswers); }
function saveAnswersToStore(answers) { store.set('orbitApply.answers', answers); }
let answers = loadAnswers();

function renderAnswers() {
  byId('answersList').innerHTML = answers.map((item) => `
    <article class="answer-card" data-id="${item.id}">
      <p class="answer-question">${escapeHTML(item.question)}</p>
      <textarea rows="3" maxlength="600" placeholder="Write the answer to reuse for this question…">${escapeHTML(item.answer)}</textarea>
    </article>
  `).join('');
  document.querySelectorAll('.answer-card textarea').forEach((textarea) => {
    textarea.addEventListener('input', () => {
      const id = textarea.closest('.answer-card').dataset.id;
      const entry = answers.find((a) => a.id === id);
      if (entry) entry.answer = textarea.value;
      updateAnswersStatus();
    });
  });
  updateAnswersStatus();
}

function updateAnswersStatus() {
  const ready = answers.filter((a) => a.answer.trim().length > 0).length;
  byId('answersReadyStatus').innerHTML = `<i></i> ${ready} of ${answers.length} ready`;
}

byId('saveAnswers').addEventListener('click', () => {
  saveAnswersToStore(answers);
  const note = byId('answersSavedNote');
  note.textContent = `Saved · ready to auto-fill ${answers.filter((a) => a.answer.trim()).length} questions`;
  setTimeout(() => { note.textContent = 'Saved'; }, 2500);
});

renderAnswers();

/* ---------- 6) LIVE SEARCH MODAL: now with location + experience filters on top of Remotive results ---------- */
function jobMatchesFilters(job, location, experience) {
  const text = `${job.location} ${job.title} ${job.tags.join(' ')}`.toLowerCase();
  if (location !== 'any') {
    if (location === 'remote' && !text.includes('remote')) return false;
    if (location === 'bengaluru' && !(text.includes('india') || text.includes('bengaluru') || text.includes('bangalore'))) return false;
    if (location === 'hybrid' && !text.includes('hybrid')) return false;
  }
  if (experience !== 'any') {
    if (experience === 'internship' && !text.includes('intern')) return false;
    if (experience === 'fresher' && (text.includes('senior') || text.includes('lead'))) return false;
    if (experience === '0-2' && (text.includes('senior') || text.includes('principal') || text.includes('staff'))) return false;
  }
  return true;
}

byId('jobSearchForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const output = byId('jobResults');
  output.innerHTML = '<p class="loading">Searching the public feed…</p>';
  const location = byId('searchLocation').value;
  const experience = byId('searchExperience').value;
  try {
    const response = await fetch(`/api/jobs?q=${encodeURIComponent(byId('query').value.trim())}&limit=20`);
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    const jobs = (payload.jobs || []).filter((job) => jobMatchesFilters(job, location, experience)).slice(0, 9);
    output.innerHTML = jobs.length ? jobs.map((job) => `<article class="job-result"><div><p>${escapeHTML(job.company)}</p><h3>${escapeHTML(job.title)}</h3><small>${escapeHTML(job.location)} · ${dateLabel(job.publication_date)} · ${escapeHTML(job.salary)}</small></div><a href="${encodeURI(job.url)}" target="_blank" rel="noreferrer">Open posting ↗</a></article>`).join('') : '<p class="loading">No results for that location/experience combination. Try widening the filters.</p>';
  } catch (error) { output.innerHTML = `<p class="loading error">${escapeHTML(error.message || 'Unable to reach the public feed.')}</p>`; }
});
