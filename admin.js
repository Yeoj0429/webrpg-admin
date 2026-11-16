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

function toggleMobileNav() {
  document.getElementById('cp-nav').classList.toggle('open');
}

function closeMobileNav() {
  document.getElementById('cp-nav')?.classList.remove('open');
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

  renderProgressMatrix();
  renderAnalytics();
  renderLessonPosters();
  loadAssessmentQuestions();
}

// 1. RENDER PROGRESS MATRIX
function renderProgressMatrix() {
  if (state.lessons.length === 0) return;

  const countLabel = String(state.lessons.length).padStart(2, '0');
  const heroCounter = document.getElementById('hero-lesson-count');
  if (heroCounter) heroCounter.innerText = `"${countLabel} TOTAL LESSONS"`;

  const first = state.lessons[0];
  const rest = state.lessons.slice(1);

  document.getElementById('featured-lesson-box').innerHTML = `
    <div class="cp-featured-banner">
      <h4>FEATURED MODULE</h4>
      <span>${(first.location_name || 'Sector 01').toUpperCase()}</span>
    </div>
    <div class="cp-featured-body">
      <h3>${first.title.toUpperCase()}</h3>
      <p style="margin-bottom: 18px; color: #EDE9F7;">${first.content}</p>
      <div style="display:flex; justify-content:space-between; font-weight:700; color:#8CEEF6;">
        <span>SUCCESS RATE: ${first.success_rate}%</span>
        <span>AVG QUIZ SCORE: ${first.avg_quiz}%</span>
      </div>
      <div class="cp-progress-track">
        <div class="cp-progress-fill" style="width:${first.success_rate}%"></div>
      </div>
    </div>
  `;

  document.getElementById('remaining-lessons-grid').innerHTML = rest.map(l => `
    <div class="cp-news-card">
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:#F288E8; font-weight:700; letter-spacing:1.5px;">
          <span>${(l.location_name || 'Sector').toUpperCase()}</span>
          <span>${l.xp_reward} XP</span>
        </div>
        <h4 style="font-family:'Orbitron',sans-serif; font-size:1.05rem; margin:8px 0; color:#8CEEF6;">
          ${l.title}
        </h4>
      </div>
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.9rem; font-weight:700;">
          <span>${l.success_rate}% Success Rate</span>
          <span style="color:#4AD8F0;">Avg: ${l.avg_quiz}%</span>
        </div>
        <div class="cp-progress-track">
          <div class="cp-progress-fill" style="width:${l.success_rate}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

// 2. RENDER ANALYTICS
function renderAnalytics() {
  const len = state.lessons.length || 1;
  const avgSuccess = Math.round(
    state.lessons.reduce((sum, l) => sum + Number(l.success_rate || 0), 0) / len
  );
  const avgQuizAll = Math.round(
    state.lessons.reduce((sum, l) => sum + Number(l.avg_quiz || 0), 0) / len
  );

  document.getElementById('analytics-kpis').innerHTML = `
    <div class="cp-kpi-box"><span>ACTIVE LEARNERS</span><strong>08</strong></div>
    <div class="cp-kpi-box"><span>AVG SUCCESS RATE</span><strong>${avgSuccess}%</strong></div>
    <div class="cp-kpi-box"><span>AVG QUIZ SCORE</span><strong>${avgQuizAll}%</strong></div>
    <div class="cp-kpi-box"><span>TOTAL LESSONS</span><strong>${String(state.lessons.length).padStart(2, '0')}</strong></div>
  `;

  document.getElementById('age-group-bars').innerHTML = state.demographics.map(d => `
    <div style="margin-top: 14px;">
      <div style="display:flex; justify-content:space-between; font-weight:700;">
        <span>${d.group}</span>
        <span style="color:#4AD8F0;">${d.percent}% (${d.avgScore}% Avg)</span>
      </div>
      <div class="cp-progress-track"><div class="cp-progress-fill" style="width:${d.percent}%"></div></div>
    </div>
  `).join('');

  document.getElementById('score-comparison-bars').innerHTML = state.scoreBreakdown.map(s => `
    <div style="margin-top: 14px;">
      <div style="display:flex; justify-content:space-between; font-weight:700;">
        <span>${s.label}</span>
        <span style="color:#F288E8;">${s.score}%</span>
      </div>
      <div class="cp-progress-track"><div class="cp-progress-fill" style="width:${s.score}%"></div></div>
    </div>
  `).join('');
}

// 3. RENDER LESSON POSTERS + ADD / EDIT / DELETE LESSON
function renderLessonPosters() {
  document.getElementById('lesson-posters-container').innerHTML = state.lessons.map(l => `
    <div class="cp-poster-card">
      <div>
        <div class="cp-poster-sector">${(l.location_name || 'Sector').toUpperCase()}</div>
        <div class="cp-poster-title">${l.title}</div>
        <div class="cp-poster-xp">REWARD: ${l.xp_reward} XP</div>
        <p class="cp-poster-desc">${l.content}</p>
      </div>
      <button class="cp-btn-outline-cyan" style="width:100%; min-width:0;" onclick="openLessonModal(${l.lesson_id})">
        EDIT / DELETE
      </button>
    </div>
  `).join('');

  const select = document.getElementById('quiz-lesson-select');
  const currentVal = select.value;
  select.innerHTML = state.lessons.map(l => `<option value="${l.lesson_id}">${l.title}</option>`).join('');
  if (currentVal && state.lessons.some(l => String(l.lesson_id) === String(currentVal))) {
    select.value = currentVal;
  }
}

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
  document.getElementById('modal-lesson-tag').innerText = `LESSON #${lesson.lesson_id}`;
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
    showNotify('MISSING FIELDS', 'Please enter both a title and lesson content.');
    return;
  }

  if (!rawId) {
    // ADD NEW LESSON (POST)
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
      location_name: `Sector 01: Neo-Intramuros`,
      title,
      content,
      xp_reward,
      success_rate: 0,
      avg_quiz: 0
    });
    showNotify('LESSON ADDED', `${title} has been created.`);
  } else {
    // EDIT EXISTING LESSON (PUT)
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
    showNotify('LESSON SAVED', `${title} updated.`);
  }

  renderProgressMatrix();
  renderAnalytics();
  renderLessonPosters();
  closeLessonModal();
}

