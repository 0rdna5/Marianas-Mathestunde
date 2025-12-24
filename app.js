// Marianas Mathestunde – Fokus Upgrade (AT AHS)
// Fokus: lineare Funktionen, Potenzen & Wurzeln, Geometrie, Terme & Klammern
const el = (id) => document.getElementById(id);

const questionEl = el("question");
const hintEl = el("hint");
const answerEl = el("answer");
const feedbackEl = el("feedback");
const topicEl = el("topic");

const levelPill = el("levelPill");
const streakPill = el("streakPill");
const scorePill = el("scorePill");

// ---------------- Papa-Begleiter (Companion) ----------------
let companionEl = null;

function ensureCompanion() {
  if (companionEl) return;

  companionEl = document.createElement("div");
  companionEl.className = "companion";
  companionEl.innerHTML = `
    <div class="companionIcon">👨‍👧</div>
    <div class="companionText">
      <div class="companionTitle">Papa</div>
      <div class="companionMsg">Los geht’s – du schaffst das.</div>
    </div>
  `;

  // direkt UNTER dem Feedback einfügen
  feedbackEl.insertAdjacentElement("afterend", companionEl);
}

function setCompanionMessage(msg, title = "Papa") {
  ensureCompanion();
  companionEl.querySelector(".companionTitle").textContent = title;
  companionEl.querySelector(".companionMsg").textContent = msg;
}


const checkBtn = el("checkBtn");
const skipBtn = el("skipBtn");
const newBtn = el("newBtn");
const resetBtn = el("resetBtn");

const avatarEl = el("avatar");
const subtitleEl = el("subtitle");

const profileBtn = el("profileBtn");
const modalBackdrop = el("modalBackdrop");
const closeModalBtn = el("closeModalBtn");
const playerNameInput = el("playerName");
const themeSelect = el("theme");
const saveProfileBtn = el("saveProfileBtn");

const dailyText = el("dailyText");
const dailyDone = el("dailyDone");
const barFill = el("barFill");


const STATE_KEY = "mmm_state_v3";
const PROFILE_KEY = "mmm_profile_v1";
const STATS_KEY = "mmm_topic_stats_v1"; // adaptive repetition
const CARDS_KEY = "mmm_cards_cache_v1";
const DAILY_KEY = "mmm_daily_v1";
const DAILY_TARGET = 15;


function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function normalizeNumber(str) { return String(str).trim().replace(",", "."); }
function nearlyEqual(a, b, eps = 1e-9) { return Math.abs(a - b) < eps; }

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// ---------------- State / Profile ----------------
let state = loadJSON(STATE_KEY, { level: 1, streak: 0, score: 0 });
let profile = loadJSON(PROFILE_KEY, { name: "Mariana", theme: "mint" });

// topic stats: { topic: { correct: n, wrong: n } }
let topicStats = loadJSON(STATS_KEY, {
  terms: { correct: 0, wrong: 0 },
  linear: { correct: 0, wrong: 0 },
  powers: { correct: 0, wrong: 0 },
  roots: { correct: 0, wrong: 0 },
  geometry: { correct: 0, wrong: 0 }
});

// loaded card deck
let deck = { meta: {}, cards: [] };
let current = null;

function applyProfile() {
  const name = (profile.name || "Mariana").trim();
  avatarEl.textContent = name ? name[0].toUpperCase() : "M";
  subtitleEl.textContent = `Für ${name} • AHS Unterstufe`;
  document.documentElement.setAttribute("data-theme", profile.theme || "mint");
  playerNameInput.value = name;
  themeSelect.value = profile.theme || "mint";
}

function renderStats() {
  levelPill.textContent = `Level ${state.level}`;
  streakPill.textContent = `Streak ${state.streak}`;
  scorePill.textContent = `Punkte ${state.score}`;
}

function saveAll() {
  saveJSON(STATE_KEY, state);
  saveJSON(PROFILE_KEY, profile);
  saveJSON(STATS_KEY, topicStats);
}

