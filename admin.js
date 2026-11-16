const state = {
  lessons: [
    { lesson_id: 1, location_name: "Sector 01: Neo-Intramuros", title: "Lesson 1: Neural Link Foundations", content: "Welcome, Runner. Initialize your cyberdeck and calibrate your sensory HUD before entering the data stream.", xp_reward: 50, success_rate: 90, avg_quiz: 87 },
    { lesson_id: 2, location_name: "Sector 02: Cobalt Docks", title: "Lesson 2: Data Packet Routing", content: "Encrypted packets travel through high-security nodes. Learn to trace corrupted headers before ICE locks your terminal.", xp_reward: 75, success_rate: 86, avg_quiz: 83 },
    { lesson_id: 3, location_name: "Sector 03: Violet Spire", title: "Lesson 3: Memory Allocation & Buffers", content: "Overloading a memory register triggers a neural feedback spike. Balance your stack allocations inside the Spire.", xp_reward: 100, success_rate: 84, avg_quiz: 80 },
    { lesson_id: 4, location_name: "Sector 04: Synth Bazaar", title: "Lesson 4: Cryptographic Handshakes", content: "Every NPC broker in the Bazaar verifies public and private keys before unlocking high-tier mission nodes.", xp_reward: 125, success_rate: 81, avg_quiz: 76 },
    { lesson_id: 5, location_name: "Sector 05: Blackwall Core", title: "Lesson 5: Autonomous AI Countermeasures", content: "Final bastion protocol. Combine all prior subroutines to breach the Blackwall Core and pass the post-assessment.", xp_reward: 200, success_rate: 78, avg_quiz: 72 }
  ],
  demographics: [
    { group: "13 - 15 YRS", percent: 25, avgScore: 81 },
    { group: "16 - 18 YRS", percent: 38, avgScore: 86 },
    { group: "19 - 21 YRS", percent: 25, avgScore: 89 },
    { group: "22+ YRS", percent: 12, avgScore: 84 }
  ],
  scoreBreakdown: [
    { label: "Pre-Test Exam", score: 78 },
    { label: "Mission Quizzes (1-5)", score: 84 },
    { label: "Post-Test Exam", score: 88 }
  ],
  currentQuestions: []
};

async function initDashboard() {
  try {
    const res = await fetch('/api/admin/lesson-progress');
    if (res.ok) {
      const dbLessons = await res.json();
      if (dbLessons.length > 0) state.lessons = dbLessons;
    }
  } catch (e) {}

  renderProgress();
  renderAnalytics();
  renderLessons();
  loadAssessmentQuestions();
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  btn.classList.add('active');

  const titles = {
    progress: "LEARNER PROGRESS",
    analytics: "LEARNING ANALYTICS",
    lessons: "LESSON MODULES",
    quizzes: "QUIZ QUESTIONS"
  };
  document.getElementById('view-title').innerText = titles[tabId];
}

function showNotify(title, message) {
  document.getElementById('notify-title').innerText = title;
  document.getElementById('notify-message').innerText = message;
  document.getElementById('notify-modal').classList.remove('hidden');
}

function closeNotifyModal() {
  document.getElementById('notify-modal').classList.add('hidden');
}

// 1. PROGRESS
function renderProgress() {
  const container = document.getElementById('lesson-success-list');
  container.innerHTML = state.lessons.map(l => `
    <div class="cyber-card">
      <div>
        <div class="card-tag">${l.location_name}</div>
        <h3>${l.title}</h3>
        <p style="margin: 8px 0; color: #8CEEF6;">
          <strong>${l.success_rate}% Success Rate</strong> (Avg Score: ${l.avg_quiz}%)
        </p>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${l.success_rate}%"></div>
      </div>
    </div>
  `).join('');
}

