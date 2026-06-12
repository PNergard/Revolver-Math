// Storage hardening harness (T7): corrupt data, schema mismatch, quota,
// high-score ordering, analytics math. Runs storage.js in a vm sandbox with
// a fake localStorage. Run: node tests/storage.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "js/storage.js"), "utf8");

function freshStorage(preset = {}, { failWrites = false } = {}) {
  const store = new Map(Object.entries(preset));
  const sandbox = vm.createContext({
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => {
        if (failWrites) throw new Error("QuotaExceededError");
        store.set(k, String(v));
      },
      removeItem: (k) => store.delete(k),
    },
    crypto: { randomUUID: () => "00000000-0000-4000-8000-000000000000" },
  });
  vm.runInContext(src, sandbox, { filename: "js/storage.js" });
  return { rm: sandbox.RM.storage, store };
}

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

/* Corrupt settings JSON → defaults */
{
  const { rm } = freshStorage({ "rm.settings": "{not json!!" });
  rm.initStorage();
  const s = rm.getSettings();
  check("corrupt settings JSON falls back to defaults",
    s.timerMs === 5000 && s.tables.length === 9 && s.sound === true, JSON.stringify(s));
}

/* Garbage values inside valid JSON → sanitized */
{
  const { rm } = freshStorage({
    "rm.settings": JSON.stringify({ tables: [0, 99, "x", 11, 12, 7], timerMs: 999999, sound: 1 }),
  });
  const s = rm.getSettings();
  check("out-of-range values sanitized (incl. legacy 11/12)",
    s.tables.join() === "7" && s.timerMs === 5000 && s.sound === true, JSON.stringify(s));
}

/* Unknown schema version → full reset */
{
  const { rm, store } = freshStorage({
    "rm.version": "99",
    "rm.highscores": JSON.stringify([{ initials: "OLD", score: 1, date: "2020-01-01" }]),
  });
  rm.initStorage();
  check("future schema version wipes old keys",
    rm.getHighscores().length === 0 && store.get("rm.version") === "1");
}

/* Player uuid created once, kept on re-init */
{
  const { rm, store } = freshStorage();
  rm.initStorage();
  const first = store.get("rm.player");
  rm.initStorage();
  check("player uuid stable across boots", first === store.get("rm.player") && first.includes("4000"));
}

/* High scores: ordering, top-10 trim, qualification */
{
  const { rm } = freshStorage();
  for (let i = 1; i <= 12; i++) rm.addHighscore("P" + i, i * 100);
  const hs = rm.getHighscores();
  check("high scores: top 10, descending",
    hs.length === 10 && hs[0].score === 1200 && hs[9].score === 300,
    hs.map((h) => h.score).join(","));
  check("qualification: above floor yes, below no, zero never",
    rm.qualifiesForHighscore(301) && !rm.qualifiesForHighscore(300) && !rm.qualifiesForHighscore(0));
}

/* Analytics: key normalization + running average over correct answers only */
{
  const { rm } = freshStorage();
  rm.recordAnswer("mul", 7, 6, true, 1000);
  rm.recordAnswer("mul", 6, 7, true, 3000);
  rm.recordAnswer("mul", 6, 7, false, 500);
  const a = rm.getAnalytics();
  const e = a["mul:6x7"];
  check("analytics normalized + avg over rights only",
    Object.keys(a).length === 1 && e.right === 2 && e.wrong === 1 && e.avgMs === 2000,
    JSON.stringify(a));
}

/* Quota exceeded → no throw, game keeps going */
{
  const { rm } = freshStorage({}, { failWrites: true });
  let threw = false;
  try {
    rm.initStorage();
    rm.saveSettings({ tables: [2], timerMs: 5000, sound: true, lang: "sv" });
    rm.addHighscore("PER", 100);
    rm.recordAnswer("mul", 2, 3, true, 100);
  } catch { threw = true; }
  check("write failures are swallowed (quota/disabled storage)", !threw);
}

console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