function todayKey() {
  // Local date key: YYYY-MM-DD
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function loadDaily() {
  const t = todayKey();
  const stored = loadJSON(DAILY_KEY, { day: t, solved: 0 });
  if (stored.day !== t) return { day: t, solved: 0 }; // new day -> reset
  return stored;
}

function saveDaily(d) { saveJSON(DAILY_KEY, d); }

let daily = loadDaily();

function renderDaily() {
  const solved = Math.min(daily.solved, DAILY_TARGET);
  dailyText.textContent = `Tagesziel: ${solved}/${DAILY_TARGET}`;
  const pct = Math.round((solved / DAILY_TARGET) * 100);
  barFill.style.width = `${Math.min(100, pct)}%`;
  dailyDone.hidden = solved < DAILY_TARGET;
}


// ---------------- Card deck loading ----------------
async function loadDeck() {
  // Try localStorage cache first (fast), fallback to fetch.
  const cached = loadJSON(CARDS_KEY, null);
  if (cached && cached.cards) deck = cached;

  try {
    const res = await fetch("./levels.json", { cache: "no-store" });
    if (res.ok) {
      deck = await res.json();
      saveJSON(CARDS_KEY, deck);
    }
  } catch {
    // offline/no fetch -> keep cached
  }
}

function cardsForTopic(topic) {
  return (deck.cards || []).filter(c => c.topic === topic);
}

// ---------------- Topic selection (weighted + adaptive) ----------------
// Base weights = your chosen focus
const BASE_WEIGHTS = {
  terms: 26,
  linear: 24,
  powers: 18,
  roots: 18,
  geometry: 14
};

function adaptiveWeight(topic) {
  const s = topicStats[topic] || { correct: 0, wrong: 0 };
  const total = s.correct + s.wrong;
  if (total < 6) return 1.0; // not enough data
  const wrongRate = s.wrong / total; // 0..1
  // boost topics with higher wrong-rate (up to +60%)
  return 1.0 + Math.min(0.6, wrongRate * 0.9);
}

function weightedPickTopic() {
  const selected = topicEl.value;
  if (selected !== "mix") return selected;

  const topics = Object.keys(BASE_WEIGHTS);
  const weights = topics.map(t => BASE_WEIGHTS[t] * adaptiveWeight(t));

  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < topics.length; i++) {
    r -= weights[i];
    if (r <= 0) return topics[i];
  }
  return topics[0];
}

// ---------------- Generators (procedural) ----------------
function genTerms(level) {
  // Klammern + zusammenfassen: a(bx + c) + dx + e
  const a = randInt(2, 6);
  const b = randInt(1, 6);
  const c = randInt(-9, 9);
  const d = randInt(1, 6);
  const e = randInt(-12, 12);

  // expression: a(bx + c) + dx + e
  // simplified: (a*b + d)x + (a*c + e)
  const coef = a * b + d;
  const konst = a * c + e;

  const signC = c >= 0 ? `+ ${c}` : `- ${Math.abs(c)}`;
  const signE = e >= 0 ? `+ ${e}` : `- ${Math.abs(e)}`;
  const prompt = `Vereinfache: ${a}(${b}x ${signC}) + ${d}x ${signE}`;

  // answer text in normalized format: "<coef>x<+/-const>"
  const ans = `${coef}x${konst >= 0 ? "+" + konst : konst}`;

  return {
    topic: "terms",
    q: prompt,
    hint: "Tipp: Erst ausmultiplizieren, dann x-Terme und Zahlen zusammenfassen.",
    answerType: "text",
    a: ans
  };
}

function genLinear(level) {
  // y = mx + b with integer result
  const m = randInt(-6, 8);
  const b = randInt(-12, 12);
  const x = randInt(-6, 10);
  const y = m * x + b;
  const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  return {
    topic: "linear",
    q: `Berechne y: y = ${m}x ${signB} für x = ${x}`,
    hint: "Tipp: x einsetzen → multiplizieren → +b.",
    answerType: "number",
    a: y
  };
}

