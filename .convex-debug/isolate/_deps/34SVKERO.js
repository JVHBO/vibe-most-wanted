import {
  a as n
} from "./5B5TEMMX.js";

// node_modules/convex/dist/esm/values/base64.js
var d = [], l = [], et = Uint8Array, V = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
for (h = 0, J = V.length; h < J; ++h)
  d[h] = V[h], l[V.charCodeAt(h)] = h;
var h, J;
l[45] = 62;
l[95] = 63;
function rt(t) {
  var e = t.length;
  if (e % 4 > 0)
    throw new Error("Invalid string. Length must be a multiple of 4");
  var r = t.indexOf("=");
  r === -1 && (r = e);
  var o = r === e ? 0 : 4 - r % 4;
  return [r, o];
}
n(rt, "getLens");
function nt(t, e, r) {
  return (e + r) * 3 / 4 - r;
}
n(nt, "_byteLength");
function g(t) {
  var e, r = rt(t), o = r[0], s = r[1], f = new et(nt(t, o, s)), i = 0, c = s > 0 ? o - 4 : o, p;
  for (p = 0; p < c; p += 4)
    e = l[t.charCodeAt(p)] << 18 | l[t.charCodeAt(p + 1)] << 12 | l[t.charCodeAt(p + 2)] << 6 | l[t.charCodeAt(p + 3)], f[i++] = e >> 16 & 255, f[i++] = e >> 8 & 255, f[i++] = e & 255;
  return s === 2 && (e = l[t.charCodeAt(p)] << 2 | l[t.charCodeAt(p + 1)] >> 4, f[i++] = e & 255), s === 1 && (e = l[t.charCodeAt(p)] << 10 | l[t.charCodeAt(p + 1)] << 4 | l[t.charCodeAt(p + 2)] >> 2, f[i++] = e >> 8 & 255, f[i++] = e & 255), f;
}
n(g, "toByteArray");
function ot(t) {
  return d[t >> 18 & 63] + d[t >> 12 & 63] + d[t >> 6 & 63] + d[t & 63];
}
n(ot, "tripletToBase64");
function it(t, e, r) {
  for (var o, s = [], f = e; f < r; f += 3)
    o = (t[f] << 16 & 16711680) + (t[f + 1] << 8 & 65280) + (t[f + 2] & 255), s.push(ot(o));
  return s.join("");
}
n(it, "encodeChunk");
function m(t) {
  for (var e, r = t.length, o = r % 3, s = [], f = 16383, i = 0, c = r - o; i < c; i += f)
    s.push(
      it(
        t,
        i,
        i + f > c ? c : i + f
      )
    );
  return o === 1 ? (e = t[r - 1], s.push(d[e >> 2] + d[e << 4 & 63] + "==")) : o === 2 && (e = (t[r - 2] << 8) + t[r - 1], s.push(
    d[e >> 10] + d[e >> 4 & 63] + d[e << 2 & 63] + "="
  )), s.join("");
}
n(m, "fromByteArray");

// node_modules/convex/dist/esm/common/index.js
function $t(t) {
  if (t === void 0)
    return {};
  if (!R(t))
    throw new Error(
      `The arguments to a Convex function must be an object. Received: ${t}`
    );
  return t;
}
n($t, "parseArgs");
function R(t) {
  let e = typeof t == "object", r = Object.getPrototypeOf(t), o = r === null || r === Object.prototype || // Objects generated from other contexts (e.g. across Node.js `vm` modules) will not satisfy the previous
  // conditions but are still simple objects.
  r?.constructor?.name === "Object";
  return e && o;
}
n(R, "isSimpleObject");

