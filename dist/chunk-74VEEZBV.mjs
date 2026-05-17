"use client";
// src/stamps/graph-2d/serialize.ts
var EMPTY_GRAPH = {
  version: 1,
  view: { xMin: -10, xMax: 10, yMin: -10, yMax: 10, showAxis: true, showGrid: true },
  functions: [],
  parameters: [],
  points: [],
  intersections: [],
  tangents: []
};
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

// src/stamps/graph-2d/evaluator.ts
var ALLOWED_FUNCTIONS = {
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
var ALLOWED_CONSTANTS = {
  pi: Math.PI,
  e: Math.E
};
var OPERATORS = /* @__PURE__ */ new Set(["+", "-", "*", "/", "^"]);
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
var Parser = class {
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
var ALLOWED_FUNCTION_NAMES = new Set(Object.keys(ALLOWED_FUNCTIONS));
new Set(Object.keys(ALLOWED_CONSTANTS));

// src/stamps/graph-2d/parser.ts
var ALLOWED_FUNCTIONS2 = ALLOWED_FUNCTION_NAMES;
var ALLOWED_CHARS = /^[a-zA-Z0-9_.+\-*/^()\s,]+$/;
var SUGGESTIONS = {
  tg: "tan",
  arcsin: "asin",
  arccos: "acos",
  arctan: "atan"
};
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

// src/stamps/graph-2d/types.ts
function isGraph2DCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "graph2d" && d.version === 1 && typeof d.jsonState === "string";
}

export { EMPTY_GRAPH, addIntersection, addPointOnCurve, compile, isGraph2DCustomData, numericalDerivative, parseSerializedGraph, renderGraph2dSvgFromState, stringifySerializedGraph, validate };
//# sourceMappingURL=chunk-74VEEZBV.mjs.map
//# sourceMappingURL=chunk-74VEEZBV.mjs.map