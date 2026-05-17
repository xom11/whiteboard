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

// src/stamps/graph-2d/parser.ts
var ALLOWED_FUNCTIONS = /* @__PURE__ */ new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "log",
  "ln",
  "exp",
  "sqrt",
  "abs",
  "floor",
  "ceil",
  "round"
]);
var ALLOWED_CHARS = /^[a-zA-Z0-9_.+\-*/^()\s,]+$/;
var IDENTIFIER_RE = /[a-zA-Z][a-zA-Z0-9_]*/g;
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
  const ids = trimmed.match(IDENTIFIER_RE) ?? [];
  const freeVars = /* @__PURE__ */ new Set();
  for (const id of ids) {
    if (id === "x" || id === "pi" || id === "e") continue;
    if (ALLOWED_FUNCTIONS.has(id)) continue;
    if (id.length === 1) {
      freeVars.add(id);
      continue;
    }
    const hint = SUGGESTIONS[id];
    return errResult(
      hint ? `T\xEAn h\xE0m kh\xF4ng h\u1EE3p l\u1EC7: "${id}". B\u1EA1n c\xF3 \xFD l\xE0 "${hint}" kh\xF4ng?` : `T\xEAn kh\xF4ng h\u1EE3p l\u1EC7: "${id}"`
    );
  }
  try {
    const paramSubs = Object.fromEntries([...freeVars].map((v) => [v, 1]));
    const rewritten = rewriteToJs(trimmed, paramSubs);
    new Function("x", `return (${rewritten})`);
  } catch {
    return errResult("L\u1ED7i c\xFA ph\xE1p");
  }
  return { ok: true, freeVars };
}
var FUNCTION_REPLACEMENTS = [
  // longest first để tránh substring conflict (asin trước sin)
  ["asin", "Math.asin"],
  ["acos", "Math.acos"],
  ["atan", "Math.atan"],
  ["sqrt", "Math.sqrt"],
  ["floor", "Math.floor"],
  ["round", "Math.round"],
  ["ceil", "Math.ceil"],
  ["sin", "Math.sin"],
  ["cos", "Math.cos"],
  ["tan", "Math.tan"],
  ["abs", "Math.abs"],
  ["exp", "Math.exp"],
  ["log", "Math.log10"],
  ["ln", "Math.log"]
];
function rewriteToJs(expr, params) {
  let s = expr.replace(/\^/g, "**");
  s = s.replace(/\bpi\b/g, "Math.PI");
  s = s.replace(/\be\b/g, "Math.E");
  for (const [from, to] of FUNCTION_REPLACEMENTS) {
    s = s.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  for (const [name, value] of Object.entries(params)) {
    if (name.length !== 1) continue;
    s = s.replace(new RegExp(`\\b${name}\\b`, "g"), `(${value})`);
  }
  return s;
}
function compile(expr, paramValues) {
  const v = validate(expr);
  if (!v.ok) return { error: v.error ?? "Invalid" };
  try {
    const rewritten = rewriteToJs(expr, paramValues);
    const raw = new Function("x", `return (${rewritten})`);
    return (x) => {
      try {
        const y = raw(x);
        return typeof y === "number" ? y : NaN;
      } catch {
        return NaN;
      }
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
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
//# sourceMappingURL=chunk-HM7RIXJE.mjs.map
//# sourceMappingURL=chunk-HM7RIXJE.mjs.map