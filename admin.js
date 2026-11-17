if (!sessionStorage.getItem('webrpg_admin_token')) {
  window.location.href = 'login.html';
}

function logoutAdmin() {
  sessionStorage.removeItem('webrpg_admin_token');
  sessionStorage.removeItem('webrpg_admin_user');
  window.location.href = 'login.html';
}

const state = {
  activeView: 'dashboard',
  totalLearners: 0,
  totalAssessments: 0,
  totalQuestions: 0,
  lessons: [],
  demographics: [],
  scoreBreakdown: [],
  currentQuestions: []
};

const paletteColors = ['#4AD8F0', '#C84BF2', '#8B4DF2', '#2696E8'];

function renderTopbarActions(viewName) {
  const container = document.getElementById('topbar-actions');
  if (!container) return;

  if (viewName === 'lessons') {
    container.innerHTML = `
      <button class="cp-notch-btn cyan-btn" onclick="openAddLessonModal()">+ NEW LESSON</button>
    `;
  } else if (viewName === 'quizzes') {
    container.innerHTML = `
      <button class="cp-notch-btn magenta-btn" onclick="openAddQuestionModal()">+ ADD QUESTION</button>
    `;
  } else {
    container.innerHTML = `
      <button class="cp-notch-btn magenta-btn" onclick="exportAnalyticsToExcel()">⬇ EXPORT EXCEL (.XLSX)</button>
      <button class="cp-notch-btn cyan-btn" onclick="initDashboard()">↻ SYNC LIVE DB</button>
    `;
  }
}

