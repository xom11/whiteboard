"use client";
'use strict';

var react = require('react');
var jsxRuntime = require('react/jsx-runtime');

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/stamps/graph-2d/serialize.ts
function stringifySerializedGraph(graph) {
  return JSON.stringify(graph);
}
function parseSerializedGraph(jsonState) {
  let raw;
  try {
    raw = JSON.parse(jsonState);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const r = raw;
  if (r.version !== 1) return null;
  if (!r.view || typeof r.view !== "object") return null;
  const v = r.view;
  if (typeof v.xMin !== "number" || typeof v.xMax !== "number" || typeof v.yMin !== "number" || typeof v.yMax !== "number" || typeof v.showAxis !== "boolean" || typeof v.showGrid !== "boolean") {
    return null;
  }
  for (const key of ["functions", "parameters", "points", "intersections", "tangents"]) {
    if (!Array.isArray(r[key])) return null;
  }
  return raw;
}
var EMPTY_GRAPH;
var init_serialize = __esm({
  "src/stamps/graph-2d/serialize.ts"() {
    EMPTY_GRAPH = {
      version: 1,
      view: { xMin: -10, xMax: 10, yMin: -10, yMax: 10, showAxis: true, showGrid: true },
      functions: [],
      parameters: [],
      points: [],
      intersections: [],
      tangents: []
    };
  }
});

// src/stamps/graph-2d/evaluator.ts
function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
      i++;
      continue;
    }
    if (ch >= "0" && ch <= "9" || ch === ".") {
      let j = i;
      let hasDot = false;
      let hasExp = false;
      while (j < src.length) {
        const c = src[j];
        if (c >= "0" && c <= "9") {
          j++;
        } else if (c === "." && !hasDot && !hasExp) {
          hasDot = true;
          j++;
        } else if ((c === "e" || c === "E") && !hasExp) {
          hasExp = true;
          j++;
          if (src[j] === "+" || src[j] === "-") j++;
        } else {
          break;
        }
      }
      const raw = src.slice(i, j);
      if (!/[0-9]/.test(raw)) {
        throw new Error(`S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7 t\u1EA1i v\u1ECB tr\xED ${i}: "${raw}"`);
      }
      tokens.push({ type: "NUMBER", value: raw, pos: i });
      i = j;
      continue;
    }
    if (ch >= "a" && ch <= "z" || ch >= "A" && ch <= "Z") {
      let j = i;
      while (j < src.length) {
        const c = src[j];
        if (c >= "a" && c <= "z" || c >= "A" && c <= "Z" || c >= "0" && c <= "9" || c === "_") {
          j++;
        } else {
          break;
        }
      }
      tokens.push({ type: "IDENT", value: src.slice(i, j), pos: i });
      i = j;
      continue;
    }
    if (OPERATORS.has(ch)) {
      tokens.push({ type: "OP", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "LPAREN", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "RPAREN", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "COMMA", value: ch, pos: i });
      i++;
      continue;
    }
    throw new Error(`K\xFD t\u1EF1 kh\xF4ng h\u1EE3p l\u1EC7 t\u1EA1i v\u1ECB tr\xED ${i}: "${ch}"`);
  }
  return tokens;
}
function parseAst(src) {
  const tokens = tokenize(src);
  if (tokens.length === 0) throw new Error("Bi\u1EC3u th\u1EE9c r\u1ED7ng");
  const p = new Parser(tokens);
  return p.parseExpression();
}
function evaluate(node, env) {
  switch (node.kind) {
    case "num":
      return node.value;
    case "ident": {
      const name = node.name;
      if (name === "x") return env.x;
      if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) {
        return ALLOWED_CONSTANTS[name];
      }
      if (name.length === 1 && Object.prototype.hasOwnProperty.call(env.params, name)) {
        return env.params[name];
      }
      throw new Error(`Identifier kh\xF4ng h\u1EE3p l\u1EC7: "${name}"`);
    }
    case "unary": {
      const v = evaluate(node.arg, env);
      return node.op === "-" ? -v : +v;
    }
    case "binary": {
      const a = evaluate(node.lhs, env);
      const b = evaluate(node.rhs, env);
      switch (node.op) {
        case "+":
          return a + b;
        case "-":
          return a - b;
        case "*":
          return a * b;
        case "/":
          return a / b;
        // có thể trả Infinity/NaN — đúng theo IEEE 754
        case "^":
          return Math.pow(a, b);
      }
      throw new Error(`To\xE1n t\u1EED kh\xF4ng h\u1ED7 tr\u1EE3: "${node.op}"`);
    }
    case "call": {
      const fn = ALLOWED_FUNCTIONS[node.name];
      if (typeof fn !== "function") {
        throw new Error(`H\xE0m kh\xF4ng h\u1EE3p l\u1EC7: "${node.name}"`);
      }
      const args = node.args.map((a) => evaluate(a, env));
      return fn(...args);
    }
  }
}
function collectFreeVars(node, out = /* @__PURE__ */ new Set()) {
  switch (node.kind) {
    case "num":
      return out;
    case "ident": {
      const name = node.name;
      if (name === "x") return out;
      if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) return out;
      if (name.length === 1) out.add(name);
      return out;
    }
    case "unary":
      return collectFreeVars(node.arg, out);
    case "binary":
      collectFreeVars(node.lhs, out);
      collectFreeVars(node.rhs, out);
      return out;
    case "call":
      for (const a of node.args) collectFreeVars(a, out);
      return out;
  }
}
function checkIdentifiers(node) {
  switch (node.kind) {
    case "num":
      return null;
    case "ident": {
      const name = node.name;
      if (name === "x") return null;
      if (Object.prototype.hasOwnProperty.call(ALLOWED_CONSTANTS, name)) return null;
      if (name.length === 1) return null;
      return `T\xEAn kh\xF4ng h\u1EE3p l\u1EC7: "${name}"`;
    }
    case "unary":
      return checkIdentifiers(node.arg);
    case "binary":
      return checkIdentifiers(node.lhs) ?? checkIdentifiers(node.rhs);
    case "call": {
      if (!Object.prototype.hasOwnProperty.call(ALLOWED_FUNCTIONS, node.name)) {
        return `T\xEAn h\xE0m kh\xF4ng h\u1EE3p l\u1EC7: "${node.name}"`;
      }
      for (const a of node.args) {
        const e = checkIdentifiers(a);
        if (e) return e;
      }
      return null;
    }
  }
}
var ALLOWED_FUNCTIONS, ALLOWED_CONSTANTS, OPERATORS, Parser, ALLOWED_FUNCTION_NAMES;
var init_evaluator = __esm({
  "src/stamps/graph-2d/evaluator.ts"() {
    ALLOWED_FUNCTIONS = {
      sin: Math.sin,
      cos: Math.cos,
      tan: Math.tan,
      asin: Math.asin,
      acos: Math.acos,
      atan: Math.atan,
      log: Math.log10,
      // log = log10 (khớp với rewriteToJs)
      ln: Math.log,
      // ln = log tự nhiên
      exp: Math.exp,
      sqrt: Math.sqrt,
      abs: Math.abs,
      floor: Math.floor,
      ceil: Math.ceil,
      round: Math.round
    };
    ALLOWED_CONSTANTS = {
      pi: Math.PI,
      e: Math.E
    };
    OPERATORS = /* @__PURE__ */ new Set(["+", "-", "*", "/", "^"]);
    Parser = class {
      constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
      }
      peek() {
        return this.tokens[this.pos];
      }
      consume() {
        const t = this.tokens[this.pos++];
        if (!t) throw new Error("C\xFA ph\xE1p: h\u1EBFt token s\u1EDBm");
        return t;
      }
      parseExpression() {
        const node = this.parseAddSub();
        if (this.pos < this.tokens.length) {
          const t = this.tokens[this.pos];
          throw new Error(`C\xFA ph\xE1p: token th\u1EEBa "${t.value}" t\u1EA1i v\u1ECB tr\xED ${t.pos}`);
        }
        return node;
      }
      // + - (left assoc)
      parseAddSub() {
        let lhs = this.parseMulDiv();
        while (true) {
          const t = this.peek();
          if (t && t.type === "OP" && (t.value === "+" || t.value === "-")) {
            this.consume();
            const rhs = this.parseMulDiv();
            lhs = { kind: "binary", op: t.value, lhs, rhs };
          } else {
            break;
          }
        }
        return lhs;
      }
      // * / (left assoc)
      parseMulDiv() {
        let lhs = this.parseUnary();
        while (true) {
          const t = this.peek();
          if (t && t.type === "OP" && (t.value === "*" || t.value === "/")) {
            this.consume();
            const rhs = this.parseUnary();
            lhs = { kind: "binary", op: t.value, lhs, rhs };
          } else {
            break;
          }
        }
        return lhs;
      }
      // unary + - (right assoc) sau đó parsePow
      parseUnary() {
        const t = this.peek();
        if (t && t.type === "OP" && (t.value === "+" || t.value === "-")) {
          this.consume();
          const arg = this.parseUnary();
          return { kind: "unary", op: t.value, arg };
        }
        return this.parsePow();
      }
      // ^ (right assoc)
      parsePow() {
        const lhs = this.parsePrimary();
        const t = this.peek();
        if (t && t.type === "OP" && t.value === "^") {
          this.consume();
          const rhs = this.parseUnary();
          return { kind: "binary", op: "^", lhs, rhs };
        }
        return lhs;
      }
      parsePrimary() {
        const t = this.peek();
        if (!t) throw new Error("C\xFA ph\xE1p: thi\u1EBFu bi\u1EC3u th\u1EE9c");
        if (t.type === "NUMBER") {
          this.consume();
          const v = Number(t.value);
          return { kind: "num", value: v };
        }
        if (t.type === "IDENT") {
          this.consume();
          const next = this.peek();
          if (next && next.type === "LPAREN") {
            this.consume();
            const args = [];
            const lookahead = this.peek();
            if (!lookahead || lookahead.type !== "RPAREN") {
              args.push(this.parseAddSub());
              while (true) {
                const nx = this.peek();
                if (nx && nx.type === "COMMA") {
                  this.consume();
                  args.push(this.parseAddSub());
                } else {
                  break;
                }
              }
            }
            const close = this.peek();
            if (!close || close.type !== "RPAREN") {
              throw new Error(`C\xFA ph\xE1p: thi\u1EBFu ")" sau h\xE0m "${t.value}"`);
            }
            this.consume();
            return { kind: "call", name: t.value, args };
          }
          return { kind: "ident", name: t.value };
        }
        if (t.type === "LPAREN") {
          this.consume();
          const inner = this.parseAddSub();
          const close = this.peek();
          if (!close || close.type !== "RPAREN") {
            throw new Error('C\xFA ph\xE1p: thi\u1EBFu ")"');
          }
          this.consume();
          return inner;
        }
        throw new Error(`C\xFA ph\xE1p: token b\u1EA5t ng\u1EDD "${t.value}" t\u1EA1i v\u1ECB tr\xED ${t.pos}`);
      }
    };
    ALLOWED_FUNCTION_NAMES = new Set(Object.keys(ALLOWED_FUNCTIONS));
    new Set(Object.keys(ALLOWED_CONSTANTS));
  }
});