// node_modules/convex/dist/esm/values/value.js
var G = !0, w = BigInt("-9223372036854775808"), M = BigInt("9223372036854775807"), U = BigInt("0"), st = BigInt("8"), at = BigInt("256");
function Y(t) {
  return Number.isNaN(t) || !Number.isFinite(t) || Object.is(t, -0);
}
n(Y, "isSpecial");
function ft(t) {
  t < U && (t -= w + w);
  let e = t.toString(16);
  e.length % 2 === 1 && (e = "0" + e);
  let r = new Uint8Array(new ArrayBuffer(8)), o = 0;
  for (let s of e.match(/.{2}/g).reverse())
    r.set([parseInt(s, 16)], o++), t >>= st;
  return m(r);
}
n(ft, "slowBigIntToBase64");
function pt(t) {
  let e = g(t);
  if (e.byteLength !== 8)
    throw new Error(
      `Received ${e.byteLength} bytes, expected 8 for $integer`
    );
  let r = U, o = U;
  for (let s of e)
    r += BigInt(s) * at ** o, o++;
  return r > M && (r += w + w), r;
}
n(pt, "slowBase64ToBigInt");
function ut(t) {
  if (t < w || M < t)
    throw new Error(
      `BigInt ${t} does not fit into a 64-bit signed integer.`
    );
  let e = new ArrayBuffer(8);
  return new DataView(e).setBigInt64(0, t, !0), m(new Uint8Array(e));
}
n(ut, "modernBigIntToBase64");
function ct(t) {
  let e = g(t);
  if (e.byteLength !== 8)
    throw new Error(
      `Received ${e.byteLength} bytes, expected 8 for $integer`
    );
  return new DataView(e.buffer).getBigInt64(0, !0);
}
n(ct, "modernBase64ToBigInt");
var lt = DataView.prototype.setBigInt64 ? ut : ft, dt = DataView.prototype.getBigInt64 ? ct : pt, H = 1024;
function q(t) {
  if (t.length > H)
    throw new Error(
      `Field name ${t} exceeds maximum field name length ${H}.`
    );
  if (t.startsWith("$"))
    throw new Error(`Field name ${t} starts with a '$', which is reserved.`);
  for (let e = 0; e < t.length; e += 1) {
    let r = t.charCodeAt(e);
    if (r < 32 || r >= 127)
      throw new Error(
        `Field name ${t} has invalid character '${t[e]}': Field names can only contain non-control ASCII characters`
      );
  }
}
n(q, "validateObjectField");
function S(t) {
  if (t === null || typeof t == "boolean" || typeof t == "number" || typeof t == "string")
    return t;
  if (Array.isArray(t))
    return t.map((o) => S(o));
  if (typeof t != "object")
    throw new Error(`Unexpected type of ${t}`);
  let e = Object.entries(t);
  if (e.length === 1) {
    let o = e[0][0];
    if (o === "$bytes") {
      if (typeof t.$bytes != "string")
        throw new Error(`Malformed $bytes field on ${t}`);
      return g(t.$bytes).buffer;
    }
    if (o === "$integer") {
      if (typeof t.$integer != "string")
        throw new Error(`Malformed $integer field on ${t}`);
      return dt(t.$integer);
    }
    if (o === "$float") {
      if (typeof t.$float != "string")
        throw new Error(`Malformed $float field on ${t}`);
      let s = g(t.$float);
      if (s.byteLength !== 8)
        throw new Error(
          `Received ${s.byteLength} bytes, expected 8 for $float`
        );
      let i = new DataView(s.buffer).getFloat64(0, G);
      if (!Y(i))
        throw new Error(`Float ${i} should be encoded as a number`);
      return i;
    }
    if (o === "$set")
      throw new Error(
        "Received a Set which is no longer supported as a Convex type."
      );
    if (o === "$map")
      throw new Error(
        "Received a Map which is no longer supported as a Convex type."
      );
  }
  let r = {};
  for (let [o, s] of Object.entries(t))
    q(o), r[o] = S(s);
  return r;
}
n(S, "jsonToConvex");
var X = 16384;
function y(t) {
  let e = JSON.stringify(t, (r, o) => o === void 0 ? "undefined" : typeof o == "bigint" ? `${o.toString()}n` : o);
  if (e.length > X) {
    let r = "[...truncated]", o = X - r.length, s = e.codePointAt(o - 1);
    return s !== void 0 && s > 65535 && (o -= 1), e.substring(0, o) + r;
  }
  return e;
}
n(y, "stringifyValueForError");
function b(t, e, r, o) {
  if (t === void 0) {
    let i = r && ` (present at path ${r} in original object ${y(
      e
    )})`;
    throw new Error(
      `undefined is not a valid Convex value${i}. To learn about Convex's supported types, see https://docs.convex.dev/using/types.`
    );
  }
  if (t === null)
    return t;
  if (typeof t == "bigint") {
    if (t < w || M < t)
      throw new Error(
        `BigInt ${t} does not fit into a 64-bit signed integer.`
      );
    return { $integer: lt(t) };
  }
  if (typeof t == "number")
    if (Y(t)) {
      let i = new ArrayBuffer(8);
      return new DataView(i).setFloat64(0, t, G), { $float: m(new Uint8Array(i)) };
    } else
      return t;
  if (typeof t == "boolean" || typeof t == "string")
    return t;
  if (t instanceof ArrayBuffer)
    return { $bytes: m(new Uint8Array(t)) };
  if (Array.isArray(t))
    return t.map(
      (i, c) => b(i, e, r + `[${c}]`, !1)
    );
  if (t instanceof Set)
    throw new Error(
      D(r, "Set", [...t], e)
    );
  if (t instanceof Map)
    throw new Error(
      D(r, "Map", [...t], e)
    );
  if (!R(t)) {
    let i = t?.constructor?.name, c = i ? `${i} ` : "";
    throw new Error(
      D(r, c, t, e)
    );
  }
  let s = {}, f = Object.entries(t);
  f.sort(([i, c], [p, Bt]) => i === p ? 0 : i < p ? -1 : 1);
  for (let [i, c] of f)
    c !== void 0 ? (q(i), s[i] = b(c, e, r + `.${i}`, !1)) : o && (q(i), s[i] = K(
      c,
      e,
      r + `.${i}`
    ));
  return s;
}
n(b, "convexToJsonInternal");
function D(t, e, r, o) {
  return t ? `${e}${y(
    r
  )} is not a supported Convex type (present at path ${t} in original object ${y(
    o
  )}). To learn about Convex's supported types, see https://docs.convex.dev/using/types.` : `${e}${y(
    r
  )} is not a supported Convex type.`;
}
n(D, "errorMessageForUnsupportedType");
function K(t, e, r) {
  if (t === void 0)
    return { $undefined: null };
  if (e === void 0)
    throw new Error(
      `Programming error. Current value is ${y(
        t
      )} but original value is undefined`
    );
  return b(t, e, r, !1);
}
n(K, "convexOrUndefinedToJsonInternal");
function _(t) {
  return b(t, t, "", !1);
}
n(_, "convexToJson");
function Tt(t) {
  return K(t, t, "");
}
n(Tt, "convexOrUndefinedToJson");
function Ct(t) {
  return b(t, t, "", !0);
}
n(Ct, "patchValueToJson");

