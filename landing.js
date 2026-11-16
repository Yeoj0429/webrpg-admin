const defaultLessons = [
  { lesson_id: 1, location_name: "Sector 01", title: "Lesson 1: Cyber Fundamentals", content: "Initialize your HUD and verify safe terminal connections.", xp_reward: 50, success_rate: 90 },
  { lesson_id: 2, location_name: "Sector 02", title: "Lesson 2: Malicious Websites", content: "Inspect suspicious URLs to avoid phishing traps.", xp_reward: 75, success_rate: 86 },
  { lesson_id: 3, location_name: "Sector 03", title: "Lesson 3: Ad Scams", content: "Spot clickbait, fake alerts, and pop-up traps.", xp_reward: 100, success_rate: 84 },
  { lesson_id: 4, location_name: "Sector 04", title: "Lesson 4: Web Privacy", content: "Use VPNs and ad blockers to protect your data.", xp_reward: 125, success_rate: 81 }
];

const pillarDetails = [
  {
    tag: "TOPIC 01",
    title: "BASIC CYBERSECURITY",
    body: "Learn how to secure your accounts, create strong passwords, and spot social engineering."
  },
  {
    tag: "TOPIC 02",
    title: "MALICIOUS WEBSITES",
    body: "Identify fake URLs, unsafe file downloads, and dangerous websites before they harm your device."
  },
  {
    tag: "TOPIC 03",
    title: "AD SCAMS",
    body: "Recognize fake prize pop-ups, urgent scam messages, and deceptive advertisements."
  },
  {
    tag: "TOPIC 04",
    title: "WEB PRIVACY",
    body: "Understand how VPNs, ad blockers, and browser privacy tools keep your personal information safe."
  }
];

function toggleMobileNav() {
  document.getElementById('cp-nav').classList.toggle('open');
}

function closeMobileNav() {
  document.getElementById('cp-nav')?.classList.remove('open');
}

async function initLandingPage() {
  let lessons = defaultLessons;
  try {
    const res = await fetch('/api/admin/lesson-progress');
    if (res.ok) {
      const dbLessons = await res.json();
      if (dbLessons.length > 0) lessons = dbLessons;
    }
  } catch (e) {}

  const avgPass = Math.round(
    lessons.reduce((s, l) => s + Number(l.success_rate || 84), 0) / lessons.length
  );
  document.getElementById('live-lesson-count').innerText = String(lessons.length).padStart(2, '0');
  document.getElementById('live-quiz-count').innerText = String(lessons.length * 7).padStart(2, '0');
  document.getElementById('live-pass-rate').innerText = `${avgPass}%`;

  const previewContainer = document.getElementById('live-lessons-preview');
  previewContainer.innerHTML = lessons.slice(0, 4).map(l => `
    <div class="matrix-card">
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.74rem; color:#F288E8; font-weight:700;">
          <span>${(l.location_name || 'SECTOR').toUpperCase()}</span>
          <span>${l.xp_reward} XP</span>
        </div>
        <h4 style="font-family:'Orbitron',sans-serif; font-size:1.02rem; color:#8CEEF6; margin:8px 0;">
          ${l.title}
        </h4>
        <p style="font-size:0.9rem; color:#EDE9F7; line-height:1.4;">
          ${l.content}
        </p>
      </div>
      <div style="margin-top:12px; font-size:0.8rem; font-weight:700; color:#4AD8F0;">
        PASS RATE: ${l.success_rate}%
      </div>
    </div>
  `).join('');
}

function openDownloadModal() {
  document.getElementById('download-modal').classList.remove('hidden');
}

function closeDownloadModal() {
  document.getElementById('download-modal').classList.add('hidden');
}

function openPillarModal(index) {
  const item = pillarDetails[index];
  document.getElementById('info-modal-tag').innerText = item.tag;
  document.getElementById('info-modal-title').innerText = item.title;
  document.getElementById('info-modal-body').innerText = item.body;
  document.getElementById('info-modal').classList.remove('hidden');
}

function openTrailerModal() {
  document.getElementById('info-modal-tag').innerText = "GAME OVERVIEW";
  document.getElementById('info-modal-title').innerText = "ABOUT WEBRPG!";
  document.getElementById('info-modal-body').innerText =
    "WebRPG! is a 3D Unity desktop game where you explore 5 sectors, talk to NPCs, and complete quizzes to master web browsing safety.";
  document.getElementById('info-modal').classList.remove('hidden');
}

function closeInfoModal() {
  document.getElementById('info-modal').classList.add('hidden');
}

function triggerDownloadNotice(e) {
  e.preventDefault();
  closeDownloadModal();
  document.getElementById('info-modal-tag').innerText = "DOWNLOAD";
  document.getElementById('info-modal-title').innerText = "INSTALLER QUEUED";
  document.getElementById('info-modal-body').innerText =
    "WebRPG_Installer_x64.zip is starting.";
  document.getElementById('info-modal').classList.remove('hidden');
}

initLandingPage();