# RevolverMath — Plan (Step 1)

Ordered tasks for Claude Code sessions. Each task is independently completable and
has done-criteria. Update status markers as work proceeds:
`[ ]` todo · `[~]` in progress · `[x]` done

Reference docs: `idea.md` (concept/roadmap), `spec.md` (authoritative spec),
`decisions.md` (decision log — append, never rewrite).

---

## T1 — Scaffold [x]

Create the file structure per spec.md "Tech & structure". index.html with screen
containers (title, settings, game, summary, highscores), main.css with palette
variables and base layout, main.js with a minimal screen-routing mechanism
(show/hide by id, no framework). strings.js with sv/en maps and language detection.
storage.js with rm.* read/write helpers and a schema version field.

**Done when:** title screen renders with correct localized title, navigation between
empty screens works, language toggle switches title text, settings persist across
reload, no console errors, runs from `python -m http.server` or file://.

## T2 — Question engine [x]

questions.js: question generation `{ a, b, op, answer }` (op="mul" only), operand
order randomized for display but analytics key normalized a≤b. Smart distractor
generation per spec (adjacent table, off-by-one-operand, digit swap; dedupe;
fallback to nearby products if a strategy collides). Adaptive weighting over the
enabled-tables pair pool driven by rm.analytics counters.

**Done when:** unit-testable in isolation (plain functions, no DOM); a quick test
page or console harness shows 100 generated questions all have 4 unique options
including the answer; weighting visibly favors pairs marked wrong in rm.analytics.

## T3 — Game loop [x]

game.js: run state machine (intro → draw → resolution → next / defeat), 3 lives,
countdown driven by rm.settings.timerMs with the in-run ramp (floor 70% of base,
step every 5 duels), outcome tier classification by answer speed, scoring with
combo multiplier (×1/×2/×3 cap), boss draw every 5th duel (tighter timer, double
points). Updates rm.analytics on every resolution. Placeholder visuals are fine —
colored boxes and text.

**Done when:** a full run is playable with keyboard/tap on placeholder UI, score
and lives behave per spec, defeat screen shows summary, high-score entry writes
top-10 to rm.highscores, analytics counters update correctly (verify in devtools).

## T4 — Duel screen UI & layout [x]

Real layout for the game screen: question display, 2×2 answer grid (≥64 px buttons),
countdown bar, lives indicator, combo sheriff-star meter, score. Portrait-first,
landscape media query for Chromebooks. Title/settings/summary/high-score screens
styled to match (desert palette, chunky cartoon UI).

**Done when:** all five screens look intentional on a 380 px portrait viewport and
a 1366×768 landscape viewport; buttons comfortably tappable; countdown bar smooth.

## T5 — Characters & outcome animations [x]

Opponent roster (opponents.js, 6 outlaws, palette/sprite variations, localized
names), player gunslinger, standoff intro animation, and the four outcome
animations as CSS keyframe sequences: legendary (hat flies, spin, dust cloud),
clean hit (stagger over barrel), close call (both fire, stumble), outdrawn
(player tumble). SVG layers or simple sprite sheets — keep assets light.

**Done when:** each tier is visually distinct and reads as slapstick comedy;
intro plays before each duel; boss draws look/feel different (name plate, sting
placeholder); animations don't block input for the next duel longer than ~1.5 s.

## T6 — Audio [x]

audio.js wrapper over Web Audio: tension drone during countdown, whistle sting on
intro, per-tier resolution sounds (pop, boing, ricochet, tumble), mute toggle wired
to settings. Synthesized or tiny royalty-free samples; lazy-loaded; game must be
fully functional muted or if audio fails to load.

**Done when:** sounds fire on the right events, mute persists, no autoplay-policy
errors (audio context unlocked on first user gesture), zero impact when muted.

## T7 — Polish & hardening [x]

Settings slider for timer (3–10 s), tables picker UX, edge cases (rapid double-tap
on answers, tab backgrounding pausing the timer fairly, localStorage quota/corrupt
data → reset gracefully via schema version), offline check, final pass on both
languages, favicon/app icons, README with how-to-run.

**Done when:** Definition of done in spec.md fully satisfied.

---

## Parking lot (do NOT do in step 1)

- Step 2: .NET 10 minimal API, class codes, server leaderboard, analytics sync
- Step 3: Blazor teacher dashboard, round mode
- Two-player versus (hot-seat first, SignalR later)
- Division/addition operations (engine is abstracted; implementation deferred)

## Session notes

(Claude Code: append a dated bullet per session — what was done, what's next,
anything surprising.)

