// strings.js — sv/en string maps and language detection.
// All user-facing text lives here (D1). Code never branches on product name.
// Classic script (D8): exposes RM.strings on the shared namespace.

(() => {
  "use strict";
  const RM = (globalThis.RM = globalThis.RM || {});

  const STRINGS = {
    sv: {
      gameTitle: "Snabbast i Västern",
      play: "Spela",
      settings: "Inställningar",
      highScores: "Topplista",
      tables: "Tabeller",
      timer: "Tid per fråga",
      sound: "Ljud",
      language: "Språk",
      back: "Tillbaka",
      runOver: "Duellen är över!",
      finalScore: "Poäng:",
      duelsWon: "Vunna dueller:",
      bestCombo: "Bästa kombo:",
      newHighScore: "Ny topplistenotering! Skriv dina initialer:",
      ok: "OK",
      playAgain: "Spela igen",
      backToTitle: "Till start",
      seconds: "s",
      draw: "DRA!",
      bossDraw: "BOSSDUELL!",
      // Outcome tier flavor text
      tierLegendary: "Legendariskt drag!",
      tierClean: "Ren träff!",
      tierClose: "Nära ögat!",
      tierOutdrawn: "Utdragen...",
      emptyHighscores: "Inga poäng ännu — bli först!",
      westCleaned: "⭐ Du har rensat Vilda Västern! ⭐",
      westCleanedBadge: "⭐ Västern rensad!",
      testSound: "🔊 Testa ljud",
    },
    en: {
      gameTitle: "Revolver Math",
      play: "Play",
      settings: "Settings",
      highScores: "High Scores",
      tables: "Tables",
      timer: "Time per question",
      sound: "Sound",
      language: "Language",
      back: "Back",
      runOver: "The duel is over!",
      finalScore: "Score:",
      duelsWon: "Duels won:",
      bestCombo: "Best combo:",
      newHighScore: "New high score! Enter your initials:",
      ok: "OK",
      playAgain: "Play Again",
      backToTitle: "Back to Title",
      seconds: "s",
      draw: "DRAW!",
      bossDraw: "BOSS DRAW!",
      tierLegendary: "Legendary draw!",
      tierClean: "Clean hit!",
      tierClose: "Close call!",
      tierOutdrawn: "Outdrawn...",
      emptyHighscores: "No scores yet — be the first!",
      westCleaned: "⭐ You've cleaned up the West! ⭐",
      westCleanedBadge: "⭐ West cleaned up!",
      testSound: "🔊 Test sound",
    },
  };

  // Opponent roster display names (spec: opponent names live in strings.js).
  // Index-aligned with the roster in opponents.js.
  const OPPONENT_NAMES = {
    sv: [
      "Kaktus-Kalle",
      "Stora Stina",
      "Prärie-Pelle",
      "Dynamit-Doris",
      "Sheriffen av Sjuan",
      "Multiplikator-Magnus",
    ],
    en: [
      "Cactus Carl",
      "Big Bertha",
      "Prairie Pete",
      "Dynamite Doris",
      "The Sheriff of Sevens",
      "Mad Multiplier McGraw",
    ],
  };

  const SUPPORTED = ["sv", "en"];
  const FALLBACK = "en";

  let currentLang = FALLBACK;

  /** Detect language from navigator.language; returns a supported code. */
  function detectLanguage() {
    const nav = (navigator.language || "").slice(0, 2).toLowerCase();
    return SUPPORTED.includes(nav) ? nav : FALLBACK;
  }

  function setLanguage(lang) {
    currentLang = SUPPORTED.includes(lang) ? lang : FALLBACK;
  }

  function getLanguage() {
    return currentLang;
  }

  /** Look up a string key in the current language. */
  function t(key) {
    const map = STRINGS[currentLang] || STRINGS[FALLBACK];
    return map[key] ?? STRINGS[FALLBACK][key] ?? key;
  }

  /** Apply current language to every element carrying data-str. */
  function applyStrings(root = document) {
    root.querySelectorAll("[data-str]").forEach((el) => {
      el.textContent = t(el.dataset.str);
    });
    document.documentElement.lang = currentLang;
    document.title = t("gameTitle");
  }

  RM.strings = {
    OPPONENT_NAMES,
    detectLanguage,
    setLanguage,
    getLanguage,
    t,
    applyStrings,
    maps: STRINGS, // exposed for the language-parity test harness
  };
})();
