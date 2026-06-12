# RevolverMath — Idea

**Display names:** "Snabbast i Västern" (sv) / "Revolver Math" (en)
**Codebase name:** RevolverMath (all code, identifiers, comments in English)

## Concept

A Wild West quick-draw duel where multiplication skill is your gun skill. A question
appears at high noon; answer fast and correctly to win the draw. Slapstick cartoon
consequences — Lucky Luke / Looney Tunes, not Sergio Leone. Dust clouds, stars circling
heads, boots sticking out of water troughs. Never blood, never menace.

## Audience & pedagogy

Kids aged 8–11 drilling multiplication tables 2–12, playing in a browser on a phone,
tablet, or school Chromebook. No install, no account, no app store.

Pedagogical principles baked into the design:

- **The math IS the gameplay**, not a quiz bolted onto a game. Needing to answer to
  survive the draw mirrors real motivation.
- **Instant feedback** — every answer resolves immediately with a visible, audible outcome.
- **Reward accuracy streaks** (combo multiplier) rather than punishing mistakes hard.
  Wrong answers have natural in-fiction consequences (you get outdrawn) without shame.
- **Smart distractors** — wrong answer options are plausible errors (adjacent table
  results, off-by-one-operand, digit swaps), never random noise, so even reading the
  options is educational.
- **Adaptive repetition** — pairs the player struggles with quietly appear more often;
  mastered pairs decay. Counters, not ML.
- **Short sessions** — a run lasts a few minutes. Arcade structure (3 lives, high score
  with initials) drives "one more go".

## Roadmap

### Step 1 — The game (current scope)
Fully client-side vanilla HTML/CSS/JS web game. localStorage for settings, local high
scores, and per-pair analytics. Hostable as static files. See `spec.md`.

### Step 2 — API + class leaderboard
.NET 10 minimal API serving the same static files plus endpoints for:
- Class codes (teacher creates code, kids enter it)
- Shared class leaderboard
- Analytics ingestion (answer events sync from localStorage, keyed by anonymous
  player UUID + class code)
Storage: SQLite to start. The step 1 localStorage schema is designed to sync additively —
no client rework.

### Step 3 — Teacher dashboard (Blazor)
Blazor admin UI on top of the step 2 API:
- Class heatmap of which multiplication pairs the class struggles with
- Per-student progress over time (anonymous IDs mapped to names by the teacher locally)
- Leaderboard administration, class code management
- Possible "round mode" (fixed 20-duel rounds) for classroom time-boxing

### Later / parking lot
- Two-player versus — the duel format maps perfectly to hot-seat (same device) first,
  SignalR online duels later. Same question, race to answer.
- More operations: division, addition, subtraction (question engine abstracts operation
  from day one — see decisions.md D7).
- More opponents, achievements, cosmetic unlocks.
- Sibling games reusing the question engine (ammo-reload wave shooter, tower defense).