- **2026-06-12** — T1 done. Scaffolded index.html (5 screen sections), css/main.css
  (desert palette vars, chunky button style, portrait-first + landscape media query),
  js/main.js (screen routing, settings form, high-score render), js/strings.js
  (sv/en maps incl. opponent names, auto-detect + live switch), js/storage.js
  (rm.* helpers, schema v1, graceful reset on unknown version, anonymous player
  uuid). Verified with headless-Chrome CDP smoke test: localized title, navigation,
  live language switch, settings persistence across reload, empty high-score state,
  zero console errors. Creative calls pending implementation in T3/T5: brief "DRAW!"
  flash before timer starts (string key `draw` already in strings.js), intro
  shortened after early duels. Next: T2 question engine.
- **2026-06-12 (cont.)** — T2 + T3 done, same session. T2: js/questions.js with
  op-abstracted OPS table (D7), smart distractors (adjacent table / off-by-one
  operand / digit swap, plausible-product fallback), adaptive pairWeight (wrong
  pairs up to 4×, mastered pairs decay to 0.3×, slow ×1.5, hard tables 7/8/12 ramp
  to 2× by duel 20). Committed console harness at tests/questions.test.mjs (run:
  `node tests/questions.test.mjs`) — all checks pass incl. full 2–12 pair sweep.
  T3: js/game.js run state machine with "DRAW!" flash (450 ms) before timer,
  intro 1.5 s for first 3 duels then 0.8 s, proportional ramp (−7.5% per 5 duels,
  floor 70%), boss every 5th (−15% timer, 2× base), combo streak → ×1/×2/×3.
  Verified by CDP-driven full playthrough: scoring math exact (300/900/1800/2700/
  4500 boss/5400), lives, summary, initials → rm.highscores, analytics 6 right /
  3 wrong, Play Again resets clean, zero console errors. Placeholder visuals
  (name plates, tier text + color) await T5. Next: T4 duel screen UI & layout.
- **2026-06-12 (cont. 2)** — Per's first double-click of index.html failed: ES
  modules are CORS-blocked on file://, so no JS ran (empty dead buttons, only the
  CSS tumbleweed moved). Earlier smoke tests had only covered http://. Fixed per
  D8: converted all five js files to classic scripts on a `globalThis.RM`
  namespace, script tags in dependency order in index.html; test harness now
  loads them via node:vm. Re-verified everything **against file:// directly**:
  engine harness, T1 navigation/persistence smoke, full T3 playthrough — all
  green, zero console errors. Lesson recorded: always verify the file:// path,
  it's the primary way Per runs the game.
- **2026-06-12 (cont. 3)** — D9 added on Per's "when do you win?" question:
  victory moment when the 6th outlaw is first beaten in a run (celebration text
  for a 2.4 s beat, gold; sheriff-badge line on summary; run continues). Once per
  run via run.westCleaned flag. Verified via file:// playthrough of 12 winning
  duels: fires exactly once at duel 6, badge shows on summary, no console errors.
  T5 should turn the celebration into a proper animation. Next: T4.
- **2026-06-12 (cont. 4)** — T4 done. Full CSS pass: shared desert-horizon
  backdrop (sky→sand gradient + radial sun) on body and screens, wooden-sign
  title logo, cactus SVG (assets/cactus.svg) on title + duel stage, HUD (red
  hearts, paper score plate, 3-slot sheriff-star combo meter — game.js renders
  filled/empty spans), name plate above opponent (gold for boss), parchment
  question card, countdown bar shifts green→orange→red (JS at thresholds 50/25%),
  wanted-poster summary card, arcade high-score list (gold/silver/bronze rows).
  Duel stage restructured: #player-figure / #opponent-figure + #opponent-name
  elements ready for T5 animations; emoji placeholders (🤠/🥸). Landscape ≥900px:
  CSS grid — stage left, question+answers right, app full-width. Verified via
  screenshot tour of all 5 screens at 380×740 and 1366×768: buttons 72px, no
  overflow, no console errors; full-game regression green. Bug found via
  screenshot review: id-level display:flex overrode the hidden attribute, so the
  initials prompt showed even without a qualifying score — fixed with global
  `[hidden] { display: none !important; }`. Next: T5 characters & outcome
  animations (incl. proper D9 celebration).
- **2026-06-12 (cont. 5)** — T5 + T6 done, driven by Per's feedback (no sound
  heard → test button; wants articulated characters + visible guns → D10).
  T5: CSS-built gunslingers (hat/head/torso/arms/legs, palette via custom props;
  css/animations.css) — opponent mirrored with `scale: -1 1`, ALL animations
  use `transform` only so keyframes work for both sides in local coords
  (forward = +x). js/opponents.js holds 6 outfit palettes; player is sheriff
  blue + gold star. Stage state classes on #duel-stage (stage-intro/draw/
  legendary/clean/close/outdrawn/celebrate) drive everything: walk-in with
  stepping legs, revolver draw + tense tremble during countdown, comic star
  muzzle flash (never hits a body, D10), hat-fly, spin-out + dust puff, stagger
  over barrel, both-fire stumble, player tumble, celebration hop + rising stars.
  T6: js/audio.js — fully synthesized Web Audio (no asset files): whistle,
  pop, double-pop, ricochet, ding, boing, sad-trombone wah, fanfare, tension
  drone during countdown. Lazy AudioContext inside user gesture; play() no-ops
  when muted or unavailable. "Test sound" button in Settings (bypasses toggle,
  doubles as autoplay unlock). Verified: animation-state screenshots (intro/
  draw/legendary/outdrawn), full-game + win regressions all green on file://,
  zero console errors. NOTE: sounds are code-verified only — Per should
  ear-test via the settings button and a run; synth params may want tuning.
  Next: T7 polish & hardening.