// node_modules/convex/dist/esm/values/validators.js
var ht = Object.defineProperty, yt = /* @__PURE__ */ n((t, e, r) => e in t ? ht(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), a = /* @__PURE__ */ n((t, e, r) => yt(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), wt = "https://docs.convex.dev/error#undefined-validator";
function x(t, e) {
  let r = e !== void 0 ? ` for field "${e}"` : "";
  throw new Error(
    `A validator is undefined${r} in ${t}. This is often caused by circular imports. See ${wt} for details.`
  );
}
n(x, "throwUndefinedValidatorError");
var u = class {
  static {
    n(this, "BaseValidator");
  }
  constructor({ isOptional: e }) {
    a(this, "type"), a(this, "fieldPaths"), a(this, "isOptional"), a(this, "isConvexValidator"), this.isOptional = e, this.isConvexValidator = !0;
  }
}, A = class t extends u {
  static {
    n(this, "VId");
  }
  /**
   * Usually you'd use `v.id(tableName)` instead.
   */
  constructor({
    isOptional: e,
    tableName: r
  }) {
    if (super({ isOptional: e }), a(this, "tableName"), a(this, "kind", "id"), typeof r != "string")
      throw new Error("v.id(tableName) requires a string");
    this.tableName = r;
  }
  /** @internal */
  get json() {
    return { type: "id", tableName: this.tableName };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional",
      tableName: this.tableName
    });
  }
}, O = class t extends u {
  static {
    n(this, "VFloat64");
  }
  constructor() {
    super(...arguments), a(this, "kind", "float64");
  }
  /** @internal */
  get json() {
    return { type: "number" };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional"
    });
  }
}, B = class t extends u {
  static {
    n(this, "VInt64");
  }
  constructor() {
    super(...arguments), a(this, "kind", "int64");
  }
  /** @internal */
  get json() {
    return { type: "bigint" };
  }
  /** @internal */
  asOptional() {
    return new t({ isOptional: "optional" });
  }
}, $ = class t extends u {
  static {
    n(this, "VBoolean");
  }
  constructor() {
    super(...arguments), a(this, "kind", "boolean");
  }
  /** @internal */
  get json() {
    return { type: this.kind };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional"
    });
  }
}, E = class t extends u {
  static {
    n(this, "VBytes");
  }
  constructor() {
    super(...arguments), a(this, "kind", "bytes");
  }
  /** @internal */
  get json() {
    return { type: this.kind };
  }
  /** @internal */
  asOptional() {
    return new t({ isOptional: "optional" });
  }
}, I = class t extends u {
  static {
    n(this, "VString");
  }
  constructor() {
    super(...arguments), a(this, "kind", "string");
  }
  /** @internal */
  get json() {
    return { type: this.kind };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional"
    });
  }
}, j = class t extends u {
  static {
    n(this, "VNull");
  }
  constructor() {
    super(...arguments), a(this, "kind", "null");
  }
  /** @internal */
  get json() {
    return { type: this.kind };
  }
  /** @internal */
  asOptional() {
    return new t({ isOptional: "optional" });
  }
}, T = class t extends u {
  static {
    n(this, "VAny");
  }
  constructor() {
    super(...arguments), a(this, "kind", "any");
  }
  /** @internal */
  get json() {
    return {
      type: this.kind
    };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional"
    });
  }
}, C = class t extends u {
  static {
    n(this, "VObject");
  }
  /**
   * Usually you'd use `v.object({ ... })` instead.
   */
  constructor({
    isOptional: e,
    fields: r
  }) {
    super({ isOptional: e }), a(this, "fields"), a(this, "kind", "object"), globalThis.Object.entries(r).forEach(([o, s]) => {
      if (s === void 0 && x("v.object()", o), !s.isConvexValidator)
        throw new Error("v.object() entries must be validators");
    }), this.fields = r;
  }
  /** @internal */
  get json() {
    return {
      type: this.kind,
      value: globalThis.Object.fromEntries(
        globalThis.Object.entries(this.fields).map(([e, r]) => [
          e,
          {
            fieldType: r.json,
            optional: r.isOptional === "optional"
          }
        ])
      )
    };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional",
      fields: this.fields
    });
  }
  /**
   * Create a new VObject with the specified fields omitted.
   * @param fields The field names to omit from this VObject.
   */
  omit(...e) {
    let r = { ...this.fields };
    for (let o of e)
      delete r[o];
    return new t({
      isOptional: this.isOptional,
      fields: r
    });
  }
  /**
   * Create a new VObject with only the specified fields.
   * @param fields The field names to pick from this VObject.
   */
  pick(...e) {
    let r = {};
    for (let o of e)
      r[o] = this.fields[o];
    return new t({
      isOptional: this.isOptional,
      fields: r
    });
  }
  /**
   * Create a new VObject with all fields marked as optional.
   */
  partial() {
    let e = {};
    for (let [r, o] of globalThis.Object.entries(this.fields))
      e[r] = o.asOptional();
    return new t({
      isOptional: this.isOptional,
      fields: e
    });
  }
  /**
   * Create a new VObject with additional fields merged in.
   * @param fields An object with additional validators to merge into this VObject.
   */
  extend(e) {
    return new t({
      isOptional: this.isOptional,
      fields: { ...this.fields, ...e }
    });
  }
}, N = class t extends u {
  static {
    n(this, "VLiteral");
  }
  /**
   * Usually you'd use `v.literal(value)` instead.
   */
  constructor({ isOptional: e, value: r }) {
    if (super({ isOptional: e }), a(this, "value"), a(this, "kind", "literal"), typeof r != "string" && typeof r != "boolean" && typeof r != "number" && typeof r != "bigint")
      throw new Error("v.literal(value) must be a string, number, or boolean");
    this.value = r;
  }
  /** @internal */
  get json() {
    return {
      type: this.kind,
      value: _(this.value)
    };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional",
      value: this.value
    });
  }
}, v = class t extends u {
  static {
    n(this, "VArray");
  }
  /**
   * Usually you'd use `v.array(element)` instead.
   */
  constructor({
    isOptional: e,
    element: r
  }) {
    super({ isOptional: e }), a(this, "element"), a(this, "kind", "array"), r === void 0 && x("v.array()"), this.element = r;
  }
  /** @internal */
  get json() {
    return {
      type: this.kind,
      value: this.element.json
    };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional",
      element: this.element
    });
  }
}, L = class t extends u {
  static {
    n(this, "VRecord");
  }
  /**
   * Usually you'd use `v.record(key, value)` instead.
   */
  constructor({
    isOptional: e,
    key: r,
    value: o
  }) {
    if (super({ isOptional: e }), a(this, "key"), a(this, "value"), a(this, "kind", "record"), r === void 0 && x("v.record()", "key"), o === void 0 && x("v.record()", "value"), r.isOptional === "optional")
      throw new Error("Record validator cannot have optional keys");
    if (o.isOptional === "optional")
      throw new Error("Record validator cannot have optional values");
    if (!r.isConvexValidator || !o.isConvexValidator)
      throw new Error("Key and value of v.record() but be validators");
    this.key = r, this.value = o;
  }
  /** @internal */
  get json() {
    return {
      type: this.kind,
      // This cast is needed because TypeScript thinks the key type is too wide
      keys: this.key.json,
      values: {
        fieldType: this.value.json,
        optional: !1
      }
    };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional",
      key: this.key,
      value: this.value
    });
  }
}, k = class t extends u {
  static {
    n(this, "VUnion");
  }
  /**
   * Usually you'd use `v.union(...members)` instead.
   */
  constructor({ isOptional: e, members: r }) {
    super({ isOptional: e }), a(this, "members"), a(this, "kind", "union"), r.forEach((o, s) => {
      if (o === void 0 && x("v.union()", `member at index ${s}`), !o.isConvexValidator)
        throw new Error("All members of v.union() must be validators");
    }), this.members = r;
  }
  /** @internal */
  get json() {
    return {
      type: this.kind,
      value: this.members.map((e) => e.json)
    };
  }
  /** @internal */
  asOptional() {
    return new t({
      isOptional: "optional",
      members: this.members
    });
  }
};

