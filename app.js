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
const questListEl = el("questList");

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

const hintBoxEl = el("hintBox");
const hintTitleEl = el("hintTitle");

const profileBtn = el("profileBtn");
const modalBackdrop = el("modalBackdrop");
const closeModalBtn = el("closeModalBtn");
const playerNameInput = el("playerName");
const themeSelect = el("theme");
const explainModeToggle = el("explainMode");
const saveProfileBtn = el("saveProfileBtn");
const profileSelect = el("profileSelect");
const newProfileBtn = el("newProfileBtn");
const deleteProfileBtn = el("deleteProfileBtn");
const parentModeToggle = el("parentModeToggle");
const topicCheckboxesEl = el("topicCheckboxes");
const numberRangeMinInput = el("numberRangeMin");
const numberRangeMaxInput = el("numberRangeMax");
const allowNegativeToggle = el("allowNegative");
const allowCarryBorrowToggle = el("allowCarryBorrow");
const timeGoalInput = el("timeGoalSeconds");
const minLevelInput = el("minLevel");
const maxLevelInput = el("maxLevel");
const shopList = el("shopList");
const shopMessage = el("shopMessage");
const shopCoins = el("shopCoins");
const nextHintBtn = el("nextHintBtn");

const dailyText = el("dailyText");
const dailyDone = el("dailyDone");
const barFill = el("barFill");


const APP_STORAGE_KEY = "mmm_profiles_v1";
const STATE_KEY = "mmm_state_v3"; // legacy
const PROFILE_KEY = "mmm_profile_v1"; // legacy
const STATS_KEY = "mmm_topic_stats_v1"; // legacy adaptive repetition & difficulty
const CARDS_KEY = "mmm_cards_cache_v1";
const DAILY_KEY = "mmm_daily_v1"; // legacy
const DAILY_TARGET = 15;
const DEFAULT_THEME = "cottoncandy";
const THEMES = [
  { id: "cottoncandy", name: "Cotton Candy" },
  { id: "lavender", name: "Lavender Glow" },
  { id: "skyrose", name: "Sky Rose" }
];

function dailyTarget() {
  return daily?.targetCount ?? DAILY_TARGET;
}
const THEME_PRICES = {
  [DEFAULT_THEME]: 0,
  lavender: 20,
  skyrose: 20
};


function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function normalizeNumber(str) { return String(str).trim().replace(",", "."); }
function nearlyEqual(a, b, eps = 1e-9) { return Math.abs(a - b) < eps; }
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// ---------------- State / Profile ----------------
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

const APP_VERSION = 1;
const DEFAULT_STATE = { level: 1, streak: 0, score: 0, coins: 0 };
const DEFAULT_PROFILE = { name: "Mariana", theme: DEFAULT_THEME, unlockedThemes: [DEFAULT_THEME], explainMode: false };
const DIFFICULTY_MIN = 1;
const DIFFICULTY_MAX = 10;
const DIFFICULTY_ALPHA = 0.25; // EWMA smoothing for accuracy & time
const TARGET_SOLVE_TIME_MS = 12000; // kindgerechtes Zieltempo
const DEBUG_DIFFICULTY = false;

function defaultParentSettings() {
  return {
    enabled: false,
    enabledTopics: [...ALL_TOPICS],
    numberRange: { min: 0, max: 20 },
    allowNegative: false,
    allowCarryBorrow: true,
    timeGoalSeconds: 10,
    difficultyClamp: { minLevel: 1, maxLevel: 10 }
  };
}

function normalizeParentSettings(raw) {
  const defaults = defaultParentSettings();
  const data = { ...defaults, ...(raw || {}) };
  const enabledTopics = Array.isArray(data.enabledTopics) && data.enabledTopics.length
    ? data.enabledTopics.filter((t) => ALL_TOPICS.includes(t))
    : [...ALL_TOPICS];
  const nr = data.numberRange || {};
  const nrMinRaw = Number.isFinite(nr.min) ? nr.min : defaults.numberRange.min;
  const nrMaxRaw = Number.isFinite(nr.max) ? nr.max : defaults.numberRange.max;
  const nrMin = Math.min(nrMinRaw, nrMaxRaw);
  const nrMax = Math.max(nrMinRaw, nrMaxRaw);
  const allowNegative = !!data.allowNegative;
  const minLevel = Number.isFinite(data.difficultyClamp?.minLevel) ? data.difficultyClamp.minLevel : defaults.difficultyClamp.minLevel;
  const maxLevel = Number.isFinite(data.difficultyClamp?.maxLevel) ? data.difficultyClamp.maxLevel : defaults.difficultyClamp.maxLevel;

  return {
    enabled: !!data.enabled,
    enabledTopics,
    numberRange: { min: nrMin, max: nrMax },
    allowNegative,
    allowCarryBorrow: data.allowCarryBorrow !== false,
    timeGoalSeconds: Number.isFinite(data.timeGoalSeconds) ? data.timeGoalSeconds : defaults.timeGoalSeconds,
    difficultyClamp: {
      minLevel: clamp(minLevel, DIFFICULTY_MIN, DIFFICULTY_MAX),
      maxLevel: clamp(maxLevel, DIFFICULTY_MIN, DIFFICULTY_MAX)
    }
  };
}

