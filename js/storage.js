// storage.js — localStorage read/write for rm.* keys with schema versioning (D6).
// Corrupt or future-versioned data resets gracefully to defaults.
// Classic script (D8): exposes RM.storage on the shared namespace.

(() => {
  "use strict";
  const RM = (globalThis.RM = globalThis.RM || {});

  const SCHEMA_VERSION = 1;
  const KEYS = {
    version: "rm.version",
    settings: "rm.settings",
    highscores: "rm.highscores",
    analytics: "rm.analytics",
    player: "rm.player",
  };

  const DEFAULT_SETTINGS = {
    tables: [2, 3, 4, 5, 6, 7, 8, 9, 10],
    timerMs: 5000,
    sound: true,
    lang: null, // null = auto-detect
  };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded or storage disabled — game keeps working, just unpersisted.
    }
  }

  /** Run once at boot. Resets storage if the schema version is unknown. */
  function initStorage() {
    const stored = readJson(KEYS.version, null);
    if (stored !== null && stored !== SCHEMA_VERSION) {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    }
    writeJson(KEYS.version, SCHEMA_VERSION);
    ensurePlayer();
  }

  function ensurePlayer() {
    const player = readJson(KEYS.player, null);
    if (!player || typeof player.id !== "string") {
      const id = crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      writeJson(KEYS.player, { id });
    }
  }

  function getSettings() {
    const s = readJson(KEYS.settings, {});
    const merged = { ...DEFAULT_SETTINGS, ...s };
    // Sanitize: tables must be a non-empty subset of 2–12.
    if (!Array.isArray(merged.tables)) merged.tables = [...DEFAULT_SETTINGS.tables];
    merged.tables = merged.tables.filter((n) => Number.isInteger(n) && n >= 2 && n <= 12);
    if (merged.tables.length === 0) merged.tables = [...DEFAULT_SETTINGS.tables];
    merged.timerMs = clamp(merged.timerMs, 1000, 10000, DEFAULT_SETTINGS.timerMs);
    merged.sound = Boolean(merged.sound);
    return merged;
  }

  function saveSettings(settings) {
    writeJson(KEYS.settings, settings);
  }

  function clamp(value, min, max, fallback) {
    return typeof value === "number" && value >= min && value <= max ? value : fallback;
  }

  /** Top-10 high scores, descending. */
  function getHighscores() {
    const list = readJson(KEYS.highscores, []);
    return Array.isArray(list) ? list : [];
  }

  /**
   * Insert a score; returns the rank (0-based) if it made top 10, else -1.
   * Entry shape: { initials, score, date }.
   */
  function addHighscore(initials, score) {
    const list = getHighscores();
    const entry = { initials, score, date: new Date().toISOString().slice(0, 10) };
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const top = list.slice(0, 10);
    writeJson(KEYS.highscores, top);
    return top.indexOf(entry);
  }

  /** Would this score make the top 10? */
  function qualifiesForHighscore(score) {
    if (score <= 0) return false;
    const list = getHighscores();
    return list.length < 10 || score > list[list.length - 1].score;
  }

  /** Analytics map: { "mul:6x7": { right, wrong, avgMs } }. Key normalized a≤b. */
  function getAnalytics() {
    const a = readJson(KEYS.analytics, {});
    return a && typeof a === "object" ? a : {};
  }

  function analyticsKey(op, a, b) {
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    return `${op}:${lo}x${hi}`;
  }

  /**
   * Record a resolved duel. avgMs is a running average over correct answers only.
   */
  function recordAnswer(op, a, b, correct, elapsedMs) {
    const analytics = getAnalytics();
    const key = analyticsKey(op, a, b);
    const entry = analytics[key] || { right: 0, wrong: 0, avgMs: 0 };
    if (correct) {
      entry.avgMs = Math.round((entry.avgMs * entry.right + elapsedMs) / (entry.right + 1));
      entry.right += 1;
    } else {
      entry.wrong += 1;
    }
    analytics[key] = entry;
    writeJson(KEYS.analytics, analytics);
  }

  RM.storage = {
    initStorage,
    getSettings,
    saveSettings,
    getHighscores,
    addHighscore,
    qualifiesForHighscore,
    getAnalytics,
    analyticsKey,
    recordAnswer,
  };
})();
