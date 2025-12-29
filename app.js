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

const fxLayer = el("fxLayer");
const badgeToast = el("badgeToast");
const badgeIcon = el("badgeIcon");
const badgeTitle = el("badgeTitle");
const badgeSub = el("badgeSub");
const coinPill = el("coinPill"); // falls du Coins-Pill eingebaut hast
const streakFill = el("streakFill");
const streakValue = el("streakValue");
const coinFill = el("coinFill");
const coinValue = el("coinValue");


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
const shopList = el("shopList");
const shopMessage = el("shopMessage");
const shopCoins = el("shopCoins");

const dailyText = el("dailyText");
const dailyDone = el("dailyDone");
const barFill = el("barFill");


const STATE_KEY = "mmm_state_v3";
const PROFILE_KEY = "mmm_profile_v1";
const STATS_KEY = "mmm_topic_stats_v1"; // adaptive repetition
const CARDS_KEY = "mmm_cards_cache_v1";
const DAILY_KEY = "mmm_daily_v1";
const DAILY_TARGET = 15;
const DEFAULT_THEME = "cottoncandy";
const THEMES = [
  { id: "cottoncandy", name: "Cotton Candy" },
  { id: "lavender", name: "Lavender Glow" },
  { id: "skyrose", name: "Sky Rose" }
];
const THEME_PRICES = {
  [DEFAULT_THEME]: 0,
  lavender: 20,
  skyrose: 20
};


function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function normalizeNumber(str) { return String(str).trim().replace(",", "."); }
function nearlyEqual(a, b, eps = 1e-9) { return Math.abs(a - b) < eps; }

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// ---------------- State / Profile ----------------
const DEFAULT_STATE = { level: 1, streak: 0, score: 0, coins: 0 };
const DEFAULT_PROFILE = { name: "Mariana", theme: DEFAULT_THEME, unlockedThemes: [DEFAULT_THEME] };

function normalizeProfile(rawProfile) {
  const data = { ...DEFAULT_PROFILE, ...(rawProfile || {}) };
  const unlocked = Array.isArray(data.unlockedThemes) ? [...new Set(data.unlockedThemes)] : [];
  if (!unlocked.includes(DEFAULT_THEME)) unlocked.push(DEFAULT_THEME);
  if (data.theme && !unlocked.includes(data.theme)) unlocked.push(data.theme);

  return { ...data, unlockedThemes: unlocked };
}

let state = { ...DEFAULT_STATE, ...loadJSON(STATE_KEY, DEFAULT_STATE) };
if (!Number.isFinite(state.coins)) state.coins = 0;
let profile = normalizeProfile(loadJSON(PROFILE_KEY, DEFAULT_PROFILE));

// topic stats: { topic: { correct: n, wrong: n } }
const ALL_TOPICS = [
  "terms",
  "equations",
  "powers",
  "roots",
  "percent",
  "linear",
  "geometry",
  "pythagoras"
];

const DEFAULT_TOPIC_STATS = ALL_TOPICS.reduce((acc, topic) => {
  acc[topic] = { correct: 0, wrong: 0 };
  return acc;
}, {});

let topicStats = { ...DEFAULT_TOPIC_STATS, ...loadJSON(STATS_KEY, DEFAULT_TOPIC_STATS) };

// loaded card deck
let deck = { meta: {}, cards: [] };
let current = null;

function themeName(id) {
  return THEMES.find((t) => t.id === id)?.name || id;
}

function isThemeUnlocked(themeId) {
  return (profile.unlockedThemes || []).includes(themeId);
}

function renderThemeOptions() {
  if (!themeSelect) return;
  const unlocked = new Set(profile.unlockedThemes || []);
  Array.from(themeSelect.options).forEach((opt) => {
    const unlockedTheme = unlocked.has(opt.value);
    opt.disabled = !unlockedTheme;
    opt.textContent = `${unlockedTheme ? "" : "🔒 "}${themeName(opt.value)}`;
    opt.classList.toggle("lockedOption", !unlockedTheme);
  });

  const active = profile.theme || DEFAULT_THEME;
  if (!unlocked.has(active)) {
    profile.unlockedThemes = Array.from(new Set([active, ...unlocked]));
  }
  themeSelect.value = active;
}

function applyProfile() {
  const name = (profile.name || "Mariana").trim();
  avatarEl.textContent = name ? name[0].toUpperCase() : "M";
  subtitleEl.textContent = `Für ${name} • AHS Unterstufe`;
  document.documentElement.setAttribute("data-theme", profile.theme || DEFAULT_THEME);
  playerNameInput.value = name;
  renderThemeOptions();
}