function switchView(viewName, btnEl) {
  state.activeView = viewName;
  document.querySelectorAll('.view-window').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.side-link').forEach(b => b.classList.remove('active'));

  document.getElementById(`view-${viewName}`).classList.add('active');
  if (btnEl) btnEl.classList.add('active');

  const titles = {
    dashboard: 'DASHBOARD OVERVIEW',
    analytics: 'LEARNING ANALYTICS',
    lessons: 'LESSON MODULES',
    quizzes: 'QUIZ MATRIX'
  };
  document.getElementById('workspace-title').innerText = titles[viewName] || 'DASHBOARD';
  renderTopbarActions(viewName);
  closeMobileMenu();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleMobileMenu() {
  document.getElementById('sidebar-drawer').classList.toggle('open');
  document.getElementById('sidebar-backdrop').classList.toggle('open');
}

function closeMobileMenu() {
  document.getElementById('sidebar-drawer')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('open');
}

function showNotify(title, message) {
  document.getElementById('notify-title').innerText = title;
  document.getElementById('notify-message').innerText = message;
  document.getElementById('notify-modal').classList.remove('hidden');
}

function closeNotifyModal() {
  document.getElementById('notify-modal').classList.add('hidden');
}

async function initDashboard() {
  renderTopbarActions(state.activeView);

  try {
    const [lessonsRes, analyticsRes] = await Promise.all([
      fetch('/api/admin/lesson-progress'),
      fetch('/api/admin/analytics')
    ]);

    if (lessonsRes.ok) {
      state.lessons = await lessonsRes.json();
    }

    if (analyticsRes.ok) {
      const data = await analyticsRes.json();
      state.totalLearners = data.totalLearners || 0;
      state.totalAssessments = data.totalAssessments || 0;
      state.totalQuestions = data.totalQuestions || 0;

      const totalAgeCount = (data.ageRows || []).reduce((s, r) => s + Number(r.count), 0) || 1;
      state.demographics = (data.ageRows || []).map((r, i) => ({
        group: r.age_group,
        percent: Math.round((Number(r.count) / totalAgeCount) * 100),
        avgScore: r.avg_score,
        color: paletteColors[i % paletteColors.length]
      }));

      state.scoreBreakdown = (data.scoreRows || []).map(r => ({
        label: r.category,
        score: Number(r.avg_score)
      }));
    }
  } catch (e) {
    console.error('Database sync error:', e);
  }

  renderAll();
  await loadAssessmentQuestions();
}

function renderAll() {
  renderSplineChart();
  renderDonutChart();
  renderGradientKPIs();
  renderLessonTimeline();
  renderAnalyticsView();
  renderLessonsView();
}

function renderSplineChart() {
  const lessons = state.lessons;
  if (lessons.length === 0) return;

  const avgSuccess = (lessons.reduce((s, l) => s + Number(l.success_rate || 0), 0) / lessons.length).toFixed(1);
  document.getElementById('hero-avg-success').innerText = `${avgSuccess}%`;
  document.getElementById('hero-total-lessons').innerText = String(lessons.length).padStart(2, '0');

  // Update Bottom 4 Badges Dynamically from Score Breakdown
  const pre = state.scoreBreakdown.find(s => s.label.includes('Pre-Test'))?.score || 0;
  const mis = state.scoreBreakdown.find(s => s.label.includes('Mission'))?.score || 0;
  const post = state.scoreBreakdown.find(s => s.label.includes('Post-Test'))?.score || 0;
  const badgeEls = document.querySelectorAll('.spline-bottom-badges .badge-item strong');
  if (badgeEls.length >= 3) {
    badgeEls[0].innerText = `${pre}%`;
    badgeEls[1].innerText = `${mis}%`;
    badgeEls[2].innerText = `${post}%`;
  }

  const width = 600;
  const height = 200;
  const stepX = lessons.length > 1 ? width / (lessons.length - 1) : width;

  const ptsSuccess = lessons.map((l, i) => ({
    x: Math.round(i * stepX),
    y: Math.round(height - (Math.min(100, Math.max(5, Number(l.success_rate || 0))) / 100) * 165)
  }));

  const ptsQuiz = lessons.map((l, i) => ({
    x: Math.round(i * stepX),
    y: Math.round(height - (Math.min(100, Math.max(5, Number(l.avg_quiz || 0))) / 100) * 165)
  }));

  const buildSmoothPath = (pts) => {
    if (pts.length === 1) return `M 0,${pts[0].y} L ${width},${pts[0].y}`;
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      d += ` C ${midX},${pts[i].y} ${midX},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`;
    }
    return d;
  };

  const successLine = buildSmoothPath(ptsSuccess);
  const successArea = `${successLine} L ${width},${height} L 0,${height} Z`;
  const quizLine = buildSmoothPath(ptsQuiz);
  const quizArea = `${quizLine} L ${width},${height} L 0,${height} Z`;

  document.getElementById('spline-svg').innerHTML = `
    <defs>
      <linearGradient id="cyanAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4AD8F0" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="#4AD8F0" stop-opacity="0.0"/>
      </linearGradient>
      <linearGradient id="magentaAreaGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#C84BF2" stop-opacity="0.45"/>
        <stop offset="100%" stop-color="#C84BF2" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <line x1="0" y1="45" x2="600" y2="45" stroke="rgba(140,238,246,0.1)" stroke-dasharray="4"/>
    <line x1="0" y1="100" x2="600" y2="100" stroke="rgba(140,238,246,0.1)" stroke-dasharray="4"/>
    <line x1="0" y1="155" x2="600" y2="155" stroke="rgba(140,238,246,0.1)" stroke-dasharray="4"/>
    <path d="${quizArea}" fill="url(#magentaAreaGrad)" />
    <path d="${successArea}" fill="url(#cyanAreaGrad)" />
    <path d="${quizLine}" fill="none" stroke="#C84BF2" stroke-width="3" />
    <path d="${successLine}" fill="none" stroke="#4AD8F0" stroke-width="3.5" />
    ${ptsSuccess.map(p => `<circle cx="${p.x}" cy="${p.y}" r="5" fill="#080B1A" stroke="#8CEEF6" stroke-width="3"/>`).join('')}
  `;

  document.getElementById('spline-x-labels').innerHTML = lessons
    .map(l => `<span>L0${l.lesson_id} (${l.success_rate}%)</span>`)
    .join('');
}