async function deleteLesson() {
  const id = parseInt(document.getElementById('edit-lesson-id').value);
  if (!id || !confirm('Are you sure you want to delete this Lesson Module?')) return;

  try {
    await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' });
  } catch (e) {}

  state.lessons = state.lessons.filter(l => l.lesson_id !== id);
  renderProgressMatrix();
  renderAnalytics();
  renderLessonPosters();
  closeLessonModal();
  showNotify('LESSON DELETED', `Lesson #${id} has been removed.`);
}

// 4. QUIZ QUESTIONS: LOAD, ADD, EDIT & DELETE
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
        renderQuestionCards();
        return;
      }
    }
  } catch (e) {}

  state.currentQuestions = Array.from({ length: count }, (_, i) => ({
    question_id: i + 1,
    question_order: i + 1,
    question_text: `Verify system protocol response for node #${i + 1}?`,
    options: [
      { option_id: i * 4 + 1, option_text: `Option A (Correct)`, is_correct: 1 },
      { option_id: i * 4 + 2, option_text: `Option B`, is_correct: 0 },
      { option_id: i * 4 + 3, option_text: `Option C`, is_correct: 0 },
      { option_id: i * 4 + 4, option_text: `Option D`, is_correct: 0 }
    ]
  }));
  renderQuestionCards();
}

function renderQuestionCards() {
  const container = document.getElementById('questions-editor-list');
  container.innerHTML = state.currentQuestions.map((q, idx) => {
    const correctOpt = q.options.find(o => o.is_correct) || q.options[0];
    return `
      <div class="cp-q-card">
        <div>
          <span style="font-size:0.72rem; color:#F288E8; font-weight:700; letter-spacing:1.5px;">QUESTION #${q.question_order}</span>
          <h4>${q.question_text}</h4>
          <div class="cp-q-correct">Correct: ${correctOpt ? correctOpt.option_text : 'N/A'}</div>
        </div>
        <button class="cp-btn-Notch primary" onclick="openQuestionModal(${idx})">EDIT</button>
      </div>
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
  document.getElementById('modal-question-tag').innerText = `QUESTION #${q.question_order}`;
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
    // ADD NEW QUESTION (POST)
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
      question_text,
      options
    });

    renderQuestionCards();
    closeQuestionModal();
    showNotify('QUESTION ADDED', `Question #${newOrder} added.`);
  } else {
    // EDIT EXISTING QUESTION (PUT)
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

    renderQuestionCards();
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
  renderQuestionCards();
  closeQuestionModal();
  showNotify('QUESTION DELETED', `Question #${q.question_order} removed.`);
}

initDashboard();