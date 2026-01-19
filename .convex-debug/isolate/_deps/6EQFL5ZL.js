import {
  a as v,
  b as m,
  c as p,
  d as x,
  e as pe,
  f as fe,
  g as V,
  h as a,
  i as he
} from "./34SVKERO.js";
import {
  a as n
} from "./5B5TEMMX.js";

// node_modules/convex/dist/esm/server/functionName.js
var _ = Symbol.for("functionName");

// node_modules/convex/dist/esm/server/components/paths.js
var W = Symbol.for("toReferencePath");
function Ve(t) {
  return t[W] ?? null;
}
n(Ve, "extractReferencePath");
function We(t) {
  return t.startsWith("function://");
}
n(We, "isFunctionHandle");
function w(t) {
  let e;
  if (typeof t == "string")
    We(t) ? e = { functionHandle: t } : e = { name: t };
  else if (t[_])
    e = { name: t[_] };
  else {
    let r = Ve(t);
    if (!r)
      throw new Error(`${t} is not a functionReference`);
    e = { reference: r };
  }
  return e;
}
n(w, "getFunctionAddress");

// node_modules/convex/dist/esm/server/api.js
function B(t) {
  let e = w(t);
  if (e.name === void 0)
    throw e.functionHandle !== void 0 ? new Error(
      `Expected function reference like "api.file.func" or "internal.file.func", but received function handle ${e.functionHandle}`
    ) : e.reference !== void 0 ? new Error(
      `Expected function reference in the current component like "api.file.func" or "internal.file.func", but received reference ${e.reference}`
    ) : new Error(
      `Expected function reference like "api.file.func" or "internal.file.func", but received ${JSON.stringify(e)}`
    );
  if (typeof t == "string") return t;
  let r = t[_];
  if (!r)
    throw new Error(`${t} is not a functionReference`);
  return r;
}
n(B, "getFunctionName");
function me(t = []) {
  let e = {
    get(r, o) {
      if (typeof o == "string") {
        let s = [...t, o];
        return me(s);
      } else if (o === _) {
        if (t.length < 2) {
          let l = ["api", ...t].join(".");
          throw new Error(
            `API path is expected to be of the form \`api.moduleName.functionName\`. Found: \`${l}\``
          );
        }
        let s = t.slice(0, -1).join("/"), i = t[t.length - 1];
        return i === "default" ? s : s + ":" + i;
      } else return o === Symbol.toStringTag ? "FunctionReference" : void 0;
    }
  };
  return new Proxy({}, e);
}
n(me, "createApi");
var Be = me();

