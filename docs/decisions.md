# RevolverMath — Decisions

Append-only log. Newest at the bottom. Format: ID, date, decision, rationale.

---

**D1 · 2026-06-12 · Naming: English codebase, localized display name**
Repo/namespace/identifiers: `RevolverMath`, storage prefix `rm.*`. Display name per
language in strings.js: "Snabbast i Västern" (sv), "Revolver Math" (en). Code never
branches on product name. Ship sv + en from day one.

**D2 · 2026-06-12 · Timer: 5 s default, configurable 3–10 s**
`rm.settings.timerMs`, default 5000, settings slider. In-run difficulty ramp is
proportional: shrinks toward a floor of 70% of the configured base (not a hardcoded
ms value), so longer timers for younger kids get a proportionally gentler ramp.

**D3 · 2026-06-12 · Run structure: 3 lives, arcade style**
Classic arcade run: 3 lives, score per run, top-10 local high scores with 3-letter
initials (no PII). "Round mode" (fixed 20 duels, classroom time-boxing) parked for
step 3 — door kept open, nothing in step 1 should preclude it.

**D4 · 2026-06-12 · Rendering: DOM + CSS animations, no canvas, no framework**
The game is single-screen and animation-driven with no physics — CSS keyframes
handle the slapstick. Vanilla JS ES modules, zero build step, zero dependencies.
Debuggable, hostable as static files, trivially served by the step 2 .NET app later.

**D5 · 2026-06-12 · Three-step roadmap; Blazor for dashboard, not the game**
Step 1 pure client-side game. Step 2 .NET 10 minimal API (class codes, leaderboard,
analytics sync, SQLite). Step 3 Blazor teacher dashboard. Blazor is the right tool
for the form-and-data dashboard, wrong tool for the game loop.

**D6 · 2026-06-12 · localStorage schema designed for step 2 sync**
Keys: rm.settings, rm.highscores, rm.analytics, rm.player (anonymous uuid = future
sync key). Analytics keyed `"{op}:{a}x{b}"` with a≤b normalized. Step 2 is additive:
client posts the same events to the API tagged with a class code; no schema rework.

**D7 · 2026-06-12 · Question engine abstracts operation from day one**
Question shape `{ a, b, op, answer }`; distractors and adaptive weighting written
per-operation. Only `op: "mul"` implemented in step 1. Division/addition later slot
in without touching the game loop. Costs nothing now, saves a migration later.

**D8 · 2026-06-12 · Classic scripts instead of ES modules — double-click must work**
Supersedes the "ES modules" detail of D4 (everything else in D4 stands). ES modules
are blocked by browsers on file://, which broke the spec promise "open index.html"
on first real-world try. The five js files are now classic scripts sharing a
`globalThis.RM` namespace (RM.strings, RM.storage, RM.questions, RM.game), loaded
in dependency order at the end of index.html. Zero build step unchanged; works from
file://, USB stick, network share, any static host. Node test harness loads the
files via node:vm instead of import.

**D9 · 2026-06-12 · Victory moment: "cleaned up the West", run continues**
Extends D3 (arcade structure stands). First time in a run the player beats the 6th
outlaw (roster index 5, Mad Multiplier McGraw — duel 6), a short celebration plays
and the run summary shows a sheriff-badge line. The run does NOT end — endless
arcade and high-score chase stay intact; this gives kids a story-shaped goal.
Triggers once per run (flag on run state).

**D10 · 2026-06-12 · Cartoon revolvers shown; comic-flash fire, never injury**
Per's call: showing actual guns is fine and fun. Constraint that keeps it
kid-appropriate: revolvers are chunky cartoon props, firing is a yellow comic
star-flash with a "pop", and no shot ever visibly hits a body — consequences stay
slapstick (hat flies off, spin into dust cloud, fall over barrel, backward tumble).
No blood, no wounds, no aiming at the player's viewpoint. Also added: "Test sound"
button in Settings (plays a sample regardless of autoplay state — doubles as the
audio unlock gesture).

**D11 · 2026-06-12 · Keyboard answers (1–4) and timer floor lowered to 1 s**
Per's call. Keys 1–4 (top row or numpad) trigger the corresponding answer button;
small corner hints on the buttons appear only on hover-capable fine-pointer
devices (Chromebooks/desktops), never on touch. Timer slider minimum lowered from
3 s (D2) to 1 s for expert players — default and ramp behavior unchanged, D2
otherwise stands.

**D12 · 2026-06-12 · Tables limited to 1–10; ×11/×12 removed entirely**
Bug report from Per: his wife deselected 11 and 12 but still got ×11/×12
questions. Root cause was pool semantics, not settings reading: a pair is
included when *either* operand's table is enabled, and the free operand always
ranged over the full 2–12 — so enabling the 3s alone still produced 3×11 and
3×12. Per's call: drop 11/12 as options altogether and offer tables 1–10
(default stays 2–10). Operand range is now 1–10 everywhere (pool, products,
distractors); hard-table ramp is 7s/8s (12 gone); storage sanitization accepts
1–10 and silently strips legacy 11/12 from saved settings, so existing devices
need no migration. The either-operand pool semantics stays: enabling table n
means n×1 … n×10, which can surface an unticked second operand by design.

---

(Claude Code: append new decisions below with the next ID and date. Never edit or
remove existing entries; supersede with a new entry referencing the old ID.)
