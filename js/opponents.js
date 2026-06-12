// opponents.js — roster outfit data for the six outlaws (T5).
// Display names live in strings.js (index-aligned). Pure cosmetics in step 1:
// CSS custom properties applied to the opponent figure per duel.
// Classic script (D8): exposes RM.opponents.

(() => {
  "use strict";
  const RM = (globalThis.RM = globalThis.RM || {});

  // Index-aligned with OPPONENT_NAMES in strings.js.
  const roster = [
    { hat: "#6b4a2c", shirt: "#b54d33", pants: "#5a4632", skin: "#f3c08b" }, // Cactus Carl
    { hat: "#7d3b56", shirt: "#a85ca0", pants: "#4a3b5a", skin: "#f3c08b" }, // Big Bertha
    { hat: "#9c7b2f", shirt: "#5e8c4a", pants: "#6b4a2c", skin: "#e8b07a" }, // Prairie Pete
    { hat: "#c0392b", shirt: "#d98e32", pants: "#7a3b2a", skin: "#f3c08b" }, // Dynamite Doris
    { hat: "#2c3e50", shirt: "#3a5f7d", pants: "#2c3e50", skin: "#e8b07a" }, // Sheriff of Sevens
    { hat: "#1f1f23", shirt: "#3b3b42", pants: "#1f1f23", skin: "#e0a06a" }, // Mad Multiplier McGraw
  ];

  RM.opponents = {
    roster,
    get(duelIndex) {
      return roster[duelIndex % roster.length];
    },
  };
})();