function genPowers(level) {
  // a^n, keep manageable
  const a = randInt(2, 9);
  const n = level < 4 ? randInt(2, 4) : randInt(2, 5);
  return {
    topic: "powers",
    q: `Berechne: ${a}^${n}`,
    hint: "Tipp: Potenz = wiederholte Multiplikation.",
    answerType: "number",
    a: Math.pow(a, n)
  };
}

function genRoots(level) {
  // perfect squares
  const squares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144, 169, 196];
  const idxMax = Math.min(squares.length - 1, 6 + level);
  const v = squares[randInt(0, idxMax)];
  return {
    topic: "roots",
    q: `Berechne: √${v}`,
    hint: "Tipp: Welche Zahl mal sich selbst ergibt v?",
    answerType: "number",
    a: Math.round(Math.sqrt(v))
  };
}

function genGeometry(level) {
  // mix rectangle area, triangle area, circle circumference (π≈3,14)
  const type = randInt(0, 2);

  if (type === 0) {
    const a = randInt(3, 30);
    const b = randInt(3, 30);
    return {
      topic: "geometry",
      q: `Rechteck: a=${a} cm, b=${b} cm. Fläche A = ? (cm²)`,
      hint: "Tipp: A = a · b.",
      answerType: "number",
      a: a * b
    };
  }

  if (type === 1) {
    const g = randInt(4, 40);
    const h = randInt(3, 30);
    return {
      topic: "geometry",
      q: `Dreieck: g=${g} cm, h=${h} cm. Fläche A = ? (cm²)`,
      hint: "Tipp: A = (g · h) / 2.",
      answerType: "number",
      a: (g * h) / 2
    };
  }

  const r = randInt(2, 18);
  const U = Math.round(2 * 3.14 * r * 100) / 100;
  return {
    topic: "geometry",
    q: `Kreis: r=${r} cm. Umfang U ≈ ? (π≈3,14)`,
    hint: "Tipp: U ≈ 2 · 3,14 · r. (2 Dezimalstellen ok)",
    answerType: "number",
    a: U
  };
}

// ---------------- Question creation (cards + procedural) ----------------
function pickFromCardsOrProcedural(topic) {
  // 35% chance to use a fixed "card" (if available), else procedural generator
  const useCard = Math.random() < 0.35;
  const cards = cardsForTopic(topic);

  if (useCard && cards.length) {
    const c = cards[randInt(0, cards.length - 1)];
    return {
      topic: c.topic,
      q: c.prompt,
      hint: c.hint || "",
      answerType: c.answerType || "number",
      a: c.answer
    };
  }

  const L = state.level;
  if (topic === "terms") return genTerms(L);
  if (topic === "linear") return genLinear(L);
  if (topic === "powers") return genPowers(L);
  if (topic === "roots") return genRoots(L);
  if (topic === "geometry") return genGeometry(L);

  return genLinear(L);
}

function normalizeTextAnswer(s) {
  // For term simplification: remove spaces; unify "−" etc.
  return String(s)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/−/g, "-");
}

