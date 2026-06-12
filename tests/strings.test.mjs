// Language parity harness (T7): sv and en must have identical key sets,
// no empty values, and matching opponent-name counts.
// Run: node tests/strings.test.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = vm.createContext({});
vm.runInContext(readFileSync(join(root, "js/strings.js"), "utf8"), sandbox,
  { filename: "js/strings.js" });
const { maps, OPPONENT_NAMES } = sandbox.RM.strings;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
};

const svKeys = Object.keys(maps.sv).sort();
const enKeys = Object.keys(maps.en).sort();
const onlySv = svKeys.filter((k) => !enKeys.includes(k));
const onlyEn = enKeys.filter((k) => !svKeys.includes(k));
check("sv and en have identical key sets", onlySv.length === 0 && onlyEn.length === 0,
  `only sv: [${onlySv}] only en: [${onlyEn}]`);

const empty = [...svKeys.map((k) => ["sv", k, maps.sv[k]]), ...enKeys.map((k) => ["en", k, maps.en[k]])]
  .filter(([, , v]) => typeof v !== "string" || v.trim() === "");
check("no empty or non-string values", empty.length === 0,
  empty.map(([l, k]) => `${l}.${k}`).join(", "));

check("opponent name lists same length, 6 outlaws",
  OPPONENT_NAMES.sv.length === 6 && OPPONENT_NAMES.en.length === 6,
  `sv: ${OPPONENT_NAMES.sv.length}, en: ${OPPONENT_NAMES.en.length}`);

console.log(failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
