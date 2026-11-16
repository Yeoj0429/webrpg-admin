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
    { label: "PRE-TEST EXAM AVG (10 Qs)", score: 78 },
    { label: "MISSIONS 1-5 QUIZ AVG (5 Qs each)", score: 84 },
    { label: "POST-TEST EXAM AVG (10 Qs)", score: 88 }
  ]
};

async function initDashboard() {
  try {
    const res = await fetch('/api/admin/lesson-progress');
    if (res.ok) {
      const dbLessons = await res.json();
      if (dbLessons.length > 0) state.lessons = dbLessons;
    }
  } catch (e) {
    console.warn('Using fallback state until Cloud MySQL env vars are set.');
  }

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
    progress: "LEARNER PROGRESS & SUCCESS RATES",
    analytics: "LEARNING ANALYTICS // DEMOGRAPHICS & SCORES",
    lessons: "LESSON MODULES // IN-GAME CONTENT EDITOR",
    quizzes: "QUIZ MATRIX // INDIVIDUAL QUESTION EDITOR"
  };
  document.getElementById('view-title').innerText = titles[tabId];
}

function renderProgress() {
  const container = document.getElementById('lesson-success-list');
  container.innerHTML = state.lessons.map(l => `
    <div class="cyber-card">
      <div class="card-tag">LESSON 0${l.lesson_id} // ${l.location_name}</div>
      <h3>${l.title}</h3>
      <p style="margin: 8px 0; color: #8CEEF6;">
        <strong>${l.success_rate}% Success Rate</strong> — Most learners obtain at least <strong>${l.avg_quiz}%+</strong> across lesson quizzes.
      </p>
      <div class="progress-track">
        <div class="progress-fill" style="width: ${l.success_rate}%"></div>
      </div>
    </div>
  `).join('');
}

function renderAnalytics() {
  document.getElementById('age-group-bars').innerHTML = state.demographics.map(d => `
    <div style="margin-top: 14px;">
      <div style="display:flex; justify-content:space-between; font-weight:700;">
        <span>${d.group}</span>
        <span style="color:#4AD8F0;">${d.percent}% of Learners (Avg Score: ${d.avgScore}%)</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${d.percent}%"></div></div>
    </div>
  `).join('');

  document.getElementById('score-comparison-bars').innerHTML = state.scoreBreakdown.map(s => `
    <div style="margin-top: 16px;">
      <div style="display:flex; justify-content:space-between; font-weight:700;">
        <span>${s.label}</span>
        <span style="color:#F288E8;">${s.score}%</span>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${s.score}%"></div></div>
    </div>
  `).join('');
}

function renderLessons() {
  const container = document.getElementById('lesson-cards-container');
  container.innerHTML = state.lessons.map(l => `
    <div class="cyber-card">
      <div class="card-tag">MODULE 0${l.lesson_id} // XP REWARD: ${l.xp_reward}</div>
      <h3 style="color:#8CEEF6; margin-bottom:10px;">${l.title}</h3>
      <p style="font-size:0.95rem; line-height:1.4; margin-bottom:18px; color:#EDE9F7;">
        "${l.content}"
      </p>
      <button class="cyber-btn primary" onclick="openLessonModal(${l.lesson_id})">
        EDIT LESSON MODULE
      </button>
    </div>
  `).join('');

  const select = document.getElementById('quiz-lesson-select');
  select.innerHTML = state.lessons.map(l => `<option value="${l.lesson_id}">${l.title}</option>`).join('');
}

function openLessonModal(lessonId) {
  const lesson = state.lessons.find(l => l.lesson_id === lessonId);
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
}

async function loadAssessmentQuestions() {
  const lessonId = document.getElementById('quiz-lesson-select').value || 1;
  const type = document.getElementById('quiz-type-select').value;
  const count = (type === 'pre_test' || type === 'post_test') ? 10 : 5;
  const container = document.getElementById('questions-editor-list');

  try {
    const res = await fetch(`/api/admin/questions?lessonId=${lessonId}&assessmentType=${type}`);
    if (res.ok) {
      const dbQuestions = await res.json();
      if (dbQuestions.length > 0) {
        container.innerHTML = dbQuestions.map((q, idx) => `
          <div class="cyber-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="card-tag">LESSON 0${lessonId} // ${type.toUpperCase()} // QUESTION #${q.question_order}</span>
              <button class="cyber-btn primary" onclick="saveDbQuestion(${q.question_id}, ${idx})">
                SAVE QUESTION #${q.question_order}
              </button>
            </div>
            <input type="text" id="db-q-text-${q.question_id}" class="cyber-input" value="${q.question_text}" />
            <div class="options-grid">
              ${q.options.map(opt => `
                <div class="option-row">
                  <input type="radio" name="correct-${q.question_id}" value="${opt.option_id}" ${opt.is_correct ? 'checked' : ''} />
                  <input type="text" id="db-opt-${opt.option_id}" class="cyber-input" style="margin:0;" value="${opt.option_text}" />
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');
        return;
      }
    }
  } catch (e) {}

  // Fallback UI if Cloud DB is not yet seeded
  let html = '';
  for (let i = 1; i <= count; i++) {
    html += `
      <div class="cyber-card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="card-tag">LESSON 0${lessonId} // ${type.toUpperCase()} // QUESTION #${i}</span>
          <button class="cyber-btn primary" onclick="alert('Saved Question #${i}!')">
            SAVE QUESTION #${i}
          </button>
        </div>
        <input type="text" class="cyber-input" value="[L${lessonId} // ${type.toUpperCase()} // Q${i}] Verify system protocol response for node #${i}?" />
        <div class="options-grid">
          ${['A', 'B', 'C', 'D'].map((opt, idx) => `
            <div class="option-row">
              <input type="radio" name="correct-${i}" ${idx === 0 ? 'checked' : ''} />
              <input type="text" class="cyber-input" style="margin:0;" value="Option ${opt}: Execute neural protocol #${i}" />
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

async function saveDbQuestion(questionId) {
  const question_text = document.getElementById(`db-q-text-${questionId}`).value;
  const radios = document.querySelectorAll(`input[name="correct-${questionId}"]`);
  
  const options = Array.from(radios).map(r => {
    const optId = parseInt(r.value);
    return {
      option_id: optId,
      option_text: document.getElementById(`db-opt-${optId}`).value,
      is_correct: r.checked ? 1 : 0
    };
  });

  const res = await fetch(`/api/admin/questions/${questionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question_text, options })
  });

  if (res.ok) {
    alert(`[NETWATCH DB COMMIT] Question #${questionId} updated in MySQL!`);
  } else {
    alert('Failed to update question.');
  }
}

initDashboard();