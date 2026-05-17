"use client";
import { useState, useRef, useCallback, useEffect } from 'react';
import { jsxs, Fragment, jsx } from 'react/jsx-runtime';

// src/stamps/shared/useChordShortcut.ts
var A_CODE = "a".charCodeAt(0);
function isFieldFocused() {
  const ae = typeof document !== "undefined" ? document.activeElement : null;
  return !!(ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA" || ae.isContentEditable));
}
function useChordShortcut(args) {
  const { groupOrder, tools, onSelect, enabled } = args;
  const [chordGroup, setChordGroup] = useState(null);
  const groupOrderRef = useRef(groupOrder);
  const toolsRef = useRef(tools);
  const onSelectRef = useRef(onSelect);
  const chordGroupRef = useRef(null);
  groupOrderRef.current = groupOrder;
  toolsRef.current = tools;
  onSelectRef.current = onSelect;
  const cancel = useCallback(() => {
    chordGroupRef.current = null;
    setChordGroup(null);
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const setChord = (next) => {
      chordGroupRef.current = next;
      setChordGroup(next);
    };
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isFieldFocused()) return;
      const key = e.key;
      const lower = key.length === 1 ? key.toLowerCase() : key;
      if (key === "Escape") {
        if (chordGroupRef.current !== null) {
          e.preventDefault();
          e.stopPropagation();
          setChord(null);
        }
        return;
      }
      if (lower.length === 1 && lower >= "a" && lower <= "z") {
        const idx = lower.charCodeAt(0) - A_CODE;
        if (idx < groupOrderRef.current.length) {
          e.preventDefault();
          e.stopPropagation();
          setChord(groupOrderRef.current[idx]);
        }
        return;
      }
      if (key >= "1" && key <= "9") {
        const active = chordGroupRef.current;
        if (active === null) return;
        const n = key.charCodeAt(0) - "1".charCodeAt(0);
        const toolsInGroup = toolsRef.current.filter(
          (t) => t.group === active
        );
        e.preventDefault();
        e.stopPropagation();
        if (n < toolsInGroup.length) {
          onSelectRef.current(toolsInGroup[n].key);
        }
        setChord(null);
        return;
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [enabled]);
  return { chordGroup, cancel };
}
function MobileToolDrawer({
  title,
  headerIcon,
  chips,
  actions,
  groups,
  activeTool,
  onToolSelect,
  drawerOpen,
  onDrawerClose,
  isDark,
  testId
}) {
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    drawerOpen && /* @__PURE__ */ jsx(
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
        "aria-hidden": !drawerOpen ? "true" : void 0,
        "data-testid": testId,
        "data-stamp-area": "true",
        "data-mobile-drawer": "true",
        "data-geo-mobile": "true",
        "data-drawer-state": drawerOpen ? "open" : "closed",
        className: [
          isDark ? "theme--dark " : "",
          "stamp-drawer-mobile flex flex-col border-r border-slate-200 bg-white shadow-md"
        ].join(""),
        children: [
          /* @__PURE__ */ jsxs("header", { className: "flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-4 py-3", children: [
            /* @__PURE__ */ jsxs("h3", { className: "flex items-center gap-2 text-base font-semibold text-slate-800", children: [
              /* @__PURE__ */ jsx("span", { className: "inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700", children: headerIcon }),
              title
            ] }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: onDrawerClose,
                "aria-label": "\u0110\xF3ng ng\u0103n c\xF4ng c\u1EE5",
                className: "inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
                children: /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
                  /* @__PURE__ */ jsx("line", { x1: "6", y1: "6", x2: "18", y2: "18" }),
                  /* @__PURE__ */ jsx("line", { x1: "18", y1: "6", x2: "6", y2: "18" })
                ] })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "sticky top-0 z-10 flex items-center gap-2 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur", children: [
            chips.map((c) => /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                role: "switch",
                "aria-pressed": c.pressed,
                "aria-label": c.label,
                "data-testid": c.testId,
                onClick: () => c.onToggle(!c.pressed),
                className: "geo-mobile-chip",
                children: [
                  c.icon,
                  c.label
                ]
              },
              c.label
            )),
            actions.length > 0 && /* @__PURE__ */ jsx("div", { className: "ml-auto flex items-center gap-1", children: actions.map((a) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: a.onClick,
                disabled: a.disabled,
                "aria-label": a.label,
                title: a.title ?? a.label,
                className: "inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
                children: a.icon
              },
              a.label
            )) })
          ] }),
          /* @__PURE__ */ jsx(
            "div",
            {
              className: "min-h-0 flex-1 overflow-y-auto",
              style: { paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" },
              children: groups.map((g) => /* @__PURE__ */ jsxs("section", { className: "px-3 pt-3 pb-1", children: [
                /* @__PURE__ */ jsxs("h4", { className: "mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500", children: [
                  /* @__PURE__ */ jsx("span", { className: "h-1 w-1 rounded-full bg-emerald-500" }),
                  g.groupLabel
                ] }),
                /* @__PURE__ */ jsx("div", { className: "grid grid-cols-3 gap-2", children: g.tools.map((t) => {
                  const active = activeTool === t.key;
                  return /* @__PURE__ */ jsxs(
                    "button",
                    {
                      type: "button",
                      "aria-label": t.label,
                      "aria-pressed": active,
                      "data-tool": t.key,
                      onClick: () => {
                        onToolSelect(t.key);
                        onDrawerClose();
                      },
                      className: [
                        "flex flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3 transition active:scale-95",
                        active ? "geo-mobile-tool-active" : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                      ].join(" "),
                      children: [
                        /* @__PURE__ */ jsx("span", { className: "flex h-6 w-6 items-center justify-center", children: t.icon }),
                        /* @__PURE__ */ jsx("span", { className: "text-center text-[11px] font-medium leading-tight line-clamp-2", children: t.label })
                      ]
                    },
                    t.key
                  );
                }) })
              ] }, g.group))
            }
          )
        ]
      }
    )
  ] });
}

export { MobileToolDrawer, useChordShortcut };
//# sourceMappingURL=chunk-LPM4MM45.mjs.map
//# sourceMappingURL=chunk-LPM4MM45.mjs.map