function renderDonutChart() {
  const centerStrong = document.querySelector('.donut-center strong');
  if (centerStrong) centerStrong.innerText = String(state.totalLearners).padStart(2, '0');

  // Dynamically calculate SVG stroke-dasharray for the Donut segments
  const circumference = 352;
  let offset = 0;
  const svg = document.querySelector('.donut-svg');
  if (svg && state.demographics.length > 0) {
    const circles = state.demographics.map((d, i) => {
      const segLen = Math.round((d.percent / 100) * circumference);
      const circleHtml = `<circle cx="80" cy="80" r="56" class="donut-seg seg-${(i % 4) + 1}" stroke-dasharray="${segLen} ${circumference}" stroke-dashoffset="-${offset}" />`;
      offset += segLen;
      return circleHtml;
    }).join('');
    svg.innerHTML = `<circle cx="80" cy="80" r="56" class="donut-track" />${circles}`;
  }

  document.getElementById('donut-legend').innerHTML = state.demographics.map(d => `
    <div class="legend-box" style="border-left-color: ${d.color}">
      <strong style="color:${d.color}">${d.percent}%</strong>
      <span>${d.group}</span>
    </div>
  `).join('');
}

function renderGradientKPIs() {
  const topLesson = state.lessons.reduce((best, cur) =>
    Number(cur.success_rate || 0) >= Number(best?.success_rate || 0) ? cur : best
  , state.lessons[0]);

  const totalXp = state.lessons.reduce((s, l) => s + Number(l.xp_reward || 0), 0);

  if (topLesson) {
    document.getElementById('card-l1-rate').innerText = `${topLesson.success_rate}%`;
    const smallEl = document.querySelector('.grad-magenta small');
    if (smallEl) smallEl.innerText = topLesson.location_name || topLesson.title;
  }

  const assessCardStrong = document.querySelector('.grad-purple strong');
  if (assessCardStrong && state.totalAssessments) {
    assessCardStrong.innerText = String(state.totalAssessments);
  }

  if (state.totalQuestions) {
    document.getElementById('card-q-count').innerText = String(state.totalQuestions);
  }

  document.getElementById('card-total-xp').innerText = `${totalXp} XP`;
}

function renderLessonTimeline() {
  document.getElementById('lesson-timeline-list').innerHTML = state.lessons.map(l => `
    <div class="timeline-item">
      <div class="tl-left">
        <div class="tl-circle">0${l.lesson_id}</div>
        <div class="tl-text">
          <h4>${l.title}</h4>
          <span>${l.xp_reward} XP • ${l.success_rate}% Pass</span>
        </div>
      </div>
      <button class="status-pill pill-cyan" onclick="openLessonModal(${l.lesson_id})">EDIT</button>
    </div>
  `).join('');

  const select = document.getElementById('quiz-lesson-select');
  const prev = select.value;
  select.innerHTML = state.lessons.map(l => `<option value="${l.lesson_id}">${l.title}</option>`).join('');
  if (prev && state.lessons.some(l => String(l.lesson_id) === String(prev))) {
    select.value = prev;
  }
}

function renderAnalyticsView() {
  document.getElementById('analytics-age-bars').innerHTML = state.demographics.map(d => `
    <div>
      <div class="bar-row-label">
        <span>${d.group}</span>
        <span style="color:${d.color}">${d.percent}% Users (${d.avgScore}% Avg Score)</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${d.percent}%"></div></div>
    </div>
  `).join('');

  document.getElementById('analytics-score-bars').innerHTML = state.scoreBreakdown.map(s => `
    <div>
      <div class="bar-row-label">
        <span>${s.label}</span>
        <span style="color:#8CEEF6">${s.score}%</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width:${s.score}%"></div></div>
    </div>
  `).join('');

  document.getElementById('analytics-lesson-tbody').innerHTML = state.lessons.map(l => `
    <tr>
      <td><strong>#0${l.lesson_id}</strong></td>
      <td style="color:#8CEEF6">${l.location_name || 'Sector'}</td>
      <td><strong>${l.title}</strong></td>
      <td>${l.avg_quiz}%</td>
      <td style="color:#4AD8F0; font-weight:700;">${l.success_rate}%</td>
      <td style="color:#F288E8; font-weight:700;">${l.xp_reward} XP</td>
    </tr>
  `).join('');
}

