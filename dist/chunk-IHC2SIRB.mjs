"use client";
import { listObjects, getKind } from './chunk-MBJVQIF6.mjs';
import * as React2 from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';
import { jsxs, Fragment, jsx } from 'react/jsx-runtime';

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
                "data-testid": a.testId,
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

// src/core/scene/ui/kindMeta.ts
var KIND_UI_META = {
  // 2D
  point: { displayName: "\u0110i\u1EC3m", icon: "\xB7" },
  segment: { displayName: "\u0110o\u1EA1n th\u1EB3ng", icon: "\u2014" },
  line: { displayName: "\u0110\u01B0\u1EDDng th\u1EB3ng", icon: "/" },
  ray: { displayName: "Tia", icon: "\u2192" },
  vector: { displayName: "Vector", icon: "\u2197" },
  circle: { displayName: "\u0110\u01B0\u1EDDng tr\xF2n", icon: "\u25CB" },
  polygon: { displayName: "\u0110a gi\xE1c", icon: "\u25C7" },
  intersection: { displayName: "Giao \u0111i\u1EC3m", icon: "\u2715" },
  // 3D
  point3d: { displayName: "\u0110i\u1EC3m", icon: "\xB7" },
  segment3d: { displayName: "\u0110o\u1EA1n th\u1EB3ng", icon: "\u2014" },
  line3d: { displayName: "\u0110\u01B0\u1EDDng th\u1EB3ng", icon: "/" },
  ray3d: { displayName: "Tia", icon: "\u2192" },
  vector3d: { displayName: "Vector", icon: "\u2197" },
  plane3d: { displayName: "M\u1EB7t ph\u1EB3ng", icon: "\u25B1" },
  polygon3d: { displayName: "\u0110a gi\xE1c", icon: "\u25C7" },
  sphere3d: { displayName: "M\u1EB7t c\u1EA7u", icon: "\u25EF" },
  polyhedron3d: { displayName: "\u0110a di\u1EC7n", icon: "\u2B22" },
  cylinder3d: { displayName: "H\xECnh tr\u1EE5", icon: "\u232D" },
  cone3d: { displayName: "H\xECnh n\xF3n", icon: "\u25B2" }
};
function getKindUiMeta(kind) {
  return KIND_UI_META[kind] ?? { displayName: kind, icon: "?" };
}
function ObjectRowMenu(props) {
  const { onRename, onChangeColor, onDelete } = props;
  const [open, setOpen] = React2.useState(false);
  return /* @__PURE__ */ jsxs("div", { className: "relative inline-block", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "aria-label": "Row menu",
        onClick: (e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        },
        className: "rounded px-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
        children: "\u22EE"
      }
    ),
    open ? /* @__PURE__ */ jsxs(
      "div",
      {
        role: "menu",
        className: "absolute right-0 z-10 mt-1 w-40 rounded-md border border-zinc-200 bg-white py-1 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900",
        onClick: (e) => e.stopPropagation(),
        children: [
          /* @__PURE__ */ jsx(MenuItem, { onClick: () => {
            setOpen(false);
            onRename();
          }, children: "\u0110\u1ED5i t\xEAn" }),
          /* @__PURE__ */ jsx(MenuItem, { onClick: () => {
            setOpen(false);
            onChangeColor();
          }, children: "\u0110\u1ED5i m\xE0u" }),
          /* @__PURE__ */ jsx(MenuItem, { onClick: () => {
            setOpen(false);
            onDelete();
          }, className: "text-red-600", children: "Xo\xE1" })
        ]
      }
    ) : null
  ] });
}
function MenuItem({ children, onClick, className }) {
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      role: "menuitem",
      onClick,
      className: `block w-full px-3 py-1 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 ${className ?? ""}`,
      children
    }
  );
}
function ObjectRow(props) {
  const { obj, selected, onSelect, onToggleVisible, onToggleLocked, onRename, onChangeColor, onDelete } = props;
  const meta = getKindUiMeta(obj.kind);
  let summary = "";
  try {
    summary = getKind(obj.kind).describe(obj);
  } catch {
    summary = obj.label;
  }
  return /* @__PURE__ */ jsxs(
    "li",
    {
      "data-testid": `object-row-${obj.id}`,
      "aria-selected": selected,
      onClick: () => onSelect(obj.id),
      className: "flex items-center gap-2 border-b border-zinc-100 px-3 py-1.5 text-xs cursor-pointer dark:border-zinc-800 " + (selected ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-zinc-50 dark:hover:bg-zinc-900"),
      children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": true, className: "inline-block w-4 text-center text-base leading-none", children: meta.icon }),
        /* @__PURE__ */ jsx("span", { className: "min-w-[3ch] font-semibold", children: obj.label }),
        /* @__PURE__ */ jsx("span", { className: "flex-1 truncate text-zinc-500", children: summary }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "aria-label": "Toggle visibility",
            "aria-pressed": !obj.visible,
            onClick: (e) => {
              e.stopPropagation();
              onToggleVisible(obj.id);
            },
            className: "rounded px-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
            children: obj.visible ? "\u{1F441}" : "\u{1F6AB}"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            "aria-label": "Toggle lock",
            "aria-pressed": obj.locked,
            onClick: (e) => {
              e.stopPropagation();
              onToggleLocked(obj.id);
            },
            className: "rounded px-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800",
            children: obj.locked ? "\u{1F512}" : "\u{1F513}"
          }
        ),
        /* @__PURE__ */ jsx(
          ObjectRowMenu,
          {
            onRename: () => onRename(obj.id),
            onChangeColor: () => onChangeColor(obj.id),
            onDelete: () => onDelete(obj.id)
          }
        )
      ]
    }
  );
}
function ObjectListPanel(props) {
  const { store, selectedId, onSelect } = props;
  const subscribe = React2.useCallback(
    (cb) => store.subscribe(() => cb()),
    [store]
  );
  const state = React2.useSyncExternalStore(subscribe, store.getState, store.getState);
  const objects = listObjects(state);
  function handleSelect(id) {
    onSelect?.(id);
  }
  function handleToggleVisible(id) {
    const obj = state.objects[id];
    if (!obj) return;
    store.dispatch({ type: "UPDATE", payload: { id, patch: { visible: !obj.visible } } });
  }
  function handleToggleLocked(id) {
    const obj = state.objects[id];
    if (!obj) return;
    store.dispatch({ type: "UPDATE", payload: { id, patch: { locked: !obj.locked } } });
  }
  function handleDelete(id) {
    store.dispatch({ type: "DELETE", payload: { id } });
  }
  function noop() {
  }
  return /* @__PURE__ */ jsx(
    "ul",
    {
      "data-testid": "object-list-panel",
      className: "flex max-h-[calc(100vh-200px)] flex-col overflow-y-auto",
      children: objects.length === 0 ? /* @__PURE__ */ jsx("li", { className: "px-3 py-4 text-center text-xs text-zinc-500", children: "Ch\u01B0a c\xF3 \u0111\u1ED1i t\u01B0\u1EE3ng n\xE0o" }) : objects.map((obj) => /* @__PURE__ */ jsx(
        ObjectRow,
        {
          obj,
          state,
          selected: obj.id === selectedId,
          onSelect: handleSelect,
          onToggleVisible: handleToggleVisible,
          onToggleLocked: handleToggleLocked,
          onRename: noop,
          onChangeColor: noop,
          onDelete: handleDelete
        },
        obj.id
      ))
    }
  );
}

export { MobileToolDrawer, ObjectListPanel, useChordShortcut };
//# sourceMappingURL=chunk-IHC2SIRB.mjs.map
//# sourceMappingURL=chunk-IHC2SIRB.mjs.map