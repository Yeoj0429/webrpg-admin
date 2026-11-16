const state = {
  lessons: [
    { lesson_id: 1, location_name: "Sector 01: Neo-Intramuros", title: "Lesson 1: Neural Link Foundations", content: "Welcome, Runner. Initialize your cyberdeck and calibrate your sensory HUD before entering the data stream.", xp_reward: 50, success_rate: 90, avg_quiz: 87 },
    { lesson_id: 2, location_name: "Sector 02: Cobalt Docks", title: "Lesson 2: Data Packet Routing", content: "Encrypted packets travel through high-security nodes. Learn to trace corrupted headers before ICE locks your terminal.", xp_reward: 75, success_rate: 86, avg_quiz: 83 },
    { lesson_id: 3, location_name: "Sector 03: Violet Spire", title: "Lesson 3: Memory Allocation & Buffers", content: "Overloading a memory register triggers a neural feedback spike. Balance your stack allocations inside the Spire.", xp_reward: 100, success_rate: 84, avg_quiz: 80 },
    { lesson_id: 4, location_name: "Sector 04: Synth Bazaar", title: "Lesson 4: Cryptographic Handshakes", content: "Every NPC broker in the Bazaar verifies public and private keys before unlocking high-tier mission nodes.", xp_reward: 125, success_rate: 81, avg_quiz: 76 },
    { lesson_id: 5, location_name: "Sector 05: Blackwall Core", title: "Lesson 5: Autonomous AI Countermeasures", content: "Final bastion protocol. Combine all prior subroutines to breach the Blackwall Core and pass the post-assessment.", xp_reward: 200, success_rate: 78, avg_quiz: 72 }
  ],
  demographics: [
    { group: "16 - 18 YRS", percent: 38, color: "#4AD8F0" },
    { group: "13 - 15 YRS", percent: 25, color: "#C84BF2" },
    { group: "19 - 21 YRS", percent: 25, color: "#8B4DF2" },
    { group: "22+ YRS", percent: 12, color: "#2696E8" }
  ],
  currentQuestions: []
};

function toggleMobileMenu() {
  document.getElementById('sidebar-drawer').classList.toggle('open');
  document.getElementById('sidebar-backdrop').classList.toggle('open');
}

function closeMobileMenu() {
  document.getElementById('sidebar-drawer')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('open');
}

function setActiveNav(el) {
  document.querySelectorAll('.side-link').forEach(a => a.classList.remove('active'));
  el.classList.add('active');
  closeMobileMenu();
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
  try {
    const res = await fetch('/api/admin/lesson-progress');
    if (res.ok) {
      const dbLessons = await res.json();
      if (dbLessons.length > 0) state.lessons = dbLessons;
    }
  } catch (e) {}

  renderAll();
  loadAssessmentQuestions();
}

function renderAll() {
  renderSplineChart();
  renderDonutLegend();
  renderGradientKPIs();
  renderLessonTimeline();
}

// 1. RENDER SVG AREA SPLINE CHART (Matches Designer Inspo 1 & 2)
function renderSplineChart() {
  const lessons = state.lessons;
  if (lessons.length === 0) return;

  const avgSuccess = (lessons.reduce((s, l) => s + Number(l.success_rate || 0), 0) / lessons.length).toFixed(1);
  document.getElementById('hero-avg-success').innerText = `${avgSuccess}%`;
  document.getElementById('hero-total-lessons').innerText = String(lessons.length).padStart(2, '0');

  const width = 600;
  const height = 200;
  const stepX = lessons.length > 1 ? width / (lessons.length - 1) : width;

  const ptsSuccess = lessons.map((l, i) => ({
    x: Math.round(i * stepX),
    y: Math.round(height - (Math.min(100, Math.max(10, Number(l.success_rate || 75))) / 100) * 165)
  }));

  const ptsQuiz = lessons.map((l, i) => ({
    x: Math.round(i * stepX),
    y: Math.round(height - (Math.min(100, Math.max(10, Number(l.avg_quiz || 70))) / 100) * 165)
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

// 2. RENDER DONUT LEGEND
function renderDonutLegend() {
  document.getElementById('donut-legend').innerHTML = state.demographics.map(d => `
    <div class="legend-box" style="border-left-color: ${d.color}">
      <strong style="color:${d.color}">${d.percent}%</strong>
      <span>${d.group}</span>
    </div>
  `).join('');
}

// 3. RENDER 4 GRADIENT KPI CARDS
function renderGradientKPIs() {
  const topRate = state.lessons.length ? Math.max(...state.lessons.map(l => Number(l.success_rate || 0))) : 90;
  const totalXp = state.lessons.reduce((s, l) => s + Number(l.xp_reward || 0), 0);

  document.getElementById('card-l1-rate').innerText = `${topRate}%`;
  document.getElementById('card-total-xp').innerText = `${totalXp} XP`;
}

// 4. RENDER LEFT TIMELINE LESSON MODULES + SELECT DROPDOWN
function renderLessonTimeline() {
  const container = document.getElementById('lesson-timeline-list');
  container.innerHTML = state.lessons.map(l => `
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

// LESSON CRUD MODALS
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
    showNotify('MISSING FIELDS', 'Please enter both a module title and lesson text.');
    return;
  }

  if (!rawId) {
    let newId = state.lessons.length > 0 ? Math.max(...state.lessons.map(l => l.lesson_id)) + 1 : 1;
    try {
      const res = await fetch('/api/admin/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: 1, title, content, xp_reward })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.lesson_id) newId = data.lesson_id;
      }
    } catch (e) {}

    state.lessons.push({
      lesson_id: newId,
      location_name: `Sector 0${newId}`,
      title,
      content,
      xp_reward,
      success_rate: 80,
      avg_quiz: 78
    });
    showNotify('MODULE CREATED', `${title} added.`);
  } else {
    const id = parseInt(rawId);
    const lesson = state.lessons.find(l => l.lesson_id === id);
    if (lesson) {
      lesson.title = title;
      lesson.content = content;
      lesson.xp_reward = xp_reward;
    }

    try {
      await fetch(`/api/admin/lessons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, xp_reward })
      });
    } catch (e) {}
    showNotify('MODULE SAVED', `${title} updated.`);
  }

  renderAll();
  closeLessonModal();
}

