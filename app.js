// Marianas Mathestunde – AT (AHS Unterstufe) Upgrade
const el = (id) => document.getElementById(id);

const questionEl = el("question");
const hintEl = el("hint");
const answerEl = el("answer");
const feedbackEl = el("feedback");
const topicEl = el("topic");

const levelPill = el("levelPill");
const streakPill = el("streakPill");
const scorePill = el("scorePill");

const checkBtn = el("checkBtn");
const skipBtn = el("skipBtn");
const newBtn = el("newBtn");
const resetBtn = el("resetBtn");

const avatarEl = el("avatar");
const subtitleEl = el("subtitle");

// Modal / Profil
const profileBtn = el("profileBtn");
const modalBackdrop = el("modalBackdrop");
const closeModalBtn = el("closeModalBtn");
const playerNameInput = el("playerName");
const themeSelect = el("theme");
const saveProfileBtn = el("saveProfileBtn");

const STATE_KEY = "mmm_state_v2";
const PROFILE_KEY = "mmm_profile_v1";

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function normalizeNumber(str) { return String(str).trim().replace(",", "."); }
function nearlyEqual(a, b, eps = 1e-9) { return Math.abs(a - b) < eps; }

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) ?? { level: 1, streak: 0, score: 0 };
  } catch {
    return { level: 1, streak: 0, score: 0 };
  }
}
function saveState(s) { localStorage.setItem(STATE_KEY, JSON.stringify(s)); }

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) ?? { name: "Mariana", theme: "mint" };
  } catch {
    return { name: "Mariana", theme: "mint" };
  }
}
function saveProfile(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }

let state = loadState();
let profile = loadProfile();
let current = null;

