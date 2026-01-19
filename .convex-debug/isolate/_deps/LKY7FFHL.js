import {
  a as e
} from "./5B5TEMMX.js";

// convex/utils.ts
function o(t) {
  if (!t)
    throw new Error("Address is required");
  if (!t.startsWith("0x"))
    throw new Error("Invalid address format: must start with 0x");
  if (t.length !== 42)
    throw new Error(`Invalid address length: expected 42, got ${t.length}`);
  return t.toLowerCase();
}
e(o, "normalizeAddress");
function s(t) {
  return !t || !t.startsWith("0x") || t.length !== 42 ? !1 : /^0x[a-fA-F0-9]{40}$/.test(t);
}
e(s, "isValidAddress");
function u(t, r) {
  try {
    return o(t) === o(r);
  } catch {
    return !1;
  }
}
e(u, "addressesEqual");
function a() {
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
e(a, "getTodayString");
function g(t) {
  let r = a(), n = new Date(t).toISOString().split("T")[0];
  return r === n;
}
e(g, "isToday");
function l(t) {
  return t.reduce((r, n) => r + (n.power || 0), 0);
}
e(l, "calculateTotalPower");
function f(t, r, n, i = "Value") {
  if (t < r || t > n)
    throw new Error(`${i} must be between ${r} and ${n}, got ${t}`);
}
e(f, "validateRange");
function c(t, r = "Field") {
  if (!t || t.trim().length === 0)
    throw new Error(`${r} cannot be empty`);
}
e(c, "validateNotEmpty");

export {
  o as a,
  s as b,
  u as c,
  a as d,
  g as e,
  l as f,
  f as g,
  c as h
};
//# sourceMappingURL=LKY7FFHL.js.map
