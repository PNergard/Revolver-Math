// main.js — bootstrap and screen routing. No framework: show/hide sections by id.
// Classic script (D8): loads last; wires everything together via RM.*.

(() => {
  "use strict";
  const RM = (globalThis.RM = globalThis.RM || {});
  const { initStorage, getSettings, saveSettings, getHighscores } = RM.storage;
  const { detectLanguage, setLanguage, getLanguage, applyStrings, t } = RM.strings;
  const { initGame } = RM.game;

  const SCREENS = ["title", "settings", "game", "summary", "highscores"];

  // Autoplay policy: no audio until the user has clicked/tapped once. Until
  // then we hold the whole title sequence (shots + tune) so sound and visuals
  // stay in sync — it kicks off on the first gesture instead.
  let gestureSeen = false;

  function showScreen(name) {
    SCREENS.forEach((s) => {
      document.getElementById(`screen-${s}`).hidden = s !== name;
    });
    // Title tune + sign shoot-up play on the title screen only.
    if (name === "title") {
      if (gestureSeen) {
        RM.audio.startTitleMusic();
        startTitleShots();
      }
    } else {
      RM.audio.stopTitleMusic();
      stopTitleShots();
    }
  }

  /* Three shots punch bullet holes into the title sign; sounds fire in sync
     with the CSS delays (600/1300/2100 ms in animations.css). */
  let titleShotTimers = [];

  function startTitleShots() {
    stopTitleShots();
    const sign = document.getElementById("title-logo");
    sign.classList.remove("shot-up");
    void sign.offsetWidth; // restart the animation sequence
    sign.classList.add("shot-up");
    [600, 1300, 2100].forEach((ms) =>
      titleShotTimers.push(setTimeout(() => RM.audio.play("pop"), ms)));
  }

  function stopTitleShots() {
    titleShotTimers.forEach(clearTimeout);
    titleShotTimers = [];
  }

  /* ---------- Settings UI ---------- */

  function buildTablesPicker(settings) {
    const picker = document.getElementById("tables-picker");
    // Keep the legend, rebuild the toggles.
    picker.querySelectorAll(".table-toggle").forEach((el) => el.remove());
    for (let n = 1; n <= 10; n++) {
      const label = document.createElement("label");
      label.className = "table-toggle";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = String(n);
      input.checked = settings.tables.includes(n);
      input.addEventListener("change", onSettingsChanged);
      label.append(input, document.createTextNode(String(n)));
      picker.appendChild(label);
    }
  }

  function readSettingsForm() {
    const tables = [...document.querySelectorAll("#tables-picker input:checked")]
      .map((el) => Number(el.value));
    return {
      tables: tables.length ? tables : getSettings().tables, // never allow zero tables
      timerMs: Number(document.getElementById("timer-slider").value),
      sound: document.getElementById("sound-toggle").checked,
      lang: document.getElementById("lang-select").value,
    };
  }

  function onSettingsChanged() {
    const settings = readSettingsForm();
    saveSettings(settings);
    setLanguage(settings.lang);
    applyStrings();
    updateTimerOutput(settings.timerMs);
  }

  function updateTimerOutput(timerMs) {
    document.getElementById("timer-value").textContent =
      `${(timerMs / 1000).toFixed(1)} ${t("seconds")}`;
  }

  function populateSettingsForm() {
    const settings = getSettings();
    buildTablesPicker(settings);
    document.getElementById("timer-slider").value = String(settings.timerMs);
    document.getElementById("sound-toggle").checked = settings.sound;
    document.getElementById("lang-select").value = getLanguage();
    updateTimerOutput(settings.timerMs);
  }

  /* ---------- High scores UI ---------- */

  function renderHighscores() {
    const list = document.getElementById("highscore-list");
    list.innerHTML = "";
    const scores = getHighscores();
    if (scores.length === 0) {
      const li = document.createElement("li");
      li.textContent = t("emptyHighscores");
      li.style.justifyContent = "center";
      list.appendChild(li);
      return;
    }
    scores.forEach((entry) => {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = entry.initials;
      const score = document.createElement("span");
      score.textContent = String(entry.score);
      li.append(name, score);
      list.appendChild(li);
    });
  }

  /* ---------- Boot ---------- */

  function boot() {
    initStorage();
    const settings = getSettings();
    setLanguage(settings.lang || detectLanguage());
    applyStrings();

    initGame({ showScreen }); // wires Play / Play Again / answers / initials

    document.getElementById("btn-settings").addEventListener("click", () => {
      populateSettingsForm();
      showScreen("settings");
    });
    document.getElementById("btn-highscores").addEventListener("click", () => {
      renderHighscores();
      showScreen("highscores");
    });
    document.getElementById("btn-settings-back").addEventListener("click", () => {
      showScreen("title");
    });
    document.getElementById("btn-highscores-back").addEventListener("click", () => {
      showScreen("title");
    });
    document.getElementById("btn-summary-title").addEventListener("click", () => {
      showScreen("title");
    });

    document.getElementById("timer-slider").addEventListener("input", onSettingsChanged);
    document.getElementById("sound-toggle").addEventListener("change", onSettingsChanged);
    document.getElementById("lang-select").addEventListener("change", onSettingsChanged);
    document.getElementById("btn-test-sound").addEventListener("click", () => RM.audio.test());

    // First click/tap unlocks audio: run the held title sequence if we're
    // still on the title screen.
    const onFirstGesture = () => {
      if (gestureSeen) return;
      gestureSeen = true;
      if (!document.getElementById("screen-title").hidden) {
        RM.audio.startTitleMusic();
        startTitleShots();
      }
    };
    document.addEventListener("pointerdown", onFirstGesture, { once: true });
    document.addEventListener("keydown", onFirstGesture, { once: true });

    showScreen("title");
  }

  boot();
})();
