import {
  a as o
} from "./5B5TEMMX.js";

// convex/languageBoost.ts
function t(e) {
  return e === "zh-CN";
}
o(t, "hasLanguageBoost");
function u(e, n) {
  if (!t(n))
    return e;
  let r = Math.floor(e * 1.05);
  return console.log(`\u{1F1E8}\u{1F1F3} Social Credit Boost Applied! ${e} \u2192 ${r} (+5%)`), r;
}
o(u, "applyLanguageBoost");
function p(e) {
  return t(e) ? 5 : 0;
}
o(p, "getBoostPercentage");
function a(e) {
  return t(e) ? 1.05 : 1;
}
o(a, "getBoostMultiplier");

export {
  t as a,
  u as b,
  p as c,
  a as d
};
//# sourceMappingURL=5GK4PSQG.js.map
