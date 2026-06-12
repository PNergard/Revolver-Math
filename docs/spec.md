# RevolverMath — Spec v1.0 (Step 1: The Game)

Status: agreed 2026-06-12. Decisions referenced as D1–D7 live in `decisions.md`.

## Scope

A fully client-side web game: open URL, play. No backend, no accounts, no build step.
High scores and analytics live in localStorage, structured to sync to the step 2 .NET
API without rework. Steps 2 (API + class leaderboard) and 3 (Blazor teacher dashboard)
are out of scope but inform the data model.

## Core loop

1. **Standoff intro** (~1.5 s): opponent walks into frame, tumbleweed, tension sting.
2. **Draw!**: question appears large ("7 × 8"), four answer buttons, countdown bar
   drains (configured duration, default 5 s — D2).
3. **Resolution**: outcome animation based on speed + correctness (tiers below).
4. **Next opponent**, or **defeat screen** when out of lives.

A run = a sequence of duels of increasing difficulty until the player loses all
3 lives (D3). Score accumulates per run; run ends with arcade-style high-score
entry (3-letter initials — no PII).

## Outcome tiers

| Result | Condition | Animation | Score |
|---|---|---|---|
| Legendary draw | Correct, fastest ~third of timer | Hat flies off, opponent spins into dust cloud | Base × 3 × combo |
| Clean hit | Correct, mid timer | Opponent staggers back over a barrel | Base × 2 × combo |
| Close call | Correct, last moment | Both fire, player stumbles but survives | Base × 1, combo resets |
| Outdrawn | Wrong answer or timeout | Player tumbles dramatically, −1 life | 0, combo resets |

**Combo:** consecutive Legendary/Clean answers build a multiplier ×1 → ×2 → ×3
(capped), shown as a growing sheriff-star meter. Close call keeps the run alive but
resets combo.

**Base score:** suggest 100 per duel, +50 per boss draw; tune during implementation.

## Question engine

- **Question shape:** `{ a, b, op, answer }` with `op: "mul"` as the only implemented
  operation in step 1. Distractor generation and adaptive weighting are written
  per-operation so division/addition slot in later without touching the game loop (D7).
- **Tables config:** player/parent picks included tables, 2–12; default 2–10.
  Persisted in `rm.settings`.
- **Smart distractors:** three wrong answers from plausible errors:
  - adjacent table results (6×7 → 36, 48)
  - off-by-one-operand (6×7 → 7×7 = 49)
  - digit swaps (24 → 42) where the swap is a plausible product
  Dedupe, never equal to the answer, never negative, never random noise.
- **Adaptive weighting:** weighted random over the pair pool. Pairs answered wrongly
  or slowly gain weight; mastered pairs decay. Counters in `rm.analytics`, no ML.
- **In-run difficulty ramp:** timer shrinks slightly every 5 duels toward a floor of
  70% of the configured base (D2 — proportional, not hardcoded). Later duels weight
  up the harder tables (7s, 8s, 12s).

## Opponents

Roster of ~6 cartoon outlaws with escalating names/looks (e.g. Cactus Carl →
Mad Multiplier McGraw). Pure cosmetics in step 1 — same mechanics, different
sprite/palette — providing progression and someone to beat. Every 5th duel is a
**boss draw**: tighter timer (additional ~15% cut for that duel), double points,
distinct music sting.

Opponent names are display strings → live in `strings.js` per language.

## Presentation

- **Rendering:** DOM + CSS animations (layered SVG or sprite-sheet PNGs). No canvas
  in v1. CSS keyframes carry the slapstick; keeps everything inspectable/debuggable.
- **Art direction:** flat cartoon, warm desert palette, chunky outlines. Comedy over
  menace.
- **Audio:** Web Audio API. Whistle sting, gunshot "pop", cartoon boing, ricochet,
  tension drone during countdown. Mute toggle persisted in settings. Lazy/optional
  load — game must work fully silent.
- **Layout:** portrait-first, single screen, no scrolling. Answer buttons ≥ 64 px
  tall in a 2×2 grid at thumb height. Same DOM works landscape (Chromebooks) with a
  different grid via media query.
- **Localization:** all UI strings in `strings.js` as a per-language map. Ship
  Swedish + English day one (D1). Title screen shows "Snabbast i Västern" (sv) /
  "Revolver Math" (en). Language auto-detected from `navigator.language`,
  overridable in settings.

## Screens

1. **Title** — logo, Play, Settings, High Scores. A tumbleweed or two.
2. **Settings** — tables picker (2–12 toggles), timer slider 1–10 s (default 5 s,
   D11), sound on/off, language sv/en, sound test button.
3. **Game** — the duel screen (core loop).
4. **Defeat / run summary** — final score, duels won, best combo; high-score initials
   entry if top 10; Play Again.
5. **High scores** — local top 10, arcade table style.

## Data model (localStorage, forward-compatible with step 2)

```
rm.settings    { tables: [2..10], timerMs: 5000, sound: true, lang: "sv" }
rm.highscores  [ { initials, score, date } ]            // top 10, descending
rm.analytics   { "mul:6x7": { right: 4, wrong: 2, avgMs: 2300 }, ... }
rm.player      { id: "<uuid>" }                          // anonymous; step 2 sync key
```

- Analytics keys are `"{op}:{a}x{b}"` with a ≤ b normalized (6x7, never 7x6) so the
  pair is tracked once regardless of presentation order. Presentation may still
  randomize operand order on screen.
- `avgMs` is a running average over correct answers only.
- Every resolved duel updates `rm.analytics` synchronously.

## Tech & structure

Vanilla HTML/CSS/JS, zero build step, zero runtime dependencies. Classic scripts
sharing a `globalThis.RM` namespace, loaded in dependency order — ES modules are
blocked on file:// and double-clicking index.html must work (D8).

```
/index.html
/css/            main.css (+ animations.css if it grows)
/js/
  main.js        bootstrap, screen routing
  game.js        run state machine, duel loop, scoring, lives, combo
  questions.js   question + distractor generation, adaptive weighting (op-abstracted)
  opponents.js   roster data, boss logic
  audio.js       Web Audio wrapper, mute handling
  storage.js     localStorage read/write, schema versioning (rm.* keys)
  strings.js     sv/en string maps, language detection
/assets/         sprites, svg, audio
```

Hostable as static files anywhere (GitHub Pages for testing). In step 2 the .NET 10
solution serves these same files plus the API — nothing about step 1 changes.

## Out of scope for step 1

Accounts, class codes, server leaderboard, teacher dashboard, two-player versus,
achievements, app-store packaging, round mode (fixed duel count), operations other
than multiplication (engine abstracts them, but only `mul` is implemented).

## Definition of done (step 1)

- Full run playable start → defeat → high score entry → replay, on a phone-sized
  portrait viewport and a Chromebook landscape viewport.
- All four outcome tiers visually and audibly distinct.
- Distractors are always plausible (manual spot-check across tables 2–12).
- Adaptive weighting demonstrably favors weak pairs (verifiable via rm.analytics
  in devtools).
- Swedish and English both complete; switching language requires no reload glitches.
- Works fully offline after first load; works fully with sound muted.
- No console errors; no build step required to run (open index.html or any static
  server).
