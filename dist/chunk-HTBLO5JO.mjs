"use client";
// src/stamps/geometry-2d/editor/theme.ts
var themeStroke = (dark) => dark ? "#e2e8f0" : "#0f172a";
var themeAxis = (dark) => dark ? "#cbd5e1" : "#94a3b8";
var themeGrid = (dark) => dark ? "#475569" : "#e2e8f0";
var themeLabel = (dark) => dark ? "#e2e8f0" : "#000000";
function paletteFor(isDark) {
  return {
    stroke: themeStroke(isDark),
    axis: themeAxis(isDark),
    grid: themeGrid(isDark),
    label: themeLabel(isDark)
  };
}
var SENTINEL_MAP = {
  "@stroke": "stroke",
  "@axis": "axis",
  "@grid": "grid",
  "@label": "label"
};
function resolveAttrColors(attrs, palette) {
  if (typeof attrs === "string") {
    const key = SENTINEL_MAP[attrs];
    return key ? palette[key] : attrs;
  }
  if (Array.isArray(attrs)) {
    return attrs.map((a) => resolveAttrColors(a, palette));
  }
  if (attrs && typeof attrs === "object") {
    const out = {};
    for (const [k, v] of Object.entries(attrs)) {
      out[k] = resolveAttrColors(v, palette);
    }
    return out;
  }
  return attrs;
}

export { paletteFor, resolveAttrColors, themeAxis, themeGrid, themeLabel };
//# sourceMappingURL=chunk-HTBLO5JO.mjs.map
//# sourceMappingURL=chunk-HTBLO5JO.mjs.map