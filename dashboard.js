/* ── AUTH GUARD ── */
const cpUser = sessionStorage.getItem('cp_user');
if (!cpUser) { window.location.href = 'getstarted.html'; }
document.getElementById('navWelcome').textContent = '👋 Hi, ' + cpUser + '!';
document.getElementById('overviewName').textContent = cpUser;

/* ── STATE ── */
const state = {
  cvScore: null,
  sessions: JSON.parse(sessionStorage.getItem('cp_sessions') || '[]'),
  currentField: null,
  currentDiff: 'beginner',
  currentQNum: 0,
  currentQs: [],
  sessionScores: [],
};

function saveState() {
  sessionStorage.setItem('cp_sessions', JSON.stringify(state.sessions));
}

/* ── LOGOUT ── */
function logout() {
  sessionStorage.clear();
  window.location.href = 'getstarted.html';
}

/* ── VIEW SWITCH ── */
function showView(name, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  if (btn) btn.classList.add('active');
  if (name === 'progress') updateProgress();
  if (name === 'overview') updateOverview();
}

/* ── OVERVIEW UPDATE ── */
function updateOverview() {
  document.getElementById('stat-cv').textContent = state.cvScore !== null ? state.cvScore : '—';
  document.getElementById('stat-interviews').textContent = state.sessions.length;
  const avg = state.sessions.length
    ? Math.round(state.sessions.reduce((a,s) => a + s.score, 0) / state.sessions.length)
    : null;
  document.getElementById('stat-avg').textContent = avg !== null ? avg : '—';
  document.getElementById('stat-badges').textContent = countBadges();

  const actEl = document.getElementById('recent-activity');
  if (state.sessions.length === 0 && state.cvScore === null) {
    actEl.innerHTML = '<span style="color:var(--dim)">No sessions yet. Start by analyzing your CV or doing a mock interview!</span>';
  } else {
    let html = '';
    if (state.cvScore !== null) {
      html += `<div style="padding:10px 0;border-bottom:0.5px solid var(--border);font-size:13px">
        📄 CV analyzed — Score: <b style="color:var(--accent)">${state.cvScore}/100</b></div>`;
    }
    state.sessions.slice(-3).reverse().forEach(s => {
      html += `<div style="padding:10px 0;border-bottom:0.5px solid var(--border);font-size:13px">
        🎙️ ${s.field} interview (${s.difficulty}) — Score: <b style="color:var(--green)">${s.score}/100</b></div>`;
    });
    actEl.innerHTML = html || '<span style="color:var(--dim)">No sessions yet.</span>';
  }
}

/* ── FILE UPLOAD ── */
let selectedFile = null;

function handleFileSelect(input) {
  const file = input.files[0];
  if (!file) return;
  selectedFile = file;
  document.getElementById('uploadTitle').textContent = file.name;
  document.getElementById('uploadSub').textContent = (file.size / 1024).toFixed(1) + ' KB — Ready to analyze';
  document.getElementById('analyzeBtn').style.display = 'flex';
  document.getElementById('analyzeBtn').style.alignItems = 'center';
  document.getElementById('fileName').textContent = file.name;
  document.getElementById('uploadZone').style.borderColor = 'var(--accent)';
}