// 2. ANALYTICS
function renderAnalytics() {
  const avgSuccess = Math.round(
    state.lessons.reduce((sum, l) => sum + Number(l.success_rate), 0) / state.lessons.length
  );
  const avgQuizAll = Math.round(
    state.lessons.reduce((sum, l) => sum + Number(l.avg_quiz), 0) / state.lessons.length
  );

  document.getElementById('analytics-kpis').innerHTML = `
    <div class="kpi-card"><span>ACTIVE LEARNERS</span><strong>08</strong></div>
    <div class="kpi-card"><span>AVG SUCCESS RATE</span><strong>${avgSuccess}%</strong></div>
    <div class="kpi-card"><span>AVG QUIZ SCORE</span><strong>${avgQuizAll}%</strong></div>
    <div class="kpi-card"><span>TOTAL QUESTIONS</span><strong>225</strong></div>
  `;

  document.getElementById('age-group-bars').innerHTML = state.demographics.map(d => `
    <div style="margin-top: 12px;">
      <div style="display:flex; justify-content:space-between; font-weight:700;">
        <span>${d.group}</span>
        <span style="color:#4AD8F0;">${d.percent}% (${d.avgScore}% Avg)</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${d.percent}%"></div></div>
    </div>
  `).join('');

  document.getElementById('score-comparison-bars').innerHTML = state.scoreBreakdown.map(s => `
    <div style="margin-top: 12px;">
      <div style="display:flex; justify-content:space-between; font-weight:700;">
        <span>${s.label}</span>
        <span style="color:#F288E8;">${s.score}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${s.score}%"></div></div>
    </div>
  `).join('');

  document.getElementById('analytics-table-body').innerHTML = state.lessons.map(l => `
    <tr>
      <td><strong>${l.title}</strong></td>
      <td style="color:#8CEEF6;">${l.location_name}</td>
      <td>${l.avg_quiz}%</td>
      <td style="color:#4AD8F0; font-weight:700;">${l.success_rate}%</td>
      <td style="color:#F288E8;">${l.xp_reward} XP</td>
    </tr>
  `).join('');
}

// 3. LESSONS & MODAL
function renderLessons() {
  const container = document.getElementById('lesson-cards-container');
  container.innerHTML = state.lessons.map(l => `
    <div class="cyber-card">
      <div>
        <div class="card-tag">LESSON 0${l.lesson_id} • ${l.xp_reward} XP</div>
        <h3 style="color:#8CEEF6; margin-bottom:10px;">${l.title}</h3>
        <p style="font-size:0.95rem; line-height:1.4; margin-bottom:18px; color:#EDE9F7;">
          ${l.content}
        </p>
      </div>
      <button class="cyber-btn primary" onclick="openLessonModal(${l.lesson_id})">
        EDIT LESSON
      </button>
    </div>
  `).join('');

  const select = document.getElementById('quiz-lesson-select');
  select.innerHTML = state.lessons.map(l => `<option value="${l.lesson_id}">${l.title}</option>`).join('');
}

function openLessonModal(lessonId) {
  const lesson = state.lessons.find(l => l.lesson_id === lessonId);
  document.getElementById('modal-lesson-tag').innerText = `LESSON 0${lesson.lesson_id}`;
  document.getElementById('edit-lesson-id').value = lesson.lesson_id;
  document.getElementById('edit-lesson-title').value = lesson.title;
  document.getElementById('edit-lesson-content').value = lesson.content;
  document.getElementById('edit-lesson-xp').value = lesson.xp_reward;
  document.getElementById('lesson-modal').classList.remove('hidden');
}

function closeLessonModal() {
  document.getElementById('lesson-modal').classList.add('hidden');
}

