// Marianas Mathestunde – Minimal Web Game (mobile friendly)
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

const STATE_KEY = "mmm_state_v1";

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STATE_KEY)) ?? { level: 1, streak: 0, score: 0 };
  } catch {
    return { level: 1, streak: 0, score: 0 };
  }
}
function saveState(s) { localStorage.setItem(STATE_KEY, JSON.stringify(s)); }

let state = loadState();
let current = null;

function randInt(min, max) { // inclusive
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function normalizeNumber(str) {
  // Allow comma or dot as decimal separator
  return String(str).trim().replace(",", ".");
}

function nearlyEqual(a, b, eps = 1e-9) {
  return Math.abs(a - b) < eps;
}

function pickTopic() {
  const t = topicEl.value;
  if (t !== "mix") return t;
  const pool = ["integers", "fractions", "decimals", "percent", "equations"];
  return pool[randInt(0, pool.length - 1)];
}

// ---- Task generators (Level affects difficulty) ----
function genIntegers(level) {
  const range = Math.min(20 + level * 10, 200);
  const a = randInt(-range, range);
  const b = randInt(-range, range);
  const ops = level < 3 ? ["+", "-"] : ["+", "-", "×"];
  const op = ops[randInt(0, ops.length - 1)];
  let ans;
  if (op === "+") ans = a + b;
  if (op === "-") ans = a - b;
  if (op === "×") ans = a * b;
  return { q: `${a} ${op} ${b} = ?`, a: ans, hint: "Tipp: Vorzeichen beachten." };
}

function genFractions(level) {
  // Simplified: add/sub like denominators first, then mixed
  const denom = level < 3 ? randInt(2, 9) : randInt(2, 12);
  const n1 = randInt(1, denom - 1);
  const n2 = randInt(1, denom - 1);
  const op = randInt(0, 1) === 0 ? "+" : "-";
  let num = op === "+" ? (n1 + n2) : (n1 - n2);
  let den = denom;

  // Keep positive result for younger learners
  if (num <= 0) { num = n2 + n1; }

  // Reduce fraction
  const g = gcd(Math.abs(num), den);
  num /= g; den /= g;

  return {
    q: `${n1}/${denom} ${op} ${n2}/${denom} = ? (als Bruch)`,
    a: `${num}/${den}`,
    hint: "Tipp: Zähler addieren/subtrahieren, Nenner bleibt gleich. Kürzen nicht vergessen."
  };
}

function genDecimals(level) {
  const digits = level < 3 ? 1 : 2;
  const a = randFloat(0, 50, digits);
  const b = randFloat(0, 50, digits);
  const op = randInt(0, 1) === 0 ? "+" : "-";
  let ans = op === "+" ? (a + b) : (a - b);
  if (ans < 0) ans = Math.abs(ans);
  ans = roundTo(ans, digits);
  return {
    q: `${fmt(a)} ${op} ${fmt(b)} = ?`,
    a: ans,
    hint: "Tipp: Kommas untereinander schreiben."
  };
}

function genPercent(level) {
  const base = randInt(20, 400);
  const p = level < 3 ? [10, 20, 25, 50] : [5, 10, 12.5, 15, 20, 25, 30, 40, 50];
  const percent = p[randInt(0, p.length - 1)];
  const ans = (base * percent) / 100;
  return {
    q: `${percent}% von ${base} = ?`,
    a: ans,
    hint: "Tipp: Prozent in Bruch/Dezimalzahl umwandeln oder 1% berechnen."
  };
}

function genEquations(level) {
  // Linear: ax + b = c
  const a = level < 3 ? randInt(1, 5) : randInt(2, 9);
  const x = randInt(1, 12);
  const b = randInt(-10, 10);
  const c = a * x + b;
  const signB = b >= 0 ? `+ ${b}` : `- ${Math.abs(b)}`;
  return {
    q: `Löse: ${a}x ${signB} = ${c}  (x = ?)`,
    a: x,
    hint: "Tipp: Erst +b weg, dann durch a teilen."
  };
}

// Helpers
function gcd(a, b) { while (b) [a, b] = [b, a % b]; return a; }
function roundTo(n, digits) {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}
function randFloat(min, max, digits) {
  const f = Math.pow(10, digits);
  return randInt(min * f, max * f) / f;
}
function fmt(n) {
  // show as german decimal comma in UI
  return String(n).replace(".", ",");
}

function generateQuestion() {
  const t = pickTopic();
  const L = state.level;

  if (t === "integers") return genIntegers(L);
  if (t === "fractions") return genFractions(L);
  if (t === "decimals") return genDecimals(L);
  if (t === "percent") return genPercent(L);
  if (t === "equations") return genEquations(L);

  return genIntegers(L);
}

function render() {
  levelPill.textContent = `Level ${state.level}`;
  streakPill.textContent = `Streak ${state.streak}`;
  scorePill.textContent = `Punkte ${state.score}`;
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
  const user = normalizeNumber(answerEl.value);

  let ok = false;

  // fraction answer format "a/b"
  if (typeof current.a === "string" && current.a.includes("/")) {
    ok = user.replace(/\s+/g, "") === current.a;
  } else {
    const userNum = Number(user);
    const targetNum = Number(current.a);
    ok = Number.isFinite(userNum) && nearlyEqual(userNum, targetNum);
  }

  if (ok) {
    state.streak += 1;
    state.score += 10 + Math.min(10, state.level); // small scaling
    if (state.streak % 5 === 0) state.level += 1;
    feedbackEl.textContent = "✅ Richtig! Weiter so.";
  } else {
    state.streak = 0;
    feedbackEl.textContent = `❌ Leider nein. Richtige Antwort: ${String(current.a).replace(".", ",")}`;
  }
  saveState(state);
  render();
}

function resetProgress() {
  state = { level: 1, streak: 0, score: 0 };
  saveState(state);
  render();
  newQuestion();
}

checkBtn.addEventListener("click", checkAnswer);
newBtn.addEventListener("click", newQuestion);
skipBtn.addEventListener("click", newQuestion);
resetBtn.addEventListener("click", resetProgress);

answerEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") checkAnswer();
});

topicEl.addEventListener("change", newQuestion);

// Init
render();
newQuestion();