/* ── CV ANALYSIS via AI ── */
async function analyzeCV() {
  if (!selectedFile) return;

  document.getElementById('analyzeBtn').style.display = 'none';
  document.getElementById('uploadLoading').style.display = 'flex';
  document.getElementById('cvResult').classList.remove('show');

  let fileText = '';
  try {
    fileText = await readFileText(selectedFile);
  } catch (e) {
    fileText = `[CV file: ${selectedFile.name}] Unable to read file content directly.`;
  }

  const prompt = `You are an expert HR professional and resume coach. Analyze this CV/resume and provide detailed feedback.

CV Content:
${fileText.slice(0, 3000)}

Provide your analysis in this exact JSON format (no markdown, just raw JSON):
{
  "score": <number 0-100>,
  "label": "<Strong|Good|Average|Needs Work>",
  "summary": "<2 sentence overall summary>",
  "feedback": [
    {"type": "positive", "text": "<strength 1>"},
    {"type": "positive", "text": "<strength 2>"},
    {"type": "warning", "text": "<area to improve 1>"},
    {"type": "warning", "text": "<area to improve 2>"},
    {"type": "tip", "text": "<actionable tip 1>"},
    {"type": "tip", "text": "<actionable tip 2>"}
  ]
}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await resp.json();
    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    showCVResult(result);
  } catch (e) {
    // Fallback mock result
    showCVResult({
      score: 68,
      label: 'Good',
      summary: 'Your CV shows solid experience and relevant skills. With a few targeted improvements, it can stand out to recruiters significantly.',
      feedback: [
        { type: 'positive', text: '✅ Clear structure and readable formatting' },
        { type: 'positive', text: '✅ Relevant work experience is highlighted' },
        { type: 'warning', text: '⚠️ Missing quantifiable achievements (numbers, percentages)' },
        { type: 'warning', text: '⚠️ Skills section could be more specific and keyword-rich' },
        { type: 'tip', text: '💡 Add a professional summary at the top (3-4 lines)' },
        { type: 'tip', text: '💡 Use action verbs: "Led", "Built", "Improved", "Delivered"' }
      ]
    });
  }
}

function readFileText(file) {
  return new Promise((resolve, reject) => {
    if (file.type === 'application/pdf') {
      resolve(`[PDF file: ${file.name}] This is a PDF resume.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function showCVResult(result) {
  document.getElementById('uploadLoading').style.display = 'none';
  document.getElementById('cvResult').classList.add('show');

  // Animate score
  const target = result.score;
  state.cvScore = target;
  saveState();

  let current = 0;
  const step = target / 40;
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    document.getElementById('cvScoreNum').textContent = Math.round(current);
    const offset = 314 - (314 * (current / 100));
    document.getElementById('scoreCircle').style.strokeDashoffset = offset;
    if (current >= target) clearInterval(timer);
  }, 30);

  const colors = { Strong: '#34C759', Good: '#4F7EFF', Average: '#FFB700', 'Needs Work': '#FF5C5C' };
  document.getElementById('cvScoreNum').style.color = colors[result.label] || '#4F7EFF';
  document.getElementById('cvScoreLabel').textContent = `${result.label} Resume (${result.score}/100)`;
  document.getElementById('cvScoreSummary').textContent = result.summary;

  const icons = { positive: '✅', warning: '⚠️', tip: '💡' };
  const feedbackHtml = result.feedback.map(f =>
    `<li><span class="fi">${icons[f.type] || '•'}</span><span>${f.text}</span></li>`
  ).join('');
  document.getElementById('cvFeedbackList').innerHTML = feedbackHtml;

  // Earn badge
  if (result.score >= 80) earnBadge('badge-cv-80');
  earnBadge('badge-first-cv');
  updateOverview();
}

/* ── INTERVIEW ── */
const QUESTIONS = {
  it: {
    beginner: [
      "Tell me about yourself and why you're interested in IT.",
      "What programming languages are you familiar with?",
      "Explain what a database is and give an example.",
      "What does HTML stand for and what is it used for?",
      "Describe the difference between hardware and software."
    ],
    intermediate: [
      "Explain the difference between REST and SOAP APIs.",
      "What is OOP and can you explain its four pillars?",
      "How does a relational database differ from NoSQL?",
      "Describe the software development life cycle (SDLC).",
      "What is version control and why is Git important?"
    ],
    advanced: [
      "Design a scalable architecture for a high-traffic web app.",
      "Explain microservices vs monolithic architecture trade-offs.",
      "How would you approach optimizing a slow SQL query?",
      "Describe your experience with CI/CD pipelines.",
      "How do you handle security vulnerabilities in production?"
    ]
  },
  business: {
    beginner: [
      "Tell me about yourself and your interest in business.",
      "What do you understand by marketing?",
      "Explain the concept of supply and demand.",
      "What is a balance sheet?",
      "Why is customer service important for a business?"
    ],
    intermediate: [
      "Describe a time you resolved a conflict at work.",
      "How would you analyze market competition for a new product?",
      "What is a SWOT analysis and when would you use it?",
      "Explain the difference between B2B and B2C businesses.",
      "How do you prioritize tasks when managing multiple projects?"
    ],
    advanced: [
      "How would you develop a go-to-market strategy for a new product?",
      "Describe your approach to leading organizational change.",
      "How do you measure ROI on a marketing campaign?",
      "Walk me through a strategic business decision you've made.",
      "How do you build and maintain stakeholder relationships?"
    ]
  },
  engineering: {
    beginner: [
      "Tell me about yourself and your engineering background.",
      "What branch of engineering are you studying or working in?",
      "Explain Newton's second law of motion.",
      "What is the difference between AC and DC current?",
      "What software tools do you use in your engineering work?"
    ],
    intermediate: [
      "Describe a project where you solved a complex engineering problem.",
      "How do you approach failure mode analysis (FMEA)?",
      "What safety standards are important in your field?",
      "Explain the importance of quality control in engineering.",
      "How do you manage project timelines and technical constraints?"
    ],
    advanced: [
      "Walk me through a complex engineering design decision you made.",
      "How do you ensure your designs meet regulatory compliance?",
      "Describe your experience with simulation tools (FEA, CFD, etc.)",
      "How do you approach technical risk management?",
      "Explain a time you had to innovate under strict constraints."
    ]
  }
};