// src/stamps/graph-2d/parser.ts
function errResult(message) {
  return { ok: false, error: message, freeVars: /* @__PURE__ */ new Set() };
}
function validate(expr) {
  const trimmed = expr.trim();
  if (!trimmed) return errResult("Bi\u1EC3u th\u1EE9c r\u1ED7ng");
  if (!ALLOWED_CHARS.test(trimmed)) return errResult("K\xFD t\u1EF1 kh\xF4ng h\u1EE3p l\u1EC7");
  let tokens;
  try {
    tokens = tokenize(trimmed);
  } catch {
    return errResult("L\u1ED7i c\xFA ph\xE1p");
  }
  const earlyFree = /* @__PURE__ */ new Set();
  for (const tok of tokens) {
    if (tok.type !== "IDENT") continue;
    const id = tok.value;
    if (id === "x" || id === "pi" || id === "e") continue;
    if (ALLOWED_FUNCTIONS2.has(id)) continue;
    if (id.length === 1) {
      earlyFree.add(id);
      continue;
    }
    const hint = SUGGESTIONS[id];
    return errResult(
      hint ? `T\xEAn h\xE0m kh\xF4ng h\u1EE3p l\u1EC7: "${id}". B\u1EA1n c\xF3 \xFD l\xE0 "${hint}" kh\xF4ng?` : `T\xEAn kh\xF4ng h\u1EE3p l\u1EC7: "${id}"`
    );
  }
  let ast;
  try {
    ast = parseAst(trimmed);
  } catch {
    return errResult("L\u1ED7i c\xFA ph\xE1p");
  }
  const idErr = checkIdentifiers(ast);
  if (idErr) return errResult(idErr);
  const freeVars = collectFreeVars(ast);
  for (const v of earlyFree) freeVars.add(v);
  return { ok: true, freeVars };
}
function compile(expr, paramValues) {
  const v = validate(expr);
  if (!v.ok) return { error: v.error ?? "Invalid" };
  let ast;
  try {
    ast = parseAst(expr.trim());
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  return (x) => {
    try {
      const y = evaluate(ast, { x, params: paramValues });
      return typeof y === "number" ? y : NaN;
    } catch {
      return NaN;
    }
  };
}
var ALLOWED_FUNCTIONS2, ALLOWED_CHARS, SUGGESTIONS;
var init_parser = __esm({
  "src/stamps/graph-2d/parser.ts"() {
    init_evaluator();
    ALLOWED_FUNCTIONS2 = ALLOWED_FUNCTION_NAMES;
    ALLOWED_CHARS = /^[a-zA-Z0-9_.+\-*/^()\s,]+$/;
    SUGGESTIONS = {
      tg: "tan",
      arcsin: "asin",
      arccos: "acos",
      arctan: "atan"
    };
  }
});

// src/stamps/graph-2d/editor/handlers.ts
function addPointOnCurve(graph, ctx, idFactory) {
  if (!ctx.functionId) return graph;
  const point = {
    id: idFactory(),
    functionId: ctx.functionId,
    x: ctx.x
  };
  return { ...graph, points: [...graph.points, point] };
}
function addIntersection(graph, functionIdA, functionIdB, idFactory) {
  if (functionIdA === functionIdB) return graph;
  const exists = graph.intersections.some(
    (i) => i.functionIdA === functionIdA && i.functionIdB === functionIdB || i.functionIdA === functionIdB && i.functionIdB === functionIdA
  );
  if (exists) return graph;
  const intersection = {
    id: idFactory(),
    functionIdA,
    functionIdB
  };
  return { ...graph, intersections: [...graph.intersections, intersection] };
}
function numericalDerivative(expression, paramValues, x, h = 1e-4) {
  const fn = compile(expression, paramValues);
  if (typeof fn !== "function") return NaN;
  const y1 = fn(x - h);
  const y2 = fn(x + h);
  return (y2 - y1) / (2 * h);
}
var init_handlers = __esm({
  "src/stamps/graph-2d/editor/handlers.ts"() {
    init_parser();
  }
});

// src/stamps/graph-2d/renderObjects.ts
function renderGraphObjects(board, graph) {
  const paramMap = {};
  for (const p of graph.parameters) paramMap[p.name] = p.value;
  for (const f of graph.functions) {
    if (!f.visible) continue;
    const compiled = compile(f.expression, paramMap);
    if (typeof compiled !== "function") continue;
    const domain = f.domain ?? { min: graph.view.xMin, max: graph.view.xMax };
    board.create("functiongraph", [compiled, domain.min, domain.max], {
      strokeColor: f.color,
      strokeWidth: 2,
      name: f.name,
      withLabel: false,
      highlight: false
    });
  }
  for (const point of graph.points) {
    const fn = graph.functions.find((f) => f.id === point.functionId);
    if (!fn || !fn.visible) continue;
    const compiled = compile(fn.expression, paramMap);
    if (typeof compiled !== "function") continue;
    const y = compiled(point.x);
    board.create("point", [point.x, y], {
      name: point.label ?? "",
      size: 3,
      fillColor: fn.color,
      strokeColor: fn.color,
      withLabel: !!point.label
    });
  }
  for (const inter of graph.intersections) {
    const fa = graph.functions.find((f) => f.id === inter.functionIdA);
    const fb = graph.functions.find((f) => f.id === inter.functionIdB);
    if (!fa || !fb || !fa.visible || !fb.visible) continue;
    const cfa = compile(fa.expression, paramMap);
    const cfb = compile(fb.expression, paramMap);
    if (typeof cfa !== "function" || typeof cfb !== "function") continue;
    const roots = scanRoots((x) => cfa(x) - cfb(x), graph.view.xMin, graph.view.xMax);
    for (const x of roots) {
      board.create("point", [x, cfa(x)], {
        size: 3,
        fillColor: "#000",
        strokeColor: "#000"
      });
    }
  }
  for (const tan of graph.tangents) {
    const pt = graph.points.find((p) => p.id === tan.pointId);
    if (!pt) continue;
    const fn = graph.functions.find((f) => f.id === pt.functionId);
    if (!fn || !fn.visible) continue;
    const slope = numericalDerivative(fn.expression, paramMap, pt.x);
    const cfn = compile(fn.expression, paramMap);
    if (typeof cfn !== "function" || !Number.isFinite(slope)) continue;
    const y0 = cfn(pt.x);
    const x1 = graph.view.xMin;
    const x2 = graph.view.xMax;
    board.create(
      "line",
      [
        [x1, slope * (x1 - pt.x) + y0],
        [x2, slope * (x2 - pt.x) + y0]
      ],
      {
        strokeColor: fn.color,
        strokeWidth: 1,
        dash: 2,
        straightFirst: false,
        straightLast: false
      }
    );
  }
}
function scanRoots(fn, xMin, xMax, samples = 200) {
  const roots = [];
  const step = (xMax - xMin) / samples;
  let prevX = xMin;
  let prevY = fn(prevX);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * step;
    const y = fn(x);
    if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
      let a = prevX;
      let b = x;
      let ya = prevY;
      for (let j = 0; j < 30; j++) {
        const m = (a + b) / 2;
        const ym = fn(m);
        if (Math.abs(ym) < 1e-6) {
          a = b = m;
          break;
        }
        if (ya * ym < 0) {
          b = m;
        } else {
          a = m;
          ya = ym;
        }
      }
      roots.push((a + b) / 2);
    }
    prevX = x;
    prevY = y;
  }
  return roots;
}
var init_renderObjects = __esm({
  "src/stamps/graph-2d/renderObjects.ts"() {
    init_parser();
    init_handlers();
  }
});