// node_modules/convex/dist/esm/values/validator.js
function gt(t) {
  return !!t.isConvexValidator;
}
n(gt, "isValidator");
function mt(t) {
  return gt(t) ? t : F.object(t);
}
n(mt, "asObjectValidator");
var F = {
  /**
   * Validates that the value corresponds to an ID of a document in given table.
   * @param tableName The name of the table.
   */
  id: /* @__PURE__ */ n((t) => new A({
    isOptional: "required",
    tableName: t
  }), "id"),
  /**
   * Validates that the value is of type Null.
   */
  null: /* @__PURE__ */ n(() => new j({ isOptional: "required" }), "null"),
  /**
   * Validates that the value is of Convex type Float64 (Number in JS).
   *
   * Alias for `v.float64()`
   */
  number: /* @__PURE__ */ n(() => new O({ isOptional: "required" }), "number"),
  /**
   * Validates that the value is of Convex type Float64 (Number in JS).
   */
  float64: /* @__PURE__ */ n(() => new O({ isOptional: "required" }), "float64"),
  /**
   * @deprecated Use `v.int64()` instead
   */
  bigint: /* @__PURE__ */ n(() => new B({ isOptional: "required" }), "bigint"),
  /**
   * Validates that the value is of Convex type Int64 (BigInt in JS).
   */
  int64: /* @__PURE__ */ n(() => new B({ isOptional: "required" }), "int64"),
  /**
   * Validates that the value is of type Boolean.
   */
  boolean: /* @__PURE__ */ n(() => new $({ isOptional: "required" }), "boolean"),
  /**
   * Validates that the value is of type String.
   */
  string: /* @__PURE__ */ n(() => new I({ isOptional: "required" }), "string"),
  /**
   * Validates that the value is of Convex type Bytes (constructed in JS via `ArrayBuffer`).
   */
  bytes: /* @__PURE__ */ n(() => new E({ isOptional: "required" }), "bytes"),
  /**
   * Validates that the value is equal to the given literal value.
   * @param literal The literal value to compare against.
   */
  literal: /* @__PURE__ */ n((t) => new N({ isOptional: "required", value: t }), "literal"),
  /**
   * Validates that the value is an Array of the given element type.
   * @param element The validator for the elements of the array.
   */
  array: /* @__PURE__ */ n((t) => new v({ isOptional: "required", element: t }), "array"),
  /**
   * Validates that the value is an Object with the given properties.
   * @param fields An object specifying the validator for each property.
   */
  object: /* @__PURE__ */ n((t) => new C({ isOptional: "required", fields: t }), "object"),
  /**
   * Validates that the value is a Record with keys and values that match the given types.
   * @param keys The validator for the keys of the record. This cannot contain string literals.
   * @param values The validator for the values of the record.
   */
  record: /* @__PURE__ */ n((t, e) => new L({
    isOptional: "required",
    key: t,
    value: e
  }), "record"),
  /**
   * Validates that the value matches one of the given validators.
   * @param members The validators to match against.
   */
  union: /* @__PURE__ */ n((...t) => new k({
    isOptional: "required",
    members: t
  }), "union"),
  /**
   * Does not validate the value.
   */
  any: /* @__PURE__ */ n(() => new T({ isOptional: "required" }), "any"),
  /**
   * Allows not specifying a value for a property in an Object.
   * @param value The property value validator to make optional.
   *
   * ```typescript
   * const objectWithOptionalFields = v.object({
   *   requiredField: v.string(),
   *   optionalField: v.optional(v.string()),
   * });
   * ```
   */
  optional: /* @__PURE__ */ n((t) => t.asOptional(), "optional"),
  /**
   * Allows specifying a value or null.
   */
  nullable: /* @__PURE__ */ n((t) => F.union(t, F.null()), "nullable")
};

// node_modules/convex/dist/esm/values/errors.js
var bt = Object.defineProperty, xt = /* @__PURE__ */ n((t, e, r) => e in t ? bt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), P = /* @__PURE__ */ n((t, e, r) => xt(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), Z, z, Ot = Symbol.for("ConvexError"), Q = class extends (z = Error, Z = Ot, z) {
  static {
    n(this, "ConvexError");
  }
  constructor(e) {
    super(typeof e == "string" ? e : y(e)), P(this, "name", "ConvexError"), P(this, "data"), P(this, Z, !0), this.data = e;
  }
};

// node_modules/convex/dist/esm/values/compare_utf8.js
var tt = /* @__PURE__ */ n(() => Array.from({ length: 4 }, () => 0), "arr"), Mt = tt(), _t = tt();

export {
  $t as a,
  S as b,
  _ as c,
  Tt as d,
  Ct as e,
  gt as f,
  mt as g,
  F as h,
  Q as i
};
//# sourceMappingURL=34SVKERO.js.map