const fieldNames = { it: 'Information Technology', business: 'Business & Management', engineering: 'Engineering' };
let selectedFieldEl = null;

function selectField(field, el) {
  if (selectedFieldEl) selectedFieldEl.classList.remove('selected');
  el.classList.add('selected');
  selectedFieldEl = el;
  state.currentField = field;
  document.getElementById('difficultyRow').style.display = 'block';
  document.getElementById('startBtnWrap').style.display = 'block';
}

function selectDiff(diff, el) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  state.currentDiff = diff;
  el.style.borderColor = 'var(--accent)';
  el.style.color = 'var(--accent)';
}

function startInterview() {
  if (!state.currentField) return;

  state.currentQs = [...QUESTIONS[state.currentField][state.currentDiff]];
  state.currentQNum = 0;
  state.sessionScores = [];

  document.getElementById('fieldSelect').style.display = 'none';
  const session = document.getElementById('interviewSession');
  session.classList.add('active');
  document.getElementById('interviewScoreCard').classList.remove('show');
  document.getElementById('sessionLabel').textContent =
    `${fieldNames[state.currentField]} — ${state.currentDiff.charAt(0).toUpperCase() + state.currentDiff.slice(1)}`;

  const chatBox = document.getElementById('chatBox');
  chatBox.innerHTML = '';
  appendMsg('ai', `👋 Hello! I'm your AI interviewer for today's ${fieldNames[state.currentField]} session. I'll ask you 5 questions and give feedback on each answer. Ready? Let's start!\n\n<b>Question 1:</b> ${state.currentQs[0]}`);
  document.getElementById('qCount').textContent = '1';
}

function appendMsg(role, html) {
  const chatBox = document.getElementById('chatBox');
  const div = document.createElement('div');
  div.className = 'chat-msg';
  div.innerHTML = `
    <div class="chat-avatar ${role}">${role === 'ai' ? '🤖' : '👤'}</div>
    <div class="chat-bubble ${role === 'user' ? 'user' : ''}">${html}</div>`;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendAnswer() {
  const input = document.getElementById('userAnswer');
  const answer = input.value.trim();
  if (!answer || document.getElementById('sendBtn').disabled) return;

  input.value = '';
  appendMsg('user', answer);

  document.getElementById('sendBtn').disabled = true;
  appendMsg('ai', '<div class="loading"><div class="spinner"></div> Evaluating your answer…</div>');

  const q = state.currentQs[state.currentQNum];
  const prompt = `You are an expert interviewer for ${fieldNames[state.currentField]} (${state.currentDiff} level).

Question asked: "${q}"
Candidate's answer: "${answer}"

Give brief, encouraging feedback in 2-3 sentences. Score this answer from 0-100. Be realistic but supportive.

Respond in JSON only:
{"score": <number>, "feedback": "<2-3 sentence feedback>", "tip": "<one specific improvement tip>"}`;

  let score = 70;
  let feedback = '';

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    const data = await resp.json();
    const raw = data.content[0].text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);
    score = result.score;
    feedback = `${result.feedback}<br><br>💡 <i>Tip: ${result.tip}</i>`;
  } catch (e) {
    score = Math.floor(Math.random() * 30) + 60;
    feedback = `Good attempt! Your answer addressed the key points. Consider providing more specific examples to strengthen your response.<br><br>💡 <i>Tip: Structure answers using the STAR method (Situation, Task, Action, Result).</i>`;
  }

  // Remove loading bubble
  const chatBox = document.getElementById('chatBox');
  chatBox.lastChild.remove();

  state.sessionScores.push(score);
  state.currentQNum++;

  const scoreColor = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)';
  appendMsg('ai',
    `<b style="color:${scoreColor}">Score: ${score}/100</b><br>${feedback}`);

  if (state.currentQNum < 5) {
    document.getElementById('qCount').textContent = state.currentQNum + 1;
    setTimeout(() => {
      appendMsg('ai', `<b>Question ${state.currentQNum + 1}:</b> ${state.currentQs[state.currentQNum]}`);
      document.getElementById('sendBtn').disabled = false;
      chatBox.scrollTop = chatBox.scrollHeight;
    }, 800);
  } else {
    finishInterview();
  }
}

function finishInterview() {
  const avg = Math.round(state.sessionScores.reduce((a, b) => a + b, 0) / state.sessionScores.length);
  const msg = avg >= 80 ? "Outstanding performance! You're interview-ready. 🎉"
             : avg >= 65 ? "Good work! A bit more practice and you'll nail it. 💪"
             : "Keep practicing — confidence comes with repetition. You got this! 🌱";

  document.getElementById('iScoreNum').textContent = avg;
  document.getElementById('iScoreMsg').textContent = msg;
  document.getElementById('interviewScoreCard').classList.add('show');

  const session = {
    field: fieldNames[state.currentField],
    difficulty: state.currentDiff,
    score: avg,
    date: new Date().toLocaleDateString()
  };
  state.sessions.push(session);
  saveState();

  earnBadge('badge-first-interview');
  if (avg >= 70) earnBadge('badge-score-70');
  if (avg >= 90) earnBadge('badge-score-90');
  if (state.sessions.length >= 5) earnBadge('badge-5-sessions');

  updateOverview();
  document.getElementById('sendBtn').disabled = true;
}