// src/stamps/graph-2d/render.ts
async function renderGraph2dSvgFromState(jsonState) {
  const parsed = parseSerializedGraph(jsonState);
  if (!parsed) throw new Error("renderGraph2dSvgFromState: jsonState corrupt");
  const JXG = (await import('jsxgraph')).default;
  const opts = JXG.Options;
  if (opts) {
    opts.text = opts.text || {};
    opts.text.display = "internal";
    opts.text.useASCIIMathML = false;
    opts.text.useMathJax = false;
    opts.text.useKatex = false;
    opts.label = opts.label || {};
    opts.label.display = "internal";
  }
  const container = document.createElement("div");
  container.id = `jxg_graph2d_off_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  container.style.cssText = "position:absolute;top:-99999px;left:-99999px;width:600px;height:400px;visibility:hidden;pointer-events:none;";
  document.body.appendChild(container);
  let board = null;
  try {
    board = JXG.JSXGraph.initBoard(container.id, {
      boundingbox: [parsed.view.xMin, parsed.view.yMax, parsed.view.xMax, parsed.view.yMin],
      axis: parsed.view.showAxis,
      grid: parsed.view.showGrid,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: false
    });
    renderGraphObjects(board, parsed);
    board.update();
    const svgEl = container.querySelector("svg");
    if (!svgEl) throw new Error("renderGraph2dSvgFromState: no svg generated");
    return svgEl.outerHTML;
  } finally {
    try {
      if (board) JXG.JSXGraph.freeBoard(board);
    } catch {
    }
    if (container.parentNode) container.parentNode.removeChild(container);
  }
}
var init_render = __esm({
  "src/stamps/graph-2d/render.ts"() {
    init_serialize();
    init_renderObjects();
  }
});

// src/stamps/graph-2d/types.ts
function isGraph2DCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "graph2d" && d.version === 1 && typeof d.jsonState === "string";
}
var init_types = __esm({
  "src/stamps/graph-2d/types.ts"() {
  }
});

// src/stamps/graph-2d/editor/tools.ts
var GRAPH_TOOLS;
var init_tools = __esm({
  "src/stamps/graph-2d/editor/tools.ts"() {
    GRAPH_TOOLS = [
      { id: "move", label: "Di chuy\u1EC3n", title: "Di chuy\u1EC3n / ch\u1ECDn" },
      { id: "point-on-curve", label: "\u0110i\u1EC3m tr\xEAn curve", title: "T\u1EA1o \u0111i\u1EC3m c\u1ED1 \u0111\u1ECBnh tr\xEAn \u0111\u1ED3 th\u1ECB" },
      { id: "intersect", label: "Giao \u0111i\u1EC3m", title: "\u0110\xE1nh d\u1EA5u giao \u0111i\u1EC3m 2 \u0111\u1ED3 th\u1ECB" },
      { id: "tangent", label: "Ti\u1EBFp tuy\u1EBFn", title: "V\u1EBD ti\u1EBFp tuy\u1EBFn t\u1EA1i \u0111i\u1EC3m tr\xEAn \u0111\u1ED3 th\u1ECB" }
    ];
  }
});
function FunctionRow(props) {
  const { id, name, expression, color, visible, error } = props;
  const [draft, setDraft] = react.useState(expression);
  react.useEffect(() => {
    setDraft(expression);
  }, [expression]);
  const commit = () => {
    if (draft !== expression) props.onExpressionCommit(draft);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
      e.target.blur();
    } else if (e.key === "Escape") {
      setDraft(expression);
      e.target.blur();
    }
  };
  const handleBlur = (_) => commit();
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `graph-function-row${error ? " is-error" : ""}`, "data-testid": `graph-function-row-${id}`, children: [
    /* @__PURE__ */ jsxRuntime.jsx(
      "span",
      {
        className: "graph-function-color",
        style: { backgroundColor: color },
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "graph-function-name", "data-testid": `graph-function-name-${id}`, children: [
      name,
      "(x) ="
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "input",
      {
        "aria-label": "Bi\u1EC3u th\u1EE9c",
        className: "graph-function-input",
        type: "text",
        value: draft,
        onChange: (e) => setDraft(e.target.value),
        onKeyDown: handleKeyDown,
        onBlur: handleBlur,
        spellCheck: false,
        autoCorrect: "off",
        autoCapitalize: "off"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        type: "button",
        "aria-label": "\u1EA8n/hi\u1EC7n \u0111\u1ED3 th\u1ECB",
        className: `graph-function-eye${visible ? "" : " is-hidden"}`,
        onClick: props.onToggleVisible,
        children: visible ? "\u{1F441}" : "\u2298"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsx(
      "button",
      {
        type: "button",
        "aria-label": "Xo\xE1 \u0111\u1ED3 th\u1ECB",
        className: "graph-function-remove",
        onClick: props.onRemove,
        children: "\u2715"
      }
    ),
    error ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "graph-function-error", children: error }) : null
  ] });
}
var init_FunctionRow = __esm({
  "src/stamps/graph-2d/editor/FunctionRow.tsx"() {
    "use client";
  }
});
function SliderRow(props) {
  const { name, value, min, max, step } = props;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-slider-row", "data-testid": `graph-slider-row-${name}`, children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-slider-header", children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { className: "graph-slider-name", children: name }),
      /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "graph-slider-value", children: [
        "= ",
        value.toFixed(2)
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          "aria-label": `Xo\xE1 tham s\u1ED1 ${name}`,
          className: "graph-slider-remove",
          onClick: props.onRemove,
          children: "\u2715"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntime.jsx(
      "input",
      {
        type: "range",
        "aria-label": `Slider ${name}`,
        min,
        max,
        step,
        value,
        onChange: (e) => props.onChange(parseFloat(e.target.value)),
        className: "graph-slider-input"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-slider-range", children: [
      /* @__PURE__ */ jsxRuntime.jsx("span", { children: min }),
      /* @__PURE__ */ jsxRuntime.jsx("span", { children: max })
    ] })
  ] });
}
var init_SliderRow = __esm({
  "src/stamps/graph-2d/editor/SliderRow.tsx"() {
    "use client";
  }
});

// src/stamps/graph-2d/colors.ts
function nextColor(usedColors) {
  for (const c of GRAPH_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return GRAPH_PALETTE[usedColors.length % GRAPH_PALETTE.length];
}
function nextFunctionName(usedNames) {
  for (const n of FUNCTION_NAMES) {
    if (!usedNames.includes(n)) return n;
  }
  return FUNCTION_NAMES[usedNames.length % FUNCTION_NAMES.length];
}
var GRAPH_PALETTE, FUNCTION_NAMES, MAX_FUNCTIONS, MAX_PARAMETERS;
var init_colors = __esm({
  "src/stamps/graph-2d/colors.ts"() {
    GRAPH_PALETTE = [
      "#2563eb",
      // blue
      "#dc2626",
      // red
      "#16a34a",
      // green
      "#9333ea",
      // purple
      "#ea580c",
      // orange
      "#0891b2",
      // cyan
      "#db2777",
      // pink
      "#65a30d"
      // lime
    ];
    FUNCTION_NAMES = ["f", "g", "h", "i", "j", "k", "l", "m"];
    MAX_FUNCTIONS = 8;
    MAX_PARAMETERS = 8;
  }
});
function AlgebraView(props) {
  const { graph, errors } = props;
  const atMax = graph.functions.length >= MAX_FUNCTIONS;
  return /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-algebra-view", children: [
    /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "graph-algebra-section", children: [
      graph.functions.map((f) => /* @__PURE__ */ jsxRuntime.jsx(
        FunctionRow,
        {
          id: f.id,
          name: f.name,
          expression: f.expression,
          color: f.color,
          visible: f.visible,
          error: errors[f.id] ?? null,
          onExpressionCommit: (expr) => props.onCommitFunctionExpr(f.id, expr),
          onToggleVisible: () => props.onToggleFunctionVisible(f.id),
          onRemove: () => props.onRemoveFunction(f.id)
        },
        f.id
      )),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          "aria-label": "Th\xEAm h\xE0m s\u1ED1",
          className: "graph-algebra-add",
          onClick: props.onAddFunctionDraft,
          disabled: atMax,
          children: "+ Th\xEAm h\xE0m"
        }
      )
    ] }),
    graph.parameters.length > 0 ? /* @__PURE__ */ jsxRuntime.jsx("div", { className: "graph-algebra-section graph-algebra-parameters", children: graph.parameters.map((p) => /* @__PURE__ */ jsxRuntime.jsx(
      SliderRow,
      {
        name: p.name,
        value: p.value,
        min: p.min,
        max: p.max,
        step: p.step,
        onChange: (v) => props.onParameterChange(p.name, v),
        onRangeChange: (min, max, step) => props.onParameterRangeChange(p.name, min, max, step),
        onRemove: () => props.onRemoveParameter(p.name)
      },
      p.name
    )) }) : null
  ] });
}
var init_AlgebraView = __esm({
  "src/stamps/graph-2d/editor/AlgebraView.tsx"() {
    "use client";
    init_FunctionRow();
    init_SliderRow();
    init_colors();
  }
});
function CloseIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
  ] });
}
function UndoIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 10 L8 5 L8 8 L15 8 A5 5 0 0 1 20 13 L20 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 10 L8 15 L8 12" })
  ] });
}
function RedoIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M21 10 L16 5 L16 8 L9 8 A5 5 0 0 0 4 13 L4 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M21 10 L16 15 L16 12" })
  ] });
}
function ResetViewIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "12", r: "9" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "12", y1: "3", x2: "12", y2: "21" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "3", y1: "12", x2: "21", y2: "12" })
  ] });
}
function MoveIcon() {
  return /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 4 L9 4 L9 9 L4 9 Z" }) });
}
function PointOnCurveIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 17 C7 8, 14 8, 21 14" }),
    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "11", r: "2.2", fill: "currentColor", stroke: "none" })
  ] });
}
function IntersectIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 17 C8 5, 14 5, 21 17" }),
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 5 C8 17, 14 17, 21 5" }),
    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "11", r: "1.6", fill: "currentColor", stroke: "none" })
  ] });
}
function TangentIcon() {
  return /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", children: [
    /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 17 C8 7, 14 7, 21 16" }),
    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "14", x2: "20", y2: "6" }),
    /* @__PURE__ */ jsxRuntime.jsx("circle", { cx: "12", cy: "10", r: "1.8", fill: "currentColor", stroke: "none" })
  ] });
}
function Section({ label, children }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("section", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
function PanelBody(props) {
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    /* @__PURE__ */ jsxRuntime.jsx(Section, { label: "B\u1ED1 c\u1EE5c", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center gap-2 flex-wrap text-[11px] text-slate-700", children: [
      /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "input",
          {
            type: "checkbox",
            checked: props.showAxis,
            onChange: (e) => props.onShowAxisChange(e.target.checked),
            "data-testid": "toggle-axis"
          }
        ),
        "Tr\u1EE5c"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsxs("label", { className: "inline-flex select-none items-center gap-1.5", children: [
        /* @__PURE__ */ jsxRuntime.jsx(
          "input",
          {
            type: "checkbox",
            checked: props.showGrid,
            onChange: (e) => props.onShowGridChange(e.target.checked),
            "data-testid": "toggle-grid"
          }
        ),
        "L\u01B0\u1EDBi"
      ] }),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          onClick: props.onResetView,
          title: "\u0110\u1EB7t l\u1EA1i t\u1EA7m nh\xECn",
          "aria-label": "\u0110\u1EB7t l\u1EA1i t\u1EA7m nh\xECn",
          className: "ml-auto inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900",
          children: /* @__PURE__ */ jsxRuntime.jsx(ResetViewIcon, {})
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          onClick: props.onUndo,
          disabled: !props.canUndo,
          title: "Ho\xE0n t\xE1c (Ctrl/Cmd+Z)",
          "aria-label": "Ho\xE0n t\xE1c",
          "data-testid": "undo-btn",
          className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
          children: /* @__PURE__ */ jsxRuntime.jsx(UndoIcon, {})
        }
      ),
      /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          onClick: props.onRedo,
          disabled: !props.canRedo,
          title: "L\xE0m l\u1EA1i (Ctrl/Cmd+Shift+Z)",
          "aria-label": "L\xE0m l\u1EA1i",
          "data-testid": "redo-btn",
          className: "inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
          children: /* @__PURE__ */ jsxRuntime.jsx(RedoIcon, {})
        }
      )
    ] }) }),
    /* @__PURE__ */ jsxRuntime.jsx(Section, { label: "C\xF4ng c\u1EE5", children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "grid grid-cols-4 gap-1", children: GRAPH_TOOLS.map((t) => {
      const isActive = props.activeTool === t.id;
      return /* @__PURE__ */ jsxRuntime.jsx(
        "button",
        {
          type: "button",
          "aria-label": t.title,
          title: t.title,
          "aria-pressed": isActive,
          onClick: () => props.onToolChange(t.id),
          "data-testid": `graph-tool-${t.id}`,
          className: [
            "flex h-8 items-center justify-center rounded-md transition",
            isActive ? "bg-orange-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          ].join(" "),
          children: TOOL_ICONS[t.id]
        },
        t.id
      );
    }) }) }),
    /* @__PURE__ */ jsxRuntime.jsx(Section, { label: "H\xE0m s\u1ED1", children: /* @__PURE__ */ jsxRuntime.jsx(
      AlgebraView,
      {
        graph: props.graph,
        errors: props.errors,
        onAddFunctionDraft: props.onAddFunctionDraft,
        onCommitFunctionExpr: props.onCommitFunctionExpr,
        onToggleFunctionVisible: props.onToggleFunctionVisible,
        onRemoveFunction: props.onRemoveFunction,
        onParameterChange: props.onParameterChange,
        onParameterRangeChange: props.onParameterRangeChange,
        onRemoveParameter: props.onRemoveParameter
      }
    ) })
  ] });
}
function GraphLeftPanel(props) {
  const { isMobile, drawerOpen, isDark, onClose, onDrawerClose } = props;
  if (isMobile && !drawerOpen) return null;
  const handleClose = isMobile ? onDrawerClose : onClose;
  return /* @__PURE__ */ jsxRuntime.jsxs(
    "aside",
    {
      role: "complementary",
      "aria-label": "\u0110\u1ED3 th\u1ECB 2D",
      "data-testid": "graph-left-panel",
      "data-stamp-area": "true",
      className: [
        isDark ? "theme--dark " : "",
        isMobile ? "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl animate-in slide-in-from-left duration-200" : "absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200"
      ].join(" "),
      children: [
        /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
            /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-base leading-none", children: GraphIconHeader }),
            "\u0110\u1ED3 th\u1ECB 2D"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx(
            "button",
            {
              onClick: handleClose,
              "aria-label": "\u0110\xF3ng",
              className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
              children: /* @__PURE__ */ jsxRuntime.jsx(CloseIcon, {})
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children: /* @__PURE__ */ jsxRuntime.jsx(PanelBody, { ...props }) })
      ]
    }
  );
}
var GraphIconHeader, TOOL_ICONS;
var init_LeftPanel = __esm({
  "src/stamps/graph-2d/editor/LeftPanel.tsx"() {
    "use client";
    init_tools();
    init_AlgebraView();
    GraphIconHeader = /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 V3" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 H21" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M5 19 C8 5, 14 5, 19 17" })
    ] });
    TOOL_ICONS = {
      move: /* @__PURE__ */ jsxRuntime.jsx(MoveIcon, {}),
      "point-on-curve": /* @__PURE__ */ jsxRuntime.jsx(PointOnCurveIcon, {}),
      intersect: /* @__PURE__ */ jsxRuntime.jsx(IntersectIcon, {}),
      tangent: /* @__PURE__ */ jsxRuntime.jsx(TangentIcon, {})
    };
  }
});
var init_theme = __esm({
  "src/stamps/graph-2d/editor/theme.ts"() {
  }
});
function MiniBoard({ graph, activeTool, isDark, onBoardEvent }) {
  const containerRef = react.useRef(null);
  const boardRef = react.useRef(null);
  const curvesRef = react.useRef(/* @__PURE__ */ new Map());
  react.useEffect(() => {
    let cancelled = false;
    let createdBoard = null;
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const containerId = `jxg_graph2d_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    containerEl.id = containerId;
    (async () => {
      const JXG = (await import('jsxgraph')).default;
      if (cancelled) return;
      const opts = JXG.Options;
      if (opts) {
        opts.text = opts.text || {};
        opts.text.display = "internal";
        opts.label = opts.label || {};
        opts.label.display = "internal";
      }
      const board = JXG.JSXGraph.initBoard(containerId, {
        boundingbox: [graph.view.xMin, graph.view.yMax, graph.view.xMax, graph.view.yMin],
        axis: graph.view.showAxis,
        grid: graph.view.showGrid,
        showCopyright: false,
        showNavigation: true,
        pan: { enabled: true, needShift: false },
        zoom: { wheel: true, needShift: false },
        keepAspectRatio: false
      });
      boardRef.current = board;
      createdBoard = board;
      syncObjects(board, graph, curvesRef.current);
      board.on("boundingbox", () => {
        const bb = board.getBoundingBox();
        onBoardEvent({
          type: "view-change",
          view: {
            xMin: bb[0],
            xMax: bb[2],
            yMax: bb[1],
            yMin: bb[3],
            showAxis: graph.view.showAxis,
            showGrid: graph.view.showGrid
          }
        });
      });
      board.on("down", (ev) => {
        const usrCoords = board.getUsrCoordsOfMouse?.(ev);
        const x = usrCoords?.[0] ?? 0;
        const y = usrCoords?.[1] ?? 0;
        let functionId;
        for (const [id, ref] of curvesRef.current) {
          const obj = ref.obj;
          if (obj?.hasPoint && obj.hasPoint(ev.clientX ?? 0, ev.clientY ?? 0)) {
            functionId = id;
            break;
          }
        }
        if (functionId) onBoardEvent({ type: "click-curve", functionId, x, y });
        else onBoardEvent({ type: "click-empty", x, y });
      });
    })().catch((err) => console.error("MiniBoard init failed:", err));
    return () => {
      cancelled = true;
      try {
        if (createdBoard) __require("jsxgraph").default.JSXGraph.freeBoard(createdBoard);
      } catch {
      }
      boardRef.current = null;
      curvesRef.current.clear();
    };
  }, []);
  react.useEffect(() => {
    if (!boardRef.current) return;
    syncObjects(boardRef.current, graph, curvesRef.current);
  }, [graph]);
  react.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.cursor = activeTool === "move" ? "" : "crosshair";
  }, [activeTool]);
  return /* @__PURE__ */ jsxRuntime.jsx(
    "div",
    {
      ref: containerRef,
      className: "graph-miniboard",
      style: { width: "100%", height: "100%", minHeight: "300px" },
      "data-testid": "graph-miniboard"
    }
  );
}
function paramSig(graph) {
  return graph.parameters.map((p) => `${p.name}=${p.value}`).join(",");
}
function syncObjects(board, graph, curves) {
  const sig = paramSig(graph);
  const paramMap = {};
  for (const p of graph.parameters) paramMap[p.name] = p.value;
  const wantedIds = new Set(graph.functions.map((f) => f.id));
  for (const [id, ref] of curves) {
    if (!wantedIds.has(id)) {
      try {
        board.removeObject(ref.obj);
      } catch {
      }
      curves.delete(id);
    }
  }
  for (const f of graph.functions) {
    const existing = curves.get(f.id);
    const needsRecreate = !existing || existing.expression !== f.expression || existing.color !== f.color || existing.visible !== f.visible || existing.paramSignature !== sig;
    if (!needsRecreate) continue;
    if (existing) {
      try {
        board.removeObject(existing.obj);
      } catch {
      }
    }
    if (!f.visible) {
      curves.delete(f.id);
      continue;
    }
    const compiled = compile(f.expression, paramMap);
    if (typeof compiled !== "function") continue;
    const domain = f.domain ?? { min: graph.view.xMin, max: graph.view.xMax };
    const obj = board.create("functiongraph", [compiled, domain.min, domain.max], {
      strokeColor: f.color,
      strokeWidth: 2,
      name: f.name,
      withLabel: false,
      highlight: false
    });
    curves.set(f.id, {
      obj,
      expression: f.expression,
      color: f.color,
      visible: f.visible,
      paramSignature: sig
    });
  }
  for (const point of graph.points) {
    const fn = graph.functions.find((f) => f.id === point.functionId);
    if (!fn || !fn.visible) continue;
    const compiled = compile(fn.expression, paramMap);
    if (typeof compiled !== "function") continue;
    const y = compiled(point.x);
    board.create("point", [point.x, y], {
      name: point.label ?? "",
      size: 3,
      fillColor: fn.color,
      strokeColor: fn.color,
      withLabel: !!point.label
    });
  }
  for (const inter of graph.intersections) {
    const fa = graph.functions.find((f) => f.id === inter.functionIdA);
    const fb = graph.functions.find((f) => f.id === inter.functionIdB);
    if (!fa || !fb || !fa.visible || !fb.visible) continue;
    const cfa = compile(fa.expression, paramMap);
    const cfb = compile(fb.expression, paramMap);
    if (typeof cfa !== "function" || typeof cfb !== "function") continue;
    const roots = scanRoots2((x) => cfa(x) - cfb(x), graph.view.xMin, graph.view.xMax);
    for (const x of roots) {
      board.create("point", [x, cfa(x)], {
        size: 3,
        fillColor: "#000",
        strokeColor: "#000"
      });
    }
  }
  for (const tan of graph.tangents) {
    const pt = graph.points.find((p) => p.id === tan.pointId);
    if (!pt) continue;
    const fn = graph.functions.find((f) => f.id === pt.functionId);
    if (!fn || !fn.visible) continue;
    const slope = numericalDerivative(fn.expression, paramMap, pt.x);
    const cfn = compile(fn.expression, paramMap);
    if (typeof cfn !== "function" || !Number.isFinite(slope)) continue;
    const y0 = cfn(pt.x);
    const x1 = graph.view.xMin;
    const x2 = graph.view.xMax;
    board.create(
      "line",
      [
        [x1, slope * (x1 - pt.x) + y0],
        [x2, slope * (x2 - pt.x) + y0]
      ],
      {
        strokeColor: fn.color,
        strokeWidth: 1,
        dash: 2,
        straightFirst: false,
        straightLast: false
      }
    );
  }
  board.update();
}
function scanRoots2(fn, xMin, xMax, samples = 200) {
  const roots = [];
  const step = (xMax - xMin) / samples;
  let prevX = xMin;
  let prevY = fn(prevX);
  for (let i = 1; i <= samples; i++) {
    const x = xMin + i * step;
    const y = fn(x);
    if (Number.isFinite(prevY) && Number.isFinite(y) && prevY * y < 0) {
      let a = prevX;
      let b = x;
      let ya = prevY;
      for (let j = 0; j < 30; j++) {
        const m = (a + b) / 2;
        const ym = fn(m);
        if (Math.abs(ym) < 1e-6) {
          a = b = m;
          break;
        }
        if (ya * ym < 0) {
          b = m;
        } else {
          a = m;
          ya = ym;
        }
      }
      roots.push((a + b) / 2);
    }
    prevX = x;
    prevY = y;
  }
  return roots;
}
var init_MiniBoard = __esm({
  "src/stamps/graph-2d/editor/MiniBoard.tsx"() {
    "use client";
    init_parser();
    init_theme();
    init_handlers();
  }
});
var GraphEditorPanel;
var init_EditorPanel = __esm({
  "src/stamps/graph-2d/editor/EditorPanel.tsx"() {
    "use client";
    init_MiniBoard();
    init_serialize();
    init_parser();
    init_render();
    init_colors();
    init_handlers();
    GraphEditorPanel = react.forwardRef(function GraphEditorPanel2(props, ref) {
      const initialGraph = props.initialState ?? EMPTY_GRAPH;
      const graphRef = react.useRef(initialGraph);
      const [, forceUpdate] = react.useState(0);
      const [errors, setErrors] = react.useState({});
      const [tool, setToolState] = react.useState("move");
      const undoStackRef = react.useRef([]);
      const redoStackRef = react.useRef([]);
      const idCounterRef = react.useRef(1);
      const toolRef = react.useRef(tool);
      toolRef.current = tool;
      const intersectFirstRef = react.useRef(null);
      const propsRef = react.useRef(props);
      propsRef.current = props;
      const initialGraphNotifiedRef = react.useRef(false);
      const pushUndo = react.useCallback((g) => {
        undoStackRef.current.push(g);
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
        redoStackRef.current = [];
      }, []);
      const setErrorsWithNotify = react.useCallback(
        (updater) => {
          setErrors((prev) => {
            const next = updater(prev);
            propsRef.current.onErrorsChange?.(next);
            return next;
          });
        },
        []
      );
      const notifyStateChange = react.useCallback((g, t) => {
        propsRef.current.onStateChange({
          tool: t,
          showAxis: g.view.showAxis,
          showGrid: g.view.showGrid,
          canUndo: undoStackRef.current.length > 0,
          canRedo: redoStackRef.current.length > 0
        });
      }, []);
      const updateGraph = react.useCallback(
        (mutator) => {
          const prev = graphRef.current;
          pushUndo(prev);
          const next = mutator(prev);
          graphRef.current = next;
          notifyStateChange(next, toolRef.current);
          forceUpdate((n) => n + 1);
          propsRef.current.onGraphChange?.(next);
        },
        [pushUndo, notifyStateChange]
      );
      const doUndo = react.useCallback(() => {
        const prev = undoStackRef.current.pop();
        if (!prev) return;
        redoStackRef.current.push(graphRef.current);
        if (redoStackRef.current.length > 30) redoStackRef.current.shift();
        graphRef.current = prev;
        forceUpdate((n) => n + 1);
        propsRef.current.onStateChange({
          tool: toolRef.current,
          showAxis: prev.view.showAxis,
          showGrid: prev.view.showGrid,
          canUndo: undoStackRef.current.length > 0,
          canRedo: redoStackRef.current.length > 0
        });
        propsRef.current.onGraphChange?.(prev);
      }, []);
      const doRedo = react.useCallback(() => {
        const next = redoStackRef.current.pop();
        if (!next) return;
        undoStackRef.current.push(graphRef.current);
        if (undoStackRef.current.length > 30) undoStackRef.current.shift();
        graphRef.current = next;
        forceUpdate((n) => n + 1);
        propsRef.current.onStateChange({
          tool: toolRef.current,
          showAxis: next.view.showAxis,
          showGrid: next.view.showGrid,
          canUndo: undoStackRef.current.length > 0,
          canRedo: redoStackRef.current.length > 0
        });
        propsRef.current.onGraphChange?.(next);
      }, []);
      react.useEffect(() => {
        const onKey = (e) => {
          const ae = document.activeElement;
          const inField = !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable));
          if (inField) return;
          if (!(e.metaKey || e.ctrlKey)) return;
          const key = e.key.toLowerCase();
          if (key === "z" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            doUndo();
          } else if (key === "z" && e.shiftKey || key === "y" && !e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            doRedo();
          }
        };
        window.addEventListener("keydown", onKey, { capture: true });
        return () => window.removeEventListener("keydown", onKey, { capture: true });
      }, [doUndo, doRedo]);
      const onBoardEvent = react.useCallback((ev) => {
        const currentTool = toolRef.current;
        if (currentTool === "point-on-curve" && ev.type === "click-curve" && ev.functionId && ev.x !== void 0) {
          updateGraph(
            (g) => addPointOnCurve(
              g,
              { x: ev.x, y: ev.y ?? 0, functionId: ev.functionId },
              () => `p${idCounterRef.current++}`
            )
          );
          setToolState("move");
        } else if (currentTool === "intersect" && ev.type === "click-curve" && ev.functionId) {
          if (!intersectFirstRef.current) {
            intersectFirstRef.current = ev.functionId;
          } else {
            const a = intersectFirstRef.current;
            const b = ev.functionId;
            intersectFirstRef.current = null;
            updateGraph(
              (g) => addIntersection(g, a, b, () => `i${idCounterRef.current++}`)
            );
            setToolState("move");
          }
        } else if (currentTool === "tangent" && ev.type === "click-curve" && ev.functionId && ev.x !== void 0) {
          const pointId = `p${idCounterRef.current++}`;
          const tangentId = `t${idCounterRef.current++}`;
          updateGraph((g) => ({
            ...g,
            points: [...g.points, { id: pointId, functionId: ev.functionId, x: ev.x }],
            tangents: [...g.tangents, { id: tangentId, pointId }]
          }));
          setToolState("move");
        }
      }, [updateGraph]);
      react.useImperativeHandle(
        ref,
        () => ({
          insert: () => {
            const g = graphRef.current;
            if (g.functions.length === 0) return false;
            const jsonState = stringifySerializedGraph(g);
            renderGraph2dSvgFromState(jsonState).then((svg) => propsRef.current.onInsert(jsonState, svg)).catch((err) => console.error("Graph2D insert render failed:", err));
            return true;
          },
          hasContent: () => graphRef.current.functions.length > 0,
          setTool: (t) => {
            setToolState(t);
            const g = graphRef.current;
            propsRef.current.onStateChange({
              tool: t,
              showAxis: g.view.showAxis,
              showGrid: g.view.showGrid,
              canUndo: undoStackRef.current.length > 0,
              canRedo: redoStackRef.current.length > 0
            });
          },
          setShowAxis: (b) => updateGraph((g) => ({ ...g, view: { ...g.view, showAxis: b } })),
          setShowGrid: (b) => updateGraph((g) => ({ ...g, view: { ...g.view, showGrid: b } })),
          resetView: () => updateGraph((g) => ({
            ...g,
            view: { ...g.view, xMin: -10, xMax: 10, yMin: -10, yMax: 10 }
          })),
          undo: doUndo,
          redo: doRedo,
          addFunction: (expr) => {
            const g = graphRef.current;
            if (g.functions.length >= MAX_FUNCTIONS) {
              return { ok: false, error: `T\u1ED1i \u0111a ${MAX_FUNCTIONS} h\xE0m` };
            }
            const v = validate(expr);
            if (!v.ok) return { ok: false, error: v.error ?? "Invalid" };
            const id = `f${idCounterRef.current++}`;
            const usedNames = g.functions.map((f) => f.name);
            const usedColors = g.functions.map((f) => f.color);
            const newFn = {
              id,
              name: nextFunctionName(usedNames),
              expression: expr,
              color: nextColor(usedColors),
              visible: true
            };
            const usedParamNames = new Set(g.parameters.map((p) => p.name));
            const newParams = [];
            for (const varName of v.freeVars) {
              if (usedParamNames.has(varName)) continue;
              if (g.parameters.length + newParams.length >= MAX_PARAMETERS) break;
              newParams.push({ name: varName, value: 1, min: -5, max: 5, step: 0.1 });
            }
            updateGraph((prev) => ({
              ...prev,
              functions: [...prev.functions, newFn],
              parameters: [...prev.parameters, ...newParams]
            }));
            setErrorsWithNotify((e) => ({ ...e, [id]: null }));
            return { ok: true, id };
          },
          commitFunctionExpression: (id, expr) => {
            const g = graphRef.current;
            const v = validate(expr);
            if (!v.ok) {
              setErrorsWithNotify((e) => ({ ...e, [id]: v.error ?? "Invalid" }));
              return;
            }
            const usedParamNames = new Set(g.parameters.map((p) => p.name));
            const newParams = [];
            for (const varName of v.freeVars) {
              if (usedParamNames.has(varName)) continue;
              if (g.parameters.length + newParams.length >= MAX_PARAMETERS) break;
              newParams.push({ name: varName, value: 1, min: -5, max: 5, step: 0.1 });
            }
            updateGraph((prev) => ({
              ...prev,
              functions: prev.functions.map(
                (f) => f.id === id ? { ...f, expression: expr } : f
              ),
              parameters: [...prev.parameters, ...newParams]
            }));
            setErrorsWithNotify((e) => ({ ...e, [id]: null }));
          },
          toggleFunctionVisible: (id) => updateGraph((g) => ({
            ...g,
            functions: g.functions.map(
              (f) => f.id === id ? { ...f, visible: !f.visible } : f
            )
          })),
          removeFunction: (id) => updateGraph((g) => ({
            ...g,
            functions: g.functions.filter((f) => f.id !== id)
          })),
          // setParameter does NOT push undo — would flood the stack (slider drag)
          setParameter: (name, value) => {
            const next = {
              ...graphRef.current,
              parameters: graphRef.current.parameters.map(
                (p) => p.name === name ? { ...p, value } : p
              )
            };
            graphRef.current = next;
            forceUpdate((n) => n + 1);
            propsRef.current.onGraphChange?.(next);
          },
          setParameterRange: (name, min, max, step) => updateGraph((g) => ({
            ...g,
            parameters: g.parameters.map(
              (p) => p.name === name ? { ...p, min, max, step, value: Math.min(max, Math.max(min, p.value)) } : p
            )
          })),
          removeParameter: (name) => updateGraph((g) => ({
            ...g,
            parameters: g.parameters.filter((p) => p.name !== name)
          })),
          getGraph: () => graphRef.current,
          getErrors: () => errors
        }),
        // deps: updateGraph stable; errors changes when function errors change; setErrorsWithNotify stable
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [updateGraph, errors, setErrorsWithNotify, doUndo, doRedo]
      );
      react.useEffect(() => {
        if (!initialGraphNotifiedRef.current) {
          initialGraphNotifiedRef.current = true;
          propsRef.current.onGraphChange?.(graphRef.current);
        }
      }, []);
      const graph = graphRef.current;
      const hasContent = graph.functions.length > 0;
      const handleInsert = () => {
        const g = graphRef.current;
        if (g.functions.length === 0) return;
        const jsonState = stringifySerializedGraph(g);
        renderGraph2dSvgFromState(jsonState).then((svg) => propsRef.current.onInsert(jsonState, svg)).catch((err) => console.error("Graph2D insert render failed:", err));
      };
      const { isMobile, isDark, withLeftPanel } = props;
      const wrapperStyle = isMobile ? { position: "fixed", inset: 0, zIndex: 40 } : {
        position: "absolute",
        top: "50%",
        left: withLeftPanel ? "calc(50% + 120px)" : "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 40
      };
      return /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          role: "dialog",
          "aria-label": "\u0110\u1ED3 th\u1ECB 2D",
          "data-testid": "graph-editor-panel",
          "data-stamp-area": "true",
          "data-mobile-editor": isMobile ? "true" : void 0,
          style: wrapperStyle,
          className: [
            isDark ? "theme--dark " : "",
            "flex flex-col overflow-hidden bg-white",
            isMobile ? "h-full w-full" : "h-[540px] max-h-[85vh] w-[640px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 shadow-2xl ring-1 ring-black/5"
          ].join(" "),
          children: [
            /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-orange-500 to-amber-600 px-3 py-2 text-white", children: [
              isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  onClick: props.onOpenDrawer,
                  "aria-label": "M\u1EDF b\u1EA3ng \u0111\u1EA1i s\u1ED1",
                  "data-testid": "graph-drawer-toggle",
                  className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
                  children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
                  ] })
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
                /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 V3" }),
                  /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 H21" }),
                  /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M5 19 C8 5, 14 5, 19 17" })
                ] }),
                "\u0110\u1ED3 th\u1ECB 2D"
              ] }),
              isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  onClick: handleInsert,
                  disabled: !hasContent,
                  "data-testid": "graph-insert-btn-mobile",
                  className: "rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50",
                  children: "Ch\xE8n"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: props.onClose,
                  "aria-label": "\u0110\xF3ng",
                  className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15",
                  children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                  ] })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1", children: /* @__PURE__ */ jsxRuntime.jsx(
              MiniBoard,
              {
                graph,
                activeTool: tool,
                isDark,
                onBoardEvent
              }
            ) }),
            !isMobile && /* @__PURE__ */ jsxRuntime.jsxs("footer", { className: "flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2", children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-xs text-slate-500", children: "Nh\u1EADp bi\u1EC3u th\u1EE9c trong b\u1EA3ng \u0111\u1EA1i s\u1ED1 b\xEAn tr\xE1i." }),
              /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    onClick: props.onClose,
                    className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                    children: "Hu\u1EF7"
                  }
                ),
                /* @__PURE__ */ jsxRuntime.jsx(
                  "button",
                  {
                    onClick: handleInsert,
                    disabled: !hasContent,
                    "data-testid": "graph-insert-btn",
                    className: "rounded bg-orange-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-orange-700 disabled:opacity-50",
                    children: "Ch\xE8n"
                  }
                )
              ] })
            ] })
          ]
        }
      );
    });
  }
});

