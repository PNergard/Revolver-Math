// game.js — run state machine, duel loop, scoring, lives, combo.
// States: intro → draw → resolution → (next duel | defeat).
// T3 uses placeholder visuals; T5 replaces them with real animations.
// Classic script (D8): exposes RM.game; load after strings/storage/questions.

(() => {
  "use strict";
  const RM = (globalThis.RM = globalThis.RM || {});
  const { generateQuestion } = RM.questions;
  const {
    getSettings,
    getAnalytics,
    recordAnswer,
    qualifiesForHighscore,
    addHighscore,
  } = RM.storage;
  const { t, getLanguage, OPPONENT_NAMES } = RM.strings;

  const LIVES = 3;
  const BASE_SCORE = 100;
  const COMBO_CAP = 3;
  const BOSS_EVERY = 5;
  const BOSS_TIMER_CUT = 0.15;
  const RAMP_STEP = 0.075;      // timer cut per 5 duels…
  const RAMP_FLOOR = 0.7;       // …down to 70% of configured base (D2)
  const INTRO_MS = 1500;
  const INTRO_SHORT_MS = 800;   // after the first few duels the standoff tightens
  const DRAW_FLASH_MS = 450;
  const RESOLUTION_MS = 1400;
  const CELEBRATION_MS = 2400;  // longer beat for the "cleaned up the West" moment (D9)
  const ROSTER_SIZE = OPPONENT_NAMES.en.length;

  const TIERS = {
    legendary: { mult: 3, buildsCombo: true, strKey: "tierLegendary", color: "var(--gold)" },
    clean: { mult: 2, buildsCombo: true, strKey: "tierClean", color: "var(--cactus)" },
    close: { mult: 1, buildsCombo: false, strKey: "tierClose", color: "var(--sunset)" },
    outdrawn: { mult: 0, buildsCombo: false, strKey: "tierOutdrawn", color: "var(--danger)" },
  };

  let showScreen; // injected by initGame to keep screen routing in main.js

  let run = null;
  let phase = "idle"; // idle | intro | draw | resolution
  let rafId = 0;
  let phaseTimer = 0;
  let deadline = 0;
  let duelTimerMs = 0;
  let currentQuestion = null;
  let pausedRemainingMs = null; // non-null while hidden mid-countdown

  /* ---------- DOM helpers ---------- */

  const el = (id) => document.getElementById(id);

  function renderHud() {
    el("hud-lives").textContent = "♥".repeat(run.lives) + "♡".repeat(LIVES - run.lives);
    el("hud-score").textContent = String(run.score);
    // Sheriff-star combo meter: one slot per multiplier step, filled while a streak lives.
    const filled = run.streak > 0 ? run.comboMult : 0;
    el("hud-combo").innerHTML = Array.from({ length: COMBO_CAP }, (_, i) =>
      `<span class="star${i < filled ? " filled" : ""}">★</span>`).join("");
  }

  function setAnswerButtons(options, enabled) {
    document.querySelectorAll(".answer-btn").forEach((btn, i) => {
      btn.textContent = options ? String(options[i]) : "";
      btn.disabled = !enabled;
      btn.style.background = "";
    });
  }

  function opponentName(duelIndex) {
    const names = OPPONENT_NAMES[getLanguage()] || OPPONENT_NAMES.en;
    return names[duelIndex % names.length];
  }

  /** Swap the duel-stage state class; reflow in between restarts CSS animations. */
  function setStage(...classes) {
    const stage = el("duel-stage");
    stage.className = "";
    void stage.offsetWidth;
    stage.classList.add(...classes);
  }

  /* ---------- Run lifecycle ---------- */

  function initGame(deps) {
    showScreen = deps.showScreen;

    document.querySelectorAll(".answer-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (phase !== "draw") return; // ignore late/double taps
        onAnswer(Number(btn.textContent), btn);
      });
    });
    el("btn-play").addEventListener("click", startRun);
    el("btn-play-again").addEventListener("click", startRun);
    el("btn-initials-ok").addEventListener("click", submitInitials);
    el("initials-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitInitials();
    });

    // Keyboard play: 1–4 (top row or numpad) answer the corresponding button.
    document.addEventListener("keydown", (e) => {
      if (phase !== "draw") return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx <= 3) {
        document.querySelectorAll(".answer-btn")[idx].click();
      }
    });

    // Backgrounding the tab mid-countdown must not eat the timer (T7):
    // freeze the remaining time on hide, restore the deadline on return.
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (phase === "draw") {
          pausedRemainingMs = deadline - performance.now();
          cancelAnimationFrame(rafId);
          RM.audio.stopDrone();
        }
      } else if (phase === "draw" && pausedRemainingMs !== null) {
        deadline = performance.now() + pausedRemainingMs;
        pausedRemainingMs = null;
        RM.audio.startDrone();
        tickCountdown();
      }
    });
  }

  function startRun() {
    cancelTimers();
    run = {
      lives: LIVES,
      score: 0,
      duelIndex: 0,    // 0-based; duel 5, 10, … (1-based) are boss draws
      duelsWon: 0,
      streak: 0,       // consecutive legendary/clean
      comboMult: 1,
      bestCombo: 1,
      westCleaned: false, // beat the full roster once this run (D9)
    };
    showScreen("game");
    nextDuel();
  }

  function nextDuel() {
    phase = "intro";
    pausedRemainingMs = null;
    renderHud();
    setAnswerButtons(null, false);
    el("question-text").textContent = "";
    el("countdown-fill").style.transform = "scaleX(1)";

    const isBoss = (run.duelIndex + 1) % BOSS_EVERY === 0;
    el("opponent-name").textContent = (isBoss ? "⭐ " : "") + opponentName(run.duelIndex);
    el("opponent-area").classList.toggle("boss", isBoss);

    // Dress the opponent (palette custom props from opponents.js) and walk them in.
    const outfit = RM.opponents.get(run.duelIndex);
    const figure = el("opponent-figure");
    Object.entries(outfit).forEach(([part, color]) =>
      figure.style.setProperty(`--${part}`, color));
    setStage("stage-intro");
    RM.audio.play("whistle");

    const introMs = run.duelIndex < 3 ? INTRO_MS : INTRO_SHORT_MS;
    phaseTimer = setTimeout(() => beginDraw(isBoss), introMs);
  }

  function effectiveTimerMs(baseMs, duelIndex, isBoss) {
    const rampCut = Math.min(RAMP_STEP * Math.floor(duelIndex / 5), 1 - RAMP_FLOOR);
    let ms = baseMs * (1 - rampCut);
    if (isBoss) ms *= 1 - BOSS_TIMER_CUT;
    return Math.round(ms);
  }

  function beginDraw(isBoss) {
    const settings = getSettings();
    duelTimerMs = effectiveTimerMs(settings.timerMs, run.duelIndex, isBoss);
    currentQuestion = generateQuestion({
      tables: settings.tables,
      analytics: getAnalytics(),
      timerMs: settings.timerMs,
      duelIndex: run.duelIndex,
    });
    currentQuestion.isBoss = isBoss;

    // "DRAW!" flash so kids aren't reading mid-countdown, then question + timer.
    el("question-text").textContent = isBoss ? t("bossDraw") : t("draw");
    phaseTimer = setTimeout(() => {
      phase = "draw";
      el("question-text").textContent =
        `${currentQuestion.a} ${currentQuestion.symbol} ${currentQuestion.b}`;
      setAnswerButtons(currentQuestion.options, true);
      setStage("stage-draw"); // revolvers out, tense tremble
      RM.audio.startDrone();
      deadline = performance.now() + duelTimerMs;
      tickCountdown();
    }, DRAW_FLASH_MS);
  }

  function tickCountdown() {
    const remaining = deadline - performance.now();
    if (remaining <= 0) {
      el("countdown-fill").style.transform = "scaleX(0)";
      resolveDuel("outdrawn", duelTimerMs);
      return;
    }
    const frac = remaining / duelTimerMs;
    const fill = el("countdown-fill");
    fill.style.transform = `scaleX(${frac})`;
    fill.style.background =
      frac > 0.5 ? "var(--cactus)" : frac > 0.25 ? "var(--sunset)" : "var(--danger)";
    rafId = requestAnimationFrame(tickCountdown);
  }

  function classifyTier(elapsedMs) {
    const frac = elapsedMs / duelTimerMs;
    if (frac <= 1 / 3) return "legendary";
    if (frac <= 2 / 3) return "clean";
    return "close";
  }

  function onAnswer(value, btn) {
    const elapsedMs = duelTimerMs - (deadline - performance.now());
    const correct = value === currentQuestion.answer;
    btn.style.background = correct ? "var(--cactus)" : "var(--danger)";
    resolveDuel(correct ? classifyTier(elapsedMs) : "outdrawn", elapsedMs);
  }

  const TIER_SOUNDS = {
    legendary: ["pop", "ricochet", "ding"],
    clean: ["pop"],
    close: ["doublePop", "boing"], // both fire
    outdrawn: ["pop", "wah"],
  };

  function resolveDuel(tierName, elapsedMs) {
    phase = "resolution";
    cancelAnimationFrame(rafId);
    setAnswerButtons(currentQuestion.options, false);
    RM.audio.stopDrone();
    TIER_SOUNDS[tierName].forEach((s) => RM.audio.play(s));

    const tier = TIERS[tierName];
    const q = currentQuestion;
    const correct = tierName !== "outdrawn";

    recordAnswer(q.op, q.a, q.b, correct, Math.round(elapsedMs));

    if (tier.buildsCombo) {
      run.streak += 1;
      run.comboMult = Math.min(run.streak, COMBO_CAP);
      run.bestCombo = Math.max(run.bestCombo, run.comboMult);
    } else {
      run.streak = 0;
      run.comboMult = 1;
    }

    if (correct) {
      const base = BASE_SCORE * (q.isBoss ? 2 : 1);
      run.score += base * tier.mult * run.comboMult;
      run.duelsWon += 1;
    } else {
      run.lives -= 1;
    }
    renderHud();

    setStage(`stage-${tierName}`);
    el("question-text").textContent = t(tier.strKey);
    el("question-text").style.color = tier.color;

    // D9: first defeat of the last outlaw in the roster = "cleaned up the West".
    // Celebration replaces the tier text for a longer beat; the run continues.
    let resolutionMs = RESOLUTION_MS;
    if (correct && !run.westCleaned && run.duelIndex % ROSTER_SIZE === ROSTER_SIZE - 1) {
      run.westCleaned = true;
      el("duel-stage").classList.add("stage-celebrate");
      RM.audio.play("fanfare");
      el("question-text").textContent = t("westCleaned");
      el("question-text").style.color = "var(--gold)";
      resolutionMs = CELEBRATION_MS;
    }

    phaseTimer = setTimeout(() => {
      el("question-text").style.color = "";
      if (run.lives <= 0) {
        endRun();
      } else {
        run.duelIndex += 1;
        nextDuel();
      }
    }, resolutionMs);
  }

  function endRun() {
    phase = "idle";
    el("summary-score").textContent = String(run.score);
    el("summary-duels").textContent = String(run.duelsWon);
    el("summary-combo").textContent = `×${run.bestCombo}`;
    el("summary-badge").hidden = !run.westCleaned;
    el("summary-badge").textContent = run.westCleaned ? t("westCleanedBadge") : "";

    const qualifies = qualifiesForHighscore(run.score);
    el("initials-entry").hidden = !qualifies;
    el("btn-play-again").hidden = qualifies; // enter initials first, then replay
    if (qualifies) {
      el("initials-input").value = "";
      el("initials-input").focus();
    }
    showScreen("summary");
  }

  function submitInitials() {
    const initials = el("initials-input").value.trim().toUpperCase().slice(0, 3);
    if (initials.length === 0) return;
    addHighscore(initials, run.score);
    el("initials-entry").hidden = true;
    el("btn-play-again").hidden = false;
  }

  function cancelTimers() {
    clearTimeout(phaseTimer);
    cancelAnimationFrame(rafId);
  }

  RM.game = { initGame, startRun };
})();