function renderStats() {
  levelPill.textContent = `Level ${state.level}`;
  streakPill.textContent = `Streak ${state.streak}`;
  scorePill.textContent = `Punkte ${state.score}`;
  if (coinPill) coinPill.textContent = `Coins ${state.coins ?? 0}`;

  const streakCap = 15;
  if (streakFill) {
    const pct = Math.min(1, (state.streak || 0) / streakCap);
    streakFill.style.width = `${Math.round(pct * 100)}%`;
  }
  if (streakValue) streakValue.textContent = `${Math.min(state.streak, streakCap)}/${streakCap}`;

  if (coinFill || coinValue) {
    const coins = state.coins ?? 0;
    const coinTarget = 20;
    const pctCoin = Math.min(1, coins / coinTarget);
    if (coinFill) coinFill.style.width = `${Math.round(pctCoin * 100)}%`;

    const boost = 1 + Math.min(1.5, (state.streak || 0) * 0.05);
    if (coinValue) coinValue.textContent = `x${boost.toFixed(1)}`;
  }

  renderShop();
}

function renderShop() {
  if (!shopList) return;
  shopList.innerHTML = "";
  const unlocked = new Set(profile.unlockedThemes || []);
  if (shopCoins) shopCoins.textContent = `Coins ${state.coins ?? 0}`;

  THEMES.forEach((theme) => {
    const card = document.createElement("div");
    card.className = "shopItem";

    const info = document.createElement("div");
    info.className = "shopInfo";
    const nameEl = document.createElement("div");
    nameEl.className = "shopItemName";
    nameEl.textContent = themeName(theme.id);

    const price = THEME_PRICES[theme.id] ?? 20;
    const priceEl = document.createElement("div");
    priceEl.className = "shopPrice";
    priceEl.textContent = price === 0 ? "Kostenlos" : `${price} Coins`;

    info.appendChild(nameEl);
    info.appendChild(priceEl);

    const actions = document.createElement("div");
    actions.className = "shopActions";

    if (profile.theme === theme.id) {
      const active = document.createElement("span");
      active.className = "activeBadge";
      active.textContent = "Aktiv";
      actions.appendChild(active);
    }

    if (unlocked.has(theme.id)) {
      const badge = document.createElement("span");
      badge.className = "lockedBadge";
      badge.textContent = "Freigeschaltet";
      actions.appendChild(badge);
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shopButton";
    btn.textContent = unlocked.has(theme.id) ? "Freigeschaltet" : "Freischalten";
    btn.disabled = unlocked.has(theme.id);
    btn.addEventListener("click", () => unlockTheme(theme.id));

    actions.appendChild(btn);

    card.appendChild(info);
    card.appendChild(actions);
    shopList.appendChild(card);
  });
}

function unlockTheme(themeId) {
  const price = THEME_PRICES[themeId] ?? 20;
  const unlocked = new Set(profile.unlockedThemes || []);
  if (unlocked.has(themeId)) {
    if (shopMessage) shopMessage.textContent = "Schon freigeschaltet.";
    return;
  }

  const coins = state.coins ?? 0;
  if (coins < price) {
    if (shopMessage) shopMessage.textContent = `Dir fehlen ${price - coins} Coins. Erst sammeln, dann freischalten!`;
    return;
  }

  state.coins = coins - price;
  profile.unlockedThemes = Array.from(new Set([...unlocked, themeId]));
  saveAll();
  renderStats();
  renderThemeOptions();
  renderShop();
  if (shopMessage) shopMessage.textContent = `${themeName(themeId)} ist jetzt freigeschaltet!`;
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

function ensureTopicStats(topic) {
  if (!topicStats[topic]) {
    topicStats[topic] = { correct: 0, wrong: 0 };
  }
  return topicStats[topic];
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

function genEquations(level) {
  // ax + b = c with integer solution
  const maxCoef = Math.min(8, 3 + level);
  const a = randInt(1, maxCoef) * (Math.random() < 0.3 ? -1 : 1);
  const x = randInt(-10, 12);
  const b = randInt(-12, 12);
  const c = a * x + b;
  const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;

  return {
    topic: "equations",
    q: `Löse: ${a}x ${signB} = ${c}`,
    hint: "Tipp: Erst b auf die andere Seite, dann durch a teilen.",
    answerType: "number",
    a: x
  };
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function genPercent(level) {
  const percOptions = [10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90];
  const p = percOptions[randInt(0, percOptions.length - 1)];
  const divisor = 100 / gcd(p, 100); // ensures integer result
  const multiplier = level < 4 ? randInt(2, 10) : randInt(4, 16);
  const G = divisor * multiplier * (level > 5 ? randInt(2, 3) : 1);
  const result = (G * p) / 100;

  return {
    topic: "percent",
    q: `Wie viel sind ${p}% von ${G}?`,
    hint: "Tipp: p% = p/100. Also G · p / 100.",
    answerType: "number",
    a: result
  };
}

function genPythagoras(level) {
  const triples = [
    { a: 3, b: 4, c: 5 },
    { a: 5, b: 12, c: 13 },
    { a: 8, b: 15, c: 17 },
    { a: 7, b: 24, c: 25 },
    { a: 9, b: 40, c: 41 }
  ];

  const idx = Math.min(triples.length - 1, Math.max(0, level - 1));
  const base = triples[randInt(0, idx)];
  const scale = level < 3 ? 1 : level < 6 ? randInt(1, 2) : randInt(1, 3);
  const a = base.a * scale;
  const b = base.b * scale;
  const c = base.c * scale;

  return {
    topic: "pythagoras",
    q: `Rechtwinkliges Dreieck: a=${a} cm, b=${b} cm. Hypotenuse c = ? (cm)`,
    hint: "Tipp: c² = a² + b². Nutze das Tripel.",
    answerType: "number",
    a: c
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
  if (topic === "equations") return genEquations(L);
  if (topic === "percent") return genPercent(L);
  if (topic === "pythagoras") return genPythagoras(L);

  console.warn(`Unknown topic '${topic}', fallback to 'linear'.`);
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

let toastTimer = null;

function showBadge({ icon = "🏆", title = "Achievement!", sub = "Nice!" } = {}) {
  badgeIcon.textContent = icon;
  badgeTitle.textContent = title;
  badgeSub.textContent = sub;

  badgeToast.hidden = false;
  badgeToast.classList.remove("hide");
  badgeToast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    badgeToast.classList.remove("show");
    badgeToast.classList.add("hide");
    setTimeout(() => { badgeToast.hidden = true; }, 220);
  }, 1400);
}

function burstConfetti(count = 24) {
  if (!fxLayer) return;
  const w = window.innerWidth;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "confetti";
    p.style.left = `${Math.random() * w}px`;
    p.style.setProperty("--dur", `${900 + Math.random() * 700}ms`);
    p.style.opacity = `${0.7 + Math.random() * 0.3}`;
    p.style.transform = `translateY(-20px) rotate(${Math.random()*180}deg)`;

    fxLayer.appendChild(p);
    setTimeout(() => p.remove(), 2000);
  }
}


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

    const stats = ensureTopicStats(topic);
    stats.correct += 1;

    feedbackEl.textContent = "✅ Richtig!";
    daily = loadDaily();      // falls Mitternacht überschritten wurde
    daily.solved += 1;
    saveDaily(daily);
    renderDaily();
    state.coins = (state.coins ?? 0) + 1;
    setCompanionMessage(pick(MSG.correct));

    if (state.streak === 5)  { showBadge({icon:"🔥", title:"Streak 5!",  sub:"Flow gestartet."}); burstConfetti(18); }
    if (state.streak === 10) { showBadge({icon:"⚡️", title:"Streak 10!", sub:"Richtig stark!"}); burstConfetti(26); }
    if (state.streak === 15) { showBadge({icon:"👑", title:"Streak 15!", sub:"Unaufhaltbar!"}); burstConfetti(34); }

    // Tagesziel-Message, wenn gerade erreicht
    if (daily.solved === DAILY_TARGET) {
      showBadge({ icon:"🏆", title:"Tagesziel 15/15!", sub:"Mission complete." });
      burstConfetti(40);
    }
  } else {
    state.streak = 0;
    const stats = ensureTopicStats(topic);
    stats.wrong += 1;

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
  state = { level: 1, streak: 0, score: 0, coins: 0 };
  topicStats = { ...DEFAULT_TOPIC_STATS };
  saveAll();
  renderStats();
  newQuestion();
}

// ---------------- Modal / Profile ----------------
closeModal();
function openModal()  { modalBackdrop.hidden = false; modalBackdrop.classList.add("open"); }
function closeModal() { modalBackdrop.hidden = true; modalBackdrop.classList.remove("open"); }

profileBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", (e) => {
  e.preventDefault();
  closeModal();
});
modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeModal(); });

saveProfileBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const chosenTheme = themeSelect.value || DEFAULT_THEME;
  if (!isThemeUnlocked(chosenTheme)) {
    themeSelect.value = profile.theme || DEFAULT_THEME;
    if (shopMessage) shopMessage.textContent = "Erst im Shop freischalten, dann auswählen.";
    return;
  }
  profile = {
    name: (playerNameInput.value || "Mariana").trim().slice(0, 20),
    theme: chosenTheme,
    unlockedThemes: profile.unlockedThemes || [DEFAULT_THEME]
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