// src/stamps/shared/svgToImage.ts
async function hashString(input) {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const buf = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest)).slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  let h1 = 2166136261;
  let h2 = 3421674724;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 16777619);
    h2 ^= c + i;
    h2 = Math.imul(h2, 1099511628211 & 4294967295);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
}
function parseSize(svg, attr) {
  const re = new RegExp(`<svg[^>]*\\s${attr}="(\\d+(?:\\.\\d+)?)`, "i");
  const m = svg.match(re);
  if (m) return Math.max(1, Math.round(parseFloat(m[1])));
  const vb = svg.match(/viewBox="([\d.\s-]+)"/i);
  if (vb) {
    const parts = vb[1].trim().split(/\s+/).map(parseFloat);
    if (parts.length === 4) return Math.max(1, Math.round(attr === "width" ? parts[2] : parts[3]));
  }
  return attr === "width" ? 200 : 100;
}
async function svgToImageElement(svg) {
  const width = parseSize(svg, "width");
  const height = parseSize(svg, "height");
  const utf8 = unescape(encodeURIComponent(svg));
  const dataURL = "data:image/svg+xml;base64," + btoa(utf8);
  const fileId = await hashString(dataURL);
  return { dataURL, fileId, width, height, mimeType: "image/svg+xml" };
}
var init_svgToImage = __esm({
  "src/stamps/shared/svgToImage.ts"() {
  }
});