function newQuestion() {
  const topic = weightedPickTopic();
  current = pickFromCardsOrProcedural(topic);

  questionEl.textContent = current.q;
  hintEl.textContent = current.hint || "";
  feedbackEl.textContent = "";
  answerEl.value = "";
  answerEl.focus();
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const MSG = {
  correct: [
    "Yes! Genau so. 🧠✨",
    "Sauber gerechnet – ich bin stolz auf dich!",
    "Boom. Treffer. Weiter so!",
    "Richtig! Du wirst gerade richtig schnell."
  ],
  wrong: [
    "Kein Stress – Fehler sind Trainingspunkte. Versuch’s nochmal!",
    "Fast! Schau kurz auf den Tipp, dann packst du’s.",
    "Das war knapp daneben. Wir knacken das gemeinsam.",
    "Alles gut. Einmal ruhig durchrechnen – du kannst das."
  ],
  streak5: [
    "5er-Streak! Jetzt bist du im Flow!",
    "5 richtige am Stück – das ist Game-Mode.",
    "Streak 5: Mathe-Boss in Ausbildung!"
  ],
  streak10: [
    "10er-Streak!!! Das ist richtig stark. 🔥",
    "Wow: 10 am Stück – ich feier das!",
    "Level-Up Vibes: 10er-Streak!"
  ],
  streak15: [
    "15er-Streak… du bist heute unaufhaltbar!",
    "Das ist schon Profi-Niveau. 15 am Stück!",
    "Legendär. 15er-Streak!"
  ],
  goalDone: [
    "Tagesziel erreicht! 15/15 – Belohnung verdient. 🏆",
    "Yes! Heute gewonnen: 15 richtige. Mega!",
    "Mission complete: 15 richtige. Ich bin richtig stolz."
  ]
};


function checkAnswer() {
  if (!current) return;

  const topic = current.topic;
  let ok = false;

  if (current.answerType === "number") {
    const user = Number(normalizeNumber(answerEl.value));
    ok = Number.isFinite(user) && nearlyEqual(user, Number(current.a));
  } else {
    const user = normalizeTextAnswer(answerEl.value);
    const target = normalizeTextAnswer(current.a);
    ok = user === target;
  }

  if (ok) {
    state.streak += 1;
    state.score += 10 + Math.min(10, state.level);
    if (state.streak % 5 === 0) state.level += 1;

    topicStats[topic].correct += 1;

    feedbackEl.textContent = "✅ Richtig!";
    daily = loadDaily();      // falls Mitternacht überschritten wurde
    daily.solved += 1;
    saveDaily(daily);
    renderDaily();
    setCompanionMessage(pick(MSG.correct));

    if (state.streak === 5) setCompanionMessage(pick(MSG.streak5));
    if (state.streak === 10) setCompanionMessage(pick(MSG.streak10));
    if (state.streak === 15) setCompanionMessage(pick(MSG.streak15));

    // Tagesziel-Message, wenn gerade erreicht
    if (daily.solved === DAILY_TARGET) {
      setCompanionMessage(pick(MSG.goalDone), "Papa (Mission)");
    }


  } else {
    state.streak = 0;
    topicStats[topic].wrong += 1;

    const shown = String(current.a).replace(".", ",");
    feedbackEl.textContent = `❌ Nicht ganz. Richtige Antwort: ${shown}`;
    daily = loadDaily();
    renderDaily();
    setCompanionMessage(pick(MSG.wrong));


  }

  saveAll();
  renderStats();
}

function resetProgress() {
  state = { level: 1, streak: 0, score: 0 };
  topicStats = {
    terms: { correct: 0, wrong: 0 },
    linear: { correct: 0, wrong: 0 },
    powers: { correct: 0, wrong: 0 },
    roots: { correct: 0, wrong: 0 },
    geometry: { correct: 0, wrong: 0 }
  };
  saveAll();
  renderStats();
  newQuestion();
}

// ---------------- Modal / Profile ----------------
closeModal();
function openModal()  { modalBackdrop.classList.add("open"); }
function closeModal() { modalBackdrop.classList.remove("open"); }

profileBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", (e) => {
  e.preventDefault();
  closeModal();
});
modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeModal(); });

saveProfileBtn.addEventListener("click", (e) => {
  e.preventDefault();
  profile = {
    name: (playerNameInput.value || "Mariana").trim().slice(0, 20),
    theme: themeSelect.value || "cottoncandy"
  };
  saveAll();
  applyProfile();
  closeModal();
});

// Controls
checkBtn.addEventListener("click", checkAnswer);
newBtn.addEventListener("click", newQuestion);
skipBtn.addEventListener("click", newQuestion);
resetBtn.addEventListener("click", resetProgress);
answerEl.addEventListener("keydown", (e) => { if (e.key === "Enter") checkAnswer(); });
topicEl.addEventListener("change", newQuestion);

// Init
closeModal();
(async function init() {
  applyProfile();
  renderStats();
  renderDaily();
  setCompanionMessage("Heute 15 richtige – und ich bin bei jeder Aufgabe dabei.");
  await loadDeck();
  newQuestion();
})();
