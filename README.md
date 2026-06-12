# Snabbast i Västern / Revolver Math

A Wild West quick-draw duel where multiplication skill is your gun skill. A question
appears at high noon — answer fast and correctly to win the draw. Slapstick cartoon
consequences (hats fly, outlaws spin into dust clouds), never violence. For kids
aged 8–11 drilling multiplication tables 2–12. Swedish and English.

## How to run

**Double-click `index.html`.** That's it — no install, no build, no server.

It works equally well from a USB stick, a network share, or any static web host
(GitHub Pages, etc.). Everything runs in the browser; nothing is sent anywhere.

> Audio note: browsers block all sound until the first click or tap on the page.
> The title sequence (gunshots + tune) starts on your first interaction.

## How to play

1. **Play** — an outlaw walks in, the revolvers come out, a question appears.
2. Tap the right answer before the fuse bar runs out:
   - **Legendary draw** (fastest third of the timer) — triple points
   - **Clean hit** (mid timer) — double points
   - **Close call** (last moment) — single points, combo resets
   - **Outdrawn** (wrong or too slow) — lose one of your 3 lives
3. Consecutive fast correct answers build a sheriff-star combo (×1 → ×2 → ×3).
4. Every 5th duel is a **boss draw**: tighter timer, double points.
5. Beat all six outlaws in one run to **clean up the West** — then keep going
   for the high score. Top-10 scores with arcade initials.

**Settings**: which tables to practice (2–12), seconds per question (3–10),
sound on/off, language (svenska/English).

The game quietly shows the multiplication pairs you struggle with more often,
and the ones you've mastered less often.

## Project layout

```
index.html        the whole app shell
css/main.css      layout, palette, screens
css/animations.css characters & outcome animations
js/strings.js     sv/en strings (all user-facing text)
js/storage.js     localStorage (rm.* keys, schema versioned)
js/questions.js   question + distractor generation, adaptive weighting
js/opponents.js   outlaw roster outfits
js/audio.js       synthesized Web Audio effects + title tune
js/game.js        run state machine, duel loop, scoring
js/main.js        bootstrap, screen routing, settings UI
assets/           SVGs (cactus, tumbleweed, icon)
tests/            Node test harnesses (no dependencies)
docs/             idea, spec, plan, decision log
```

No frameworks, no dependencies, no build step. Classic scripts on a shared `RM`
namespace so `file://` works (see `docs/decisions.md` D8).

## Tests

Requires Node (any recent version), used only for development:

```
node tests/questions.test.mjs   # distractors + adaptive weighting
node tests/storage.test.mjs     # corrupt data, schema reset, high scores
node tests/strings.test.mjs     # sv/en parity
```

## Publishing on GitHub Pages

1. Push this folder to a public GitHub repository.
2. Repo **Settings → Pages → Source**: *Deploy from a branch*, branch `main`,
   folder `/ (root)`.
3. Your game appears at `https://<username>.github.io/<repo>/` after a minute.

All asset paths are relative, so it works from the subpath as-is.

## Roadmap

This is step 1 of 3 — see `docs/idea.md`. Step 2 adds a .NET API with class
codes and a shared class leaderboard; step 3 a Blazor teacher dashboard with a
class heat-map over multiplication pairs.