// src/stamps/shared/insertImage.ts
function buildStampImageElement(api, fileId, width, height, customData, x, y) {
  const appState = api?.getAppState() ?? { scrollX: 0, scrollY: 0, width: 800, height: 600, zoom: { value: 1 } };
  const cx = x ?? appState.scrollX + (appState.width ?? 800) / 2 / (appState.zoom?.value ?? 1) - width / 2;
  const cy = y ?? appState.scrollY + (appState.height ?? 600) / 2 / (appState.zoom?.value ?? 1) - height / 2;
  return {
    type: "image",
    id: "stamp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    x: cx,
    y: cy,
    width,
    height,
    fileId,
    customData,
    angle: 0,
    strokeColor: "transparent",
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    roundness: null,
    seed: Math.floor(Math.random() * 1e9),
    versionNonce: 0,
    version: 1,
    isDeleted: false,
    boundElements: null,
    updated: Date.now(),
    link: null,
    locked: false,
    status: "saved",
    scale: [1, 1]
  };
}
async function insertStampImage(api, opts) {
  const { dataURL, fileId, width, height, mimeType } = await svgToImageElement(opts.svgString);
  api.addFiles([{ id: fileId, dataURL, mimeType, created: Date.now() }]);
  const customData = opts.makeCustomData(width, height);
  const elements = api.getSceneElements();
  const editingId = opts.editingElementId ?? null;
  if (editingId) {
    const updated = elements.map(
      (e) => e.id === editingId ? { ...e, fileId, customData, width, height } : e
    );
    api.updateScene({ elements: updated, appState: clearAppStateAfterInsert() });
    return { fileId, width, height, elementId: editingId };
  }
  const newElement = buildStampImageElement(
    api,
    fileId,
    width,
    height,
    customData,
    opts.position?.x,
    opts.position?.y
  );
  api.updateScene({
    elements: [...elements, newElement],
    appState: clearAppStateAfterInsert()
  });
  return { fileId, width, height, elementId: newElement.id };
}
var clearAppStateAfterInsert;
var init_insertImage = __esm({
  "src/stamps/shared/insertImage.ts"() {
    init_svgToImage();
    clearAppStateAfterInsert = () => ({
      selectedElementIds: {},
      croppingElementId: null
    });
  }
});
function readMatch(query) {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia(query).matches;
  } catch {
    return false;
  }
}
function useIsMobile() {
  const [state, setState] = react.useState(() => ({
    isMobile: readMatch(MOBILE_QUERY),
    isTouchOnly: readMatch(NO_HOVER_QUERY)
  }));
  react.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia(MOBILE_QUERY);
    const tql = window.matchMedia(NO_HOVER_QUERY);
    const update = () => {
      setState({ isMobile: mql.matches, isTouchOnly: tql.matches });
    };
    update();
    mql.addEventListener("change", update);
    tql.addEventListener("change", update);
    return () => {
      mql.removeEventListener("change", update);
      tql.removeEventListener("change", update);
    };
  }, []);
  return state;
}
var MOBILE_QUERY, NO_HOVER_QUERY;
var init_useIsMobile = __esm({
  "src/stamps/shared/useIsMobile.ts"() {
    "use client";
    MOBILE_QUERY = "(max-width: 768px)";
    NO_HOVER_QUERY = "(hover: none)";
  }
});