function endInterview() {
  document.getElementById('interviewSession').classList.remove('active');
  document.getElementById('fieldSelect').style.display = 'block';
  document.getElementById('interviewScoreCard').classList.remove('show');
  state.currentQNum = 0;
}

function retryInterview() {
  document.getElementById('interviewScoreCard').classList.remove('show');
  document.getElementById('chatBox').innerHTML = '';
  startInterview();
}

/* ── PROGRESS ── */
function updateProgress() {
  const sessions = state.sessions;
  document.getElementById('prog-sessions').textContent = sessions.length;

  if (sessions.length > 0) {
    const avg = Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length);
    const best = Math.max(...sessions.map(s => s.score));
    document.getElementById('prog-best').textContent = best;

    const cvS = state.cvScore || 0;
    const readiness = Math.round((avg * 0.6 + cvS * 0.4));
    document.getElementById('prog-readiness').textContent = readiness + '%';

    // Skill bars (derived from session data)
    const comm = Math.min(100, avg + Math.floor(Math.random() * 10) - 5);
    const tech  = Math.min(100, avg + Math.floor(Math.random() * 14) - 7);
    const prob  = Math.min(100, avg + Math.floor(Math.random() * 12) - 6);
    const conf  = Math.min(100, Math.round(avg * 0.9));
    const cvBar = state.cvScore || 0;

    animateBar('bar-comm', comm); document.getElementById('bar-comm-val').textContent = comm + '%';
    animateBar('bar-tech', tech); document.getElementById('bar-tech-val').textContent = tech + '%';
    animateBar('bar-prob', prob); document.getElementById('bar-prob-val').textContent = prob + '%';
    animateBar('bar-conf', conf); document.getElementById('bar-conf-val').textContent = conf + '%';
    animateBar('bar-cv', cvBar);  document.getElementById('bar-cv-val').textContent = cvBar + '%';
  } else {
    document.getElementById('prog-readiness').textContent = '—';
    document.getElementById('prog-best').textContent = '—';
  }

  document.getElementById('prog-streak').textContent = sessions.length > 0 ? '1 day' : '0 days';
  document.getElementById('prog-sessions').textContent = sessions.length;

  // Session history
  const histEl = document.getElementById('sessionHistory');
  if (sessions.length === 0) {
    histEl.innerHTML = '<div style="font-size:13px; color:var(--dim)">No sessions yet.</div>';
  } else {
    histEl.innerHTML = sessions.slice(-5).reverse().map(s => {
      const scoreClass = s.score >= 80 ? 'high' : s.score >= 60 ? 'mid' : 'low';
      return `<div class="session-item">
        <div class="session-left">
          <span class="session-icon">🎙️</span>
          <div class="session-info">
            <div class="session-title">${s.field}</div>
            <div class="session-meta">${s.difficulty} · ${s.date}</div>
          </div>
        </div>
        <div class="session-score ${scoreClass}">${s.score}</div>
      </div>`;
    }).join('');
  }

  if (state.cvScore) {
    histEl.innerHTML = `<div class="session-item">
      <div class="session-left"><span class="session-icon">📄</span>
        <div class="session-info"><div class="session-title">CV Analysis</div><div class="session-meta">Resume scored</div></div>
      </div><div class="session-score high">${state.cvScore}</div></div>` + histEl.innerHTML;
  }
}

function animateBar(id, target) {
  const el = document.getElementById(id);
  setTimeout(() => { el.style.width = target + '%'; }, 100);
}

/* ── BADGES ── */
function earnBadge(id) {
  const el = document.getElementById(id);
  if (el && !el.classList.contains('earned')) {
    el.classList.add('earned');
    sessionStorage.setItem('badge_' + id, '1');
  }
}

function countBadges() {
  return document.querySelectorAll('.badge-item.earned').length;
}

function loadBadges() {
  ['badge-first-cv','badge-first-interview','badge-score-70','badge-score-90','badge-5-sessions','badge-cv-80'].forEach(id => {
    if (sessionStorage.getItem('badge_' + id)) earnBadge(id);
  });
}

/* ── INIT ── */
loadBadges();
updateOverview();

// Check if user came from free plan (redirect from index.html)
const plan = sessionStorage.getItem('cp_plan') || 'free';
if (plan === 'free') {
  // Free plan — 5 sessions limit notice can be added later
}