function applyProfile() {
  const name = (profile.name || "Mariana").trim();
  const initial = name ? name[0].toUpperCase() : "M";
  avatarEl.textContent = initial;

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

function pickTopic() {
  const t = topicEl.value;
  if (t !== "mix") return t;
  const pool = ["terms", "equations", "powers", "roots", "percent", "linear", "geometry", "pythagoras"];
  return pool[randInt(0, pool.length - 1)];
}

// ---------- Aufgaben-Generatoren (AHS) ----------
function genTerms(level) {
  // Vereinfachen: ax + bx + c
  const a = randInt(1, 9);
  const b = randInt(1, 9);
  const c = randInt(-10, 10);
  const x = randInt(1, 8);

  const left = `${a}x + ${b}x ${c >= 0 ? "+ " + c : "- " + Math.abs(c)}`;
  const simplified = (a + b);
  const value = simplified * x + c;

  return {
    q: `Vereinfache und setze x=${x} ein: ${left}`,
    a: value,
    hint: `Tipp: (${a}+${b})x = ${simplified}x, dann einsetzen.`
  };
}

function genEquations(level) {
  // ax + b = c (mit evtl. b negativ)
  const a = level < 4 ? randInt(1, 7) : randInt(2, 12);
  const x = randInt(1, 15);
  const b = randInt(-15, 15);
  const c = a * x + b;
  const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  return {
    q: `Löse: ${a}x ${signB} = ${c}  (x = ?)`,
    a: x,
    hint: "Tipp: Erst +b weg, dann durch a teilen."
  };
}

function genPowers(level) {
  // Potenzen: a^n oder Potenzgesetze leicht
  const a = randInt(2, 9);
  const n = level < 4 ? randInt(2, 4) : randInt(2, 5);
  const ans = Math.pow(a, n);
  return {
    q: `${a}^${n} = ?`,
    a: ans,
    hint: "Tipp: Potenz bedeutet wiederholte Multiplikation."
  };
}

function genRoots(level) {
  // Quadratzahlen / Wurzeln
  const squares = [4, 9, 16, 25, 36, 49, 64, 81, 100, 121, 144];
  const v = squares[randInt(0, Math.min(squares.length - 1, 5 + level))];
  const ans = Math.round(Math.sqrt(v));
  return {
    q: `√${v} = ?`,
    a: ans,
    hint: "Tipp: Welche Zahl mal sich selbst ergibt die Zahl unter der Wurzel?"
  };
}

function genPercent(level) {
  // Prozentwert: p% von G
  const G = randInt(20, 500);
  const ps = level < 4 ? [10, 20, 25, 50] : [5, 10, 12.5, 15, 20, 25, 30, 40, 50];
  const p = ps[randInt(0, ps.length - 1)];
  const ans = (G * p) / 100;
  return {
    q: `${p}% von ${G} = ?`,
    a: ans,
    hint: "Tipp: p% = p/100. Rechne (G * p) / 100."
  };
}

function genLinear(level) {
  // y = mx + b
  const m = randInt(-5, 6);
  const b = randInt(-10, 10);
  const x = randInt(-5, 8);
  const y = m * x + b;
  const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  return {
    q: `Berechne y: y = ${m}x ${signB} für x = ${x}`,
    a: y,
    hint: "Tipp: x einsetzen, dann ausrechnen."
  };
}

function genGeometry(level) {
  // Fläche / Umfang
  const type = randInt(0, 2);
  if (type === 0) {
    const a = randInt(2, 30);
    const b = randInt(2, 30);
    return {
      q: `Rechteck: a=${a} cm, b=${b} cm. Fläche A = ? (cm²)`,
      a: a * b,
      hint: "Tipp: A = a · b."
    };
  }
  if (type === 1) {
    const g = randInt(4, 40);
    const h = randInt(2, 25);
    return {
      q: `Dreieck: Grundseite g=${g} cm, Höhe h=${h} cm. Fläche A = ? (cm²)`,
      a: (g * h) / 2,
      hint: "Tipp: A = (g · h) / 2."
    };
  }
  const r = randInt(2, 12);
  // Kreisfläche (π≈3.14)
  const A = Math.round(3.14 * r * r * 100) / 100;
  return {
    q: `Kreis: r=${r} cm. Fläche A ≈ ? (π≈3,14)`,
    a: A,
    hint: "Tipp: A ≈ 3,14 · r². (Antwort mit 2 Dezimalstellen möglich)"
  };
}

function genPythagoras(level) {
  // rechtwinklig: a² + b² = c²
  const triples = [
    [3, 4, 5],
    [5, 12, 13],
    [6, 8, 10],
    [7, 24, 25],
    [8, 15, 17]
  ];
  const [a, b, c] = triples[randInt(0, Math.min(triples.length - 1, 1 + Math.floor(level / 2)))];
  const missing = randInt(0, 2); // 0->a,1->b,2->c
  if (missing === 2) {
    return {
      q: `Pythagoras: a=${a}, b=${b}. Hypotenuse c = ?`,
      a: c,
      hint: "Tipp: c² = a² + b²."
    };
  }
  if (missing === 0) {
    return {
      q: `Pythagoras: b=${b}, c=${c}. Kathete a = ?`,
      a: a,
      hint: "Tipp: a² = c² − b²."
    };
  }
  return {
    q: `Pythagoras: a=${a}, c=${c}. Kathete b = ?`,
    a: b,
    hint: "Tipp: b² = c² − a²."
  };
}

function generateQuestion() {
  const t = pickTopic();
  const L = state.level;

  if (t === "terms") return genTerms(L);
  if (t === "equations") return genEquations(L);
  if (t === "powers") return genPowers(L);
  if (t === "roots") return genRoots(L);
  if (t === "percent") return genPercent(L);
  if (t === "linear") return genLinear(L);
  if (t === "geometry") return genGeometry(L);
  if (t === "pythagoras") return genPythagoras(L);

  return genEquations(L);
}

function newQuestion() {
  current = generateQuestion();
  questionEl.textContent = current.q;
  hintEl.textContent = current.hint || "";
  feedbackEl.textContent = "";
  answerEl.value = "";
  answerEl.focus();
}

function checkAnswer() {
  if (!current) return;
  const userRaw = normalizeNumber(answerEl.value);
  const target = current.a;

  let ok = false;

  if (typeof target === "number") {
    const user = Number(userRaw);
    ok = Number.isFinite(user) && nearlyEqual(user, target);
  } else {
    ok = String(userRaw).replace(/\s+/g, "") === String(target).replace(/\s+/g, "");
  }

  if (ok) {
    state.streak += 1;
    state.score += 10 + Math.min(10, state.level);
    if (state.streak % 5 === 0) state.level += 1;
    feedbackEl.textContent = "✅ Richtig!";
  } else {
    state.streak = 0;
    const shown = String(target).replace(".", ",");
    feedbackEl.textContent = `❌ Nicht ganz. Richtige Antwort: ${shown}`;
  }

  saveState(state);
  renderStats();
}

function resetProgress() {
  state = { level: 1, streak: 0, score: 0 };
  saveState(state);
  renderStats();
  newQuestion();
}

// Profil modal
function openModal() { modalBackdrop.hidden = false; }
function closeModal() { modalBackdrop.hidden = true; }

profileBtn.addEventListener("click", openModal);
closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => { if (e.target === modalBackdrop) closeModal(); });

saveProfileBtn.addEventListener("click", () => {
  profile = {
    name: (playerNameInput.value || "Mariana").trim().slice(0, 20),
    theme: themeSelect.value || "mint"
  };
  saveProfile(profile);
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
applyProfile();
renderStats();
newQuestion();