// src/stamps/graph-2d/host.tsx
var host_exports = {};
__export(host_exports, {
  Graph2DStampHost: () => Graph2DStampHost
});
var INITIAL_GRAPH_STATE, Graph2DStampHost;
var init_host = __esm({
  "src/stamps/graph-2d/host.tsx"() {
    "use client";
    init_LeftPanel();
    init_EditorPanel();
    init_insertImage();
    init_serialize();
    init_useIsMobile();
    init_types();
    INITIAL_GRAPH_STATE = {
      tool: "move",
      showAxis: true,
      showGrid: true,
      canUndo: false,
      canRedo: false
    };
    Graph2DStampHost = react.forwardRef(
      function Graph2DStampHost2({ api, editingElement, onClose, isDark }, ref) {
        const panelRef = react.useRef(null);
        const [graphUIState, setGraphUIState] = react.useState(INITIAL_GRAPH_STATE);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = react.useState(false);
        const initialState = react.useMemo(() => {
          if (!editingElement) return null;
          if (!isGraph2DCustomData(editingElement.customData)) return null;
          return parseSerializedGraph(editingElement.customData.jsonState);
        }, [editingElement]);
        const [graphSnapshot, setGraphSnapshot] = react.useState(
          initialState ?? EMPTY_GRAPH
        );
        const [errorsSnapshot, setErrorsSnapshot] = react.useState({});
        const handleInsert = react.useCallback(
          async (jsonState, svgString) => {
            if (!api) return;
            try {
              await insertStampImage(api, {
                svgString,
                makeCustomData: (width, height) => ({
                  kind: "graph2d",
                  version: 1,
                  jsonState,
                  svgWidth: width,
                  svgHeight: height
                }),
                editingElementId: editingElement?.id ?? null
              });
            } catch (err) {
              console.error("Graph2D insert failed:", err);
            }
            onClose();
          },
          [api, editingElement?.id, onClose]
        );
        react.useImperativeHandle(
          ref,
          () => ({
            tryInsert: () => panelRef.current?.insert() ?? false,
            hasContent: () => panelRef.current?.hasContent() ?? false
          }),
          []
        );
        return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            GraphLeftPanel,
            {
              activeTool: graphUIState.tool,
              onToolChange: (t) => panelRef.current?.setTool(t),
              showAxis: graphUIState.showAxis,
              showGrid: graphUIState.showGrid,
              onShowAxisChange: (b) => panelRef.current?.setShowAxis(b),
              onShowGridChange: (b) => panelRef.current?.setShowGrid(b),
              onResetView: () => panelRef.current?.resetView(),
              onUndo: () => panelRef.current?.undo(),
              canUndo: graphUIState.canUndo,
              onRedo: () => panelRef.current?.redo(),
              canRedo: graphUIState.canRedo,
              onClose,
              isDark,
              isMobile,
              drawerOpen,
              onDrawerClose: () => setDrawerOpen(false),
              graph: graphSnapshot,
              errors: errorsSnapshot,
              onAddFunctionDraft: () => {
                const result = panelRef.current?.addFunction("x");
                if (result && !result.ok) console.warn("addFunction failed:", result.error);
              },
              onCommitFunctionExpr: (id, expr) => panelRef.current?.commitFunctionExpression(id, expr),
              onToggleFunctionVisible: (id) => panelRef.current?.toggleFunctionVisible(id),
              onRemoveFunction: (id) => panelRef.current?.removeFunction(id),
              onParameterChange: (name, v) => panelRef.current?.setParameter(name, v),
              onParameterRangeChange: (name, min, max, step) => panelRef.current?.setParameterRange(name, min, max, step),
              onRemoveParameter: (name) => panelRef.current?.removeParameter(name)
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            GraphEditorPanel,
            {
              ref: panelRef,
              initialState,
              onInsert: handleInsert,
              onClose,
              onStateChange: setGraphUIState,
              onGraphChange: setGraphSnapshot,
              onErrorsChange: setErrorsSnapshot,
              withLeftPanel: !isMobile,
              isDark,
              isMobile,
              onOpenDrawer: () => setDrawerOpen(true)
            }
          )
        ] });
      }
    );
  }
});