function renderLessonsView() {
  document.getElementById('full-lessons-grid').innerHTML = state.lessons.map(l => `
    <div class="cp-panel lesson-full-card">
      <div>
        <span class="micro-tag">${l.location_name || 'GAME SECTOR'} • ${l.xp_reward} XP</span>
        <h3 style="font-family:'Orbitron',sans-serif; color:#8CEEF6; margin: 8px 0 10px;">${l.title}</h3>
        <p style="line-height:1.5; color:#EDE9F7;">${l.content}</p>
      </div>
      <div>
        <div class="bar-row-label" style="font-size:0.85rem;">
          <span>Pass Rate: ${l.success_rate}%</span>
          <span>Quiz Avg: ${l.avg_quiz}%</span>
        </div>
        <div class="bar-track" style="margin-bottom:14px;">
          <div class="bar-fill" style="width:${l.success_rate}%"></div>
        </div>
        <button class="cp-notch-btn cyan-btn full-w" onclick="openLessonModal(${l.lesson_id})">
          EDIT / DELETE LESSON
        </button>
      </div>
    </div>
  `).join('');
}

// LESSON CRUD
function openAddLessonModal() {
  document.getElementById('modal-lesson-tag').innerText = 'NEW MODULE';
  document.getElementById('modal-lesson-heading').innerText = 'ADD LESSON MODULE';
  document.getElementById('edit-lesson-id').value = '';
  document.getElementById('edit-lesson-title').value = '';
  document.getElementById('edit-lesson-content').value = '';
  document.getElementById('edit-lesson-xp').value = 50;
  document.getElementById('delete-lesson-btn').style.display = 'none';
  document.getElementById('lesson-modal').classList.remove('hidden');
}

function openLessonModal(lessonId) {
  const lesson = state.lessons.find(l => l.lesson_id === lessonId);
  if (!lesson) return;
  document.getElementById('modal-lesson-tag').innerText = `LESSON #0${lesson.lesson_id}`;
  document.getElementById('modal-lesson-heading').innerText = 'EDIT LESSON MODULE';
  document.getElementById('edit-lesson-id').value = lesson.lesson_id;
  document.getElementById('edit-lesson-title').value = lesson.title;
  document.getElementById('edit-lesson-content').value = lesson.content;
  document.getElementById('edit-lesson-xp').value = lesson.xp_reward;
  document.getElementById('delete-lesson-btn').style.display = 'inline-block';
  document.getElementById('lesson-modal').classList.remove('hidden');
}

function closeLessonModal() {
  document.getElementById('lesson-modal').classList.add('hidden');
}

