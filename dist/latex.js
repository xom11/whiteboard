"use client";
'use strict';

var jsxRuntime = require('react/jsx-runtime');
var react = require('react');

var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/stamps/latex/render.ts
function absoluteOrigin() {
  if (typeof window !== "undefined" && window.location) return window.location.origin;
  return "";
}
async function loadKatexCss() {
  if (cachedCss !== null) return cachedCss;
  try {
    if (typeof fetch === "function") {
      const res = await fetch("/katex.min.css");
      if (res.ok) {
        let css = await res.text();
        const origin = absoluteOrigin();
        if (origin) {
          css = css.replace(/url\((['"]?)(fonts\/)/g, `url($1${origin}/$2`);
        }
        cachedCss = css;
        return css;
      }
    }
  } catch {
  }
  cachedCss = "";
  return "";
}
async function renderLatexToSvg(src, displayMode) {
  const katex = await import('katex');
  const html = katex.default.renderToString(src, { displayMode, throwOnError: true, output: "html" });
  const measureDiv = document.createElement("div");
  measureDiv.style.cssText = "position:absolute;top:-9999px;left:-9999px;visibility:hidden;display:inline-block;";
  measureDiv.innerHTML = html;
  document.body.appendChild(measureDiv);
  const rect = measureDiv.getBoundingClientRect();
  const width = Math.ceil(rect.width) || 50;
  const height = Math.ceil(rect.height) || 20;
  document.body.removeChild(measureDiv);
  const cssText = await loadKatexCss();
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:16px;line-height:1.2;"><style>' + cssText + "</style>" + html + "</div></foreignObject></svg>";
}
var cachedCss;
var init_render = __esm({
  "src/stamps/latex/render.ts"() {
    cachedCss = null;
  }
});

// src/stamps/latex/types.ts
function isLatexCustomData(data) {
  if (!data || typeof data !== "object") return false;
  const d = data;
  return d.kind === "latex" && d.version === 1 && typeof d.src === "string";
}
var init_types = __esm({
  "src/stamps/latex/types.ts"() {
  }
});
function Shell({ title, icon, onClose, children, isMobile, drawerOpen, onDrawerClose }) {
  const mobileAttrs = isMobile ? {
    "data-mobile-drawer": "true",
    "data-drawer-state": drawerOpen ? "open" : "closed"
  } : {};
  const handleHeaderClose = () => {
    if (isMobile) onDrawerClose?.();
    else onClose();
  };
  return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
    isMobile && drawerOpen && /* @__PURE__ */ jsxRuntime.jsx(
      "div",
      {
        className: "stamp-drawer-backdrop",
        onPointerDown: onDrawerClose,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxRuntime.jsxs(
      "aside",
      {
        role: "complementary",
        "aria-label": title,
        "aria-hidden": isMobile && !drawerOpen ? "true" : void 0,
        "data-testid": "stamp-left-panel",
        "data-stamp-area": "true",
        ...mobileAttrs,
        className: isMobile ? "stamp-drawer-mobile flex flex-col border-r border-slate-200 bg-white shadow-md" : "absolute left-0 top-0 z-30 flex h-full w-60 flex-col border-r border-slate-200 bg-white shadow-md animate-in slide-in-from-left duration-200",
        children: [
          /* @__PURE__ */ jsxRuntime.jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
            /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
              /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-base leading-none", children: icon }),
              title
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(
              "button",
              {
                onClick: handleHeaderClose,
                "aria-label": isMobile ? "\u0110\xF3ng ng\u0103n c\xF4ng c\u1EE5" : "\u0110\xF3ng",
                className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
                children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                  /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntime.jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children })
        ]
      }
    )
  ] });
}
function Section({ label, children }) {
  return /* @__PURE__ */ jsxRuntime.jsxs("section", { children: [
    /* @__PURE__ */ jsxRuntime.jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
function LeftPanel({
  displayMode,
  onDisplayModeChange,
  onInsertSnippet,
  onClose,
  isMobile,
  drawerOpen,
  onDrawerClose
}) {
  return /* @__PURE__ */ jsxRuntime.jsxs(
    Shell,
    {
      title: "C\xF4ng th\u1EE9c LaTeX",
      icon: "\u2211",
      onClose,
      isMobile,
      drawerOpen,
      onDrawerClose,
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(Section, { label: "Ch\u1EBF \u0111\u1ED9 hi\u1EC3n th\u1ECB", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [
          /* @__PURE__ */ jsxRuntime.jsxs(
            "button",
            {
              type: "button",
              onClick: () => onDisplayModeChange(false),
              "aria-pressed": !displayMode,
              className: [
                "rounded-md border px-2 py-1.5 text-xs transition",
                !displayMode ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              ].join(" "),
              children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block font-medium", children: "Inline" }),
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block text-[10px] text-slate-500", children: "$ ... $" })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsxs(
            "button",
            {
              type: "button",
              onClick: () => onDisplayModeChange(true),
              "aria-pressed": displayMode,
              className: [
                "rounded-md border px-2 py-1.5 text-xs transition",
                displayMode ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-300" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              ].join(" "),
              children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block font-medium", children: "Block" }),
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "block text-[10px] text-slate-500", children: "$$ ... $$" })
              ]
            }
          )
        ] }) }),
        SNIPPETS.map((group) => /* @__PURE__ */ jsxRuntime.jsx(Section, { label: group.group, children: /* @__PURE__ */ jsxRuntime.jsx("div", { className: "flex flex-wrap gap-1", children: group.items.map((s) => /* @__PURE__ */ jsxRuntime.jsx(
          "button",
          {
            type: "button",
            "data-snippet": s.snippet,
            onClick: () => onInsertSnippet(s.snippet),
            title: s.snippet,
            className: "rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
            children: s.preview
          },
          s.snippet
        )) }) }, group.group)),
        /* @__PURE__ */ jsxRuntime.jsx(Section, { label: "Ph\xEDm t\u1EAFt", children: /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex flex-wrap gap-2 text-[11px] text-slate-600", children: [
          /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntime.jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Enter" }),
            "ch\xE8n"
          ] }),
          /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsxRuntime.jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Esc" }),
            "\u0111\xF3ng"
          ] })
        ] }) })
      ]
    }
  );
}
var SNIPPETS;
var init_LeftPanel = __esm({
  "src/stamps/latex/editor/LeftPanel.tsx"() {
    "use client";
    SNIPPETS = [
      {
        group: "Ph\xE2n s\u1ED1 & lu\u1EF9 th\u1EEBa",
        items: [
          { label: "Ph\xE2n s\u1ED1", preview: "a\u2044b", snippet: "\\frac{a}{b}" },
          { label: "Lu\u1EF9 th\u1EEBa", preview: "x\xB2", snippet: "^{2}" },
          { label: "Ch\u1EC9 s\u1ED1", preview: "x\u2081", snippet: "_{1}" },
          { label: "C\u0103n", preview: "\u221Ax", snippet: "\\sqrt{x}" },
          { label: "C\u0103n n", preview: "\u207F\u221Ax", snippet: "\\sqrt[n]{x}" }
        ]
      },
      {
        group: "T\u1ED5ng & t\xEDch ph\xE2n",
        items: [
          { label: "T\u1ED5ng", preview: "\u03A3", snippet: "\\sum_{i=1}^{n}" },
          { label: "T\xEDch", preview: "\u03A0", snippet: "\\prod_{i=1}^{n}" },
          { label: "T\xEDch ph\xE2n", preview: "\u222B", snippet: "\\int_{a}^{b}" },
          { label: "Gi\u1EDBi h\u1EA1n", preview: "lim", snippet: "\\lim_{x \\to 0}" }
        ]
      },
      {
        group: "K\xFD hi\u1EC7u",
        items: [
          { label: "\u03B1", preview: "\u03B1", snippet: "\\alpha" },
          { label: "\u03B2", preview: "\u03B2", snippet: "\\beta" },
          { label: "\u03C0", preview: "\u03C0", snippet: "\\pi" },
          { label: "\u03B8", preview: "\u03B8", snippet: "\\theta" },
          { label: "\u2260", preview: "\u2260", snippet: "\\neq" },
          { label: "\u2264", preview: "\u2264", snippet: "\\leq" },
          { label: "\u2265", preview: "\u2265", snippet: "\\geq" },
          { label: "\u221E", preview: "\u221E", snippet: "\\infty" },
          { label: "\u2192", preview: "\u2192", snippet: "\\to" }
        ]
      }
    ];
  }
});
var DEBOUNCE_MS, EditorPopover;
var init_EditorPopover = __esm({
  "src/stamps/latex/editor/EditorPopover.tsx"() {
    "use client";
    init_render();
    DEBOUNCE_MS = 100;
    EditorPopover = react.forwardRef(function EditorPopover2({
      x,
      y,
      initialValue,
      onInsert,
      onClose,
      displayMode: controlledDisplayMode,
      onDisplayModeChange,
      withLeftPanel = false,
      isMobile = false,
      onOpenDrawer
    }, ref) {
      const [value, setValue] = react.useState(initialValue);
      const [internalDisplayMode] = react.useState(false);
      const displayMode = controlledDisplayMode ?? internalDisplayMode;
      const [previewSvg, setPreviewSvg] = react.useState(null);
      const [error, setError] = react.useState(null);
      const debounceRef = react.useRef(null);
      const inputRef = react.useRef(null);
      react.useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
          try {
            const svg = await renderLatexToSvg(value, displayMode);
            setPreviewSvg(svg);
            setError(null);
          } catch (err) {
            setPreviewSvg(null);
            setError(err.message);
          }
        }, DEBOUNCE_MS);
        return () => {
          if (debounceRef.current) clearTimeout(debounceRef.current);
        };
      }, [value, displayMode]);
      const handleInsert = react.useCallback(() => {
        if (!previewSvg) return;
        onInsert(previewSvg, value, displayMode);
      }, [previewSvg, value, displayMode, onInsert]);
      const handleKeyDown = react.useCallback(
        (e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleInsert();
          }
        },
        [onClose, handleInsert]
      );
      react.useImperativeHandle(
        ref,
        () => ({
          insertAtCursor: (snippet) => {
            const el = inputRef.current;
            if (!el) {
              setValue((v) => v + snippet);
              return;
            }
            const start = el.selectionStart ?? value.length;
            const end = el.selectionEnd ?? value.length;
            const next = value.slice(0, start) + snippet + value.slice(end);
            setValue(next);
            requestAnimationFrame(() => {
              el.focus();
              const pos = start + snippet.length;
              try {
                el.setSelectionRange(pos, pos);
              } catch {
              }
            });
          },
          hasContent: () => value.trim().length > 0 && !!previewSvg && !error,
          tryInsert: () => {
            if (!previewSvg || error || !value.trim()) return false;
            onInsert(previewSvg, value, displayMode);
            return true;
          }
        }),
        [value, previewSvg, error, displayMode, onInsert]
      );
      const isLegacyPosition = x > 0 || y > 0;
      const wrapperStyle = isMobile ? { position: "fixed", inset: 0, zIndex: 50 } : isLegacyPosition ? { position: "absolute", top: y, left: x, zIndex: 50 } : {
        position: "absolute",
        top: "50%",
        left: withLeftPanel ? "calc(50% + 120px)" : "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 50
      };
      return /* @__PURE__ */ jsxRuntime.jsxs(
        "div",
        {
          style: wrapperStyle,
          "data-stamp-area": "true",
          "data-mobile-editor": isMobile ? "true" : void 0,
          className: isMobile ? "flex h-full w-full flex-col bg-white" : "w-[420px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 bg-white shadow-2xl ring-1 ring-black/5",
          role: "dialog",
          "aria-label": "Nh\u1EADp c\xF4ng th\u1EE9c LaTeX",
          children: [
            /* @__PURE__ */ jsxRuntime.jsxs("header", { className: `flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-white${isMobile ? "" : " rounded-t-lg"}`, children: [
              isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  onClick: onOpenDrawer,
                  "aria-label": "M\u1EDF ng\u0103n snippet",
                  className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
                  children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
                  ] })
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
                /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-base leading-none", children: "\u2211" }),
                "C\xF4ng th\u1EE9c LaTeX"
              ] }),
              isMobile && /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  type: "button",
                  onClick: handleInsert,
                  disabled: !previewSvg || !!error,
                  "data-testid": "latex-insert-btn-mobile",
                  className: "rounded bg-white/15 px-3 py-1.5 text-xs font-semibold transition hover:bg-white/25 disabled:opacity-50",
                  children: "Ch\xE8n"
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                "button",
                {
                  onClick: onClose,
                  "aria-label": "\u0110\xF3ng",
                  className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15",
                  children: /* @__PURE__ */ jsxRuntime.jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                    /* @__PURE__ */ jsxRuntime.jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                  ] })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntime.jsxs("div", { className: `space-y-2 p-3${isMobile ? " flex min-h-0 flex-1 flex-col" : ""}`, children: [
              /* @__PURE__ */ jsxRuntime.jsx(
                "input",
                {
                  ref: inputRef,
                  type: "text",
                  role: "textbox",
                  value,
                  onChange: (e) => setValue(e.target.value),
                  onKeyDown: handleKeyDown,
                  placeholder: "Vd: \\frac{a^2+b^2}{c}",
                  className: `w-full rounded border border-slate-300 px-2 py-1.5 font-mono outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200${isMobile ? " min-h-[44px] text-base" : " text-sm"}`,
                  autoFocus: true
                }
              ),
              /* @__PURE__ */ jsxRuntime.jsx(
                "div",
                {
                  className: [
                    "flex items-center justify-center rounded border p-3 text-center",
                    isMobile ? "min-h-0 flex-1 overflow-auto" : "min-h-[64px]",
                    error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50"
                  ].join(" "),
                  children: error ? /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "text-xs", children: [
                    "L\u1ED7i: ",
                    error.slice(0, 80)
                  ] }) : previewSvg ? /* @__PURE__ */ jsxRuntime.jsx("span", { dangerouslySetInnerHTML: { __html: previewSvg } }) : /* @__PURE__ */ jsxRuntime.jsx("span", { className: "text-xs text-slate-400", children: "(xem tr\u01B0\u1EDBc)" })
                }
              ),
              !isMobile && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ jsxRuntime.jsxs("span", { className: "text-[11px] text-slate-500", children: [
                  displayMode ? "Block" : "Inline",
                  " \xB7 Enter \u0111\u1EC3 ch\xE8n"
                ] }),
                /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      onClick: onClose,
                      className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                      children: "Hu\u1EF7"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    "button",
                    {
                      onClick: handleInsert,
                      disabled: !previewSvg || !!error,
                      className: "rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50",
                      children: "Ch\xE8n"
                    }
                  )
                ] })
              ] }),
              isMobile && /* @__PURE__ */ jsxRuntime.jsxs("div", { className: "text-center text-[11px] text-slate-500", children: [
                displayMode ? "Block" : "Inline",
                " \xB7 B\u1EA5m Ch\xE8n \u1EDF thanh tr\xEAn"
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

// src/stamps/latex/host.tsx
var host_exports = {};
__export(host_exports, {
  LatexStampHost: () => LatexStampHost
});
var LatexStampHost;
var init_host = __esm({
  "src/stamps/latex/host.tsx"() {
    "use client";
    init_LeftPanel();
    init_EditorPopover();
    init_insertImage();
    init_useIsMobile();
    init_types();
    LatexStampHost = react.forwardRef(
      function LatexStampHost2({ api, editingElement, onClose }, ref) {
        const editorRef = react.useRef(null);
        const { isMobile } = useIsMobile();
        const [drawerOpen, setDrawerOpen] = react.useState(false);
        const initial = react.useMemo(() => {
          if (editingElement && isLatexCustomData(editingElement.customData)) {
            return {
              initialValue: editingElement.customData.src,
              displayMode: !!editingElement.customData.displayMode
            };
          }
          return { initialValue: "", displayMode: false };
        }, [editingElement]);
        const [displayMode, setDisplayMode] = react.useState(initial.displayMode);
        const handleInsert = react.useCallback(
          async (svgString, src, dm) => {
            if (!api) return;
            try {
              await insertStampImage(api, {
                svgString,
                makeCustomData: () => ({
                  kind: "latex",
                  version: 1,
                  src,
                  displayMode: dm
                }),
                editingElementId: editingElement?.id ?? null
              });
            } catch (err) {
              console.error("Latex insert failed:", err);
            }
            onClose();
          },
          [api, editingElement?.id, onClose]
        );
        react.useImperativeHandle(
          ref,
          () => ({
            tryInsert: () => editorRef.current?.tryInsert() ?? false,
            hasContent: () => editorRef.current?.hasContent() ?? false
          }),
          []
        );
        return /* @__PURE__ */ jsxRuntime.jsxs(jsxRuntime.Fragment, { children: [
          /* @__PURE__ */ jsxRuntime.jsx(
            LeftPanel,
            {
              displayMode,
              onDisplayModeChange: setDisplayMode,
              onInsertSnippet: (s) => editorRef.current?.insertAtCursor(s),
              onClose,
              isMobile,
              drawerOpen,
              onDrawerClose: () => setDrawerOpen(false)
            }
          ),
          /* @__PURE__ */ jsxRuntime.jsx(
            EditorPopover,
            {
              ref: editorRef,
              x: 0,
              y: 0,
              initialValue: initial.initialValue,
              displayMode,
              onDisplayModeChange: setDisplayMode,
              onInsert: handleInsert,
              onClose,
              withLeftPanel: !isMobile,
              isMobile,
              onOpenDrawer: () => setDrawerOpen(true)
            }
          )
        ] });
      }
    );
  }
});

// src/stamps/latex/index.tsx
init_render();
init_types();
var LatexStampHost3 = react.lazy(
  () => Promise.resolve().then(() => (init_host(), host_exports)).then((m) => ({ default: m.LatexStampHost }))
);
var LatexIcon = /* @__PURE__ */ jsxRuntime.jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: /* @__PURE__ */ jsxRuntime.jsx("path", { d: "M17 5 H7 L13 12 L7 19 H17" }) });
var latexStamp = {
  kind: "latex",
  shortcutKey: "l",
  toolbarLabel: "L",
  toolbarTitle: "Ch\xE8n c\xF4ng th\u1EE9c LaTeX (L)",
  toolbarIcon: LatexIcon,
  toolbarTestId: "stamp-toolbar-latex",
  matchesCustomData: isLatexCustomData,
  async renderSvgFromCustomData(data) {
    if (!isLatexCustomData(data)) {
      throw new Error("latexStamp.renderSvgFromCustomData: customData kh\xF4ng ph\u1EA3i latex");
    }
    return renderLatexToSvg(data.src, data.displayMode);
  },
  async restoreFileFromCustomData(element) {
    const data = element.customData;
    const fileId = element.fileId;
    if (!data || !fileId) return null;
    if (!isLatexCustomData(data)) return null;
    const svgString = await renderLatexToSvg(data.src, data.displayMode);
    const utf8 = unescape(encodeURIComponent(svgString));
    const dataURL = "data:image/svg+xml;base64," + (typeof btoa !== "undefined" ? btoa(utf8) : Buffer.from(utf8).toString("base64"));
    return { fileId, dataURL, mimeType: "image/svg+xml" };
  },
  Host: LatexStampHost3
};

exports.isLatexCustomData = isLatexCustomData;
exports.latexStamp = latexStamp;
//# sourceMappingURL=latex.js.map
//# sourceMappingURL=latex.js.map