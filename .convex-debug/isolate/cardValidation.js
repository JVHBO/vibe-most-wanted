import {
  a as r
} from "./_deps/5B5TEMMX.js";

// convex/cardValidation.ts
function y(e) {
  return e >= 0.99 ? "Mythic" : e >= 0.9 ? "Legendary" : e >= 0.79 ? "Epic" : e >= 0.7 ? "Rare" : "Common";
}
r(y, "calculateRarityFromScore");
function d(e) {
  let t = Math.sin(e) * 1e4;
  return t - Math.floor(t);
}
r(d, "seededRandom");
function v(e, t) {
  let l = t.reduce((a, o) => a + o.weight, 0), u = d(e) * l;
  for (let a of t)
    if (u -= a.weight, u <= 0) return a.value;
  return t[t.length - 1].value;
}
r(v, "weightedRoll");
function s(e) {
  return e <= 5e3 ? [{ value: "Prize", weight: 100 }, { value: "Standard", weight: 0 }, { value: "None", weight: 0 }] : e <= 2e4 ? [{ value: "Prize", weight: 80 }, { value: "Standard", weight: 20 }, { value: "None", weight: 0 }] : e <= 1e5 ? [{ value: "Prize", weight: 30 }, { value: "Standard", weight: 60 }, { value: "None", weight: 10 }] : e <= 25e4 ? [{ value: "Prize", weight: 5 }, { value: "Standard", weight: 35 }, { value: "None", weight: 60 }] : e <= 5e5 ? [{ value: "Prize", weight: 3 }, { value: "Standard", weight: 25 }, { value: "None", weight: 72 }] : e <= 12e5 ? [{ value: "Prize", weight: 1 }, { value: "Standard", weight: 10 }, { value: "None", weight: 89 }] : [{ value: "Prize", weight: 0 }, { value: "Standard", weight: 5 }, { value: "None", weight: 95 }];
}
r(s, "getFoilProbabilities");
function P(e) {
  return e <= 5e3 ? [{ value: "Pristine", weight: 100 }, { value: "Mint", weight: 0 }, { value: "Lightly Played", weight: 0 }, { value: "Moderately Played", weight: 0 }, { value: "Heavily Played", weight: 0 }] : e <= 2e4 ? [{ value: "Pristine", weight: 90 }, { value: "Mint", weight: 10 }, { value: "Lightly Played", weight: 0 }, { value: "Moderately Played", weight: 0 }, { value: "Heavily Played", weight: 0 }] : e <= 1e5 ? [{ value: "Pristine", weight: 50 }, { value: "Mint", weight: 40 }, { value: "Lightly Played", weight: 10 }, { value: "Moderately Played", weight: 0 }, { value: "Heavily Played", weight: 0 }] : e <= 25e4 ? [{ value: "Pristine", weight: 2 }, { value: "Mint", weight: 18 }, { value: "Lightly Played", weight: 45 }, { value: "Moderately Played", weight: 30 }, { value: "Heavily Played", weight: 5 }] : e <= 5e5 ? [{ value: "Pristine", weight: 0 }, { value: "Mint", weight: 5 }, { value: "Lightly Played", weight: 30 }, { value: "Moderately Played", weight: 55 }, { value: "Heavily Played", weight: 10 }] : e <= 12e5 ? [{ value: "Pristine", weight: 0 }, { value: "Mint", weight: 0 }, { value: "Lightly Played", weight: 5 }, { value: "Moderately Played", weight: 45 }, { value: "Heavily Played", weight: 50 }] : [{ value: "Pristine", weight: 0 }, { value: "Mint", weight: 0 }, { value: "Lightly Played", weight: 0 }, { value: "Moderately Played", weight: 10 }, { value: "Heavily Played", weight: 90 }];
}
r(P, "getWearProbabilities");
function c(e) {
  let t = v(e, s(e)), l = v(e * 2, P(e));
  return { foil: t, wear: l };
}
r(c, "calculateFidTraits");
var w = {
  rarityBase: { mythic: 800, legendary: 240, epic: 80, rare: 20, common: 5 },
  wearMultiplier: { pristine: 1.8, mint: 1.4, default: 1 },
  foilMultiplier: { prize: 15, standard: 2.5, none: 1 }
};
function p(e, t, l) {
  let u = e.toLowerCase(), a = w.rarityBase[u] || w.rarityBase.common, o = l.toLowerCase().replace(" ", ""), n = w.wearMultiplier[o] || w.wearMultiplier.default, g = t.toLowerCase(), i = w.foilMultiplier[g] || w.foilMultiplier.none;
  return Math.round(a * n * i);
}
r(p, "calculatePower");
function f(e, t, l, u, a, o) {
  let n = [], g = y(t), i = c(e), h = p(g, i.foil, i.wear);
  return l !== g && n.push(`Invalid rarity: client=${l}, expected=${g} (score=${t})`), u !== i.foil && n.push(`Invalid foil: client=${u}, expected=${i.foil}`), a !== i.wear && n.push(`Invalid wear: client=${a}, expected=${i.wear}`), Math.abs(o - h) > 1 && n.push(`Invalid power: client=${o}, expected=${h}`), {
    valid: n.length === 0,
    errors: n,
    correctedValues: {
      rarity: g,
      foil: i.foil,
      wear: i.wear,
      power: h
    }
  };
}
r(f, "validateCardTraits");
export {
  c as calculateFidTraits,
  p as calculatePower,
  y as calculateRarityFromScore,
  f as validateCardTraits
};
//# sourceMappingURL=cardValidation.js.map