function normalizeProfile(rawProfile) {
  const data = { ...DEFAULT_PROFILE, ...(rawProfile || {}) };
  const unlocked = Array.isArray(data.unlockedThemes) ? [...new Set(data.unlockedThemes)] : [];
  if (!unlocked.includes(DEFAULT_THEME)) unlocked.push(DEFAULT_THEME);
  if (data.theme && !unlocked.includes(data.theme)) unlocked.push(data.theme);
  const id = rawProfile?.id || `p_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

  return { ...data, id, unlockedThemes: unlocked, explainMode: !!data.explainMode };
}

function normalizeFullProfile(rawProfile) {
  const meta = normalizeProfile(rawProfile || {});
  const state = {
    ...DEFAULT_STATE,
    ...(rawProfile?.state || {}),
    ...(Number.isFinite(rawProfile?.level) ? { level: rawProfile.level } : {}),
    ...(Number.isFinite(rawProfile?.streak) ? { streak: rawProfile.streak } : {}),
    ...(Number.isFinite(rawProfile?.score) ? { score: rawProfile.score } : {}),
    ...(Number.isFinite(rawProfile?.coins) ? { coins: rawProfile.coins } : {})
  };
  if (!Number.isFinite(state.coins)) state.coins = 0;
  const topicStats = normalizeTopicStats(rawProfile?.topicStats || rawProfile?.stats || {});
  const parentSettings = normalizeParentSettings(rawProfile?.parentSettings);
  const daily = normalizeDaily(rawProfile?.daily, topicStats);

  return {
    ...meta,
    state,
    topicStats,
    daily,
    parentSettings
  };
}

function loadLegacyProfiles() {
  const legacyState = loadJSON(STATE_KEY, null);
  const legacyProfile = loadJSON(PROFILE_KEY, null);
  const legacyStats = loadJSON(STATS_KEY, null);
  const legacyDaily = loadJSON(DAILY_KEY, null);
  const hasLegacy = legacyState || legacyProfile || legacyStats || legacyDaily;
  if (!hasLegacy) return null;

  const merged = {
    ...(legacyProfile || {}),
    state: { ...DEFAULT_STATE, ...(legacyState || {}) },
    topicStats: normalizeTopicStats(legacyStats || {}),
    daily: legacyDaily || undefined
  };
  const p = normalizeFullProfile(merged);
  return { profiles: [p], activeProfileId: p.id, appVersion: APP_VERSION };
}

function loadAppData() {
  const stored = loadJSON(APP_STORAGE_KEY, null);
  if (stored?.profiles?.length) {
    const profiles = stored.profiles.map((p) => normalizeFullProfile(p));
    let activeProfileId = stored.activeProfileId;
    if (!profiles.some((p) => p.id === activeProfileId)) activeProfileId = profiles[0].id;
    return { profiles, activeProfileId, appVersion: stored.appVersion || APP_VERSION };
  }

  const legacy = loadLegacyProfiles();
  if (legacy) {
    saveJSON(APP_STORAGE_KEY, legacy);
    return legacy;
  }

  const fresh = normalizeFullProfile(DEFAULT_PROFILE);
  return { profiles: [fresh], activeProfileId: fresh.id, appVersion: APP_VERSION };
}

let appData = loadAppData();
let profile = appData.profiles.find((p) => p.id === appData.activeProfileId) || appData.profiles[0];
let state = profile.state;
let topicStats = profile.topicStats;
let parentSettings = profile.parentSettings;
let daily = profile.daily;

function parentConfig() {
  const normalized = normalizeParentSettings(parentSettings);
  if (!normalized.enabled) {
    return {
      ...defaultParentSettings(),
      enabled: false,
      allowNegative: true,
      numberRange: { min: -100, max: 100 },
      difficultyClamp: { minLevel: DIFFICULTY_MIN, maxLevel: DIFFICULTY_MAX },
      enabledTopics: [...ALL_TOPICS]
    };
  }
  return normalized;
}

function enabledTopics() {
  const cfg = parentConfig();
  const topics = cfg.enabled ? cfg.enabledTopics : ALL_TOPICS;
  return topics.length ? topics : [...ALL_TOPICS];
}

function clampDifficultyLevel(level) {
  const cfg = parentConfig();
  const minL = cfg.enabled ? cfg.difficultyClamp.minLevel : DIFFICULTY_MIN;
  const maxL = cfg.enabled ? cfg.difficultyClamp.maxLevel : DIFFICULTY_MAX;
  return clamp(level, minL, maxL);
}

function constrainedRange(min, max, { allowNegative } = {}) {
  const cfg = parentConfig();
  const nr = cfg.numberRange || {};
  const allowNeg = allowNegative ?? cfg.allowNegative;
  let low = min;
  let high = max;
  low = Math.max(low, allowNeg ? nr.min : Math.max(0, nr.min));
  high = Math.min(high, nr.max);
  if (high < low) {
    const fallbackLow = allowNeg ? Math.min(nr.min, nr.max) : Math.max(0, Math.min(nr.min, nr.max));
    const fallbackHigh = Math.max(nr.min, nr.max);
    low = fallbackLow;
    high = Math.max(fallbackLow, fallbackHigh);
  }
  return { min: low, max: high };
}

function constrainedRandInt(min, max, opts = {}) {
  const range = constrainedRange(min, max, opts);
  return randInt(range.min, range.max);
}

// topic stats: { topic: { attempts, correct, wrong, recentAccuracy, avgSolveTime, difficultyLevel } }
const DEFAULT_TOPIC_HINTS = {
  equations: [
    "Bringe zuerst die Zahl ohne x auf die andere Seite.",
    "Halte die Gleichung im Gleichgewicht und teile am Ende durch die Zahl vor dem x.",
    "Stelle Schritt für Schritt nach x um: erst minus/plus, dann teilen."
  ],
  percent: [
    "Überlege: Wie viel sind 10%?",
    "Schreibe p/100 und multipliziere mit dem Grundwert.",
    "Rechne G · p ÷ 100 und achte auf Einheiten." 
  ],
  pythagoras: [
    "Quadrate die Katheten a und b.",
    "Addiere die Quadrate.",
    "Ziehe die Wurzel aus der Summe, das ist die Hypotenuse."
  ],
  linear: [
    "Setze x ein und berechne den Term.",
    "Multipliziere zuerst, danach addieren/subtrahieren.",
    "Ordne sauber nach Reihenfolge: erst Klammern/Punkt, dann Strich."
  ],
  terms: [
    "Fasse gleiche Terme zusammen.",
    "Rechne Punkt-vor-Strich und löse Klammern vorsichtig.",
    "Sortiere nach Variablen und Zahlen, dann vereinfachen."
  ],
  powers: [
    "Eine Potenz ist wiederholte Multiplikation.",
    "Rechne Basis mal Basis, so oft wie der Exponent sagt.",
    "Kontrolliere das Ergebnis mit kleiner Probe (z.B. 2^3 = 8)."
  ],
  roots: [
    "Welche Zahl mal sich selbst ergibt den Wert?",
    "Denke an Quadratzahlen: 4, 9, 16, 25 …",
    "Probiere nahe Quadratzahlen oder rechne mit √ Taste (hier Kopfrechnen!)."
  ],
  geometry: [
    "Notiere die passende Formel (z.B. A = a · b).",
    "Setze die gegebenen Werte ein und rechne Schritt für Schritt.",
    "Kontrolliere Einheit und rechne auf zwei Stellen, falls nötig."
  ]
};

function defaultTopicStat() {
  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    recentAccuracy: 0.7,
    avgSolveTime: TARGET_SOLVE_TIME_MS,
    difficultyLevel: 1
  };
}

function normalizeTopicStat(raw = {}) {
  const base = defaultTopicStat();
  const attempts = Number.isFinite(raw.attempts) ? raw.attempts : (raw.correct || 0) + (raw.wrong || 0);
  const correct = Number.isFinite(raw.correct) ? raw.correct : 0;
  const wrong = Number.isFinite(raw.wrong) ? raw.wrong : 0;
  const accBase = attempts > 0 ? correct / attempts : base.recentAccuracy;
  return {
    attempts,
    correct,
    wrong,
    recentAccuracy: clamp(Number.isFinite(raw.recentAccuracy) ? raw.recentAccuracy : accBase, 0, 1),
    avgSolveTime: Number.isFinite(raw.avgSolveTime) ? raw.avgSolveTime : base.avgSolveTime,
    difficultyLevel: clamp(Number.isFinite(raw.difficultyLevel) ? raw.difficultyLevel : base.difficultyLevel, DIFFICULTY_MIN, DIFFICULTY_MAX)
  };
}

function normalizeTopicStats(raw) {
  const stats = {};
  ALL_TOPICS.forEach((topic) => {
    stats[topic] = normalizeTopicStat(raw?.[topic] || {});
  });
  return stats;
}

const DEFAULT_TOPIC_STATS = normalizeTopicStats({});
topicStats = profile.topicStats || { ...DEFAULT_TOPIC_STATS };

// loaded card deck
let deck = { meta: {}, cards: [] };
let current = null;
let questionStartedAt = null;
let wrongAttemptsForCurrentQuestion = 0;
let shownHintLevel = 0;

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

function renderTopicLocks() {
  if (!topicEl) return;
  const allowed = new Set(enabledTopics());
  Array.from(topicEl.options).forEach((opt) => {
    if (opt.value === "mix") {
      opt.disabled = allowed.size === 0;
      return;
    }
    const baseText = opt.textContent.replace(/^🔒\s*/, "");
    const isAllowed = allowed.has(opt.value);
    opt.disabled = !isAllowed;
    opt.textContent = `${isAllowed ? "" : "🔒 "}${baseText}`;
  });
}

function ensureActiveTopicAllowed() {
  if (!topicEl) return;
  if (topicEl.value === "mix") return;
  if (!enabledTopics().includes(topicEl.value)) {
    const fallback = enabledTopics()[0] || "mix";
    topicEl.value = fallback;
    feedbackEl.textContent = "Dieses Thema ist von den Eltern gesperrt. Mix nutzt nur erlaubte Themen.";
  }
}

function refreshProfileRefs(nextProfile) {
  profile = nextProfile;
  state = profile.state;
  topicStats = profile.topicStats;
  parentSettings = profile.parentSettings;
  daily = loadDaily();
  profile.daily = daily;
  profile.parentSettings = parentSettings;
}

function setActiveProfile(profileId, { skipPersistCurrent = false } = {}) {
  const next = appData.profiles.find((p) => p.id === profileId);
  if (!next) return;
  if (!skipPersistCurrent) persistActiveProfile();
  refreshProfileRefs(next);
  appData.activeProfileId = next.id;
  saveJSON(APP_STORAGE_KEY, appData);
  applyProfile();
  renderStats();
  renderDaily();
  renderDailyQuests();
  renderShop();
  renderTopicLocks();
  ensureActiveTopicAllowed();
  saveAll();
  newQuestion();
}

function createProfile(name) {
  const base = normalizeFullProfile({ ...DEFAULT_PROFILE, name: (name || "Neues Profil").trim() || "Gast" });
  appData.profiles.push(base);
  setActiveProfile(base.id);
  renderProfileSelector();
}

function renderProfileSelector() {
  if (!profileSelect) return;
  profileSelect.innerHTML = "";
  appData.profiles.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = p.name || "Profil";
    profileSelect.appendChild(opt);
  });
  profileSelect.value = profile.id;
  if (deleteProfileBtn) deleteProfileBtn.disabled = appData.profiles.length <= 1;
}

function setParentInputsDisabled(disabled) {
  [numberRangeMinInput, numberRangeMaxInput, allowNegativeToggle, allowCarryBorrowToggle, timeGoalInput, minLevelInput, maxLevelInput]
    .filter(Boolean)
    .forEach((el) => { el.disabled = disabled; });
  if (topicCheckboxesEl) {
    topicCheckboxesEl.querySelectorAll("input[type=checkbox]").forEach((cb) => { cb.disabled = disabled; });
  }
}

function renderParentSettingsForm() {
  const cfg = parentConfig();
  if (parentModeToggle) parentModeToggle.checked = !!cfg.enabled;
  if (topicCheckboxesEl) {
    topicCheckboxesEl.innerHTML = "";
    ALL_TOPICS.forEach((topic) => {
      const label = document.createElement("label");
      label.className = "checkboxLabel";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = topic;
      cb.checked = cfg.enabledTopics.includes(topic);
      cb.disabled = !cfg.enabled;
      label.appendChild(cb);
      const span = document.createElement("span");
      span.textContent = topicLabel(topic);
      label.appendChild(span);
      topicCheckboxesEl.appendChild(label);
    });
  }
  if (numberRangeMinInput) numberRangeMinInput.value = cfg.numberRange.min;
  if (numberRangeMaxInput) numberRangeMaxInput.value = cfg.numberRange.max;
  if (allowNegativeToggle) allowNegativeToggle.checked = cfg.allowNegative;
  if (allowCarryBorrowToggle) allowCarryBorrowToggle.checked = cfg.allowCarryBorrow;
  if (timeGoalInput) timeGoalInput.value = cfg.timeGoalSeconds;
  if (minLevelInput) minLevelInput.value = cfg.difficultyClamp.minLevel;
  if (maxLevelInput) maxLevelInput.value = cfg.difficultyClamp.maxLevel;
  setParentInputsDisabled(!cfg.enabled);
  renderTopicLocks();
}

function collectParentSettingsFromForm() {
  const cfg = parentConfig();
  const enabled = !!parentModeToggle?.checked;
  const enabledTopicsList = Array.from(topicCheckboxesEl?.querySelectorAll("input[type=checkbox]") || [])
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
  const numberRange = {
    min: Number(numberRangeMinInput?.value) || cfg.numberRange.min,
    max: Number(numberRangeMaxInput?.value) || cfg.numberRange.max
  };
  const difficultyClamp = {
    minLevel: Number(minLevelInput?.value) || cfg.difficultyClamp.minLevel,
    maxLevel: Number(maxLevelInput?.value) || cfg.difficultyClamp.maxLevel
  };

  parentSettings = normalizeParentSettings({
    ...cfg,
    enabled,
    enabledTopics: enabledTopicsList,
    numberRange,
    allowNegative: !!allowNegativeToggle?.checked,
    allowCarryBorrow: !!allowCarryBorrowToggle?.checked,
    timeGoalSeconds: Number(timeGoalInput?.value) || cfg.timeGoalSeconds,
    difficultyClamp
  });
  profile.parentSettings = parentSettings;
}

function applyProfile() {
  const name = (profile.name || "Mariana").trim();
  avatarEl.textContent = name ? name[0].toUpperCase() : "M";
  subtitleEl.textContent = `Für ${name} • AHS Unterstufe`;
  document.documentElement.setAttribute("data-theme", profile.theme || DEFAULT_THEME);
  playerNameInput.value = name;
  if (explainModeToggle) explainModeToggle.checked = !!profile.explainMode;
  if (profileSelect) profileSelect.value = profile.id;
  renderThemeOptions();
  renderParentSettingsForm();
  renderTopicLocks();
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

function persistActiveProfile() {
  const enrichedProfile = {
    ...profile,
    state,
    topicStats,
    daily,
    parentSettings
  };
  const idx = appData.profiles.findIndex((p) => p.id === enrichedProfile.id);
  if (idx >= 0) {
    appData.profiles[idx] = enrichedProfile;
  } else {
    appData.profiles.push(enrichedProfile);
  }
  appData.activeProfileId = enrichedProfile.id;
  appData.appVersion = APP_VERSION;
  saveJSON(APP_STORAGE_KEY, appData);
}

function saveAll() {
  persistActiveProfile();
}

function todayKey() {
  // Local date key: YYYY-MM-DD
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
}

function topicLabel(topic) {
  if (!topic) return "";
  const opts = Array.from(topicEl?.options || []);
  return opts.find((o) => o.value === topic)?.textContent || topic;
}

function computeWeakTopic(statsSource = topicStats) {
  let weakest = null;
  let weakestAcc = Infinity;

  const allowed = new Set(enabledTopics());
  Object.entries(statsSource || {}).forEach(([topic, stats]) => {
    if (!allowed.has(topic)) return;
    const total = (stats.correct || 0) + (stats.wrong || 0);
    if (total < 3) return;
    const acc = total === 0 ? 1 : (stats.correct || 0) / total;
    if (acc < weakestAcc) {
      weakestAcc = acc;
      weakest = topic;
    }
  });

  if (!weakest) {
    const selected = topicEl?.value;
    if (selected && selected !== "mix" && enabledTopics().includes(selected)) return selected;
    const allowed = enabledTopics();
    if (allowed.length) return allowed[0];
    return "linear";
  }
  return weakest;
}

function formatSeconds(ms) {
  if (!Number.isFinite(ms)) return "-";
  return `${(ms / 1000).toFixed(1)}s`;
}

function computeSessionBestTopic() {
  if (!session) return null;
  const allowed = new Set(enabledTopics());
  let best = null;
  let bestAcc = -1;

  Object.entries(session.perTopic || {}).forEach(([topic, data]) => {
    if (!allowed.has(topic) || !data?.attempts) return;
    const acc = data.correct / data.attempts;
    if (acc > bestAcc) {
      bestAcc = acc;
      best = { topic, accuracy: acc, attempts: data.attempts };
    }
  });

  return best;
}

function computeSessionWeakTopic() {
  if (!session) return null;
  const allowed = new Set(enabledTopics());
  let weak = null;
  let weakAcc = Infinity;
  let fallbackWeak = null;
  let fallbackAcc = Infinity;

  Object.entries(session.perTopic || {}).forEach(([topic, data]) => {
    if (!allowed.has(topic) || !data?.attempts) return;
    const acc = data.correct / data.attempts;
    if (data.attempts >= 3 && acc < weakAcc) {
      weak = { topic, accuracy: acc, attempts: data.attempts };
      weakAcc = acc;
    }
    if (acc < fallbackAcc) {
      fallbackWeak = { topic, accuracy: acc, attempts: data.attempts };
      fallbackAcc = acc;
    }
  });

  if (weak) return weak;
  if (fallbackWeak) return fallbackWeak;

  const topic = session.lastQuestionTopic && allowed.has(session.lastQuestionTopic)
    ? session.lastQuestionTopic
    : computeWeakTopic();
  return topic ? { topic, accuracy: null, attempts: 0 } : null;
}

function nextGoalSuggestion(weakTopic) {
  const allowed = new Set(enabledTopics());
  const topic = weakTopic && allowed.has(weakTopic) ? weakTopic : computeWeakTopic();

  const target = dailyTarget();

  if (daily && daily.doneCount < target) {
    const remaining = Math.max(0, target - (daily.doneCount || 0));
    const focusTopic = topicLabel(daily?.quests?.C?.weakTopic || topic);
    return `Heute fehlen noch ${remaining} Aufgaben. Fokus: ${focusTopic || "dein Lieblingsthema"}.`;
  }

  if (topic) {
    return `Übe ${topicLabel(topic)} als nächstes: 5 richtige Aufgaben.`;
  }

  return "Weiter so! Morgen knacken wir dein Wunschthema.";
}

function buildSessionRecap() {
  if (!session) return null;
  const best = computeSessionBestTopic();
  const weak = computeSessionWeakTopic();
  const nextGoal = nextGoalSuggestion(weak?.topic || session.lastQuestionTopic);

  const recap = {
    startedAt: session.startedAt,
    endedAt: Date.now(),
    correct: session.correctCount,
    wrong: session.wrongCount,
    fastestCorrect: session.fastestCorrect,
    bestTopic: best,
    weakTopic: weak,
    solveTimesMsCorrect: {
      minTimeMs: session.solveTimesMsCorrect?.minTimeMs ?? null,
      avgTimeMs: session.solveTimesMsCorrect?.avgTimeMs ?? null
    },
    nextGoal,
    lastQuestionTopic: session.lastQuestionTopic
  };

  profile.lastSessionRecap = recap;
  const history = Array.isArray(profile.sessionHistory) ? [...profile.sessionHistory, recap] : [recap];
  profile.sessionHistory = history.slice(-10);
  return recap;
}

function renderRecap(recap) {
  if (!recap || !recapBackdrop) return;
  recapCorrectEl.textContent = recap.correct ?? 0;
  recapWrongEl.textContent = recap.wrong ?? 0;

  const fastest = recap.fastestCorrect?.timeMs ?? recap.solveTimesMsCorrect?.minTimeMs;
  recapFastestEl.textContent = formatSeconds(fastest);

  const best = recap.bestTopic;
  const weak = recap.weakTopic;
  recapBestTopicEl.textContent = best
    ? `${topicLabel(best.topic)} · ${(best.accuracy * 100).toFixed(0)}%`
    : "-";
  recapWeakTopicEl.textContent = weak
    ? `${topicLabel(weak.topic)} · ${weak.accuracy == null ? "noch üben" : `${Math.round(weak.accuracy * 100)}%`}`
    : "-";

  recapNextGoalEl.textContent = recap.nextGoal || "Weiter so!";
}

function showRecap(recap) {
  renderRecap(recap || profile.lastSessionRecap);
  if (recapBackdrop) {
    recapBackdrop.hidden = false;
    recapBackdrop.classList.add("open");
  }
}

function hideRecap() {
  if (recapBackdrop) {
    recapBackdrop.hidden = true;
    recapBackdrop.classList.remove("open");
  }
}

function endSession(reason = "manual") {
  if (!session || session.ended) return;
  session.ended = true;
  const recap = buildSessionRecap();
  saveAll();
  renderStats();
  if (reason === "daily") {
    setCompanionMessage("Mission erfüllt! Zeit für ein Recap.");
  }
  showRecap(recap);
}

function startNewSession({ freshQuestion = false } = {}) {
  startSession();
  hideRecap();
  if (freshQuestion) {
    newQuestion();
  }
}

function defaultDaily(dateKey = todayKey(), statsSource = topicStats) {
  const weakTopic = computeWeakTopic(statsSource);
  return {
    dateKey,
    day: dateKey,
    targetCount: DAILY_TARGET,
    doneCount: 0,
    solved: 0,
    correctStreakToday: 0,
    fastCorrectToday: 0,
    weakTopicCorrectToday: 0,
    quests: {
      A: { progress: 0, goal: 5, done: false, claimed: false },
      B: { progress: 0, goal: 3, done: false, claimed: false },
      C: { progress: 0, goal: 5, done: false, claimed: false, weakTopic }
    }
  };
}

function normalizeDaily(raw, statsSource = topicStats) {
  const today = todayKey();
  if (!raw) return defaultDaily(today, statsSource);

  const sameDay = (raw.day || raw.dateKey) === today;
  if (!sameDay) return defaultDaily(today, statsSource);

  const base = defaultDaily(today, statsSource);
  const data = { ...base, ...raw, dateKey: today, day: today };

  data.targetCount = Number.isFinite(data.targetCount) ? data.targetCount : DAILY_TARGET;
  const solved = Number.isFinite(data.doneCount)
    ? data.doneCount
    : Number.isFinite(data.solved)
      ? data.solved
      : 0;
  data.doneCount = Math.max(0, solved);
  data.solved = data.doneCount;
  data.correctStreakToday = data.correctStreakToday || 0;
  data.fastCorrectToday = data.fastCorrectToday || 0;
  data.weakTopicCorrectToday = data.weakTopicCorrectToday || 0;

  const weakTopic = data?.quests?.C?.weakTopic || computeWeakTopic(statsSource);
  data.quests = {
    A: { ...base.quests.A, ...(data.quests?.A || {}) },
    B: { ...base.quests.B, ...(data.quests?.B || {}) },
    C: { ...base.quests.C, ...(data.quests?.C || {}), weakTopic }
  };

  return data;
}

function loadDaily() {
  return normalizeDaily(profile.daily, topicStats);
}

function saveDaily(d) {
  daily = normalizeDaily(d, topicStats);
  profile.daily = daily;
  persistActiveProfile();
}

daily = loadDaily();

function renderDaily() {
  const target = dailyTarget();
  const solved = Math.min(daily.doneCount, target);
  dailyText.textContent = `Tagesziel: ${solved}/${target}`;
  const pct = Math.round((solved / target) * 100);
  barFill.style.width = `${Math.min(100, pct)}%`;
  dailyDone.hidden = solved < target;
}

function renderDailyQuests() {
  if (!questListEl) return;
  questListEl.innerHTML = "";
  const q = daily.quests || {};
  const quests = [
    {
      id: "A",
      title: "5 richtig ohne Fehler",
      progress: q.A?.progress || 0,
      goal: q.A?.goal || 5,
      done: !!q.A?.done
    },
    {
      id: "B",
      title: `3 Aufgaben unter ${parentConfig().timeGoalSeconds || 10} Sekunden`,
      progress: q.B?.progress || 0,
      goal: q.B?.goal || 3,
      done: !!q.B?.done
    },
    {
      id: "C",
      title: `5 Aufgaben in: ${topicLabel(q.C?.weakTopic || computeWeakTopic())}`,
      progress: q.C?.progress || 0,
      goal: q.C?.goal || 5,
      done: !!q.C?.done
    }
  ];

  quests.forEach((quest) => {
    const row = document.createElement("div");
    row.className = "questRow";

    const info = document.createElement("div");
    info.className = "questInfo";
    const title = document.createElement("div");
    title.className = "questTitle";
    title.textContent = quest.title;
    const progress = document.createElement("div");
    progress.className = "questProgress";
    progress.textContent = `${quest.progress}/${quest.goal}`;
    info.appendChild(title);
    info.appendChild(progress);

    const status = document.createElement("div");
    status.className = "questStatus" + (quest.done ? " questDone" : "");
    status.textContent = quest.done ? "Abgeschlossen" : "Läuft";

    row.appendChild(info);
    row.appendChild(status);
    questListEl.appendChild(row);
  });
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
  const s = topicStats[topic] || defaultTopicStat();
  const total = s.correct + s.wrong;
  if (total < 6) return 1.0; // not enough data
  const wrongRate = s.wrong / total; // 0..1
  // boost topics with higher wrong-rate (up to +60%)
  return 1.0 + Math.min(0.6, wrongRate * 0.9);
}

function weightedPickTopic() {
  const selected = topicEl.value;
  if (selected !== "mix") return selected;

  const allowed = enabledTopics().filter((t) => Object.keys(BASE_WEIGHTS).includes(t));
  const topics = allowed.length ? allowed : enabledTopics();
  const weights = topics.map(t => (BASE_WEIGHTS[t] || 10) * adaptiveWeight(t));

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
    topicStats[topic] = defaultTopicStat();
  }
  // falls ältere Saves geladen wurden
  topicStats[topic] = { ...normalizeTopicStat(topicStats[topic]), difficultyLevel: clampDifficultyLevel(topicStats[topic].difficultyLevel) };
  return topicStats[topic];
}

function levelScaledValue(level, min, max) {
  const span = max - min;
  const clamped = clampDifficultyLevel(level);
  const factor = (clamped - DIFFICULTY_MIN) / (DIFFICULTY_MAX - DIFFICULTY_MIN);
  return min + Math.round(span * factor);
}

function updateTopicStats({ topic, correct, solveTimeMs }) {
  const stats = ensureTopicStats(topic);
  stats.topic = topic;
  stats.attempts += 1;
  if (correct) stats.correct += 1; else stats.wrong += 1;

  const accValue = correct ? 1 : 0;
  stats.recentAccuracy = stats.recentAccuracy == null
    ? accValue
    : stats.recentAccuracy * (1 - DIFFICULTY_ALPHA) + accValue * DIFFICULTY_ALPHA;

  if (Number.isFinite(solveTimeMs)) {
    const time = Math.max(500, solveTimeMs);
    stats.avgSolveTime = stats.avgSolveTime == null
      ? time
      : stats.avgSolveTime * (1 - DIFFICULTY_ALPHA) + time * DIFFICULTY_ALPHA;
  }

  adjustDifficulty(stats);
}

function adjustDifficulty(stats) {
  const prev = stats.difficultyLevel || DIFFICULTY_MIN;
  let delta = 0;

  if (stats.attempts >= 2) {
    if (stats.recentAccuracy > 0.85 && stats.avgSolveTime < TARGET_SOLVE_TIME_MS) {
      delta = 1;
    } else if (stats.recentAccuracy < 0.55) {
      delta = -1;
    }
  }

  const next = clamp(clampDifficultyLevel(prev + delta), DIFFICULTY_MIN, DIFFICULTY_MAX);
  stats.difficultyLevel = next;

  if (DEBUG_DIFFICULTY && delta !== 0) {
    console.log(`Difficulty change for ${stats.topic || "topic"}: ${prev} -> ${next} (acc=${stats.recentAccuracy.toFixed(2)}, time=${Math.round(stats.avgSolveTime)}ms)`);
  }
}

function getTopicDifficulty(topic) {
  return clampDifficultyLevel(ensureTopicStats(topic).difficultyLevel || DIFFICULTY_MIN);
}

// ---------------- Generators (procedural) ----------------
function genTerms(level) {
  // Klammern + zusammenfassen: a(bx + c) + dx + e
  const maxCoef = levelScaledValue(level, 4, 12);
  const maxOffset = levelScaledValue(level, 8, 22);
  const a = constrainedRandInt(2, maxCoef, { allowNegative: false });
  const b = constrainedRandInt(1, maxCoef, { allowNegative: parentConfig().allowNegative });
  const c = constrainedRandInt(-maxOffset, maxOffset, { allowNegative: true });
  const d = constrainedRandInt(1, maxCoef, { allowNegative: parentConfig().allowNegative });
  const e = constrainedRandInt(-maxOffset, maxOffset, { allowNegative: true });

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
  const m = constrainedRandInt(-levelScaledValue(level, 4, 10), levelScaledValue(level, 6, 14), { allowNegative: true });
  const b = constrainedRandInt(-levelScaledValue(level, 10, 24), levelScaledValue(level, 10, 28), { allowNegative: true });
  const x = constrainedRandInt(-levelScaledValue(level, 6, 14), levelScaledValue(level, 8, 18), { allowNegative: true });
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
  const a = constrainedRandInt(2, levelScaledValue(level, 7, 12), { allowNegative: false });
  const n = level < 3 ? constrainedRandInt(2, 3, { allowNegative: false }) : level < 7 ? constrainedRandInt(2, 4, { allowNegative: false }) : constrainedRandInt(2, 5, { allowNegative: false });
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
  const idxMax = Math.min(squares.length - 1, levelScaledValue(level, 5, squares.length - 1));
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
    const a = constrainedRandInt(3, levelScaledValue(level, 18, 40), { allowNegative: false });
    const b = constrainedRandInt(3, levelScaledValue(level, 18, 40), { allowNegative: false });
    return {
      topic: "geometry",
      q: `Rechteck: a=${a} cm, b=${b} cm. Fläche A = ? (cm²)`,
      hint: "Tipp: A = a · b.",
      answerType: "number",
      a: a * b
    };
  }

  if (type === 1) {
    const g = constrainedRandInt(4, levelScaledValue(level, 22, 48), { allowNegative: false });
    const h = constrainedRandInt(3, levelScaledValue(level, 18, 36), { allowNegative: false });
    return {
      topic: "geometry",
      q: `Dreieck: g=${g} cm, h=${h} cm. Fläche A = ? (cm²)`,
      hint: "Tipp: A = (g · h) / 2.",
      answerType: "number",
      a: (g * h) / 2
    };
  }

  const r = constrainedRandInt(2, levelScaledValue(level, 10, 26), { allowNegative: false });
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
  const maxCoef = Math.min(12, 3 + levelScaledValue(level, 3, 10));
  const allowNegativeA = level > 3 && parentConfig().allowNegative;
  const a = constrainedRandInt(1, maxCoef, { allowNegative: allowNegativeA }) * (allowNegativeA && Math.random() < 0.4 ? -1 : 1);
  const x = constrainedRandInt(-levelScaledValue(level, 8, 16), levelScaledValue(level, 10, 22), { allowNegative: true });
  const b = constrainedRandInt(-levelScaledValue(level, 10, 22), levelScaledValue(level, 10, 22), { allowNegative: true });
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
  const percOptions = [10, 12.5, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90];
  const maxIdx = levelScaledValue(level, 5, percOptions.length - 1);
  const p = percOptions[randInt(0, maxIdx)];
  const divisor = 100 / gcd(Math.round(p * 10), 1000); // ensures integer result even for 12.5
  const multiplier = level < 4 ? constrainedRandInt(2, 10) : constrainedRandInt(4, levelScaledValue(level, 14, 24));
  const extraScale = level > 6 ? constrainedRandInt(2, 4) : level > 3 ? constrainedRandInt(1, 3) : 1;
  const G = divisor * multiplier * extraScale;
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
  const scaleMax = level < 3 ? 1 : level < 6 ? 2 : level < 9 ? 3 : 4;
  const scale = constrainedRandInt(1, scaleMax, { allowNegative: false });
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
      hints: Array.isArray(c.hints) ? c.hints : undefined,
      answerType: c.answerType || "number",
      a: c.answer
    };
  }

  const L = getTopicDifficulty(topic);
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

function collectHintsForQuestion(q) {
  const base = Array.isArray(q.hints) ? q.hints.filter(Boolean) : [];
  const collected = base.length ? [...base] : (q.hint ? [q.hint] : []);
  const fallback = DEFAULT_TOPIC_HINTS[q.topic] || [];
  const merged = [0, 1, 2].map((i) => collected[i] || fallback[i]).filter(Boolean);
  return merged;
}

function resetHintProgress() {
  wrongAttemptsForCurrentQuestion = 0;
  shownHintLevel = 0;
  renderHint();
}

function renderHint() {
  if (!hintEl || !current) return;
  const hints = current.preparedHints || [];
  const hasHint = shownHintLevel > 0 && hints[shownHintLevel - 1];

  if (!hasHint) {
    hintEl.textContent = "";
    if (hintBoxEl) hintBoxEl.hidden = true;
    if (nextHintBtn) nextHintBtn.disabled = false;
    return;
  }

  hintEl.textContent = hints[shownHintLevel - 1];
  if (hintBoxEl) hintBoxEl.hidden = false;
  if (hintTitleEl) hintTitleEl.textContent = `Tipp ${shownHintLevel}`;
  if (nextHintBtn) {
    const noMore = shownHintLevel >= hints.length;
    nextHintBtn.disabled = noMore;
    nextHintBtn.textContent = noMore ? "Alle Tipps gezeigt" : "Noch ein Tipp";
  }
}

function revealHint(level) {
  if (!current) return;
  const hints = current.preparedHints || [];
  shownHintLevel = Math.max(0, Math.min(level, hints.length));
  renderHint();
}

function autoRevealHint() {
  if (!current) return;
  const hints = current.preparedHints || [];
  if (!hints.length) return;

  const desiredLevel = profile.explainMode
    ? Math.min(hints.length, Math.max(3, wrongAttemptsForCurrentQuestion))
    : Math.min(hints.length, wrongAttemptsForCurrentQuestion);

  if (desiredLevel > shownHintLevel) {
    revealHint(desiredLevel);
  }
}

function showNextHintManual() {
  if (!current) return;
  const hints = current.preparedHints || [];
  if (!hints.length) return;

  const nextLevel = Math.min(hints.length, shownHintLevel + 1);
  if (nextLevel > shownHintLevel) {
    revealHint(nextLevel);
  }
}

function newQuestion() {
  ensureActiveTopicAllowed();
  const topic = weightedPickTopic();
  current = pickFromCardsOrProcedural(topic);

  current.preparedHints = collectHintsForQuestion(current);

  questionEl.textContent = current.q;
  resetHintProgress();
  feedbackEl.textContent = "";
  answerEl.value = "";
  answerEl.focus();
  questionStartedAt = Date.now();

  if (nextHintBtn) {
    const hasHints = (current.preparedHints || []).length > 0;
    nextHintBtn.hidden = !hasHints;
    nextHintBtn.textContent = "Noch ein Tipp";
    nextHintBtn.disabled = false;
  }
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

function grantQuestReward(questId) {
  const quest = daily.quests?.[questId];
  if (!quest || quest.claimed) return;
  quest.claimed = true;
  const bonus = 5;
  state.coins = (state.coins ?? 0) + bonus;
  showBadge({ icon: "🎯", title: `Quest ${questId} geschafft!`, sub: `+${bonus} Coins` });
  burstConfetti(22);
}

function updateQuestsOnAnswer({ correct, solveTime, topic }) {
  const q = daily.quests;

  if (!correct) {
    daily.correctStreakToday = 0;
    if (!q.A.done) q.A.progress = 0;
    saveDaily(daily);
    return;
  }

  // Quest A: 5 richtig ohne Fehler
  daily.correctStreakToday = (daily.correctStreakToday || 0) + 1;
  if (!q.A.done) {
    q.A.progress = Math.min(q.A.goal, daily.correctStreakToday);
    if (q.A.progress >= q.A.goal) {
      q.A.done = true;
      grantQuestReward("A");
    }
  }

  // Quest B: 3 Aufgaben unter Zeitlimit
  const timeGoal = parentConfig().timeGoalSeconds || 10;
  if (solveTime != null && solveTime <= timeGoal) {
    daily.fastCorrectToday = (daily.fastCorrectToday || 0) + 1;
    if (!q.B.done) {
      q.B.progress = Math.min(q.B.goal, daily.fastCorrectToday);
      if (q.B.progress >= q.B.goal) {
        q.B.done = true;
        grantQuestReward("B");
      }
    }
  }

  // Quest C: 5 Aufgaben im Weak-Topic
  const weakTopic = q.C.weakTopic || computeWeakTopic();
  q.C.weakTopic = weakTopic;
  if (topic === weakTopic) {
    daily.weakTopicCorrectToday = (daily.weakTopicCorrectToday || 0) + 1;
    if (!q.C.done) {
      q.C.progress = Math.min(q.C.goal, daily.weakTopicCorrectToday);
      if (q.C.progress >= q.C.goal) {
        q.C.done = true;
        grantQuestReward("C");
      }
    }
  }

  saveDaily(daily);
}


function checkAnswer() {
  if (!current) return;

  const topic = current.topic;
  let ok = false;
  const now = Date.now();
  const solveTimeMs = questionStartedAt ? now - questionStartedAt : null;
  const solveTime = solveTimeMs != null ? solveTimeMs / 1000 : null;

  if (current.answerType === "number") {
    const user = Number(normalizeNumber(answerEl.value));
    ok = Number.isFinite(user) && nearlyEqual(user, Number(current.a));
  } else {
    const user = normalizeTextAnswer(answerEl.value);
    const target = normalizeTextAnswer(current.a);
    ok = user === target;
  }

  daily = loadDaily();

  if (ok) {
    state.streak += 1;
    state.score += 10 + Math.min(10, state.level);
    if (state.streak % 5 === 0) state.level += 1;

    updateTopicStats({ topic, correct: true, solveTimeMs });

    feedbackEl.textContent = "✅ Richtig!";
    daily.doneCount += 1;
    daily.solved = daily.doneCount;
    renderDaily();
    state.coins = (state.coins ?? 0) + 1;
    setCompanionMessage(pick(MSG.correct));

    updateQuestsOnAnswer({ correct: true, solveTime, topic });
    renderDailyQuests();

    if (state.streak === 5)  { showBadge({icon:"🔥", title:"Streak 5!",  sub:"Flow gestartet."}); burstConfetti(18); }
    if (state.streak === 10) { showBadge({icon:"⚡️", title:"Streak 10!", sub:"Richtig stark!"}); burstConfetti(26); }
    if (state.streak === 15) { showBadge({icon:"👑", title:"Streak 15!", sub:"Unaufhaltbar!"}); burstConfetti(34); }

    const target = dailyTarget();
    // Tagesziel-Message, wenn gerade erreicht
    if (daily.solved === target) {
      showBadge({ icon:"🏆", title:`Tagesziel ${target}/${target}!`, sub:"Mission complete." });
      burstConfetti(40);
    }

    resetHintProgress();
  } else {
    state.streak = 0;
    updateTopicStats({ topic, correct: false, solveTimeMs });

    wrongAttemptsForCurrentQuestion += 1;
    feedbackEl.textContent = "❌ Noch einmal versuchen – der Tipp hilft dir weiter.";
    renderDaily();
    setCompanionMessage(pick(MSG.wrong));

    updateQuestsOnAnswer({ correct: false, solveTime, topic });
    renderDailyQuests();

    autoRevealHint();


  }

  saveDaily(daily);
  saveAll();
  renderStats();
}

function resetProgress() {
  state = { level: 1, streak: 0, score: 0, coins: 0 };
  topicStats = { ...DEFAULT_TOPIC_STATS };
  daily = defaultDaily(todayKey(), topicStats);
  profile.state = state;
  profile.topicStats = topicStats;
  profile.daily = daily;
  saveDaily(daily);
  saveAll();
  renderStats();
  renderDaily();
  renderDailyQuests();
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
  collectParentSettingsFromForm();
  profile.name = (playerNameInput.value || "Mariana").trim().slice(0, 20);
  profile.theme = chosenTheme;
  profile.unlockedThemes = profile.unlockedThemes || [DEFAULT_THEME];
  profile.explainMode = !!explainModeToggle?.checked;
  profile.parentSettings = parentSettings;
  renderProfileSelector();
  saveAll();
  applyProfile();
  renderTopicLocks();
  renderDailyQuests();
  ensureActiveTopicAllowed();
  closeModal();
});

if (newProfileBtn) {
  newProfileBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const name = prompt("Name für neues Profil?") || `Profil ${appData.profiles.length + 1}`;
    createProfile(name);
    applyProfile();
    renderStats();
    renderDaily();
    renderDailyQuests();
  });
}

if (deleteProfileBtn) {
  deleteProfileBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (appData.profiles.length <= 1) return;
    const ok = confirm("Dieses Profil wirklich löschen? Fortschritt geht verloren.");
    if (!ok) return;
    const remaining = appData.profiles.filter((p) => p.id !== profile.id);
    appData.profiles = remaining.length ? remaining : appData.profiles;
    const next = remaining[0] || appData.profiles[0];
    setActiveProfile(next.id, { skipPersistCurrent: true });
    renderProfileSelector();
  });
}

if (profileSelect) {
  profileSelect.addEventListener("change", (e) => {
    setActiveProfile(e.target.value);
  });
}

if (parentModeToggle) {
  parentModeToggle.addEventListener("change", () => {
    const enabled = !!parentModeToggle.checked;
    setParentInputsDisabled(!enabled);
    if (topicCheckboxesEl) {
      topicCheckboxesEl.querySelectorAll("input[type=checkbox]").forEach((cb) => { cb.disabled = !enabled; });
    }
  });
}

// Controls
checkBtn.addEventListener("click", checkAnswer);
newBtn.addEventListener("click", newQuestion);
skipBtn.addEventListener("click", newQuestion);
resetBtn.addEventListener("click", resetProgress);
answerEl.addEventListener("keydown", (e) => { if (e.key === "Enter") checkAnswer(); });
topicEl.addEventListener("change", () => { ensureActiveTopicAllowed(); newQuestion(); });
if (nextHintBtn) nextHintBtn.addEventListener("click", showNextHintManual);

// Init
closeModal();
(async function init() {
  renderProfileSelector();
  applyProfile();
  renderStats();
  renderDaily();
  renderDailyQuests();
  setCompanionMessage("Heute 15 richtige – und ich bin bei jeder Aufgabe dabei.");
  await loadDeck();
  newQuestion();
})();