// node_modules/convex/dist/esm/server/cron.js
var De = Object.defineProperty, ke = /* @__PURE__ */ n((t, e, r) => e in t ? De(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), ye = /* @__PURE__ */ n((t, e, r) => ke(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), Le = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday"
], Ye = /* @__PURE__ */ n(() => new L(), "cronJobs");
function D(t) {
  if (!Number.isInteger(t) || t <= 0)
    throw new Error("Interval must be an integer greater than 0");
}
n(D, "validateIntervalNumber");
function Ke(t) {
  if (!Number.isInteger(t) || t < 1 || t > 31)
    throw new Error("Day of month must be an integer from 1 to 31");
  return t;
}
n(Ke, "validatedDayOfMonth");
function Xe(t) {
  if (!Le.includes(t))
    throw new Error('Day of week must be a string like "monday".');
  return t;
}
n(Xe, "validatedDayOfWeek");
function k(t) {
  if (!Number.isInteger(t) || t < 0 || t > 23)
    throw new Error("Hour of day must be an integer from 0 to 23");
  return t;
}
n(k, "validatedHourOfDay");
function R(t) {
  if (!Number.isInteger(t) || t < 0 || t > 59)
    throw new Error("Minute of hour must be an integer from 0 to 59");
  return t;
}
n(R, "validatedMinuteOfHour");
function Ze(t) {
  if (!t.match(/^[ -~]*$/))
    throw new Error(
      `Invalid cron identifier ${t}: use ASCII letters that are not control characters`
    );
  return t;
}
n(Ze, "validatedCronIdentifier");
var L = class {
  static {
    n(this, "Crons");
  }
  constructor() {
    ye(this, "crons"), ye(this, "isCrons"), this.isCrons = !0, this.crons = {};
  }
  /** @internal */
  schedule(e, r, o, s) {
    let i = v(s);
    if (Ze(e), e in this.crons)
      throw new Error(`Cron identifier registered twice: ${e}`);
    this.crons[e] = {
      name: B(o),
      args: [p(i)],
      schedule: r
    };
  }
  /**
   * Schedule a mutation or action to run at some interval.
   *
   * ```js
   * crons.interval("Clear presence data", {seconds: 30}, api.presence.clear);
   * ```
   *
   * @param identifier - A unique name for this scheduled job.
   * @param schedule - The time between runs for this scheduled job.
   * @param functionReference - A {@link FunctionReference} for the function
   * to schedule.
   * @param args - The arguments to the function.
   */
  interval(e, r, o, ...s) {
    let i = r, l = +("seconds" in i && i.seconds !== void 0), h = +("minutes" in i && i.minutes !== void 0), b = +("hours" in i && i.hours !== void 0);
    if (l + h + b !== 1)
      throw new Error("Must specify one of seconds, minutes, or hours");
    l ? D(r.seconds) : h ? D(r.minutes) : b && D(r.hours), this.schedule(
      e,
      { ...r, type: "interval" },
      o,
      ...s
    );
  }
  /**
   * Schedule a mutation or action to run on an hourly basis.
   *
   * ```js
   * crons.hourly(
   *   "Reset high scores",
   *   {
   *     minuteUTC: 30,
   *   },
   *   api.scores.reset
   * )
   * ```
   *
   * @param cronIdentifier - A unique name for this scheduled job.
   * @param schedule - What time (UTC) each day to run this function.
   * @param functionReference - A {@link FunctionReference} for the function
   * to schedule.
   * @param args - The arguments to the function.
   */
  hourly(e, r, o, ...s) {
    let i = R(r.minuteUTC);
    this.schedule(
      e,
      { minuteUTC: i, type: "hourly" },
      o,
      ...s
    );
  }
  /**
   * Schedule a mutation or action to run on a daily basis.
   *
   * ```js
   * crons.daily(
   *   "Reset high scores",
   *   {
   *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
   *     minuteUTC: 30,
   *   },
   *   api.scores.reset
   * )
   * ```
   *
   * @param cronIdentifier - A unique name for this scheduled job.
   * @param schedule - What time (UTC) each day to run this function.
   * @param functionReference - A {@link FunctionReference} for the function
   * to schedule.
   * @param args - The arguments to the function.
   */
  daily(e, r, o, ...s) {
    let i = k(r.hourUTC), l = R(r.minuteUTC);
    this.schedule(
      e,
      { hourUTC: i, minuteUTC: l, type: "daily" },
      o,
      ...s
    );
  }
  /**
   * Schedule a mutation or action to run on a weekly basis.
   *
   * ```js
   * crons.weekly(
   *   "Weekly re-engagement email",
   *   {
   *     dayOfWeek: "Tuesday",
   *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
   *     minuteUTC: 30,
   *   },
   *   api.emails.send
   * )
   * ```
   *
   * @param cronIdentifier - A unique name for this scheduled job.
   * @param schedule - What day and time (UTC) each week to run this function.
   * @param functionReference - A {@link FunctionReference} for the function
   * to schedule.
   */
  weekly(e, r, o, ...s) {
    let i = Xe(r.dayOfWeek), l = k(r.hourUTC), h = R(r.minuteUTC);
    this.schedule(
      e,
      { dayOfWeek: i, hourUTC: l, minuteUTC: h, type: "weekly" },
      o,
      ...s
    );
  }
  /**
   * Schedule a mutation or action to run on a monthly basis.
   *
   * Note that some months have fewer days than others, so e.g. a function
   * scheduled to run on the 30th will not run in February.
   *
   * ```js
   * crons.monthly(
   *   "Bill customers at ",
   *   {
   *     hourUTC: 17, // (9:30am Pacific/10:30am Daylight Savings Pacific)
   *     minuteUTC: 30,
   *     day: 1,
   *   },
   *   api.billing.billCustomers
   * )
   * ```
   *
   * @param cronIdentifier - A unique name for this scheduled job.
   * @param schedule - What day and time (UTC) each month to run this function.
   * @param functionReference - A {@link FunctionReference} for the function
   * to schedule.
   * @param args - The arguments to the function.
   */
  monthly(e, r, o, ...s) {
    let i = Ke(r.day), l = k(r.hourUTC), h = R(r.minuteUTC);
    this.schedule(
      e,
      { day: i, hourUTC: l, minuteUTC: h, type: "monthly" },
      o,
      ...s
    );
  }
  /**
   * Schedule a mutation or action to run on a recurring basis.
   *
   * Like the unix command `cron`, Sunday is 0, Monday is 1, etc.
   *
   * ```
   *  ┌─ minute (0 - 59)
   *  │ ┌─ hour (0 - 23)
   *  │ │ ┌─ day of the month (1 - 31)
   *  │ │ │ ┌─ month (1 - 12)
   *  │ │ │ │ ┌─ day of the week (0 - 6) (Sunday to Saturday)
   * "* * * * *"
   * ```
   *
   * @param cronIdentifier - A unique name for this scheduled job.
   * @param cron - Cron string like `"15 7 * * *"` (Every day at 7:15 UTC)
   * @param functionReference - A {@link FunctionReference} for the function
   * to schedule.
   * @param args - The arguments to the function.
   */
  cron(e, r, o, ...s) {
    let i = r;
    this.schedule(
      e,
      { cron: i, type: "cron" },
      o,
      ...s
    );
  }
  /** @internal */
  export() {
    return JSON.stringify(this.crons);
  }
};

// node_modules/convex/dist/esm/index.js
var f = "1.31.5";

// node_modules/convex/dist/esm/server/impl/syscall.js
function $(t, e) {
  if (typeof Convex > "u" || Convex.syscall === void 0)
    throw new Error(
      "The Convex database and auth objects are being used outside of a Convex backend. Did you mean to use `useQuery` or `useMutation` to call a Convex function?"
    );
  let r = Convex.syscall(t, JSON.stringify(e));
  return JSON.parse(r);
}
n($, "performSyscall");
async function c(t, e) {
  if (typeof Convex > "u" || Convex.asyncSyscall === void 0)
    throw new Error(
      "The Convex database and auth objects are being used outside of a Convex backend. Did you mean to use `useQuery` or `useMutation` to call a Convex function?"
    );
  let r;
  try {
    r = await Convex.asyncSyscall(t, JSON.stringify(e));
  } catch (o) {
    if (o.data !== void 0) {
      let s = new he(o.message);
      throw s.data = m(o.data), s;
    }
    throw new Error(o.message);
  }
  return JSON.parse(r);
}
n(c, "performAsyncSyscall");
function F(t, e) {
  if (typeof Convex > "u" || Convex.jsSyscall === void 0)
    throw new Error(
      "The Convex database and auth objects are being used outside of a Convex backend. Did you mean to use `useQuery` or `useMutation` to call a Convex function?"
    );
  return Convex.jsSyscall(t, e);
}
n(F, "performJsSyscall");

// node_modules/convex/dist/esm/server/components/index.js
function xe(t, e) {
  let r = {
    get(o, s) {
      if (typeof s == "string") {
        let i = [...e, s];
        return xe(t, i);
      } else if (s === W) {
        if (e.length < 1) {
          let i = [t, ...e].join(".");
          throw new Error(
            `API path is expected to be of the form \`${t}.childComponent.functionName\`. Found: \`${i}\``
          );
        }
        return "_reference/childComponent/" + e.join("/");
      } else
        return;
    }
  };
  return new Proxy({}, r);
}
n(xe, "createChildComponents");
var et = /* @__PURE__ */ n(() => xe("components", []), "componentsGeneric");

// node_modules/convex/dist/esm/server/impl/actions_impl.js
function Y(t, e, r) {
  return {
    ...w(e),
    args: p(v(r)),
    version: f,
    requestId: t
  };
}
n(Y, "syscallArgs");
function we(t) {
  return {
    runQuery: /* @__PURE__ */ n(async (e, r) => {
      let o = await c(
        "1.0/actions/query",
        Y(t, e, r)
      );
      return m(o);
    }, "runQuery"),
    runMutation: /* @__PURE__ */ n(async (e, r) => {
      let o = await c(
        "1.0/actions/mutation",
        Y(t, e, r)
      );
      return m(o);
    }, "runMutation"),
    runAction: /* @__PURE__ */ n(async (e, r) => {
      let o = await c(
        "1.0/actions/action",
        Y(t, e, r)
      );
      return m(o);
    }, "runAction")
  };
}
n(we, "setupActionCalls");

// node_modules/convex/dist/esm/server/vector_search.js
var tt = Object.defineProperty, rt = /* @__PURE__ */ n((t, e, r) => e in t ? tt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), ge = /* @__PURE__ */ n((t, e, r) => rt(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), O = class {
  static {
    n(this, "FilterExpression");
  }
  /**
   * @internal
   */
  constructor() {
    ge(this, "_isExpression"), ge(this, "_value");
  }
};

// node_modules/convex/dist/esm/server/impl/validate.js
function u(t, e, r, o) {
  if (t === void 0)
    throw new TypeError(
      `Must provide arg ${e} \`${o}\` to \`${r}\``
    );
}
n(u, "validateArg");
function ve(t, e, r, o) {
  if (!Number.isInteger(t) || t < 0)
    throw new TypeError(
      `Arg ${e} \`${o}\` to \`${r}\` must be a non-negative integer`
    );
}
n(ve, "validateArgIsNonNegativeInteger");

// node_modules/convex/dist/esm/server/impl/vector_search_impl.js
var nt = Object.defineProperty, ot = /* @__PURE__ */ n((t, e, r) => e in t ? nt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), K = /* @__PURE__ */ n((t, e, r) => ot(t, typeof e != "symbol" ? e + "" : e, r), "__publicField");
function be(t) {
  return async (e, r, o) => {
    if (u(e, 1, "vectorSearch", "tableName"), u(r, 2, "vectorSearch", "indexName"), u(o, 3, "vectorSearch", "query"), !o.vector || !Array.isArray(o.vector) || o.vector.length === 0)
      throw Error("`vector` must be a non-empty Array in vectorSearch");
    return await new X(
      t,
      e + "." + r,
      o
    ).collect();
  };
}
n(be, "setupActionVectorSearch");
var X = class {
  static {
    n(this, "VectorQueryImpl");
  }
  constructor(e, r, o) {
    K(this, "requestId"), K(this, "state"), this.requestId = e;
    let s = o.filter ? M(o.filter(st)) : null;
    this.state = {
      type: "preparing",
      query: {
        indexName: r,
        limit: o.limit,
        vector: o.vector,
        expressions: s
      }
    };
  }
  async collect() {
    if (this.state.type === "consumed")
      throw new Error("This query is closed and can't emit any more values.");
    let e = this.state.query;
    this.state = { type: "consumed" };
    let { results: r } = await c("1.0/actions/vectorSearch", {
      requestId: this.requestId,
      version: f,
      query: e
    });
    return r;
  }
}, A = class extends O {
  static {
    n(this, "ExpressionImpl");
  }
  constructor(e) {
    super(), K(this, "inner"), this.inner = e;
  }
  serialize() {
    return this.inner;
  }
};
function M(t) {
  return t instanceof A ? t.serialize() : { $literal: x(t) };
}
n(M, "serializeExpression");
var st = {
  //  Comparisons  /////////////////////////////////////////////////////////////
  eq(t, e) {
    if (typeof t != "string")
      throw new Error("The first argument to `q.eq` must be a field name.");
    return new A({
      $eq: [
        M(new A({ $field: t })),
        M(e)
      ]
    });
  },
  //  Logic  ///////////////////////////////////////////////////////////////////
  or(...t) {
    return new A({ $or: t.map(M) });
  }
};

// node_modules/convex/dist/esm/server/impl/authentication_impl.js
function J(t) {
  return {
    getUserIdentity: /* @__PURE__ */ n(async () => await c("1.0/getUserIdentity", {
      requestId: t
    }), "getUserIdentity")
  };
}
n(J, "setupAuth");

// node_modules/convex/dist/esm/server/filter_builder.js
var it = Object.defineProperty, at = /* @__PURE__ */ n((t, e, r) => e in t ? it(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), Se = /* @__PURE__ */ n((t, e, r) => at(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), U = class {
  static {
    n(this, "Expression");
  }
  /**
   * @internal
   */
  constructor() {
    Se(this, "_isExpression"), Se(this, "_value");
  }
};

// node_modules/convex/dist/esm/server/impl/filter_builder_impl.js
var ut = Object.defineProperty, ct = /* @__PURE__ */ n((t, e, r) => e in t ? ut(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), lt = /* @__PURE__ */ n((t, e, r) => ct(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), y = class extends U {
  static {
    n(this, "ExpressionImpl");
  }
  constructor(e) {
    super(), lt(this, "inner"), this.inner = e;
  }
  serialize() {
    return this.inner;
  }
};
function d(t) {
  return t instanceof y ? t.serialize() : { $literal: x(t) };
}
n(d, "serializeExpression");
var _e = {
  //  Comparisons  /////////////////////////////////////////////////////////////
  eq(t, e) {
    return new y({
      $eq: [d(t), d(e)]
    });
  },
  neq(t, e) {
    return new y({
      $neq: [d(t), d(e)]
    });
  },
  lt(t, e) {
    return new y({
      $lt: [d(t), d(e)]
    });
  },
  lte(t, e) {
    return new y({
      $lte: [d(t), d(e)]
    });
  },
  gt(t, e) {
    return new y({
      $gt: [d(t), d(e)]
    });
  },
  gte(t, e) {
    return new y({
      $gte: [d(t), d(e)]
    });
  },
  //  Arithmetic  //////////////////////////////////////////////////////////////
  add(t, e) {
    return new y({
      $add: [d(t), d(e)]
    });
  },
  sub(t, e) {
    return new y({
      $sub: [d(t), d(e)]
    });
  },
  mul(t, e) {
    return new y({
      $mul: [d(t), d(e)]
    });
  },
  div(t, e) {
    return new y({
      $div: [d(t), d(e)]
    });
  },
  mod(t, e) {
    return new y({
      $mod: [d(t), d(e)]
    });
  },
  neg(t) {
    return new y({ $neg: d(t) });
  },
  //  Logic  ///////////////////////////////////////////////////////////////////
  and(...t) {
    return new y({ $and: t.map(d) });
  },
  or(...t) {
    return new y({ $or: t.map(d) });
  },
  not(t) {
    return new y({ $not: d(t) });
  },
  //  Other  ///////////////////////////////////////////////////////////////////
  field(t) {
    return new y({ $field: t });
  }
};

// node_modules/convex/dist/esm/server/index_range_builder.js
var dt = Object.defineProperty, pt = /* @__PURE__ */ n((t, e, r) => e in t ? dt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), ft = /* @__PURE__ */ n((t, e, r) => pt(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), j = class {
  static {
    n(this, "IndexRange");
  }
  /**
   * @internal
   */
  constructor() {
    ft(this, "_isIndexRange");
  }
};

// node_modules/convex/dist/esm/server/impl/index_range_builder_impl.js
var ht = Object.defineProperty, mt = /* @__PURE__ */ n((t, e, r) => e in t ? ht(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), Ae = /* @__PURE__ */ n((t, e, r) => mt(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), Q = class t extends j {
  static {
    n(this, "IndexRangeBuilderImpl");
  }
  constructor(e) {
    super(), Ae(this, "rangeExpressions"), Ae(this, "isConsumed"), this.rangeExpressions = e, this.isConsumed = !1;
  }
  static new() {
    return new t([]);
  }
  consume() {
    if (this.isConsumed)
      throw new Error(
        "IndexRangeBuilder has already been used! Chain your method calls like `q => q.eq(...).eq(...)`. See https://docs.convex.dev/using/indexes"
      );
    this.isConsumed = !0;
  }
  eq(e, r) {
    return this.consume(), new t(
      this.rangeExpressions.concat({
        type: "Eq",
        fieldPath: e,
        value: x(r)
      })
    );
  }
  gt(e, r) {
    return this.consume(), new t(
      this.rangeExpressions.concat({
        type: "Gt",
        fieldPath: e,
        value: x(r)
      })
    );
  }
  gte(e, r) {
    return this.consume(), new t(
      this.rangeExpressions.concat({
        type: "Gte",
        fieldPath: e,
        value: x(r)
      })
    );
  }
  lt(e, r) {
    return this.consume(), new t(
      this.rangeExpressions.concat({
        type: "Lt",
        fieldPath: e,
        value: x(r)
      })
    );
  }
  lte(e, r) {
    return this.consume(), new t(
      this.rangeExpressions.concat({
        type: "Lte",
        fieldPath: e,
        value: x(r)
      })
    );
  }
  export() {
    return this.consume(), this.rangeExpressions;
  }
};

// node_modules/convex/dist/esm/server/search_filter_builder.js
var yt = Object.defineProperty, xt = /* @__PURE__ */ n((t, e, r) => e in t ? yt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), wt = /* @__PURE__ */ n((t, e, r) => xt(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), G = class {
  static {
    n(this, "SearchFilter");
  }
  /**
   * @internal
   */
  constructor() {
    wt(this, "_isSearchFilter");
  }
};

// node_modules/convex/dist/esm/server/impl/search_filter_builder_impl.js
var gt = Object.defineProperty, vt = /* @__PURE__ */ n((t, e, r) => e in t ? gt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), Ee = /* @__PURE__ */ n((t, e, r) => vt(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), H = class t extends G {
  static {
    n(this, "SearchFilterBuilderImpl");
  }
  constructor(e) {
    super(), Ee(this, "filters"), Ee(this, "isConsumed"), this.filters = e, this.isConsumed = !1;
  }
  static new() {
    return new t([]);
  }
  consume() {
    if (this.isConsumed)
      throw new Error(
        "SearchFilterBuilder has already been used! Chain your method calls like `q => q.search(...).eq(...)`."
      );
    this.isConsumed = !0;
  }
  search(e, r) {
    return u(e, 1, "search", "fieldName"), u(r, 2, "search", "query"), this.consume(), new t(
      this.filters.concat({
        type: "Search",
        fieldPath: e,
        value: r
      })
    );
  }
  eq(e, r) {
    return u(e, 1, "eq", "fieldName"), arguments.length !== 2 && u(r, 2, "search", "value"), this.consume(), new t(
      this.filters.concat({
        type: "Eq",
        fieldPath: e,
        value: x(r)
      })
    );
  }
  export() {
    return this.consume(), this.filters;
  }
};

// node_modules/convex/dist/esm/server/impl/query_impl.js
var bt = Object.defineProperty, St = /* @__PURE__ */ n((t, e, r) => e in t ? bt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), Z = /* @__PURE__ */ n((t, e, r) => St(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), Ie = 256, E = class {
  static {
    n(this, "QueryInitializerImpl");
  }
  constructor(e) {
    Z(this, "tableName"), this.tableName = e;
  }
  withIndex(e, r) {
    u(e, 1, "withIndex", "indexName");
    let o = Q.new();
    return r !== void 0 && (o = r(o)), new S({
      source: {
        type: "IndexRange",
        indexName: this.tableName + "." + e,
        range: o.export(),
        order: null
      },
      operators: []
    });
  }
  withSearchIndex(e, r) {
    u(e, 1, "withSearchIndex", "indexName"), u(r, 2, "withSearchIndex", "searchFilter");
    let o = H.new();
    return new S({
      source: {
        type: "Search",
        indexName: this.tableName + "." + e,
        filters: r(o).export()
      },
      operators: []
    });
  }
  fullTableScan() {
    return new S({
      source: {
        type: "FullTableScan",
        tableName: this.tableName,
        order: null
      },
      operators: []
    });
  }
  order(e) {
    return this.fullTableScan().order(e);
  }
  // This is internal API and should not be exposed to developers yet.
  async count() {
    let e = await c("1.0/count", {
      table: this.tableName
    });
    return m(e);
  }
  filter(e) {
    return this.fullTableScan().filter(e);
  }
  limit(e) {
    return this.fullTableScan().limit(e);
  }
  collect() {
    return this.fullTableScan().collect();
  }
  take(e) {
    return this.fullTableScan().take(e);
  }
  paginate(e) {
    return this.fullTableScan().paginate(e);
  }
  first() {
    return this.fullTableScan().first();
  }
  unique() {
    return this.fullTableScan().unique();
  }
  [Symbol.asyncIterator]() {
    return this.fullTableScan()[Symbol.asyncIterator]();
  }
};
function Pe(t) {
  throw new Error(
    t === "consumed" ? "This query is closed and can't emit any more values." : "This query has been chained with another operator and can't be reused."
  );
}
n(Pe, "throwClosedError");
var S = class t {
  static {
    n(this, "QueryImpl");
  }
  constructor(e) {
    Z(this, "state"), Z(this, "tableNameForErrorMessages"), this.state = { type: "preparing", query: e }, e.source.type === "FullTableScan" ? this.tableNameForErrorMessages = e.source.tableName : this.tableNameForErrorMessages = e.source.indexName.split(".")[0];
  }
  takeQuery() {
    if (this.state.type !== "preparing")
      throw new Error(
        "A query can only be chained once and can't be chained after iteration begins."
      );
    let e = this.state.query;
    return this.state = { type: "closed" }, e;
  }
  startQuery() {
    if (this.state.type === "executing")
      throw new Error("Iteration can only begin on a query once.");
    (this.state.type === "closed" || this.state.type === "consumed") && Pe(this.state.type);
    let e = this.state.query, { queryId: r } = $("1.0/queryStream", { query: e, version: f });
    return this.state = { type: "executing", queryId: r }, r;
  }
  closeQuery() {
    if (this.state.type === "executing") {
      let e = this.state.queryId;
      $("1.0/queryCleanup", { queryId: e });
    }
    this.state = { type: "consumed" };
  }
  order(e) {
    u(e, 1, "order", "order");
    let r = this.takeQuery();
    if (r.source.type === "Search")
      throw new Error(
        "Search queries must always be in relevance order. Can not set order manually."
      );
    if (r.source.order !== null)
      throw new Error("Queries may only specify order at most once");
    return r.source.order = e, new t(r);
  }
  filter(e) {
    u(e, 1, "filter", "predicate");
    let r = this.takeQuery();
    if (r.operators.length >= Ie)
      throw new Error(
        `Can't construct query with more than ${Ie} operators`
      );
    return r.operators.push({
      filter: d(e(_e))
    }), new t(r);
  }
  limit(e) {
    u(e, 1, "limit", "n");
    let r = this.takeQuery();
    return r.operators.push({ limit: e }), new t(r);
  }
  [Symbol.asyncIterator]() {
    return this.startQuery(), this;
  }
  async next() {
    (this.state.type === "closed" || this.state.type === "consumed") && Pe(this.state.type);
    let e = this.state.type === "preparing" ? this.startQuery() : this.state.queryId, { value: r, done: o } = await c("1.0/queryStreamNext", {
      queryId: e
    });
    return o && this.closeQuery(), { value: m(r), done: o };
  }
  return() {
    return this.closeQuery(), Promise.resolve({ done: !0, value: void 0 });
  }
  async paginate(e) {
    if (u(e, 1, "paginate", "options"), typeof e?.numItems != "number" || e.numItems < 0)
      throw new Error(
        `\`options.numItems\` must be a positive number. Received \`${e?.numItems}\`.`
      );
    let r = this.takeQuery(), o = e.numItems, s = e.cursor, i = e?.endCursor ?? null, l = e.maximumRowsRead ?? null, { page: h, isDone: b, continueCursor: N, splitCursor: Ge, pageStatus: He } = await c("1.0/queryPage", {
      query: r,
      cursor: s,
      endCursor: i,
      pageSize: o,
      maximumRowsRead: l,
      maximumBytesRead: e.maximumBytesRead,
      version: f
    });
    return {
      page: h.map((ze) => m(ze)),
      isDone: b,
      continueCursor: N,
      splitCursor: Ge,
      pageStatus: He
    };
  }
  async collect() {
    let e = [];
    for await (let r of this)
      e.push(r);
    return e;
  }
  async take(e) {
    return u(e, 1, "take", "n"), ve(e, 1, "take", "n"), this.limit(e).collect();
  }
  async first() {
    let e = await this.take(1);
    return e.length === 0 ? null : e[0];
  }
  async unique() {
    let e = await this.take(2);
    if (e.length === 0)
      return null;
    if (e.length === 2)
      throw new Error(`unique() query returned more than one result from table ${this.tableNameForErrorMessages}:
 [${e[0]._id}, ${e[1]._id}, ...]`);
    return e[0];
  }
};

// node_modules/convex/dist/esm/server/impl/database_impl.js
async function ee(t, e, r) {
  if (u(e, 1, "get", "id"), typeof e != "string")
    throw new Error(
      `Invalid argument \`id\` for \`db.get\`, expected string but got '${typeof e}': ${e}`
    );
  let o = {
    id: p(e),
    isSystem: r,
    version: f,
    table: t
  }, s = await c("1.0/get", o);
  return m(s);
}
n(ee, "get");
function se() {
  let t = /* @__PURE__ */ n((s = !1) => ({
    get: /* @__PURE__ */ n(async (i, l) => l !== void 0 ? await ee(i, l, s) : await ee(void 0, i, s), "get"),
    query: /* @__PURE__ */ n((i) => new q(i, s).query(), "query"),
    normalizeId: /* @__PURE__ */ n((i, l) => {
      u(i, 1, "normalizeId", "tableName"), u(l, 2, "normalizeId", "id");
      let h = i.startsWith("_");
      if (h !== s)
        throw new Error(
          `${h ? "System" : "User"} tables can only be accessed from db.${s ? "" : "system."}normalizeId().`
        );
      let b = $("1.0/db/normalizeId", {
        table: i,
        idString: l
      });
      return m(b).id;
    }, "normalizeId"),
    // We set the system reader on the next line
    system: null,
    table: /* @__PURE__ */ n((i) => new q(i, s), "table")
  }), "reader"), { system: e, ...r } = t(!0), o = t();
  return o.system = r, o;
}
n(se, "setupReader");
async function Te(t, e) {
  if (t.startsWith("_"))
    throw new Error("System tables (prefixed with `_`) are read-only.");
  u(t, 1, "insert", "table"), u(e, 2, "insert", "value");
  let r = await c("1.0/insert", {
    table: t,
    value: p(e)
  });
  return m(r)._id;
}
n(Te, "insert");
async function te(t, e, r) {
  u(e, 1, "patch", "id"), u(r, 2, "patch", "value"), await c("1.0/shallowMerge", {
    id: p(e),
    value: pe(r),
    table: t
  });
}
n(te, "patch");
async function re(t, e, r) {
  u(e, 1, "replace", "id"), u(r, 2, "replace", "value"), await c("1.0/replace", {
    id: p(e),
    value: p(r),
    table: t
  });
}
n(re, "replace");
async function ne(t, e) {
  u(e, 1, "delete", "id"), await c("1.0/remove", {
    id: p(e),
    table: t
  });
}
n(ne, "delete_");
function Ce() {
  let t = se();
  return {
    get: t.get,
    query: t.query,
    normalizeId: t.normalizeId,
    system: t.system,
    insert: /* @__PURE__ */ n(async (e, r) => await Te(e, r), "insert"),
    patch: /* @__PURE__ */ n(async (e, r, o) => o !== void 0 ? await te(e, r, o) : await te(void 0, e, r), "patch"),
    replace: /* @__PURE__ */ n(async (e, r, o) => o !== void 0 ? await re(e, r, o) : await re(void 0, e, r), "replace"),
    delete: /* @__PURE__ */ n(async (e, r) => r !== void 0 ? await ne(e, r) : await ne(void 0, e), "delete"),
    table: /* @__PURE__ */ n((e) => new oe(e, !1), "table")
  };
}
n(Ce, "setupWriter");
var q = class {
  static {
    n(this, "TableReader");
  }
  constructor(e, r) {
    this.tableName = e, this.isSystem = r;
  }
  async get(e) {
    return ee(this.tableName, e, this.isSystem);
  }
  query() {
    let e = this.tableName.startsWith("_");
    if (e !== this.isSystem)
      throw new Error(
        `${e ? "System" : "User"} tables can only be accessed from db.${this.isSystem ? "" : "system."}query().`
      );
    return new E(this.tableName);
  }
}, oe = class extends q {
  static {
    n(this, "TableWriter");
  }
  async insert(e) {
    return Te(this.tableName, e);
  }
  async patch(e, r) {
    return te(this.tableName, e, r);
  }
  async replace(e, r) {
    return re(this.tableName, e, r);
  }
  async delete(e) {
    return ne(this.tableName, e);
  }
};

// node_modules/convex/dist/esm/server/impl/scheduler_impl.js
function Ne() {
  return {
    runAfter: /* @__PURE__ */ n(async (t, e, r) => {
      let o = qe(t, e, r);
      return await c("1.0/schedule", o);
    }, "runAfter"),
    runAt: /* @__PURE__ */ n(async (t, e, r) => {
      let o = Re(
        t,
        e,
        r
      );
      return await c("1.0/schedule", o);
    }, "runAt"),
    cancel: /* @__PURE__ */ n(async (t) => {
      u(t, 1, "cancel", "id");
      let e = { id: p(t) };
      await c("1.0/cancel_job", e);
    }, "cancel")
  };
}
n(Ne, "setupMutationScheduler");
function $e(t) {
  return {
    runAfter: /* @__PURE__ */ n(async (e, r, o) => {
      let s = {
        requestId: t,
        ...qe(e, r, o)
      };
      return await c("1.0/actions/schedule", s);
    }, "runAfter"),
    runAt: /* @__PURE__ */ n(async (e, r, o) => {
      let s = {
        requestId: t,
        ...Re(e, r, o)
      };
      return await c("1.0/actions/schedule", s);
    }, "runAt"),
    cancel: /* @__PURE__ */ n(async (e) => {
      u(e, 1, "cancel", "id");
      let r = { id: p(e) };
      return await c("1.0/actions/cancel_job", r);
    }, "cancel")
  };
}
n($e, "setupActionScheduler");
function qe(t, e, r) {
  if (typeof t != "number")
    throw new Error("`delayMs` must be a number");
  if (!isFinite(t))
    throw new Error("`delayMs` must be a finite number");
  if (t < 0)
    throw new Error("`delayMs` must be non-negative");
  let o = v(r), s = w(e), i = (Date.now() + t) / 1e3;
  return {
    ...s,
    ts: i,
    args: p(o),
    version: f
  };
}
n(qe, "runAfterSyscallArgs");
function Re(t, e, r) {
  let o;
  if (t instanceof Date)
    o = t.valueOf() / 1e3;
  else if (typeof t == "number")
    o = t / 1e3;
  else
    throw new Error("The invoke time must a Date or a timestamp");
  let s = w(e), i = v(r);
  return {
    ...s,
    ts: o,
    args: p(i),
    version: f
  };
}
n(Re, "runAtSyscallArgs");

// node_modules/convex/dist/esm/server/impl/storage_impl.js
function ie(t) {
  return {
    getUrl: /* @__PURE__ */ n(async (e) => (u(e, 1, "getUrl", "storageId"), await c("1.0/storageGetUrl", {
      requestId: t,
      version: f,
      storageId: e
    })), "getUrl"),
    getMetadata: /* @__PURE__ */ n(async (e) => await c("1.0/storageGetMetadata", {
      requestId: t,
      version: f,
      storageId: e
    }), "getMetadata")
  };
}
n(ie, "setupStorageReader");
function ae(t) {
  let e = ie(t);
  return {
    generateUploadUrl: /* @__PURE__ */ n(async () => await c("1.0/storageGenerateUploadUrl", {
      requestId: t,
      version: f
    }), "generateUploadUrl"),
    delete: /* @__PURE__ */ n(async (r) => {
      await c("1.0/storageDelete", {
        requestId: t,
        version: f,
        storageId: r
      });
    }, "delete"),
    getUrl: e.getUrl,
    getMetadata: e.getMetadata
  };
}
n(ae, "setupStorageWriter");
function Fe(t) {
  return {
    ...ae(t),
    store: /* @__PURE__ */ n(async (r, o) => await F("storage/storeBlob", {
      requestId: t,
      version: f,
      blob: r,
      options: o
    }), "store"),
    get: /* @__PURE__ */ n(async (r) => await F("storage/getBlob", {
      requestId: t,
      version: f,
      storageId: r
    }), "get")
  };
}
n(Fe, "setupStorageActionWriter");

// node_modules/convex/dist/esm/server/impl/registration_impl.js
async function Oe(t, e) {
  let o = m(JSON.parse(e)), s = {
    db: Ce(),
    auth: J(""),
    storage: ae(""),
    scheduler: Ne(),
    runQuery: /* @__PURE__ */ n((l, h) => ue("query", l, h), "runQuery"),
    runMutation: /* @__PURE__ */ n((l, h) => ue("mutation", l, h), "runMutation")
  }, i = await ce(t, s, o);
  return Me(i), JSON.stringify(p(i === void 0 ? null : i));
}
n(Oe, "invokeMutation");
function Me(t) {
  if (t instanceof E || t instanceof S)
    throw new Error(
      "Return value is a Query. Results must be retrieved with `.collect()`, `.take(n), `.unique()`, or `.first()`."
    );
}
n(Me, "validateReturnValue");
async function ce(t, e, r) {
  let o;
  try {
    o = await Promise.resolve(t(e, ...r));
  } catch (s) {
    throw _t(s);
  }
  return o;
}
n(ce, "invokeFunction");
function I(t, e) {
  return (r, o) => (globalThis.console.warn(
    `Convex functions should not directly call other Convex functions. Consider calling a helper function instead. e.g. \`export const foo = ${t}(...); await foo(ctx);\` is not supported. See https://docs.convex.dev/production/best-practices/#use-helper-functions-to-write-shared-code`
  ), e(r, o));
}
n(I, "dontCallDirectly");
function _t(t) {
  if (typeof t == "object" && t !== null && Symbol.for("ConvexError") in t) {
    let e = t;
    return e.data = JSON.stringify(
      p(e.data === void 0 ? null : e.data)
    ), e.ConvexErrorSymbol = Symbol.for("ConvexError"), e;
  } else
    return t;
}
n(_t, "serializeConvexErrorData");
function P() {
  if (typeof window > "u" || window.__convexAllowFunctionsInBrowser)
    return;
  (Object.getOwnPropertyDescriptor(globalThis, "window")?.get?.toString().includes("[native code]") ?? !1) && console.error(
    "Convex functions should not be imported in the browser. This will throw an error in future versions of `convex`. If this is a false negative, please report it to Convex support."
  );
}
n(P, "assertNotBrowser");
function Je(t, e) {
  if (e === void 0)
    throw new Error(
      `A validator is undefined for field "${t}". This is often caused by circular imports. See https://docs.convex.dev/error#undefined-validator for details.`
    );
  return e;
}
n(Je, "strictReplacer");
function T(t) {
  return () => {
    let e = a.any();
    return typeof t == "object" && t.args !== void 0 && (e = V(t.args)), JSON.stringify(e.json, Je);
  };
}
n(T, "exportArgs");
function C(t) {
  return () => {
    let e;
    return typeof t == "object" && t.returns !== void 0 && (e = V(t.returns)), JSON.stringify(e ? e.json : null, Je);
  };
}
n(C, "exportReturns");
var At = /* @__PURE__ */ n(((t) => {
  let e = typeof t == "function" ? t : t.handler, r = I("mutation", e);
  return P(), r.isMutation = !0, r.isPublic = !0, r.invokeMutation = (o) => Oe(e, o), r.exportArgs = T(t), r.exportReturns = C(t), r._handler = e, r;
}), "mutationGeneric"), Et = /* @__PURE__ */ n(((t) => {
  let e = typeof t == "function" ? t : t.handler, r = I(
    "internalMutation",
    e
  );
  return P(), r.isMutation = !0, r.isInternal = !0, r.invokeMutation = (o) => Oe(e, o), r.exportArgs = T(t), r.exportReturns = C(t), r._handler = e, r;
}), "internalMutationGeneric");
async function Ue(t, e) {
  let o = m(JSON.parse(e)), s = {
    db: se(),
    auth: J(""),
    storage: ie(""),
    runQuery: /* @__PURE__ */ n((l, h) => ue("query", l, h), "runQuery")
  }, i = await ce(t, s, o);
  return Me(i), JSON.stringify(p(i === void 0 ? null : i));
}
n(Ue, "invokeQuery");
var It = /* @__PURE__ */ n(((t) => {
  let e = typeof t == "function" ? t : t.handler, r = I("query", e);
  return P(), r.isQuery = !0, r.isPublic = !0, r.invokeQuery = (o) => Ue(e, o), r.exportArgs = T(t), r.exportReturns = C(t), r._handler = e, r;
}), "queryGeneric"), Pt = /* @__PURE__ */ n(((t) => {
  let e = typeof t == "function" ? t : t.handler, r = I("internalQuery", e);
  return P(), r.isQuery = !0, r.isInternal = !0, r.invokeQuery = (o) => Ue(e, o), r.exportArgs = T(t), r.exportReturns = C(t), r._handler = e, r;
}), "internalQueryGeneric");
async function je(t, e, r) {
  let o = m(JSON.parse(r)), i = {
    ...we(e),
    auth: J(e),
    scheduler: $e(e),
    storage: Fe(e),
    vectorSearch: be(e)
  }, l = await ce(t, i, o);
  return JSON.stringify(p(l === void 0 ? null : l));
}
n(je, "invokeAction");
var Tt = /* @__PURE__ */ n(((t) => {
  let e = typeof t == "function" ? t : t.handler, r = I("action", e);
  return P(), r.isAction = !0, r.isPublic = !0, r.invokeAction = (o, s) => je(e, o, s), r.exportArgs = T(t), r.exportReturns = C(t), r._handler = e, r;
}), "actionGeneric"), Ct = /* @__PURE__ */ n(((t) => {
  let e = typeof t == "function" ? t : t.handler, r = I("internalAction", e);
  return P(), r.isAction = !0, r.isInternal = !0, r.invokeAction = (o, s) => je(e, o, s), r.exportArgs = T(t), r.exportReturns = C(t), r._handler = e, r;
}), "internalActionGeneric");
async function ue(t, e, r) {
  let o = v(r), s = {
    udfType: t,
    args: p(o),
    ...w(e)
  }, i = await c("1.0/runUdf", s);
  return m(i);
}
n(ue, "runUdf");

// node_modules/convex/dist/esm/server/pagination.js
var Mn = a.object({
  numItems: a.number(),
  cursor: a.union(a.string(), a.null()),
  endCursor: a.optional(a.union(a.string(), a.null())),
  id: a.optional(a.number()),
  maximumRowsRead: a.optional(a.number()),
  maximumBytesRead: a.optional(a.number())
});

// node_modules/convex/dist/esm/server/schema.js
var Nt = Object.defineProperty, $t = /* @__PURE__ */ n((t, e, r) => e in t ? Nt(t, e, { enumerable: !0, configurable: !0, writable: !0, value: r }) : t[e] = r, "__defNormalProp"), g = /* @__PURE__ */ n((t, e, r) => $t(t, typeof e != "symbol" ? e + "" : e, r), "__publicField"), z = class {
  static {
    n(this, "TableDefinition");
  }
  /**
   * @internal
   */
  constructor(e) {
    g(this, "indexes"), g(this, "stagedDbIndexes"), g(this, "searchIndexes"), g(this, "stagedSearchIndexes"), g(this, "vectorIndexes"), g(this, "stagedVectorIndexes"), g(this, "validator"), this.indexes = [], this.stagedDbIndexes = [], this.searchIndexes = [], this.stagedSearchIndexes = [], this.vectorIndexes = [], this.stagedVectorIndexes = [], this.validator = e;
  }
  /**
   * This API is experimental: it may change or disappear.
   *
   * Returns indexes defined on this table.
   * Intended for the advanced use cases of dynamically deciding which index to use for a query.
   * If you think you need this, please chime in on ths issue in the Convex JS GitHub repo.
   * https://github.com/get-convex/convex-js/issues/49
   */
  " indexes"() {
    return this.indexes;
  }
  index(e, r) {
    return Array.isArray(r) ? this.indexes.push({
      indexDescriptor: e,
      fields: r
    }) : r.staged ? this.stagedDbIndexes.push({
      indexDescriptor: e,
      fields: r.fields
    }) : this.indexes.push({
      indexDescriptor: e,
      fields: r.fields
    }), this;
  }
  searchIndex(e, r) {
    return r.staged ? this.stagedSearchIndexes.push({
      indexDescriptor: e,
      searchField: r.searchField,
      filterFields: r.filterFields || []
    }) : this.searchIndexes.push({
      indexDescriptor: e,
      searchField: r.searchField,
      filterFields: r.filterFields || []
    }), this;
  }
  vectorIndex(e, r) {
    return r.staged ? this.stagedVectorIndexes.push({
      indexDescriptor: e,
      vectorField: r.vectorField,
      dimensions: r.dimensions,
      filterFields: r.filterFields || []
    }) : this.vectorIndexes.push({
      indexDescriptor: e,
      vectorField: r.vectorField,
      dimensions: r.dimensions,
      filterFields: r.filterFields || []
    }), this;
  }
  /**
   * Work around for https://github.com/microsoft/TypeScript/issues/57035
   */
  self() {
    return this;
  }
  /**
   * Export the contents of this definition.
   *
   * This is called internally by the Convex framework.
   * @internal
   */
  export() {
    let e = this.validator.json;
    if (typeof e != "object")
      throw new Error(
        "Invalid validator: please make sure that the parameter of `defineTable` is valid (see https://docs.convex.dev/database/schemas)"
      );
    return {
      indexes: this.indexes,
      stagedDbIndexes: this.stagedDbIndexes,
      searchIndexes: this.searchIndexes,
      stagedSearchIndexes: this.stagedSearchIndexes,
      vectorIndexes: this.vectorIndexes,
      stagedVectorIndexes: this.stagedVectorIndexes,
      documentType: e
    };
  }
};
function le(t) {
  return fe(t) ? new z(t) : new z(a.object(t));
}
n(le, "defineTable");
var de = class {
  static {
    n(this, "SchemaDefinition");
  }
  /**
   * @internal
   */
  constructor(e, r) {
    g(this, "tables"), g(this, "strictTableNameTypes"), g(this, "schemaValidation"), this.tables = e, this.schemaValidation = r?.schemaValidation === void 0 ? !0 : r.schemaValidation;
  }
  /**
   * Export the contents of this definition.
   *
   * This is called internally by the Convex framework.
   * @internal
   */
  export() {
    return JSON.stringify({
      tables: Object.entries(this.tables).map(([e, r]) => {
        let {
          indexes: o,
          stagedDbIndexes: s,
          searchIndexes: i,
          stagedSearchIndexes: l,
          vectorIndexes: h,
          stagedVectorIndexes: b,
          documentType: N
        } = r.export();
        return {
          tableName: e,
          indexes: o,
          stagedDbIndexes: s,
          searchIndexes: i,
          stagedSearchIndexes: l,
          vectorIndexes: h,
          stagedVectorIndexes: b,
          documentType: N
        };
      }),
      schemaValidation: this.schemaValidation
    });
  }
};
function Qe(t, e) {
  return new de(t, e);
}
n(Qe, "defineSchema");
var zn = Qe({
  _scheduled_functions: le({
    name: a.string(),
    args: a.array(a.any()),
    scheduledTime: a.float64(),
    completedTime: a.optional(a.float64()),
    state: a.union(
      a.object({ kind: a.literal("pending") }),
      a.object({ kind: a.literal("inProgress") }),
      a.object({ kind: a.literal("success") }),
      a.object({ kind: a.literal("failed"), error: a.string() }),
      a.object({ kind: a.literal("canceled") })
    )
  }),
  _storage: le({
    sha256: a.string(),
    size: a.float64(),
    contentType: a.optional(a.string())
  })
});

export {
  At as a,
  Et as b,
  It as c,
  Pt as d,
  Tt as e,
  Ct as f,
  Be as g,
  Ye as h,
  et as i
};
//# sourceMappingURL=6EQFL5ZL.js.map
