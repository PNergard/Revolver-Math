// Console harness for the question engine (T2 done-criteria).
// Run: node tests/questions.test.mjs
// The game ships as classic scripts on a shared RM namespace (D8),
// so we load them into a vm sandbox instead of importing.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = vm.createContext({});
for (const file of ["js/storage.js", "js/questions.js"]) {
  vm.runInContext(readFileSync(join(root, file), "utf8"), sandbox, { filename: file });
}
const { buildPairPool, pairWeight, generateDistractors, generateQuestion } =
  sandbox.RM.questions;
const { analyticsKey } = sandbox.RM.storage;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

/* 1. 1000 questions: 4 unique options, answer included, answer correct, operands valid. */
{
  const tables = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  let bad = null;
  for (let i = 0; i < 1000; i++) {
    const q = generateQuestion({ tables, duelIndex: i % 30 });
    const unique = new Set(q.options);
    if (
      q.options.length !== 4 ||
      unique.size !== 4 ||
      !q.options.includes(q.answer) ||
      q.answer !== q.a * q.b ||
      q.options.some((v) => v <= 0) ||
      q.a < 1 || q.a > 10 || q.b < 1 || q.b > 10
    ) {
      bad = q;
      break;
    }
  }
  check("1000 questions: 4 unique positive options incl. correct answer",
    bad === null, bad ? JSON.stringify(bad) : "");
}

/* 2. Every pair 1–10 × 1–10 produces 3 valid distractors (full spot-check). */
{
  let bad = null;
  outer: for (let a = 1; a <= 10; a++) {
    for (let b = 1; b <= 10; b++) {
      for (let i = 0; i < 20; i++) {
        const d = generateDistractors(a, b);
        if (d.length !== 3 || new Set(d).size !== 3 || d.includes(a * b) || d.some((v) => v <= 0)) {
          bad = { a, b, d };
          break outer;
        }
      }
    }
  }
  check("all pairs 1–10: 3 unique valid distractors", bad === null,
    bad ? JSON.stringify(bad) : "");
}

/* 3. Distractor plausibility sample — print a few for eyeballing. */
{
  for (const [a, b] of [[6, 7], [3, 4], [9, 10], [2, 2], [1, 8]]) {
    console.log(`   ${a}×${b}=${a * b} → distractors: ${generateDistractors(a, b).join(", ")}`);
  }
}

/* 4. Weighting favors pairs marked wrong. */
{
  const tables = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const analytics = {
    [analyticsKey("mul", 6, 7)]: { right: 1, wrong: 5, avgMs: 4000 }, // struggling
    [analyticsKey("mul", 2, 3)]: { right: 10, wrong: 0, avgMs: 900 }, // mastered
  };
  const counts = { "mul:6x7": 0, "mul:2x3": 0 };
  const N = 5000;
  for (let i = 0; i < N; i++) {
    const q = generateQuestion({ tables, analytics });
    if (q.key in counts) counts[q.key]++;
  }
  check("weighting favors wrong pair over mastered pair",
    counts["mul:6x7"] > counts["mul:2x3"] * 3,
    `6x7 picked ${counts["mul:6x7"]}×, 2x3 picked ${counts["mul:2x3"]}× of ${N}`);
}

/* 5. Hard tables ramp up with duelIndex. */
{
  const w0 = pairWeight({ a: 7, b: 8 }, undefined, { duelIndex: 0 });
  const w20 = pairWeight({ a: 7, b: 8 }, undefined, { duelIndex: 20 });
  const easy20 = pairWeight({ a: 2, b: 3 }, undefined, { duelIndex: 20 });
  check("hard pair weight doubles by duel 20, easy unaffected",
    w20 === w0 * 2 && easy20 === 1, `7x8: ${w0} → ${w20}, 2x3: ${easy20}`);
}

/* 6. Pool respects enabled tables. */
{
  const pool = buildPairPool([7]);
  const allTouch7 = pool.every((p) => p.a === 7 || p.b === 7);
  check("pool for tables=[7] only contains pairs touching 7",
    allTouch7 && pool.length === 10, `${pool.length} pairs`);
}

/* 7. Analytics key normalization (a ≤ b regardless of display order). */
{
  check("analytics key normalized",
    analyticsKey("mul", 7, 6) === "mul:6x7" && analyticsKey("mul", 6, 7) === "mul:6x7");
}

console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