async function saveLessonEdit() {
  const rawId = document.getElementById('edit-lesson-id').value;
  const title = document.getElementById('edit-lesson-title').value.trim();
  const content = document.getElementById('edit-lesson-content').value.trim();
  const xp_reward = parseInt(document.getElementById('edit-lesson-xp').value) || 50;

  if (!title || !content) {
    showNotify('MISSING FIELDS', 'Please enter both a title and lesson text.');
    return;
  }

  if (!rawId) {
    await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location_id: 1, title, content, xp_reward })
    });
    showNotify('MODULE CREATED', `${title} added to TiDB.`);
  } else {
    const id = parseInt(rawId);
    await fetch(`/api/admin/lessons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, xp_reward })
    });
    showNotify('MODULE SAVED', `${title} updated in TiDB.`);
  }

  closeLessonModal();
  await initDashboard();
}

async function deleteLesson() {
  const id = parseInt(document.getElementById('edit-lesson-id').value);
  if (!id || !confirm('Delete this Lesson Module from the database?')) return;

  await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' });
  closeLessonModal();
  showNotify('MODULE DELETED', `Lesson #${id} removed from TiDB.`);
  await initDashboard();
}

// QUIZ MATRIX CRUD
async function loadAssessmentQuestions() {
  const lessonId = document.getElementById('quiz-lesson-select').value || (state.lessons[0]?.lesson_id || 1);
  const type = document.getElementById('quiz-type-select').value || 'pre_test';

  try {
    const res = await fetch(`/api/admin/questions?lessonId=${lessonId}&assessmentType=${type}`);
    if (res.ok) {
      state.currentQuestions = await res.json();
    }
  } catch (e) {}

  renderQuestionTable();
}

function renderQuestionTable() {
  const query = (document.getElementById('question-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('questions-table-body');
  const previewBody = document.getElementById('dashboard-questions-preview');
  const pillClasses = ['pill-cyan', 'pill-magenta', 'pill-purple'];

  const filtered = state.currentQuestions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => q.question_text.toLowerCase().includes(query));

  tbody.innerHTML = filtered.map(({ q, idx }) => {
    const correctOpt = q.options.find(o => o.is_correct) || q.options[0];
    const pillClass = pillClasses[idx % pillClasses.length];
    return `
      <tr>
        <td><strong>#0${q.question_order}</strong></td>
        <td>${q.question_text}</td>
        <td style="color:#8CEEF6;">${correctOpt ? correctOpt.option_text : 'N/A'}</td>
        <td>${q.points || 1} PT</td>
        <td>
          <button class="status-pill ${pillClass}" onclick="openQuestionModal(${idx})">EDIT</button>
        </td>
      </tr>
    `;
  }).join('');

  if (previewBody) {
    previewBody.innerHTML = state.currentQuestions.slice(0, 5).map((q, idx) => {
      const correctOpt = q.options.find(o => o.is_correct) || q.options[0];
      const pillClass = pillClasses[idx % pillClasses.length];
      return `
        <tr>
          <td><strong>#0${q.question_order}</strong></td>
          <td>${q.question_text}</td>
          <td style="color:#8CEEF6;">${correctOpt ? correctOpt.option_text : 'N/A'}</td>
          <td>
            <button class="status-pill ${pillClass}" onclick="openQuestionModal(${idx})">EDIT</button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function openAddQuestionModal() {
  document.getElementById('edit-question-index').value = '';
  document.getElementById('modal-question-tag').innerText = 'NEW QUESTION';
  document.getElementById('modal-question-heading').innerText = 'ADD QUESTION';
  document.getElementById('edit-question-text').value = '';
  document.getElementById('delete-question-btn').style.display = 'none';

  document.getElementById('modal-options-container').innerHTML = [0, 1, 2, 3].map(oIdx => `
    <div class="cp-opt-row">
      <input type="radio" name="modal-correct-opt" value="${oIdx}" ${oIdx === 0 ? 'checked' : ''} />
      <input type="text" id="modal-opt-text-${oIdx}" class="cp-input" style="margin:0;" placeholder="Option ${String.fromCharCode(65 + oIdx)}" />
    </div>
  `).join('');

  document.getElementById('question-modal').classList.remove('hidden');
}

function openQuestionModal(idx) {
  const q = state.currentQuestions[idx];
  if (!q) return;
  document.getElementById('edit-question-index').value = idx;
  document.getElementById('modal-question-tag').innerText = `QUESTION #0${q.question_order}`;
  document.getElementById('modal-question-heading').innerText = 'EDIT QUESTION';
  document.getElementById('edit-question-text').value = q.question_text;
  document.getElementById('delete-question-btn').style.display = 'inline-block';

  document.getElementById('modal-options-container').innerHTML = q.options.map((opt, oIdx) => `
    <div class="cp-opt-row">
      <input type="radio" name="modal-correct-opt" value="${oIdx}" ${opt.is_correct ? 'checked' : ''} />
      <input type="text" id="modal-opt-text-${oIdx}" class="cp-input" style="margin:0;" value="${opt.option_text}" />
    </div>
  `).join('');

  document.getElementById('question-modal').classList.remove('hidden');
}

function closeQuestionModal() {
  document.getElementById('question-modal').classList.add('hidden');
}

async function saveQuestionModal() {
  const rawIdx = document.getElementById('edit-question-index').value;
  const question_text = document.getElementById('edit-question-text').value.trim();
  const selectedRadio = document.querySelector('input[name="modal-correct-opt"]:checked');
  const correctIdx = selectedRadio ? parseInt(selectedRadio.value) : 0;

  if (!question_text) {
    showNotify('MISSING PROMPT', 'Please enter a question prompt.');
    return;
  }

  if (rawIdx === '') {
    const lessonId = document.getElementById('quiz-lesson-select').value || 1;
    const assessmentType = document.getElementById('quiz-type-select').value;
    const options = [0, 1, 2, 3].map(oIdx => ({
      option_text: document.getElementById(`modal-opt-text-${oIdx}`).value.trim() || `Option ${String.fromCharCode(65 + oIdx)}`,
      is_correct: oIdx === correctIdx ? 1 : 0
    }));

    await fetch('/api/admin/questions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId, assessmentType, question_text, options })
    });

    closeQuestionModal();
    showNotify('QUESTION ADDED', 'Saved to TiDB Cloud.');
    await initDashboard();
  } else {
    const idx = parseInt(rawIdx);
    const q = state.currentQuestions[idx];
    q.question_text = question_text;

    q.options.forEach((opt, oIdx) => {
      opt.option_text = document.getElementById(`modal-opt-text-${oIdx}`).value;
      opt.is_correct = (oIdx === correctIdx) ? 1 : 0;
    });

    await fetch(`/api/admin/questions/${q.question_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_text: q.question_text, options: q.options })
    });

    closeQuestionModal();
    showNotify('QUESTION SAVED', `Question #${q.question_order} updated in TiDB.`);
    await loadAssessmentQuestions();
  }
}

async function deleteQuestionModal() {
  const idx = parseInt(document.getElementById('edit-question-index').value);
  const q = state.currentQuestions[idx];
  if (!q || !confirm(`Delete Question #${q.question_order} from the database?`)) return;

  await fetch(`/api/admin/questions/${q.question_id}`, { method: 'DELETE' });
  closeQuestionModal();
  showNotify('QUESTION DELETED', `Question #${q.question_order} removed from TiDB.`);
  await initDashboard();
}

async function exportAnalyticsToExcel() {
  if (typeof XLSX === 'undefined') {
    showNotify('EXPORT ERROR', 'SheetJS library is still loading. Please try again.');
    return;
  }

  let learners = [];
  let lessonStats = [];
  let questionBank = [];

  try {
    const res = await fetch('/api/admin/export-data');
    if (res.ok) {
      const data = await res.json();
      learners = data.learners || [];
      lessonStats = data.lessonStats || [];
      questionBank = data.questionBank || [];
      if (data.errors && data.errors.length > 0) {
        console.warn('SQL Export Warnings:', data.errors);
      }
    }
  } catch (e) {
    console.error('Export fetch error:', e);
  }

  const wb = XLSX.utils.book_new();

  // SHEET 1: Lesson Pre-Test vs Post-Test Telemetry (Live DB)
  const sheet1Data = (lessonStats.length ? lessonStats : state.lessons).map(l => ({
    "Lesson ID": `L0${l.lesson_id}`,
    "Game Sector": l.location_name || 'Sector',
    "Lesson Title": l.title,
    "XP Reward": Number(l.xp_reward || 0),
    "Pre-Test Avg (%)": Number(l.pre_avg || 0),
    "Missions 1-5 Avg (%)": Number(l.mission_avg ?? l.avg_quiz ?? 0),
    "Post-Test Avg (%)": Number(l.post_avg || 0),
    "Score Gain (%)": Number(((l.post_avg || 0) - (l.pre_avg || 0)).toFixed(1)),
    "Pass Rate (%)": Number(l.pass_rate ?? l.success_rate ?? 0)
  }));
  const ws1 = XLSX.utils.json_to_sheet(sheet1Data);
  XLSX.utils.book_append_sheet(wb, ws1, "Lesson Telemetry");

  // SHEET 2: Real Learner Profiles & Scores from TiDB (No fake data)
  const sheet2Headers = [
    "User ID", "Username", "Email", "Respondent Category", "Age",
    "Age Bracket", "Pre-Test Avg (%)", "Missions Avg (%)",
    "Post-Test Avg (%)", "Overall Score Avg (%)", "Total Quiz Attempts"
  ];
  const sheet2Data = learners.map(u => {
    const age = u.age ? Number(u.age) : null;
    const bracket = !age ? "N/A" : age <= 15 ? "13-15 YRS" : age <= 18 ? "16-18 YRS" : age <= 21 ? "19-21 YRS" : "22+ YRS";
    return {
      "User ID": u.user_id,
      "Username": u.username,
      "Email": u.email || 'N/A',
      "Respondent Category": "Learner",
      "Age": age ?? 'N/A',
      "Age Bracket": bracket,
      "Pre-Test Avg (%)": Number(u.pre_test_avg || 0),
      "Missions Avg (%)": Number(u.mission_avg || 0),
      "Post-Test Avg (%)": Number(u.post_test_avg || 0),
      "Overall Score Avg (%)": Number(u.overall_avg || 0),
      "Total Quiz Attempts": Number(u.total_attempts || 0)
    };
  });
  const ws2 = XLSX.utils.json_to_sheet(sheet2Data, { header: sheet2Headers });
  XLSX.utils.book_append_sheet(wb, ws2, "Learner Profiles & Scores");

  // SHEET 3: Age Demographics Summary (Live DB)
  const sheet3Data = state.demographics.map(d => ({
    "Age Group": d.group,
    "Distribution (%)": d.percent,
    "Average Quiz Score (%)": Number(d.avgScore || 0)
  }));
  const ws3 = XLSX.utils.json_to_sheet(sheet3Data);
  XLSX.utils.book_append_sheet(wb, ws3, "Age Demographics");

  // SHEET 4: Part III Likert-Scale Evaluation Blank Instrument (For Respondents)
  const sheet4Data = [
    { "Code": "A.1.1", "Category": "System Functionality", "Statement": "The system allows users to access the available learning activities and lessons.", "Rating (1-5)": "" },
    { "Code": "A.1.2", "Category": "System Functionality", "Statement": "The system provides functional interactions with the game's objects, locations, and NPCs.", "Rating (1-5)": "" },
    { "Code": "A.1.3", "Category": "System Functionality", "Statement": "The system allows users to complete quizzes and scenario-based activities.", "Rating (1-5)": "" },
    { "Code": "A.1.4", "Category": "System Functionality", "Statement": "The system provides appropriate feedback after learners complete quizzes and activities.", "Rating (1-5)": "" },
    { "Code": "A.1.5", "Category": "System Functionality", "Statement": "The system records the learners' assessment results and learning progress accurately.", "Rating (1-5)": "" },
    { "Code": "A.2.1", "Category": "Usability & Interaction", "Statement": "The application's interface is understandable and easy to navigate.", "Rating (1-5)": "" },
    { "Code": "A.2.2", "Category": "Usability & Interaction", "Statement": "The instructions and controls are clear and easy to follow.", "Rating (1-5)": "" },
    { "Code": "A.2.3", "Category": "Usability & Interaction", "Statement": "The 3D environment and interactions make the learning experience engaging.", "Rating (1-5)": "" },
    { "Code": "A.2.4", "Category": "Usability & Interaction", "Statement": "The educational lessons are presented in an organized and understandable manner.", "Rating (1-5)": "" },
    { "Code": "A.2.5", "Category": "Usability & Interaction", "Statement": "The application allows learners to complete the activities without unnecessary difficulty.", "Rating (1-5)": "" },
    { "Code": "A.3.1", "Category": "Reliability & Performance", "Statement": "The application operates consistently during use.", "Rating (1-5)": "" },
    { "Code": "A.3.2", "Category": "Reliability & Performance", "Statement": "The system responds appropriately when users perform different actions.", "Rating (1-5)": "" },
    { "Code": "A.3.3", "Category": "Reliability & Performance", "Statement": "The application retrieves and saves learner information correctly.", "Rating (1-5)": "" },
    { "Code": "A.3.4", "Category": "Reliability & Performance", "Statement": "The application performs its functions without frequent errors or interruptions.", "Rating (1-5)": "" },
    { "Code": "A.3.5", "Category": "Reliability & Performance", "Statement": "The system's loading times and overall performance are acceptable.", "Rating (1-5)": "" },
    { "Code": "A.4.1", "Category": "Overall User Experience", "Statement": "The game makes learning about web browsing safety more engaging.", "Rating (1-5)": "" },
    { "Code": "A.4.2", "Category": "Overall User Experience", "Statement": "The interactive activities help me understand the lessons.", "Rating (1-5)": "" },
    { "Code": "A.4.3", "Category": "Overall User Experience", "Statement": "The scenarios help me recognize potentially unsafe online situations.", "Rating (1-5)": "" },
    { "Code": "A.4.4", "Category": "Overall User Experience", "Statement": "The feedback provided by the game helps me understand my quiz results.", "Rating (1-5)": "" },
    { "Code": "A.4.5", "Category": "Overall User Experience", "Statement": "I would recommend this application as a learning tool for web browsing safety.", "Rating (1-5)": "" },
    { "Code": "B.1", "Category": "Language Evaluation", "Statement": "The application uses correct grammar, spelling, and punctuation.", "Rating (1-5)": "" },
    { "Code": "B.2", "Category": "Language Evaluation", "Statement": "The educational explanations are clear and understandable.", "Rating (1-5)": "" },
    { "Code": "B.3", "Category": "Language Evaluation", "Statement": "The quiz questions and answer choices are properly constructed.", "Rating (1-5)": "" },
    { "Code": "B.4", "Category": "Language Evaluation", "Statement": "The instructions and NPC dialogues use appropriate language for teenage learners.", "Rating (1-5)": "" },
    { "Code": "B.5", "Category": "Language Evaluation", "Statement": "The terminology and writing style are consistent throughout the application.", "Rating (1-5)": "" },
    { "Code": "C.1", "Category": "Cybersecurity Validation", "Statement": "The cybersecurity information presented in the application is technically accurate.", "Rating (1-5)": "" },
    { "Code": "C.2", "Category": "Cybersecurity Validation", "Statement": "The selected topics are relevant to web browsing safety among teenagers.", "Rating (1-5)": "" },
    { "Code": "C.3", "Category": "Cybersecurity Validation", "Statement": "The lessons explain common web browsing threats in an understandable manner.", "Rating (1-5)": "" },
    { "Code": "C.4", "Category": "Cybersecurity Validation", "Statement": "The simulated scenarios represent relevant online safety situations.", "Rating (1-5)": "" },
    { "Code": "C.5", "Category": "Cybersecurity Validation", "Statement": "The quiz questions and answer choices accurately assess the intended cybersecurity concepts.", "Rating (1-5)": "" },
    { "Code": "C.6", "Category": "Cybersecurity Validation", "Statement": "The feedback provided after learning activities reinforces appropriate web browsing safety practices.", "Rating (1-5)": "" }
  ];
  const ws4 = XLSX.utils.json_to_sheet(sheet4Data);
  XLSX.utils.book_append_sheet(wb, ws4, "Part III Likert Instrument");

  // SHEET 5: Real Quiz & Question Bank from TiDB
  const sheet5Headers = ["Lesson ID", "Lesson Title", "Assessment Type", "Question #", "Question Prompt", "Correct Answer", "Points"];
  const sheet5Data = questionBank.map(q => ({
    "Lesson ID": `L0${q.lesson_id}`,
    "Lesson Title": q.lesson_title,
    "Assessment Type": String(q.assessment_type || '').toUpperCase(),
    "Question #": q.question_order,
    "Question Prompt": q.question_text,
    "Correct Answer": q.correct_answer || 'N/A',
    "Points": q.points || 1
  }));
  const ws5 = XLSX.utils.json_to_sheet(sheet5Data, { header: sheet5Headers });
  XLSX.utils.book_append_sheet(wb, ws5, "Live Question Bank");

  const dateStamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `WebRPG_Data_Gathering_Report_${dateStamp}.xlsx`);
  showNotify('EXCEL EXPORTED', 'Live TiDB telemetry & evaluation workbook downloaded.');
}

initDashboard();