- **2026-06-12 (cont. 6)** — Two fixes on Per's feedback. (1) Tumbleweed had
  vanished: T5 introduced `@keyframes tumble` in animations.css which silently
  overrode main.css's tumbleweed keyframes of the same name (later sheet wins)
  — renamed to `player-tumble`. Lesson: keyframes share one global namespace
  across stylesheets; prefix outcome keyframes. (2) Title music: synthesized
  lonesome-whistle loop in D minor (triangle lead with 5 Hz vibrato over soft
  D2/A2 bass, ~4.4 s loop, self-rescheduling) — starts on title screen, stops
  on leaving, retried on first pointerdown because autoplay policy keeps the
  AudioContext suspended until a gesture. Verified: tumbleweed rolling +
  animationName checks, music start/stop paths, outdrawn rename, zero console
  errors. Music is ear-test pending like the rest of the audio.
- **2026-06-12 (cont. 7)** — Per's idea: title-sign shoot-up. Each time the
  title screen shows, three shots punch bullet holes into the wooden sign
  (pop-in at 600/1300/2100 ms, sign jolts via sign-hit keyframes at matching
  percentages, pop sounds from main.js timers in sync; timers cleared on
  leaving title). Title text moved into an inner span — applyStrings sets
  textContent and would otherwise wipe the hole elements. Gotcha hit:
  nth-of-type counts the text span too (same element type) — use nth-child.
  First-load shots are silent until the first pointer gesture (autoplay).
  All title checks + outdrawn regression green.
- **2026-06-12 (cont. 8)** — Title-screen feedback round: (1) first-load shots
  no longer fire silently — the whole title sequence (shots + tune) is HELD
  until the first click/tap (gestureSeen flag in main.js, pointerdown+keydown
  once-listeners), so audio and visuals always land together; returning from a
  run plays immediately as before. (2) Tumbleweed remade: assets/tumbleweed.svg
  (scraggly twig ball, two-tone), three instances in different sizes/speeds
  with negative delays, rolling via `translate` on the parent and spin+hop via
  independent `rotate`/`translate` animations on the child. (3) Ground: darker
  dirt strip + pebbles at the bottom of every screen (extra gradient stops).
  (4) Title music capped at 2 loops then fades; replays on next title visit.
  Verified: held-sequence behavior (no holes before gesture, all 3 after),
  3 tumbleweeds rolling+spinning, outdrawn regression, zero console errors.
- **2026-06-12 (cont. 9)** — T7 done; step 1 complete. (1) Tab backgrounding:
  visibilitychange handler freezes remaining countdown ms on hide, restores
  the deadline + drone on return (verified in-browser by faking document.hidden:
  bar froze at 0.934 for 900 ms, resumed from same value). (2) Hardening tests
  committed: tests/storage.test.mjs (corrupt JSON → defaults, garbage values
  sanitized, future schema wipes, uuid stable, top-10 trim/order, quota writes
  swallowed) and tests/strings.test.mjs (sv/en key parity, no empty values,
  6+6 opponent names) — all green, plus full in-browser corrupt-storage boot
  check. (3) Favicon assets/icon.svg (sheriff star) + theme-color meta.
  (4) README.md: how to run/play, layout, tests, GitHub Pages instructions.
  (5) Full regression suite green on file:// (game math, win moment, title
  sequence, both-viewport tour). Double-tap guard and timer slider already in
  place from T3/T1. Spec "Definition of done" satisfied. Git repo initialized
  for GitHub Pages publishing.
- **2026-06-12 (cont. 10)** — D11 per Per: keyboard answers — keys 1–4 (top row
  or numpad) click the corresponding answer button during the draw phase only;
  corner key-hints on the buttons shown via `@media (hover: hover) and
  (pointer: fine)` so touch devices stay clean. Timer slider minimum lowered
  3 s → 1 s (index.html min + storage clamp; spec updated). Verified in-browser:
  key answers score correctly, keys ignored during resolution, hint renders,
  slider min 1000, storage tests green. Initial git commit made (main branch)
  — ready to push to GitHub for Pages.
