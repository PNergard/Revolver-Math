// questions.js — question + distractor generation and adaptive weighting.
// Plain functions, no DOM, no storage access: analytics and settings are passed in.
// Everything operation-specific lives in the OPS table (D7) so division/addition
// later add an entry without touching the game loop.
// Classic script (D8): exposes RM.questions; load after storage.js.

(() => {
  "use strict";
  const RM = (globalThis.RM = globalThis.RM || {});
  const { analyticsKey } = RM.storage;

  const OPERAND_MIN = 2;
  const OPERAND_MAX = 12;

  /** All products reachable in tables 2–12 — used to keep distractors plausible. */
  const PRODUCTS = (() => {
    const set = new Set();
    for (let a = OPERAND_MIN; a <= OPERAND_MAX; a++)
      for (let b = OPERAND_MIN; b <= OPERAND_MAX; b++) set.add(a * b);
    return set;
  })();

  const OPS = {
    mul: {
      symbol: "×",
      answer: (a, b) => a * b,
      /**
       * Candidate wrong answers, ordered by plausibility strategy:
       * adjacent table results, off-by-one-operand, digit swaps.
       */
      distractorCandidates(a, b) {
        const answer = a * b;
        const candidates = [
          a * (b - 1), a * (b + 1),      // adjacent table results
          (a - 1) * b, (a + 1) * b,      // off-by-one-operand
        ];
        const swapped = digitSwap(answer);
        if (swapped !== null && PRODUCTS.has(swapped)) candidates.push(swapped);
        return candidates.filter((v) => v > 0 && v !== answer);
      },
      /** Fallback pool: plausible products near the answer. */
      fallbackCandidates(a, b) {
        const answer = a * b;
        return [...PRODUCTS]
          .filter((v) => v !== answer && Math.abs(v - answer) <= Math.max(10, answer * 0.3))
          .sort((x, y) => Math.abs(x - answer) - Math.abs(y - answer));
      },
      /** Hard tables that ramp up later in a run. */
      isHardPair(a, b) {
        return [7, 8, 12].includes(a) || [7, 8, 12].includes(b);
      },
    },
  };

  /** Swap the digits of a two-digit number (24 → 42); null otherwise. */
  function digitSwap(n) {
    if (n < 10 || n > 99) return null;
    const swapped = (n % 10) * 10 + Math.floor(n / 10);
    return swapped === n ? null : swapped;
  }

  /** Normalized pair pool for the enabled tables: { a, b } with a ≤ b, both 2–12. */
  function buildPairPool(tables) {
    const pool = [];
    const enabled = new Set(tables);
    for (let a = OPERAND_MIN; a <= OPERAND_MAX; a++) {
      for (let b = a; b <= OPERAND_MAX; b++) {
        if (enabled.has(a) || enabled.has(b)) pool.push({ a, b });
      }
    }
    return pool;
  }

  /**
   * Adaptive weight for a pair. Counters only, no ML:
   * - unseen pairs: weight 1 (coverage)
   * - wrong answers push weight up (to ~4x)
   * - slow correct answers push weight up
   * - mastered pairs (3+ right, few wrong, quick) decay hard
   * Later duels additionally weight up the hard tables (7s, 8s, 12s).
   */
  function pairWeight(pair, stats, { timerMs = 5000, duelIndex = 0, op = "mul" } = {}) {
    let w = 1;
    if (stats) {
      const attempts = stats.right + stats.wrong;
      if (attempts > 0) {
        const wrongRate = stats.wrong / attempts;
        w += wrongRate * 3;
        if (stats.right > 0 && stats.avgMs > timerMs * 0.6) w *= 1.5;
        if (stats.right >= 3 && wrongRate < 0.2) w *= 0.3; // mastered → decay
      }
    }
    if (OPS[op].isHardPair(pair.a, pair.b)) {
      w *= 1 + Math.min(duelIndex / 20, 1); // up to 2x by duel 20
    }
    return w;
  }

  /** Weighted random pick. rng injectable for tests. */
  function weightedPick(pool, weights, rng) {
    const total = weights.reduce((s, w) => s + w, 0);
    let roll = rng() * total;
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return pool[i];
    }
    return pool[pool.length - 1];
  }

  /** Fisher–Yates shuffle (in place). */
  function shuffle(arr, rng) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Three unique plausible distractors for a question.
   * Strategy candidates first (shuffled), then nearest plausible products,
   * then ±1/±2 of the answer as a last resort. Never the answer, never ≤ 0.
   */
  function generateDistractors(a, b, op = "mul", rng = Math.random) {
    const answer = OPS[op].answer(a, b);
    const picked = new Set();
    const take = (v) => {
      if (v > 0 && v !== answer && !picked.has(v)) picked.add(v);
    };
    shuffle(OPS[op].distractorCandidates(a, b), rng).forEach((v) => {
      if (picked.size < 3) take(v);
    });
    if (picked.size < 3) {
      for (const v of OPS[op].fallbackCandidates(a, b)) {
        if (picked.size >= 3) break;
        take(v);
      }
    }
    for (let d = 1; picked.size < 3; d++) {
      take(answer + d);
      if (picked.size < 3) take(answer - d);
    }
    return [...picked];
  }

  /**
   * Generate the next question for a run.
   * Returns { a, b, op, answer, options, key } where a/b are in display order
   * (randomized), options is the shuffled 4-answer array, and key is the
   * normalized analytics key.
   */
  function generateQuestion({
    tables,
    analytics = {},
    timerMs = 5000,
    duelIndex = 0,
    op = "mul",
    rng = Math.random,
  } = {}) {
    const pool = buildPairPool(tables);
    const weights = pool.map((pair) =>
      pairWeight(pair, analytics[analyticsKey(op, pair.a, pair.b)], { timerMs, duelIndex, op }));
    const pair = weightedPick(pool, weights, rng);

    const [a, b] = rng() < 0.5 ? [pair.a, pair.b] : [pair.b, pair.a];
    const answer = OPS[op].answer(a, b);
    const options = shuffle([answer, ...generateDistractors(a, b, op, rng)], rng);

    return { a, b, op, answer, options, key: analyticsKey(op, a, b), symbol: OPS[op].symbol };
  }

  RM.questions = { buildPairPool, pairWeight, generateDistractors, generateQuestion };
})();