async function deleteLesson() {
  const id = parseInt(document.getElementById('edit-lesson-id').value);
  if (!id || !confirm('Delete this Lesson Module?')) return;

  try {
    await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' });
  } catch (e) {}

  state.lessons = state.lessons.filter(l => l.lesson_id !== id);
  renderAll();
  closeLessonModal();
  showNotify('MODULE DELETED', `Lesson #${id} removed.`);
}

// 5. QUIZ QUESTIONS TABLE + CRUD MODALS
async function loadAssessmentQuestions() {
  const lessonId = document.getElementById('quiz-lesson-select').value || 1;
  const type = document.getElementById('quiz-type-select').value;
  const count = (type === 'pre_test' || type === 'post_test') ? 10 : 5;

  try {
    const res = await fetch(`/api/admin/questions?lessonId=${lessonId}&assessmentType=${type}`);
    if (res.ok) {
      const dbQuestions = await res.json();
      if (dbQuestions.length > 0) {
        state.currentQuestions = dbQuestions;
        renderQuestionTable();
        return;
      }
    }
  } catch (e) {}

  state.currentQuestions = Array.from({ length: count }, (_, i) => ({
    question_id: i + 1,
    question_order: i + 1,
    points: 1,
    question_text: `[L${lessonId} // ${type.toUpperCase()}] Verify neural protocol response for node #${i + 1}?`,
    options: [
      { option_id: i * 4 + 1, option_text: `Option A: Execute protocol #${i + 1}`, is_correct: 1 },
      { option_id: i * 4 + 2, option_text: `Option B: Bypass firewall`, is_correct: 0 },
      { option_id: i * 4 + 3, option_text: `Option C: Terminate packet`, is_correct: 0 },
      { option_id: i * 4 + 4, option_text: `Option D: Flush buffer`, is_correct: 0 }
    ]
  }));
  renderQuestionTable();
}

function renderQuestionTable() {
  const query = (document.getElementById('question-search')?.value || '').toLowerCase();
  const tbody = document.getElementById('questions-table-body');
  const pillClasses = ['pill-cyan', 'pill-magenta', 'pill-purple'];

  tbody.innerHTML = state.currentQuestions
    .map((q, idx) => ({ q, idx }))
    .filter(({ q }) => q.question_text.toLowerCase().includes(query))
    .map(({ q, idx }) => {
      const correctOpt = q.options.find(o => o.is_correct) || q.options[0];
      const pillClass = pillClasses[idx % pillClasses.length];
      return `
        <tr>
          <td><strong>#0${q.question_order}</strong></td>
          <td>${q.question_text}</td>
          <td style="color:#8CEEF6;">${correctOpt ? correctOpt.option_text : 'N/A'}</td>
          <td>${q.points || 1} PT</td>
          <td>
            <button class="status-pill ${pillClass}" onclick="openQuestionModal(${idx})">
              EDIT
            </button>
          </td>
        </tr>
      `;
    }).join('');
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

    const newOrder = state.currentQuestions.length + 1;
    let newQuestionId = Date.now();

    try {
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, assessmentType, question_text, options })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.question_id) newQuestionId = data.question_id;
      }
    } catch (e) {}

    state.currentQuestions.push({
      question_id: newQuestionId,
      question_order: newOrder,
      points: 1,
      question_text,
      options
    });

    renderQuestionTable();
    closeQuestionModal();
    showNotify('QUESTION ADDED', `Question #${newOrder} added.`);
  } else {
    const idx = parseInt(rawIdx);
    const q = state.currentQuestions[idx];
    q.question_text = question_text;

    q.options.forEach((opt, oIdx) => {
      opt.option_text = document.getElementById(`modal-opt-text-${oIdx}`).value;
      opt.is_correct = (oIdx === correctIdx) ? 1 : 0;
    });

    try {
      await fetch(`/api/admin/questions/${q.question_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_text: q.question_text, options: q.options })
      });
    } catch (e) {}

    renderQuestionTable();
    closeQuestionModal();
    showNotify('QUESTION SAVED', `Question #${q.question_order} updated.`);
  }
}

async function deleteQuestionModal() {
  const idx = parseInt(document.getElementById('edit-question-index').value);
  const q = state.currentQuestions[idx];
  if (!q || !confirm(`Delete Question #${q.question_order}?`)) return;

  try {
    await fetch(`/api/admin/questions/${q.question_id}`, { method: 'DELETE' });
  } catch (e) {}

  state.currentQuestions.splice(idx, 1);
  renderQuestionTable();
  closeQuestionModal();
  showNotify('QUESTION DELETED', `Question #${q.question_order} removed.`);
}

initDashboard();