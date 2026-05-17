"use client";
import { renderLatexToSvg, isLatexCustomData } from './chunk-X5R72SSJ.mjs';
import { useIsMobile } from './chunk-P2AOIF7S.mjs';
import { insertStampImage } from './chunk-C6SCVOMC.mjs';
import './chunk-BJTO5JO5.mjs';
import { forwardRef, useState, useRef, useEffect, useCallback, useImperativeHandle, useMemo } from 'react';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';

function Shell({ title, icon, onClose, children, isMobile, drawerOpen, onDrawerClose }) {
  const mobileAttrs = isMobile ? {
    "data-mobile-drawer": "true",
    "data-drawer-state": drawerOpen ? "open" : "closed"
  } : {};
  const handleHeaderClose = () => {
    if (isMobile) onDrawerClose?.();
    else onClose();
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    isMobile && drawerOpen && /* @__PURE__ */ jsx(
      "div",
      {
        className: "stamp-drawer-backdrop",
        onPointerDown: onDrawerClose,
        "aria-hidden": "true"
      }
    ),
    /* @__PURE__ */ jsxs(
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
          /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2", children: [
            /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-sm font-semibold text-slate-800", children: [
              /* @__PURE__ */ jsx("span", { className: "text-base leading-none", children: icon }),
              title
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                onClick: handleHeaderClose,
                "aria-label": isMobile ? "\u0110\xF3ng ng\u0103n c\xF4ng c\u1EE5" : "\u0110\xF3ng",
                className: "rounded p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
                children: /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                  /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { className: "min-h-0 flex-1 overflow-y-auto p-3 space-y-4", children })
        ]
      }
    )
  ] });
}
function Section({ label, children }) {
  return /* @__PURE__ */ jsxs("section", { children: [
    /* @__PURE__ */ jsx("h4", { className: "mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500", children: label }),
    children
  ] });
}
var SNIPPETS = [
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
function LeftPanel({
  displayMode,
  onDisplayModeChange,
  onInsertSnippet,
  onClose,
  isMobile,
  drawerOpen,
  onDrawerClose
}) {
  return /* @__PURE__ */ jsxs(
    Shell,
    {
      title: "C\xF4ng th\u1EE9c LaTeX",
      icon: "\u2211",
      onClose,
      isMobile,
      drawerOpen,
      onDrawerClose,
      children: [
        /* @__PURE__ */ jsx(Section, { label: "Ch\u1EBF \u0111\u1ED9 hi\u1EC3n th\u1ECB", children: /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-1.5", children: [
          /* @__PURE__ */ jsxs(
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
                /* @__PURE__ */ jsx("span", { className: "block font-medium", children: "Inline" }),
                /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-500", children: "$ ... $" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
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
                /* @__PURE__ */ jsx("span", { className: "block font-medium", children: "Block" }),
                /* @__PURE__ */ jsx("span", { className: "block text-[10px] text-slate-500", children: "$$ ... $$" })
              ]
            }
          )
        ] }) }),
        SNIPPETS.map((group) => /* @__PURE__ */ jsx(Section, { label: group.group, children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-1", children: group.items.map((s) => /* @__PURE__ */ jsx(
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
        /* @__PURE__ */ jsx(Section, { label: "Ph\xEDm t\u1EAFt", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-2 text-[11px] text-slate-600", children: [
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Enter" }),
            "ch\xE8n"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "inline-flex items-center gap-1", children: [
            /* @__PURE__ */ jsx("kbd", { className: "rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono", children: "Esc" }),
            "\u0111\xF3ng"
          ] })
        ] }) })
      ]
    }
  );
}
var DEBOUNCE_MS = 100;
var EditorPopover = forwardRef(function EditorPopover2({
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
  const [value, setValue] = useState(initialValue);
  const [internalDisplayMode] = useState(false);
  const displayMode = controlledDisplayMode ?? internalDisplayMode;
  const [previewSvg, setPreviewSvg] = useState(null);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
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
  const handleInsert = useCallback(() => {
    if (!previewSvg) return;
    onInsert(previewSvg, value, displayMode);
  }, [previewSvg, value, displayMode, onInsert]);
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleInsert();
      }
    },
    [onClose, handleInsert]
  );
  useImperativeHandle(
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
  return /* @__PURE__ */ jsxs(
    "div",
    {
      style: wrapperStyle,
      "data-stamp-area": "true",
      "data-mobile-editor": isMobile ? "true" : void 0,
      className: isMobile ? "flex h-full w-full flex-col bg-white" : "w-[420px] max-w-[calc(100vw-280px)] rounded-lg border border-slate-300 bg-white shadow-2xl ring-1 ring-black/5",
      role: "dialog",
      "aria-label": "Nh\u1EADp c\xF4ng th\u1EE9c LaTeX",
      children: [
        /* @__PURE__ */ jsxs("header", { className: `flex items-center gap-2 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-2 text-white${isMobile ? "" : " rounded-t-lg"}`, children: [
          isMobile && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: onOpenDrawer,
              "aria-label": "M\u1EDF ng\u0103n snippet",
              className: "-ml-1 inline-flex h-10 w-10 items-center justify-center rounded transition hover:bg-white/15",
              children: /* @__PURE__ */ jsxs("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("line", { x1: "4", y1: "6", x2: "20", y2: "6" }),
                /* @__PURE__ */ jsx("line", { x1: "4", y1: "12", x2: "20", y2: "12" }),
                /* @__PURE__ */ jsx("line", { x1: "4", y1: "18", x2: "20", y2: "18" })
              ] })
            }
          ),
          /* @__PURE__ */ jsxs("h3", { className: "flex flex-1 items-center gap-2 text-sm font-semibold", children: [
            /* @__PURE__ */ jsx("span", { className: "text-base leading-none", children: "\u2211" }),
            "C\xF4ng th\u1EE9c LaTeX"
          ] }),
          isMobile && /* @__PURE__ */ jsx(
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
          /* @__PURE__ */ jsx(
            "button",
            {
              onClick: onClose,
              "aria-label": "\u0110\xF3ng",
              className: "inline-flex h-9 w-9 items-center justify-center rounded transition hover:bg-white/15",
              children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs("div", { className: `space-y-2 p-3${isMobile ? " flex min-h-0 flex-1 flex-col" : ""}`, children: [
          /* @__PURE__ */ jsx(
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
          /* @__PURE__ */ jsx(
            "div",
            {
              className: [
                "flex items-center justify-center rounded border p-3 text-center",
                isMobile ? "min-h-0 flex-1 overflow-auto" : "min-h-[64px]",
                error ? "border-rose-300 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50"
              ].join(" "),
              children: error ? /* @__PURE__ */ jsxs("span", { className: "text-xs", children: [
                "L\u1ED7i: ",
                error.slice(0, 80)
              ] }) : previewSvg ? /* @__PURE__ */ jsx("span", { dangerouslySetInnerHTML: { __html: previewSvg } }) : /* @__PURE__ */ jsx("span", { className: "text-xs text-slate-400", children: "(xem tr\u01B0\u1EDBc)" })
            }
          ),
          !isMobile && /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxs("span", { className: "text-[11px] text-slate-500", children: [
              displayMode ? "Block" : "Inline",
              " \xB7 Enter \u0111\u1EC3 ch\xE8n"
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx(
                "button",
                {
                  onClick: onClose,
                  className: "rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-100",
                  children: "Hu\u1EF7"
                }
              ),
              /* @__PURE__ */ jsx(
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
          isMobile && /* @__PURE__ */ jsxs("div", { className: "text-center text-[11px] text-slate-500", children: [
            displayMode ? "Block" : "Inline",
            " \xB7 B\u1EA5m Ch\xE8n \u1EDF thanh tr\xEAn"
          ] })
        ] })
      ]
    }
  );
});
var LatexStampHost = forwardRef(
  function LatexStampHost2({ api, editingElement, onClose }, ref) {
    const editorRef = useRef(null);
    const { isMobile } = useIsMobile();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const initial = useMemo(() => {
      if (editingElement && isLatexCustomData(editingElement.customData)) {
        return {
          initialValue: editingElement.customData.src,
          displayMode: !!editingElement.customData.displayMode
        };
      }
      return { initialValue: "", displayMode: false };
    }, [editingElement]);
    const [displayMode, setDisplayMode] = useState(initial.displayMode);
    const handleInsert = useCallback(
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
    useImperativeHandle(
      ref,
      () => ({
        tryInsert: () => editorRef.current?.tryInsert() ?? false,
        hasContent: () => editorRef.current?.hasContent() ?? false
      }),
      []
    );
    return /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx(
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
      /* @__PURE__ */ jsx(
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

export { LatexStampHost };
//# sourceMappingURL=host-Z3TEJKZA.mjs.map
//# sourceMappingURL=host-Z3TEJKZA.mjs.map