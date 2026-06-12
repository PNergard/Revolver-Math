// audio.js — Web Audio wrapper (T6). All sounds are synthesized: no files,
// nothing to load, fully functional muted or if Web Audio is unavailable.
// The context is created lazily inside a user gesture (Play / Test sound click)
// to satisfy autoplay policies. Every call is wrapped: audio can never break play.
// Classic script (D8): exposes RM.audio; load after storage.js.

(() => {
  "use strict";
  const RM = (globalThis.RM = globalThis.RM || {});

  const Ctx = globalThis.AudioContext || globalThis.webkitAudioContext;
  let ctx = null;
  let drone = null;

  function ensureCtx() {
    if (!Ctx) return null;
    if (!ctx) ctx = new Ctx();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function soundOn() {
    return RM.storage.getSettings().sound;
  }

  /* ---------- Synth building blocks ---------- */

  function noiseBuffer(c, seconds) {
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Single oscillator note with a frequency glide and exponential fade-out. */
  function tone(c, { type = "square", from, to = from, dur, vol = 0.2, at = 0 }) {
    const t = c.currentTime + at;
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  /** Gunshot: filtered noise burst. */
  function pop(c, at = 0) {
    const t = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 0.16);
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(280, t + 0.13);
    const g = c.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
    src.stop(t + 0.17);
  }

  /* ---------- The effect set ---------- */

  const SOUNDS = {
    pop: (c) => pop(c),
    doublePop: (c) => { pop(c); pop(c, 0.13); },
    ricochet: (c) => tone(c, { type: "triangle", from: 1700, to: 280, dur: 0.45, vol: 0.22, at: 0.08 }),
    ding: (c) => {
      tone(c, { type: "sine", from: 1318, dur: 0.5, vol: 0.18 });
      tone(c, { type: "sine", from: 2637, dur: 0.35, vol: 0.07 });
    },
    boing: (c) => {
      const t = c.currentTime;
      const osc = c.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueCurveAtTime([380, 130, 280, 100, 190, 80], t, 0.45);
      const g = c.createGain();
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.connect(g).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.55);
    },
    // Sad-trombone-ish descending wah for getting outdrawn.
    wah: (c) => {
      tone(c, { type: "square", from: 311, dur: 0.16, vol: 0.18 });
      tone(c, { type: "square", from: 262, dur: 0.16, vol: 0.18, at: 0.18 });
      tone(c, { type: "square", from: 208, dur: 0.16, vol: 0.18, at: 0.36 });
      tone(c, { type: "square", from: 175, to: 155, dur: 0.5, vol: 0.18, at: 0.54 });
    },
    whistle: (c) => {
      tone(c, { type: "triangle", from: 700, to: 1400, dur: 0.18, vol: 0.12 });
      tone(c, { type: "triangle", from: 1400, to: 480, dur: 0.34, vol: 0.12, at: 0.2 });
    },
    fanfare: (c) => {
      [523, 659, 784].forEach((f, i) =>
        tone(c, { type: "square", from: f, dur: 0.12, vol: 0.16, at: i * 0.12 }));
      tone(c, { type: "square", from: 1046, dur: 0.4, vol: 0.18, at: 0.36 });
    },
  };

  /* ---------- Public API ---------- */

  function play(name) {
    if (!soundOn()) return;
    try {
      const c = ensureCtx();
      if (c) SOUNDS[name](c);
    } catch { /* audio must never break the game */ }
  }

  /** Low tension drone while the countdown runs. */
  function startDrone() {
    if (!soundOn() || drone) return;
    try {
      const c = ensureCtx();
      if (!c) return;
      const osc1 = c.createOscillator();
      const osc2 = c.createOscillator();
      osc1.type = osc2.type = "sawtooth";
      osc1.frequency.value = 49;
      osc2.frequency.value = 55;
      const f = c.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 220;
      const g = c.createGain();
      g.gain.setValueAtTime(0, c.currentTime);
      g.gain.linearRampToValueAtTime(0.05, c.currentTime + 0.3);
      osc1.connect(f);
      osc2.connect(f);
      f.connect(g).connect(c.destination);
      osc1.start();
      osc2.start();
      drone = { osc1, osc2, g };
    } catch { drone = null; }
  }

  function stopDrone() {
    if (!drone) return;
    try {
      const { osc1, osc2, g } = drone;
      const t = ctx.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.15);
      osc1.stop(t + 0.2);
      osc2.stop(t + 0.2);
    } catch { /* already stopped */ }
    drone = null;
  }

  /** Settings "Test sound" button: ignores the sound toggle — pressing it IS
      the intent to hear something, and it doubles as the autoplay unlock. */
  function test() {
    try {
      const c = ensureCtx();
      if (!c) return;
      SOUNDS.pop(c);
      SOUNDS.ricochet(c);
    } catch { /* unavailable */ }
  }

  /* ---------- Title music: lonesome-whistle western loop ---------- */

  let music = null;

  /** Whistle-like melody note with vibrato. */
  function whistleNote(c, dest, freq, at, dur) {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, at);
    const vib = c.createOscillator();
    vib.frequency.value = 5.2;
    const vibGain = c.createGain();
    vibGain.gain.value = 7;
    vib.connect(vibGain).connect(osc.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.15, at + 0.06);
    g.gain.setValueAtTime(0.15, at + dur - 0.1);
    g.gain.linearRampToValueAtTime(0, at + dur);
    osc.connect(g).connect(dest);
    osc.start(at); osc.stop(at + dur + 0.05);
    vib.start(at); vib.stop(at + dur + 0.05);
  }

  function bassNote(c, dest, freq, at, dur) {
    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, at);
    const g = c.createGain();
    g.gain.setValueAtTime(0.11, at);
    g.gain.exponentialRampToValueAtTime(0.001, at + dur);
    osc.connect(g).connect(dest);
    osc.start(at); osc.stop(at + dur + 0.05);
  }

  /** Muted-trumpet "wah" — sawtooth through a sweeping bandpass (the mouth
      opening and closing), with a little pitch droop on release. */
  function wahNote(c, dest, freq, at, dur, droop = false) {
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, at);
    if (droop) {
      osc.frequency.setValueAtTime(freq, at + dur * 0.5);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.84, at + dur);
    }
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.Q.value = 7;
    f.frequency.setValueCurveAtTime([420, 1500, 620], at, dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.34, at + 0.05);
    g.gain.setValueAtTime(0.34, at + dur - 0.12);
    g.gain.linearRampToValueAtTime(0, at + dur);
    osc.connect(f).connect(g).connect(dest);
    osc.start(at);
    osc.stop(at + dur + 0.05);
  }

  /** One pass of the title loop (spaghetti-western homage, original melody):
      whistled flutter → falling tail → muted-trumpet wah-wah answer, over a
      soft gallop. Returns its length in seconds. */
  function scheduleTitleLoop(c, dest, at) {
    const A4 = 440.0, C5 = 523.25, G4 = 392.0, E4 = 329.63;
    const E3 = 164.81, D3 = 146.83, C3 = 130.81;

    // Whistle flutter (fast alternating minor third), then the falling tail.
    [C5, A4, C5, A4].forEach((f, i) =>
      whistleNote(c, dest, f, at + i * 0.095, 0.1));
    whistleNote(c, dest, C5, at + 0.38, 0.32);
    whistleNote(c, dest, G4, at + 0.78, 0.36);
    whistleNote(c, dest, E4, at + 1.2, 0.85);

    // The "nuäh nuäh äähh" answer.
    wahNote(c, dest, E3, at + 2.35, 0.42);
    wahNote(c, dest, D3, at + 2.88, 0.42);
    wahNote(c, dest, C3, at + 3.42, 1.0, true);

    // Soft gallop underneath: bum–ba-dum on A.
    const A2 = 110.0, A1 = 55.0;
    for (let bar = 0; bar < 7; bar++) {
      const t0 = at + bar * 0.65;
      bassNote(c, dest, A1, t0, 0.3);
      bassNote(c, dest, A2, t0 + 0.42, 0.12);
      bassNote(c, dest, A2, t0 + 0.54, 0.12);
    }

    return 4.9;
  }

  const TITLE_MUSIC_LOOPS = 2; // then go quiet — looping forever gets annoying

  function startTitleMusic() {
    if (!soundOn() || music) return;
    try {
      const c = ensureCtx();
      // Before the first user gesture the context stays suspended — the
      // first-gesture hook in main.js calls us again once unlocked.
      if (!c || c.state !== "running") return;
      const g = c.createGain();
      g.gain.value = 0.55;
      g.connect(c.destination);
      music = { g, timer: 0 };
      let plays = 0;
      const loop = (at) => {
        if (!music) return;
        const len = scheduleTitleLoop(c, g, at);
        plays += 1;
        if (plays < TITLE_MUSIC_LOOPS) {
          music.timer = setTimeout(() => loop(at + len), (at + len - c.currentTime - 0.25) * 1000);
        } else {
          // Let the last pass ring out, then clean up so a later title visit replays.
          music.timer = setTimeout(() => {
            const m = music;
            music = null;
            if (m) m.g.disconnect();
          }, (at + len - c.currentTime + 0.3) * 1000);
        }
      };
      loop(c.currentTime + 0.05);
    } catch { music = null; }
  }

  function stopTitleMusic() {
    if (!music) return;
    try {
      clearTimeout(music.timer);
      const t = ctx.currentTime;
      music.g.gain.cancelScheduledValues(t);
      music.g.gain.setValueAtTime(music.g.gain.value, t);
      music.g.gain.linearRampToValueAtTime(0, t + 0.25);
      const g = music.g;
      setTimeout(() => g.disconnect(), 400);
    } catch { /* already gone */ }
    music = null;
  }

  RM.audio = { play, startDrone, stopDrone, test, startTitleMusic, stopTitleMusic };
})();