// src/stamps/graph-2d/index.tsx
init_render();
init_types();
var Graph2DStampHost3 = react.lazy(
  () => Promise.resolve().then(() => (init_host(), host_exports)).then((m) => ({ default: m.Graph2DStampHost }))
);
var Graph2DIcon = /* @__PURE__ */ jsxRuntime.jsxs(
  "svg",
  {
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    children: [
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 V3" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M3 21 H21" }),
      /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M5 19 C8 5, 14 5, 19 17" })
    ]
  }
);
var graph2dStamp = {
  kind: "graph2d",
  experimental: true,
  shortcutKey: "h",
  toolbarLabel: "H",
  toolbarTitle: "Ch\xE8n \u0111\u1ED3 th\u1ECB 2D (H)",
  toolbarIcon: Graph2DIcon,
  toolbarTestId: "stamp-toolbar-graph2d",
  matchesCustomData: isGraph2DCustomData,
  async renderSvgFromCustomData(data) {
    if (!isGraph2DCustomData(data)) {
      throw new Error("graph2dStamp.renderSvgFromCustomData: customData kh\xF4ng ph\u1EA3i graph2d");
    }
    return renderGraph2dSvgFromState(data.jsonState);
  },
  async restoreFileFromCustomData(element) {
    const data = element.customData;
    const fileId = element.fileId;
    if (!data || !fileId) return null;
    if (!isGraph2DCustomData(data)) return null;
    const svgString = await renderGraph2dSvgFromState(data.jsonState);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL = "data:image/svg+xml;base64," + (typeof btoa !== "undefined" ? btoa(utf8) : Buffer.from(utf8).toString("base64"));
    return { fileId, dataURL, mimeType: "image/svg+xml" };
  },
  Host: Graph2DStampHost3
};

exports.graph2dStamp = graph2dStamp;
exports.isGraph2DCustomData = isGraph2DCustomData;
//# sourceMappingURL=graph-2d.js.map
//# sourceMappingURL=graph-2d.js.map