async function saveLessonEdit() {
  const id = parseInt(document.getElementById('edit-lesson-id').value);
  const lesson = state.lessons.find(l => l.lesson_id === id);
  lesson.title = document.getElementById('edit-lesson-title').value;
  lesson.content = document.getElementById('edit-lesson-content').value;
  lesson.xp_reward = parseInt(document.getElementById('edit-lesson-xp').value);

  try {
    await fetch(`/api/admin/lessons/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lesson)
    });
  } catch (e) {}

  renderLessons();
  renderProgress();
  closeLessonModal();
  showNotify('LESSON UPDATED', `${lesson.title} has been saved.`);
}

// 4. QUIZZES & QUESTION MODAL
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
        renderQuestionRows();
        return;
      }
    }
  } catch (e) {}

  // Fallback questions
  state.currentQuestions = Array.from({ length: count }, (_, i) => ({
    question_id: i + 1,
    question_order: i + 1,
    question_text: `Sample question #${i + 1} for Lesson ${lessonId}?`,
    options: [
      { option_id: i * 4 + 1, option_text: `Option A`, is_correct: 1 },
      { option_id: i * 4 + 2, option_text: `Option B`, is_correct: 0 },
      { option_id: i * 4 + 3, option_text: `Option C`, is_correct: 0 },
      { option_id: i * 4 + 4, option_text: `Option D`, is_correct: 0 }
    ]
  }));
  renderQuestionRows();
}

function renderQuestionRows() {
  const container = document.getElementById('questions-editor-list');
  container.innerHTML = state.currentQuestions.map((q, idx) => {
    const correctOpt = q.options.find(o => o.is_correct) || q.options[0];
    return `
      <div class="cyber-card question-row-card">
        <div class="question-summary">
          <span class="card-tag">QUESTION #${q.question_order}</span>
          <h4>${q.question_text}</h4>
          <p class="correct-preview">Correct Answer: <span>${correctOpt ? correctOpt.option_text : 'N/A'}</span></p>
        </div>
        <button class="cyber-btn primary" onclick="openQuestionModal(${idx})">
          EDIT
        </button>
      </div>
    `;
  }).join('');
}

function openQuestionModal(idx) {
  const q = state.currentQuestions[idx];
  document.getElementById('edit-question-index').value = idx;
  document.getElementById('modal-question-tag').innerText = `QUESTION #${q.question_order}`;
  document.getElementById('edit-question-text').value = q.question_text;

  document.getElementById('modal-options-container').innerHTML = q.options.map((opt, oIdx) => `
    <div class="option-row">
      <input type="radio" name="modal-correct-opt" value="${oIdx}" ${opt.is_correct ? 'checked' : ''} />
      <input type="text" id="modal-opt-text-${oIdx}" class="cyber-input" style="margin:0;" value="${opt.option_text}" />
    </div>
  `).join('');

  document.getElementById('question-modal').classList.remove('hidden');
}

function closeQuestionModal() {
  document.getElementById('question-modal').classList.add('hidden');
}

async function saveQuestionModal() {
  const idx = parseInt(document.getElementById('edit-question-index').value);
  const q = state.currentQuestions[idx];
  q.question_text = document.getElementById('edit-question-text').value;

  const selectedRadio = document.querySelector('input[name="modal-correct-opt"]:checked');
  const correctIdx = selectedRadio ? parseInt(selectedRadio.value) : 0;

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

  renderQuestionRows();
  closeQuestionModal();
  showNotify('QUESTION SAVED', `Question #${q.question_order} has been updated.`);
}

function toggleMobileMenu() {
  document.getElementById('sidebar-drawer').classList.toggle('open');
  document.getElementById('burger-btn').classList.toggle('open');
  document.getElementById('sidebar-backdrop').classList.toggle('open');
}

function closeMobileMenu() {
  document.getElementById('sidebar-drawer')?.classList.remove('open');
  document.getElementById('burger-btn')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('open');
}

function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  btn.classList.add('active');

  const titles = {
    progress: "LEARNER PROGRESS",
    analytics: "LEARNING ANALYTICS",
    lessons: "LESSON MODULES",
    quizzes: "QUIZ QUESTIONS"
  };
  document.getElementById('view-title').innerText = titles[tabId];

  // Automatically close drawer on tablet/mobile after selecting a tab
  closeMobileMenu();
}

initDashboard();