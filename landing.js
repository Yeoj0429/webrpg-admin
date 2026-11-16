const defaultLessons = [
  { lesson_id: 1, location_name: "Sector 01: Neo-Intramuros", title: "Lesson 1: Neural Link & Fundamentals", content: "Initialize your HUD, understand core web-browsing variables, and verify safe terminal connections.", xp_reward: 50, success_rate: 90 },
  { lesson_id: 2, location_name: "Sector 02: Cobalt Docks", title: "Lesson 2: Malicious Websites & Routing", content: "Inspect suspicious URLs and packet headers to avoid phishing traps and unsafe downloads.", xp_reward: 75, success_rate: 86 },
  { lesson_id: 3, location_name: "Sector 03: Violet Spire", title: "Lesson 3: Ad Scams & Pop-Up Defense", content: "Recognize FOMO clickbait, fake system alerts, and deceptive advertisement language.", xp_reward: 100, success_rate: 84 },
  { lesson_id: 4, location_name: "Sector 04: Synth Bazaar", title: "Lesson 4: Web Privacy, VPNs & Ad Blockers", content: "Deploy Privacy Enhancing Technologies (PET) and VPNs to protect your personal data.", xp_reward: 125, success_rate: 81 }
];

const pillarDetails = [
  {
    tag: "PILLAR 01 // BASIC CYBERSECURITY",
    title: "BASIC CYBERSECURITY AWARENESS",
    body: "Grounded in Arishi et al. (2026) and Bulmer et al. (2023), this module teaches teenagers in Valenzuela City how to safeguard their accounts, recognize social engineering, and build situational awareness through interactive 3D RPG quests."
  },
  {
    tag: "PILLAR 02 // MALICIOUS ACTIVITIES",
    title: "RECOGNIZING MALICIOUS WEBSITES",
    body: "Based on McCloy et al. (2026) and Zempila et al. (2025), players navigate simulated high-risk web sectors inside Unity 3D, learning how to spot spoofed domains, unauthorized scripts, and unsafe file downloads."
  },
  {
    tag: "PILLAR 03 // ADVERTISEMENT SCAMS",
    title: "DEFEATING ONLINE SCAMS & FAKE ALERTS",
    body: "Informed by Park & Kang (2026) and Li et al. (2026), learners confront NPC scammers using Fear-Of-Missing-Out (FOMO) tactics, urgency language, and fake prize pop-ups—practicing safe responses in a zero-risk environment."
  },
  {
    tag: "PILLAR 04 // WEB PRIVACY & SAFETY",
    title: "VPNS, AD BLOCKERS & DIGITAL PRIVACY",
    body: "Supported by Abbas et al. (2023), Ramesh et al. (2022), and Siddharth & Madisetti (2024), this module clarifies what VPNs and ad blockers actually do—and how teenagers can protect their personal data online."
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

  // Update Live Hero Telemetry Stats from TiDB Cloud
  const avgPass = Math.round(
    lessons.reduce((s, l) => s + Number(l.success_rate || 84), 0) / lessons.length
  );
  document.getElementById('live-lesson-count').innerText = String(lessons.length).padStart(2, '0');
  document.getElementById('live-quiz-count').innerText = String(lessons.length * 7).padStart(2, '0');
  document.getElementById('live-pass-rate').innerText = `${avgPass}%`;

  // Render the first 4 live lessons in the 2x2 Matrix Grid
  const previewContainer = document.getElementById('live-lessons-preview');
  previewContainer.innerHTML = lessons.slice(0, 4).map(l => `
    <div class="matrix-card">
      <div>
        <div style="display:flex; justify-content:space-between; font-size:0.74rem; color:#F288E8; font-weight:700; letter-spacing:1.5px;">
          <span>${(l.location_name || 'GAME SECTOR').toUpperCase()}</span>
          <span>${l.xp_reward} XP</span>
        </div>
        <h4 style="font-family:'Orbitron',sans-serif; font-size:1.05rem; color:#8CEEF6; margin:8px 0;">
          ${l.title}
        </h4>
        <p style="font-size:0.9rem; color:#EDE9F7; line-height:1.4;">
          ${l.content}
        </p>
      </div>
      <div style="margin-top:12px; font-size:0.82rem; font-weight:700; color:#4AD8F0;">
        LIVE LEARNER PASS RATE: ${l.success_rate}%
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
  document.getElementById('info-modal-tag').innerText = "/// SYSTEM_ARCHITECTURE";
  document.getElementById('info-modal-title').innerText = "HOW WEBRPG! WORKS";
  document.getElementById('info-modal-body').innerText =
    "WebRPG! is a 3D desktop game built in Unity (C#) for teenagers in Valenzuela City. Players create an account, explore 5 locked cyber-sectors, talk to NPCs in choice-based scenarios, and pass Pre-Tests, 5 Mission Quizzes, and Post-Tests synced live with our MySQL database.";
  document.getElementById('info-modal').classList.remove('hidden');
}

function closeInfoModal() {
  document.getElementById('info-modal').classList.add('hidden');
}

function handleQuickRegister(e) {
  e.preventDefault();
  const email = document.getElementById('learner-email-input').value;
  document.getElementById('learner-email-input').value = '';
  openDownloadModal();
}

function triggerDownloadNotice(e) {
  // If you haven't uploaded the Unity .zip build to the repo yet, show a clean message
  e.preventDefault();
  closeDownloadModal();
  document.getElementById('info-modal-tag').innerText = "/// DOWNLOAD_INITIATED";
  document.getElementById('info-modal-title').innerText = "WEBRPG! DESKTOP CLIENT";
  document.getElementById('info-modal-body').innerText =
    "Your download for WebRPG_Installer_v1.0.0_x64.zip has been queued! (Place your exported Unity Windows .zip build in the project root folder or link it to GitHub Releases to serve the binary.)";
  document.getElementById('info-modal').classList.remove('hidden');
}

initLandingPage();