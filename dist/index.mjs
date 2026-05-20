"use client";
import './index.css';
import { geometryStamp } from './chunk-U5AWJIOW.mjs';
export { geometryStamp } from './chunk-U5AWJIOW.mjs';
import { geometry3dStamp } from './chunk-GBLR4UZB.mjs';
export { geometry3dStamp } from './chunk-GBLR4UZB.mjs';
import { latexStamp } from './chunk-7P7SQFOW.mjs';
export { latexStamp } from './chunk-7P7SQFOW.mjs';
import { graph2dStamp } from './chunk-D257NCQW.mjs';
export { graph2dStamp } from './chunk-D257NCQW.mjs';
export { isGraph2DCustomData } from './chunk-74VEEZBV.mjs';
export { isGeometryCustomData } from './chunk-S6WTYP4E.mjs';
export { isLatexCustomData } from './chunk-X5R72SSJ.mjs';
export { isGeometry3DCustomData } from './chunk-7WYGTUBK.mjs';
import './chunk-MBJVQIF6.mjs';
import './chunk-C6SCVOMC.mjs';
import './chunk-BJTO5JO5.mjs';
import { lazy, useState, useRef, useMemo, useCallback, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { jsxs, jsx, Fragment } from 'react/jsx-runtime';
import '@excalidraw/excalidraw/index.css';

// src/serialize.ts
function pickSyncableAppState(s) {
  return {
    viewBackgroundColor: s.viewBackgroundColor,
    zoom: s.zoom,
    scrollX: s.scrollX,
    scrollY: s.scrollY,
    gridSize: s.gridSize ?? null,
    theme: s.theme
  };
}

// src/stamps/shared/registry.ts
var STABLE_STAMPS = Object.freeze([
  geometryStamp,
  latexStamp
]);
var EXPERIMENTAL_STAMPS = Object.freeze([
  geometry3dStamp,
  graph2dStamp
]);
var ALL_STAMPS = Object.freeze([
  ...STABLE_STAMPS,
  ...EXPERIMENTAL_STAMPS
]);
var DEFAULT_STAMPS = ALL_STAMPS;
function findStampForCustomData(data, stamps = DEFAULT_STAMPS) {
  for (const s of stamps) {
    if (s.matchesCustomData(data)) return s;
  }
  return null;
}
function isStampElement(element, stamps = DEFAULT_STAMPS) {
  return findStampForCustomData(element.customData, stamps) !== null;
}
var MENU_WRAPPER_ID = "stamp-menu-portal-wrapper";
var POPOVER_SELECTOR = ".App-toolbar__extra-tools-dropdown .dropdown-menu-container";
function ToolbarInjector({
  enabled,
  activeStampKind,
  onToggle,
  stamps = DEFAULT_STAMPS
}) {
  const [menuMount, setMenuMount] = useState(null);
  const menuMountRef = useRef(null);
  useEffect(() => {
    if (!enabled) {
      if (menuMountRef.current !== null) {
        menuMountRef.current = null;
        setMenuMount(null);
      }
      document.getElementById(MENU_WRAPPER_ID)?.remove();
      return;
    }
    let cancelled = false;
    let observer = null;
    let rafId = null;
    let observedRoot = null;
    const apply = (next) => {
      if (cancelled || menuMountRef.current === next) return;
      menuMountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMenuMount(next);
      });
    };
    const findMenu = () => {
      if (cancelled) return;
      const container = document.querySelector(POPOVER_SELECTOR);
      if (!container) {
        apply(null);
        return;
      }
      let wrapper = container.querySelector("#" + MENU_WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = MENU_WRAPPER_ID;
        wrapper.setAttribute("data-stamp-menu", "true");
        wrapper.setAttribute("data-stamp-area", "true");
        wrapper.style.display = "contents";
        container.insertBefore(wrapper, container.firstChild);
      }
      apply(wrapper);
    };
    const attachObserver = () => {
      if (cancelled) return;
      const excalidraw = document.querySelector(".excalidraw");
      const nextRoot = excalidraw ?? document.body;
      if (observedRoot === nextRoot) return;
      observer?.disconnect();
      observedRoot = nextRoot;
      observer = new MutationObserver(onMutation);
      observer.observe(nextRoot, { childList: true, subtree: true });
    };
    const onMutation = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (cancelled) return;
        if (observedRoot !== document.querySelector(".excalidraw")) {
          attachObserver();
        }
        findMenu();
      });
    };
    findMenu();
    attachObserver();
    return () => {
      cancelled = true;
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      observer?.disconnect();
      observer = null;
      observedRoot = null;
      document.getElementById(MENU_WRAPPER_ID)?.remove();
    };
  }, [enabled]);
  if (!enabled || !menuMount) return null;
  const closePopover = () => {
    const trigger = document.querySelector(
      ".App-toolbar__extra-tools-trigger"
    );
    trigger?.click();
  };
  return createPortal(
    /* @__PURE__ */ jsxs(Fragment, { children: [
      stamps.map((stamp) => {
        const { displayLabel, shortcut } = splitTitleAndShortcut(
          stamp.toolbarTitle,
          stamp.toolbarLabel
        );
        return /* @__PURE__ */ jsx(
          StampMenuItem,
          {
            icon: stamp.toolbarIcon,
            label: displayLabel,
            ariaLabel: stamp.toolbarTitle,
            shortcut,
            active: activeStampKind === stamp.kind,
            onClick: () => {
              onToggle(stamp.kind);
              closePopover();
            },
            dataTestId: stamp.toolbarTestId
          },
          stamp.kind
        );
      }),
      /* @__PURE__ */ jsx(
        "div",
        {
          "aria-hidden": "true",
          style: {
            height: 1,
            background: "var(--default-border-color, rgba(0,0,0,0.08))",
            margin: "6px 4px"
          }
        }
      )
    ] }),
    menuMount
  );
}
function splitTitleAndShortcut(title, fallbackShortcut) {
  const match = title.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (match) {
    return { displayLabel: match[1].trim(), shortcut: match[2].trim() };
  }
  return { displayLabel: title, shortcut: fallbackShortcut };
}
function StampMenuItem({
  icon,
  label,
  ariaLabel,
  shortcut,
  active,
  onClick,
  dataTestId
}) {
  const className = [
    "dropdown-menu-item",
    "dropdown-menu-item-base",
    active ? "dropdown-menu-item--selected" : ""
  ].filter(Boolean).join(" ");
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick,
      title: ariaLabel,
      "aria-label": ariaLabel,
      "aria-pressed": active,
      "data-testid": dataTestId,
      className,
      children: [
        /* @__PURE__ */ jsx("div", { className: "dropdown-menu-item__icon", "aria-hidden": "true", children: icon }),
        /* @__PURE__ */ jsx("div", { className: "dropdown-menu-item__text", children: label }),
        shortcut ? /* @__PURE__ */ jsx("div", { className: "dropdown-menu-item__shortcut", children: shortcut }) : null
      ]
    }
  );
}
function isEditableTarget(t) {
  if (!t || !(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
function useShortcuts({
  enabled,
  onToggle,
  stamps = DEFAULT_STAMPS
}) {
  useEffect(() => {
    if (!enabled) return;
    const keyToKind = /* @__PURE__ */ new Map();
    for (const s of stamps) keyToKind.set(s.shortcutKey, s.kind);
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      const key = e.key.toLowerCase();
      const kind = keyToKind.get(key);
      if (!kind) return;
      e.preventDefault();
      e.stopPropagation();
      onToggle(kind);
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, [enabled, onToggle, stamps]);
}
var WRAPPER_ID = "pdf-import-portal-wrapper";
var POPOVER_SELECTOR2 = ".App-toolbar__extra-tools-dropdown .dropdown-menu-container";
function PdfImporterButton({ enabled, onPick }) {
  const [mount, setMount] = useState(null);
  const mountRef = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => {
    if (!enabled) {
      mountRef.current = null;
      setMount(null);
      document.getElementById(WRAPPER_ID)?.remove();
      return;
    }
    let cancelled = false;
    let observer = null;
    let rafId = null;
    let observedRoot = null;
    const apply = (next) => {
      if (cancelled || mountRef.current === next) return;
      mountRef.current = next;
      queueMicrotask(() => {
        if (!cancelled) setMount(next);
      });
    };
    const findMenu = () => {
      if (cancelled) return;
      const container = document.querySelector(POPOVER_SELECTOR2);
      if (!container) {
        apply(null);
        return;
      }
      let wrapper = container.querySelector("#" + WRAPPER_ID);
      if (!wrapper) {
        wrapper = document.createElement("div");
        wrapper.id = WRAPPER_ID;
        wrapper.setAttribute("data-pdf-import", "true");
        wrapper.style.display = "contents";
        container.appendChild(wrapper);
      }
      apply(wrapper);
    };
    const attachObserver = () => {
      if (cancelled) return;
      const excalidraw = document.querySelector(".excalidraw");
      const nextRoot = excalidraw ?? document.body;
      if (observedRoot === nextRoot) return;
      observer?.disconnect();
      observedRoot = nextRoot;
      observer = new MutationObserver(onMutation);
      observer.observe(nextRoot, { childList: true, subtree: true });
    };
    const onMutation = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (cancelled) return;
        if (observedRoot !== document.querySelector(".excalidraw")) {
          attachObserver();
        }
        findMenu();
      });
    };
    findMenu();
    attachObserver();
    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      observer?.disconnect();
      document.getElementById(WRAPPER_ID)?.remove();
    };
  }, [enabled]);
  const closePopover = () => {
    const trigger = document.querySelector(
      ".App-toolbar__extra-tools-trigger"
    );
    trigger?.click();
  };
  const handleClick = () => {
    inputRef.current?.click();
  };
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onPick(file);
    e.target.value = "";
    closePopover();
  };
  if (!enabled || !mount) {
    return /* @__PURE__ */ jsx(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept: "application/pdf,.pdf",
        style: { display: "none" },
        onChange: handleFileChange
      }
    );
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "input",
      {
        ref: inputRef,
        type: "file",
        accept: "application/pdf,.pdf",
        style: { display: "none" },
        onChange: handleFileChange
      }
    ),
    createPortal(
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: handleClick,
          title: "Ch\xE8n PDF (P)",
          "aria-label": "Ch\xE8n PDF",
          "data-testid": "pdf-import-button",
          className: "dropdown-menu-item dropdown-menu-item-base",
          children: [
            /* @__PURE__ */ jsx("div", { className: "dropdown-menu-item__icon", "aria-hidden": "true", children: /* @__PURE__ */ jsx(PdfIcon, {}) }),
            /* @__PURE__ */ jsx("div", { className: "dropdown-menu-item__text", children: "Ch\xE8n PDF" }),
            /* @__PURE__ */ jsx("div", { className: "dropdown-menu-item__shortcut", children: "P" })
          ]
        }
      ),
      mount
    )
  ] });
}
function PdfIcon() {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      width: "18",
      height: "18",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ jsx("path", { d: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" }),
        /* @__PURE__ */ jsx("path", { d: "M14 3v5h5" }),
        /* @__PURE__ */ jsx("text", { x: "7.5", y: "17", fontSize: "6", fontFamily: "sans-serif", fontWeight: "700", stroke: "none", fill: "currentColor", children: "PDF" })
      ]
    }
  );
}

// src/pdf/parseRange.ts
function parsePageRange(input, totalPages) {
  if (!Number.isInteger(totalPages) || totalPages <= 0) {
    throw new Error("S\u1ED1 trang ph\u1EA3i l\xE0 s\u1ED1 nguy\xEAn d\u01B0\u01A1ng.");
  }
  const trimmed = input.trim();
  if (trimmed === "") return [];
  const tokens = trimmed.split(/[,\s]+/).map((t) => t.trim()).filter((t) => t.length > 0);
  const set = /* @__PURE__ */ new Set();
  for (const token of tokens) {
    if (token.includes("-")) {
      const parts = token.split("-");
      if (parts.length !== 2) {
        throw new Error(`Kho\u1EA3ng trang kh\xF4ng h\u1EE3p l\u1EC7: "${token}".`);
      }
      const start = parseStrictInt(parts[0]);
      const end = parseStrictInt(parts[1]);
      if (start === null || end === null) {
        throw new Error(`Kho\u1EA3ng trang kh\xF4ng h\u1EE3p l\u1EC7: "${token}".`);
      }
      if (start > end) {
        throw new Error(`Kho\u1EA3ng trang ng\u01B0\u1EE3c: "${token}" (\u0111\u1EA7u > cu\u1ED1i).`);
      }
      if (start < 1 || end > totalPages) {
        throw new Error(
          `Kho\u1EA3ng trang v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n: "${token}". PDF c\xF3 ${totalPages} trang.`
        );
      }
      for (let i = start; i <= end; i++) set.add(i);
    } else {
      const n = parseStrictInt(token);
      if (n === null) {
        throw new Error(`S\u1ED1 trang kh\xF4ng h\u1EE3p l\u1EC7: "${token}".`);
      }
      if (n < 1 || n > totalPages) {
        throw new Error(
          `S\u1ED1 trang v\u01B0\u1EE3t gi\u1EDBi h\u1EA1n: ${n}. PDF c\xF3 ${totalPages} trang.`
        );
      }
      set.add(n);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}
function parseStrictInt(s) {
  if (!/^-?\d+$/.test(s)) return null;
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

// src/pdf/rasterize.ts
var workerSrcOverride = null;
var pdfjsCache = null;
function configurePdfWorker(workerSrc) {
  workerSrcOverride = workerSrc;
  if (pdfjsCache) {
    pdfjsCache.GlobalWorkerOptions.workerSrc = workerSrc;
  }
}
async function loadPdfjs() {
  if (pdfjsCache) return pdfjsCache;
  const mod = await import('pdfjs-dist');
  const workerSrc = workerSrcOverride ?? `https://cdn.jsdelivr.net/npm/pdfjs-dist@${mod.version}/build/pdf.worker.min.mjs`;
  mod.GlobalWorkerOptions.workerSrc = workerSrc;
  pdfjsCache = mod;
  return mod;
}
async function loadPdfDocument(source) {
  const pdfjs = await loadPdfjs();
  const data = source instanceof ArrayBuffer ? source : await source.arrayBuffer();
  const task = pdfjs.getDocument({ data: new Uint8Array(data) });
  return task.promise;
}
async function closePdfDocument(doc) {
  try {
    await doc.cleanup();
    await doc.destroy();
  } catch {
  }
}
async function rasterizePdf(doc, options = {}) {
  const scale = options.scale ?? 2;
  const total = doc.numPages;
  const pages = options.pages ?? Array.from({ length: total }, (_, i) => i + 1);
  const signal = options.signal;
  const result = [];
  for (let i = 0; i < pages.length; i++) {
    if (signal?.aborted) {
      throw new DOMException("Rasterize PDF b\u1ECB hu\u1EF7.", "AbortError");
    }
    const pageNum = pages[i];
    const page = await doc.getPage(pageNum);
    try {
      const rendered = await renderPageToPng(page, scale);
      result.push({ pageNumber: pageNum, mimeType: "image/png", ...rendered });
    } finally {
      page.cleanup();
    }
    options.onProgress?.(i + 1, pages.length);
  }
  return result;
}
async function renderPageToPng(page, scale) {
  const viewport = page.getViewport({ scale });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c 2D context c\u1EE7a canvas.");
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataURL = canvas.toDataURL("image/png");
  return { dataURL, width, height };
}
async function renderPageThumbnail(page, scale = 0.3, quality = 0.7) {
  const viewport = page.getViewport({ scale });
  const width = Math.ceil(viewport.width);
  const height = Math.ceil(viewport.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Kh\xF4ng l\u1EA5y \u0111\u01B0\u1EE3c 2D context c\u1EE7a canvas.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  const dataURL = canvas.toDataURL("image/jpeg", quality);
  return { dataURL, width, height };
}
async function renderAllThumbnails(doc, onEach, options = {}) {
  const total = doc.numPages;
  const scale = options.scale ?? 0.3;
  const quality = options.quality ?? 0.7;
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const signal = options.signal;
  let next = 1;
  async function worker() {
    while (true) {
      if (signal?.aborted) return;
      const pageNum = next++;
      if (pageNum > total) return;
      const page = await doc.getPage(pageNum);
      try {
        if (signal?.aborted) return;
        const { dataURL, width, height } = await renderPageThumbnail(page, scale, quality);
        if (signal?.aborted) return;
        onEach(pageNum, dataURL, width, height);
      } finally {
        page.cleanup();
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, total) }, () => worker())
  );
}
function serializeSelection(pages) {
  if (pages.length === 0) return "";
  const sorted = [...pages].sort((a, b) => a - b);
  const groups = [];
  let start = sorted[0];
  let prev = start;
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i];
    if (n === prev + 1) {
      prev = n;
    } else {
      groups.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = n;
      prev = n;
    }
  }
  groups.push(start === prev ? `${start}` : `${start}-${prev}`);
  return groups.join(",");
}
function PageRangeDialog({ doc, fileName, onConfirm, onCancel }) {
  const totalPages = doc.numPages;
  const defaultPages = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages]
  );
  const [selectedSet, setSelectedSet] = useState(
    () => new Set(defaultPages)
  );
  const [inputValue, setInputValue] = useState(serializeSelection(defaultPages));
  const [inputError, setInputError] = useState(null);
  const [thumbs, setThumbs] = useState({});
  const [thumbProgress, setThumbProgress] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => {
    const ctrl = new AbortController();
    void renderAllThumbnails(
      doc,
      (pageNum, dataURL, width, height) => {
        setThumbs((prev) => ({ ...prev, [pageNum]: { dataURL, width, height } }));
        setThumbProgress((prev) => prev + 1);
      },
      { scale: 0.3, quality: 0.7, concurrency: 3, signal: ctrl.signal }
    ).catch((err) => {
      if (ctrl.signal.aborted) return;
      console.warn("[PageRangeDialog] render thumbnails l\u1ED7i:", err);
    });
    return () => ctrl.abort();
  }, [doc]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [onCancel]);
  const handleInputChange = (next) => {
    setInputValue(next);
    try {
      const pages = parsePageRange(next, totalPages);
      setInputError(null);
      setSelectedSet(new Set(pages));
    } catch (e) {
      setInputError(e.message);
    }
  };
  const toggleThumb = (pageNum) => {
    setSelectedSet((prev) => {
      const next = new Set(prev);
      if (next.has(pageNum)) next.delete(pageNum);
      else next.add(pageNum);
      const serialized = serializeSelection([...next]);
      setInputValue(serialized);
      setInputError(null);
      return next;
    });
  };
  const selectAll = () => {
    setSelectedSet(new Set(defaultPages));
    setInputValue(serializeSelection(defaultPages));
    setInputError(null);
  };
  const clearAll = () => {
    setSelectedSet(/* @__PURE__ */ new Set());
    setInputValue("");
    setInputError(null);
  };
  const canSubmit = inputError === null && selectedSet.size > 0;
  const sortedSelected = useMemo(
    () => [...selectedSet].sort((a, b) => a - b),
    [selectedSet]
  );
  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm(sortedSelected);
  };
  return createPortal(
    /* @__PURE__ */ jsx(
      "div",
      {
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "pdf-range-title",
        style: {
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1e4
        },
        onClick: (e) => {
          if (e.target === e.currentTarget) onCancel();
        },
        children: /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              background: "var(--popup-bg-color, #fff)",
              color: "var(--text-primary-color, #1b1b1f)",
              borderRadius: 12,
              padding: "20px 22px",
              width: "min(880px, 92vw)",
              maxHeight: "88vh",
              boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
              fontFamily: "inherit",
              display: "flex",
              flexDirection: "column",
              gap: 12
            },
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx(
                  "h2",
                  {
                    id: "pdf-range-title",
                    style: { margin: 0, fontSize: 16, fontWeight: 600, lineHeight: 1.3 },
                    children: "Ch\xE8n PDF"
                  }
                ),
                /* @__PURE__ */ jsxs("p", { style: { margin: "4px 0 0", fontSize: 12, opacity: 0.7 }, children: [
                  fileName,
                  " \u2014 ",
                  totalPages,
                  " trang",
                  thumbProgress < totalPages && /* @__PURE__ */ jsxs(Fragment, { children: [
                    " \xB7 \u0111ang t\u1EA3i preview ",
                    thumbProgress,
                    "/",
                    totalPages,
                    "\u2026"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", gap: 10 }, children: [
                /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ jsx(
                    "label",
                    {
                      style: { display: "block", fontSize: 12, marginBottom: 4, opacity: 0.75 },
                      children: "Trang c\u1EA7n ch\xE8n (vd: 1,3,5-10) \u2014 ho\u1EB7c click thumbnail b\xEAn d\u01B0\u1EDBi"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "input",
                    {
                      ref: inputRef,
                      type: "text",
                      value: inputValue,
                      onChange: (e) => handleInputChange(e.target.value),
                      onKeyDown: (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSubmit();
                        }
                      },
                      style: {
                        width: "100%",
                        boxSizing: "border-box",
                        padding: "8px 10px",
                        fontSize: 14,
                        borderRadius: 6,
                        border: `1px solid ${inputError ? "#dc2626" : "rgba(0,0,0,0.2)"}`,
                        outline: "none",
                        background: "var(--input-bg-color, #fff)",
                        color: "inherit",
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
                      }
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, paddingTop: 18 }, children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: selectAll,
                      style: quickBtnStyle,
                      title: "Ch\u1ECDn t\u1EA5t c\u1EA3 trang",
                      children: "T\u1EA5t c\u1EA3"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: clearAll,
                      style: quickBtnStyle,
                      title: "B\u1ECF ch\u1ECDn t\u1EA5t c\u1EA3",
                      children: "B\u1ECF h\u1EBFt"
                    }
                  )
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { style: { minHeight: 18, fontSize: 12 }, "data-testid": "pdf-range-status", children: inputError ? /* @__PURE__ */ jsx("span", { style: { color: "#dc2626" }, children: inputError }) : /* @__PURE__ */ jsxs("span", { style: { opacity: 0.75 }, children: [
                "\u0110\xE3 ch\u1ECDn ",
                /* @__PURE__ */ jsx("strong", { children: selectedSet.size }),
                " / ",
                totalPages,
                " trang"
              ] }) }),
              /* @__PURE__ */ jsx(
                "div",
                {
                  style: {
                    flex: 1,
                    minHeight: 240,
                    maxHeight: "60vh",
                    overflow: "auto",
                    padding: 8,
                    background: "rgba(0,0,0,0.04)",
                    borderRadius: 8,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                    gap: 10,
                    alignContent: "start"
                  },
                  children: Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const thumb = thumbs[pageNum];
                    const selected = selectedSet.has(pageNum);
                    return /* @__PURE__ */ jsx(
                      ThumbnailItem,
                      {
                        pageNum,
                        thumb,
                        selected,
                        onToggle: () => toggleThumb(pageNum)
                      },
                      pageNum
                    );
                  })
                }
              ),
              /* @__PURE__ */ jsxs(
                "div",
                {
                  style: {
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 8,
                    paddingTop: 4
                  },
                  children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        type: "button",
                        onClick: onCancel,
                        style: {
                          padding: "8px 14px",
                          fontSize: 13,
                          borderRadius: 6,
                          border: "1px solid rgba(0,0,0,0.15)",
                          background: "transparent",
                          color: "inherit",
                          cursor: "pointer"
                        },
                        children: "Hu\u1EF7"
                      }
                    ),
                    /* @__PURE__ */ jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: handleSubmit,
                        disabled: !canSubmit,
                        style: {
                          padding: "8px 16px",
                          fontSize: 13,
                          borderRadius: 6,
                          border: "none",
                          background: canSubmit ? "#4f46e5" : "rgba(0,0,0,0.15)",
                          color: "#fff",
                          cursor: canSubmit ? "pointer" : "not-allowed",
                          fontWeight: 500
                        },
                        children: [
                          "Ch\xE8n ",
                          selectedSet.size > 0 ? `${selectedSet.size} trang` : ""
                        ]
                      }
                    )
                  ]
                }
              )
            ]
          }
        )
      }
    ),
    document.body
  );
}
var quickBtnStyle = {
  padding: "7px 10px",
  fontSize: 12,
  borderRadius: 6,
  border: "1px solid rgba(0,0,0,0.15)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  whiteSpace: "nowrap"
};
function ThumbnailItem({ pageNum, thumb, selected, onToggle }) {
  const aspect = thumb ? thumb.width / thumb.height : 0.77;
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      onClick: onToggle,
      "aria-pressed": selected,
      "aria-label": `Trang ${pageNum}${selected ? " (\u0111\xE3 ch\u1ECDn)" : ""}`,
      title: `Trang ${pageNum}`,
      style: {
        position: "relative",
        padding: 0,
        background: "#fff",
        border: `2px solid ${selected ? "#4f46e5" : "rgba(0,0,0,0.12)"}`,
        borderRadius: 6,
        overflow: "hidden",
        cursor: "pointer",
        boxShadow: selected ? "0 0 0 3px rgba(79,70,229,0.18)" : "none",
        transition: "border-color 80ms ease, box-shadow 80ms ease"
      },
      children: [
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              width: "100%",
              aspectRatio: aspect.toString(),
              background: "#f5f5f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            },
            children: thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              /* @__PURE__ */ jsx(
                "img",
                {
                  src: thumb.dataURL,
                  alt: "",
                  style: { width: "100%", height: "100%", display: "block", objectFit: "contain" },
                  draggable: false
                }
              )
            ) : /* @__PURE__ */ jsx("div", { style: { fontSize: 11, opacity: 0.5 }, children: "\u2026" })
          }
        ),
        /* @__PURE__ */ jsx(
          "div",
          {
            style: {
              position: "absolute",
              bottom: 4,
              left: 4,
              fontSize: 10,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 4,
              background: selected ? "#4f46e5" : "rgba(0,0,0,0.6)",
              color: "#fff"
            },
            children: pageNum
          }
        ),
        selected && /* @__PURE__ */ jsx(
          "div",
          {
            "aria-hidden": "true",
            style: {
              position: "absolute",
              top: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#4f46e5",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
              boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
            },
            children: "\u2713"
          }
        )
      ]
    }
  );
}

// src/pdf/insertPdfPages.ts
var PAGE_GAP = 24;
var DEFAULT_SCALE = 2;
function insertRasterizedPagesIntoScene(api, rendered, options) {
  if (!api) throw new Error("Excalidraw API ch\u01B0a s\u1EB5n s\xE0ng.");
  if (rendered.length === 0) return { insertedElementIds: [], fileIds: [] };
  const { scale } = options;
  const filesPayload = rendered.map((p) => ({
    id: generateFileId(),
    dataURL: p.dataURL,
    mimeType: p.mimeType,
    created: Date.now()
  }));
  api.addFiles(filesPayload);
  const origin = options.origin ?? getViewportCenter(api);
  const sceneSizes = rendered.map((p) => pixelsToSceneSize(p.width, p.height, scale));
  const maxSceneWidth = Math.max(...sceneSizes.map((s) => s.width));
  const baseX = origin.x - maxSceneWidth / 2;
  let cursorY = origin.y - sceneSizes[0].height / 2;
  const newElements = rendered.map((_, i) => {
    const { width, height } = sceneSizes[i];
    const x = baseX + (maxSceneWidth - width) / 2;
    const y = cursorY;
    cursorY = y + height + PAGE_GAP;
    return buildPdfImageElement(filesPayload[i].id, x, y, width, height);
  });
  const existing = api.getSceneElements();
  api.updateScene({
    elements: [...existing, ...newElements],
    appState: { selectedElementIds: {}, croppingElementId: null }
  });
  return {
    insertedElementIds: newElements.map((e) => e.id),
    fileIds: filesPayload.map((f) => f.id)
  };
}
function pixelsToSceneSize(pxWidth, pxHeight, scale) {
  return { width: pxWidth / scale, height: pxHeight / scale };
}
function buildPdfImageElement(fileId, x, y, width, height) {
  return {
    type: "image",
    id: "pdf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
    x,
    y,
    width,
    height,
    fileId,
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
function generateFileId() {
  return "pdf_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
}
function getViewportCenter(api) {
  const appState = api?.getAppState?.() ?? {
    scrollX: 0,
    scrollY: 0,
    width: 800,
    height: 600,
    zoom: { value: 1 }
  };
  const zoom = appState.zoom?.value ?? 1;
  return {
    x: appState.scrollX + (appState.width ?? 800) / 2 / zoom,
    y: appState.scrollY + (appState.height ?? 600) / 2 / zoom
  };
}
async function insertPdfPages(api, source, options = {}) {
  if (!api) throw new Error("Excalidraw API ch\u01B0a s\u1EB5n s\xE0ng.");
  const scale = options.scale ?? DEFAULT_SCALE;
  const doc = await loadPdfDocument(source);
  let rendered;
  try {
    rendered = await rasterizePdf(doc, {
      pages: options.pages,
      scale,
      onProgress: options.onProgress,
      signal: options.signal
    });
  } finally {
    void closePdfDocument(doc);
  }
  const { insertedElementIds } = insertRasterizedPagesIntoScene(api, rendered, {
    scale,
    origin: options.origin
  });
  return { insertedElementIds, pages: rendered };
}
var DOUBLE_CLICK_MS = 400;
function useStampDoubleClick({ enabled, stamps, onOpen }) {
  const lastClickRef = useRef({
    time: 0,
    elementId: null
  });
  return useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_activeTool, pointerDownState) => {
      if (!enabled) return;
      const hitElement = pointerDownState?.hit?.element;
      if (!hitElement || hitElement.type !== "image") return;
      const stamp = findStampForCustomData(hitElement.customData, stamps);
      if (!stamp) return;
      const now = Date.now();
      const isDouble = lastClickRef.current.elementId === hitElement.id && now - lastClickRef.current.time < DOUBLE_CLICK_MS;
      lastClickRef.current = { time: now, elementId: hitElement.id };
      if (!isDouble) return;
      onOpen(stamp.kind, {
        id: hitElement.id,
        customData: hitElement.customData
      });
    },
    [enabled, stamps, onOpen]
  );
}
var ALLOWED_KEYS = /* @__PURE__ */ new Set([
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Home",
  "End",
  "PageUp",
  "PageDown"
]);
function isEditable(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}
function useStampShortcutBlocker({ activeStamp, stamps }) {
  const shortcutKeys = useMemo(
    () => new Set(stamps.map((s) => s.shortcutKey.toLowerCase())),
    [stamps]
  );
  useEffect(() => {
    if (!activeStamp) return;
    const blocker = (e) => {
      if (isEditable(e.target)) return;
      if (e.ctrlKey || e.metaKey) return;
      if (ALLOWED_KEYS.has(e.key)) return;
      if (e.key === "Escape") return;
      if (shortcutKeys.has(e.key.toLowerCase())) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", blocker, { capture: true });
    return () => window.removeEventListener("keydown", blocker, { capture: true });
  }, [activeStamp, shortcutKeys]);
}
function useStampClickOutside({ activeStamp, hostRef, onClose }) {
  useEffect(() => {
    if (!activeStamp) return;
    let lastFire = 0;
    const handler = (e) => {
      const target = e.target;
      if (!target) return;
      if (target.closest('[data-stamp-area="true"]')) return;
      const now = Date.now();
      if (now - lastFire < 50) return;
      lastFire = now;
      hostRef.current?.tryInsert();
      onClose();
    };
    window.addEventListener("pointerdown", handler, { capture: true });
    window.addEventListener("mousedown", handler, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", handler, { capture: true });
      window.removeEventListener("mousedown", handler, { capture: true });
    };
  }, [activeStamp, hostRef, onClose]);
}

// src/stamps/shared/restoreStampFiles.ts
function svgToDataURL(svg) {
  const utf8 = unescape(encodeURIComponent(svg));
  return "data:image/svg+xml;base64," + btoa(utf8);
}
async function buildFileForStamp(fileId, customData, stamp) {
  try {
    const svg = await stamp.renderSvgFromCustomData(customData);
    return { id: fileId, dataURL: svgToDataURL(svg), mimeType: "image/svg+xml", created: Date.now() };
  } catch (err) {
    console.warn("Stamp restore failed for", fileId, "(" + stamp.kind + ")", err);
    return null;
  }
}
async function restoreMissingStampFiles(api, elements, stamps = DEFAULT_STAMPS) {
  if (!api) return;
  const filesToAdd = [];
  const newPathHandled = /* @__PURE__ */ new Set();
  for (const el of elements) {
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp?.restoreFileFromCustomData) continue;
    const restored = await stamp.restoreFileFromCustomData(el);
    if (!restored) continue;
    newPathHandled.add(el.id);
    filesToAdd.push({
      id: restored.fileId,
      dataURL: restored.dataURL,
      mimeType: restored.mimeType,
      created: Date.now()
    });
  }
  const existing = typeof api.getFiles === "function" ? api.getFiles() : {};
  const seen = /* @__PURE__ */ new Set();
  for (const el of elements) {
    if (newPathHandled.has(el.id)) continue;
    if (el.type !== "image") continue;
    if (!el.fileId) continue;
    if (existing && existing[el.fileId]) continue;
    if (seen.has(el.fileId)) continue;
    const stamp = findStampForCustomData(el.customData, stamps);
    if (!stamp) continue;
    seen.add(el.fileId);
    const built = await buildFileForStamp(el.fileId, el.customData, stamp);
    if (built) filesToAdd.push(built);
  }
  if (filesToAdd.length > 0) {
    try {
      api.addFiles(filesToAdd);
    } catch (err) {
      console.warn("addFiles failed:", err);
    }
  }
}

// src/core/persistence/validation.ts
var STORAGE_KEY_RE = /^[a-zA-Z0-9_-]{1,128}$/;
function validateStorageKey(key) {
  if (typeof key !== "string" || !STORAGE_KEY_RE.test(key)) {
    const sample = key === void 0 ? "undefined" : String(key).slice(0, 32);
    throw new Error(
      `[whiteboard] Invalid storageKey: must match ${STORAGE_KEY_RE} (got: ${sample})`
    );
  }
  return key;
}
var DANGEROUS_KEYS = /* @__PURE__ */ new Set(["__proto__", "constructor", "prototype"]);
function sanitizingReviver(_key, value) {
  if (DANGEROUS_KEYS.has(_key)) return void 0;
  return value;
}
var MAX_NESTED_DEPTH = 64;
function depthExceeds(v, max, depth = 0) {
  if (depth > max) return true;
  if (v === null || typeof v !== "object") return false;
  const children = Array.isArray(v) ? v : Object.values(v);
  for (const child of children) {
    if (depthExceeds(child, max, depth + 1)) return true;
  }
  return false;
}
var ALLOWED_TOP_LEVEL_KEYS = /* @__PURE__ */ new Set(["version", "elements", "appState", "savedAt"]);
function isPlainObject(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function safeParseScene(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw, sanitizingReviver);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  if (depthExceeds(parsed, MAX_NESTED_DEPTH)) return null;
  const safe = {};
  for (const k of Object.keys(parsed)) {
    if (ALLOWED_TOP_LEVEL_KEYS.has(k)) safe[k] = parsed[k];
  }
  if (!Array.isArray(safe.elements)) return null;
  for (const el of safe.elements) {
    if (!isPlainObject(el)) return null;
    if (typeof el.id !== "string" || typeof el.type !== "string") return null;
  }
  const appState = isPlainObject(safe.appState) ? safe.appState : {};
  return {
    version: safe.version,
    elements: safe.elements,
    appState,
    savedAt: safe.savedAt
  };
}

// src/core/persistence/sceneStore.ts
var PREFIX = "whiteboard:scene:";
var SCHEMA_VERSION = 1;
function fullKey(key) {
  return PREFIX + key;
}
function readScene(key) {
  const validKey = validateStorageKey(key);
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(fullKey(validKey));
  if (!raw) return null;
  const parsed = safeParseScene(raw);
  if (!parsed) {
    console.warn("[whiteboard] scene parse/validation failed, clear:", validKey);
    try {
      window.localStorage.removeItem(fullKey(validKey));
    } catch {
    }
    return null;
  }
  if (parsed.version !== SCHEMA_VERSION) {
    console.warn(
      `[whiteboard] scene version ${parsed.version} kh\xF4ng kh\u1EDBp ${SCHEMA_VERSION}, b\u1ECF qua.`
    );
    return null;
  }
  return {
    version: SCHEMA_VERSION,
    elements: parsed.elements,
    appState: parsed.appState,
    savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now()
  };
}
function writeScene(key, payload) {
  const validKey = validateStorageKey(key);
  if (typeof window === "undefined") return;
  const record = {
    version: SCHEMA_VERSION,
    elements: payload.elements,
    appState: payload.appState,
    savedAt: Date.now()
  };
  try {
    window.localStorage.setItem(fullKey(validKey), JSON.stringify(record));
  } catch (err) {
    console.warn("[whiteboard] scene write failed:", err);
  }
}

// src/core/persistence/fileStore.ts
var DB_NAME = "whiteboard-files";
var DB_VERSION = 1;
var STORE = "files";
var dbPromise = null;
var idbDisabled = false;
function openDb() {
  if (idbDisabled) return Promise.reject(new Error("IndexedDB disabled"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      idbDisabled = true;
      reject(new Error("indexedDB undefined"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("storageKey", "storageKey", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      idbDisabled = true;
      reject(req.error ?? new Error("IDB open failed"));
    };
  });
  return dbPromise;
}
async function withStore(mode, fn, fallback) {
  let db;
  try {
    db = await openDb();
  } catch {
    return fallback;
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result = fallback;
    try {
      fn(
        store,
        (value) => {
          result = value;
        },
        reject
      );
    } catch (err) {
      reject(err);
      return;
    }
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => {
      console.warn("[whiteboard] IDB tx error:", tx.error);
      reject(tx.error ?? new Error("IDB tx error"));
    };
    tx.onabort = () => reject(tx.error ?? new Error("IDB tx aborted"));
  });
}
async function readFiles(storageKey) {
  const validKey = validateStorageKey(storageKey);
  try {
    return await withStore(
      "readonly",
      (store, setResult, fail) => {
        const out = {};
        const req = store.index("storageKey").openCursor(IDBKeyRange.only(validKey));
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            setResult(out);
            return;
          }
          const record = cursor.value;
          out[record.id] = {
            dataURL: record.dataURL,
            mimeType: record.mimeType,
            created: record.created
          };
          cursor.continue();
        };
        req.onerror = () => fail(req.error);
      },
      {}
    );
  } catch (err) {
    console.warn("[whiteboard] readFiles failed:", err);
    return {};
  }
}
async function writeFiles(storageKey, files) {
  const validKey = validateStorageKey(storageKey);
  const entries = Object.entries(files);
  if (entries.length === 0) return;
  try {
    await withStore(
      "readwrite",
      (store, setResult, fail) => {
        let pending = entries.length;
        const finishOne = () => {
          pending -= 1;
          if (pending === 0) setResult(void 0);
        };
        const now = Date.now();
        for (const [id, f] of entries) {
          const ff = f;
          const getReq = store.get(id);
          getReq.onsuccess = () => {
            if (getReq.result) {
              finishOne();
              return;
            }
            const rec = {
              id,
              storageKey: validKey,
              dataURL: ff.dataURL,
              mimeType: ff.mimeType,
              created: ff.created ?? now,
              savedAt: now
            };
            const putReq = store.put(rec);
            putReq.onsuccess = finishOne;
            putReq.onerror = () => fail(putReq.error);
          };
          getReq.onerror = () => fail(getReq.error);
        }
        ;
      },
      void 0
    );
  } catch (err) {
    console.warn("[whiteboard] writeFiles failed:", err);
  }
}
async function pruneFiles(storageKey, keepIds) {
  const validKey = validateStorageKey(storageKey);
  try {
    await withStore(
      "readwrite",
      (store, setResult, fail) => {
        const req = store.index("storageKey").openCursor(IDBKeyRange.only(validKey));
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            setResult(void 0);
            return;
          }
          const record = cursor.value;
          if (keepIds.has(record.id)) {
            cursor.continue();
            return;
          }
          const deleteReq = cursor.delete();
          deleteReq.onsuccess = () => cursor.continue();
          deleteReq.onerror = () => fail(deleteReq.error);
        };
        req.onerror = () => fail(req.error);
      },
      void 0
    );
  } catch (err) {
    console.warn("[whiteboard] pruneFiles failed:", err);
  }
}
var Excalidraw = lazy(
  () => import('./ExcalidrawWithMenus-EAVPOPJZ.mjs').then((m) => ({ default: m.ExcalidrawWithMenus }))
);
var ExcalidrawLoadingFallback = () => /* @__PURE__ */ jsx("div", { className: "flex h-full items-center justify-center text-sm text-gray-500", children: "\u0110ang t\u1EA3i b\u1EA3ng\u2026" });
var SYNC_THROTTLE_MS = 200;
function Whiteboard({
  storageKey = "default",
  readOnly = false,
  onSceneChange,
  onFilesChange,
  onApi,
  langCode = "vi-VN",
  stamps = DEFAULT_STAMPS,
  initialScene,
  initialFiles
}) {
  const [api, setApi] = useState(null);
  const apiRef = useRef(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const isDarkThemeRef = useRef(false);
  const knownFileIdsRef = useRef(/* @__PURE__ */ new Set());
  const lastSceneHashRef = useRef("");
  const sceneThrottleRef = useRef(null);
  const fileThrottleRef = useRef(null);
  const pruneThrottleRef = useRef(null);
  const latestSceneRef = useRef(null);
  const pendingFilesRef = useRef({});
  const hashElementsVersionRef = useRef(null);
  const stampsRef = useRef(stamps);
  stampsRef.current = stamps;
  const persistEnabled = typeof storageKey === "string" && storageKey.length > 0;
  const persistKeyRef = useRef(storageKey);
  persistKeyRef.current = storageKey;
  const onSceneChangeRef = useRef(onSceneChange);
  onSceneChangeRef.current = onSceneChange;
  const onFilesChangeRef = useRef(onFilesChange);
  onFilesChangeRef.current = onFilesChange;
  const persistEnabledRef = useRef(persistEnabled);
  persistEnabledRef.current = persistEnabled;
  const persistedInitial = useMemo(
    () => persistEnabled ? readScene(storageKey) : null,
    [persistEnabled, storageKey]
  );
  const effectiveInitialScene = initialScene !== void 0 ? initialScene : persistedInitial ? {
    elements: persistedInitial.elements,
    appState: persistedInitial.appState
  } : null;
  const [activeStamp, setActiveStamp] = useState(null);
  const activeStampRef = useRef(activeStamp);
  activeStampRef.current = activeStamp;
  const [editingElement, setEditingElement] = useState(null);
  const hostRef = useRef(null);
  const [pdfPending, setPdfPending] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const handledCropIdRef = useRef(null);
  const prevExcalidrawToolRef = useRef("selection");
  const stampByKind = useMemo(() => {
    const m = /* @__PURE__ */ new Map();
    for (const s of stamps) m.set(s.kind, s);
    return m;
  }, [stamps]);
  const activeStampDef = activeStamp ? stampByKind.get(activeStamp) ?? null : null;
  const HostComponent = activeStampDef?.Host ?? null;
  const openStamp = useCallback(
    (kind, element = null) => {
      if (readOnly) return;
      if (!stampByKind.has(kind)) return;
      setEditingElement(element);
      setActiveStamp(kind);
    },
    [readOnly, stampByKind]
  );
  const closeStamp = useCallback(() => {
    setActiveStamp(null);
    setEditingElement(null);
  }, []);
  const toggleStampByKind = useCallback(
    (kind) => {
      if (activeStamp === kind) closeStamp();
      else openStamp(kind);
    },
    [activeStamp, openStamp, closeStamp]
  );
  const handleChange = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (elements, appState, files) => {
      const nextDark = appState?.theme === "dark";
      if (isDarkThemeRef.current !== nextDark) {
        isDarkThemeRef.current = nextDark;
        queueMicrotask(() => setIsDarkTheme(nextDark));
      }
      if (readOnly) return;
      latestSceneRef.current = { elements, appState };
      const cropId = appState?.croppingElementId;
      if (cropId && cropId !== handledCropIdRef.current && api) {
        const el = elements.find((e) => e.id === cropId);
        if (el) {
          const stamp = findStampForCustomData(el.customData, stamps);
          if (stamp) {
            handledCropIdRef.current = cropId;
            const elId = el.id;
            const elCustom = el.customData;
            const stampKind = stamp.kind;
            queueMicrotask(() => {
              try {
                api.updateScene({
                  appState: { croppingElementId: null, selectedElementIds: {} }
                });
              } catch {
              }
              openStamp(stampKind, { id: elId, customData: elCustom });
            });
            return;
          }
        }
      }
      if (!cropId) {
        handledCropIdRef.current = null;
      }
      const fileIds = Object.keys(files);
      const newIds = fileIds.filter((id) => !knownFileIdsRef.current.has(id));
      if (newIds.length > 0) {
        newIds.forEach((id) => knownFileIdsRef.current.add(id));
        onFilesChange?.(files, newIds);
      }
      if (!sceneThrottleRef.current) {
        sceneThrottleRef.current = setTimeout(async () => {
          sceneThrottleRef.current = null;
          try {
            const mod = await import('@excalidraw/excalidraw');
            hashElementsVersionRef.current = mod.hashElementsVersion;
          } catch (err) {
            console.warn("[whiteboard] import excalidraw \u0111\u1EC3 flush scene th\u1EA5t b\u1EA1i:", err);
            return;
          }
          flushSceneRef.current();
        }, SYNC_THROTTLE_MS);
      }
      if (persistEnabled && newIds.length > 0) {
        for (const id of newIds) {
          if (files[id]) pendingFilesRef.current[id] = files[id];
        }
        if (!fileThrottleRef.current) {
          fileThrottleRef.current = setTimeout(() => {
            fileThrottleRef.current = null;
            flushFilesRef.current();
          }, 1e3);
        }
      }
      if (persistEnabled && !pruneThrottleRef.current) {
        pruneThrottleRef.current = setTimeout(() => {
          pruneThrottleRef.current = null;
          flushPruneRef.current();
        }, 2e3);
      }
    },
    [readOnly, api, onSceneChange, onFilesChange, persistEnabled, storageKey, stamps, openStamp]
  );
  const flushSceneRef = useRef(() => void 0);
  flushSceneRef.current = () => {
    try {
      const latestScene = latestSceneRef.current;
      if (!latestScene) return;
      const liveElements = latestScene.elements.filter((e) => !e.isDeleted);
      const liveAppState = pickSyncableAppState(latestScene.appState);
      const hashFn = hashElementsVersionRef.current;
      const elementHash = hashFn ? hashFn(liveElements) : liveElements.map((e) => e.id).join("|");
      const sceneHash = `${elementHash}:${JSON.stringify(liveAppState)}`;
      if (sceneHash === lastSceneHashRef.current) return;
      lastSceneHashRef.current = sceneHash;
      onSceneChangeRef.current?.({ elements: liveElements, appState: liveAppState });
      if (persistEnabledRef.current) {
        writeScene(persistKeyRef.current, {
          elements: liveElements,
          appState: liveAppState
        });
      }
    } catch (err) {
      console.warn("[whiteboard] flushScene th\u1EA5t b\u1EA1i:", err);
    }
  };
  const flushFilesRef = useRef(() => void 0);
  flushFilesRef.current = () => {
    try {
      const pending = pendingFilesRef.current;
      pendingFilesRef.current = {};
      if (Object.keys(pending).length === 0) return;
      const currentElements = apiRef.current?.getSceneElements?.() ?? latestSceneRef.current?.elements ?? [];
      const stampIds = /* @__PURE__ */ new Set();
      for (const el of currentElements) {
        const fid = el.fileId;
        if (fid && isStampElement(el)) stampIds.add(fid);
      }
      const raster = {};
      for (const [id, f] of Object.entries(pending)) {
        if (!stampIds.has(id)) raster[id] = f;
      }
      if (Object.keys(raster).length > 0) {
        void writeFiles(persistKeyRef.current, raster);
      }
    } catch (err) {
      console.warn("[whiteboard] flushFiles th\u1EA5t b\u1EA1i:", err);
    }
  };
  const flushPruneRef = useRef(() => void 0);
  flushPruneRef.current = () => {
    try {
      const currentElements = apiRef.current?.getSceneElements?.() ?? latestSceneRef.current?.elements ?? [];
      const keep = /* @__PURE__ */ new Set();
      for (const el of currentElements) {
        const fid = el.fileId;
        if (fid && !isStampElement(el)) keep.add(fid);
      }
      void pruneFiles(persistKeyRef.current, keep);
    } catch (err) {
      console.warn("[whiteboard] flushPrune th\u1EA5t b\u1EA1i:", err);
    }
  };
  const initialFilesAddedRef = useRef(false);
  useEffect(() => {
    if (!api || initialFilesAddedRef.current) return;
    initialFilesAddedRef.current = true;
    if (!initialFiles) return;
    const entries = Object.entries(initialFiles);
    if (entries.length === 0) return;
    try {
      api.addFiles(
        entries.map(([id, f]) => ({
          id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          dataURL: f.dataURL,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mimeType: f.mimeType,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          created: f.created ?? Date.now()
        }))
      );
      entries.forEach(([id]) => knownFileIdsRef.current.add(id));
    } catch (err) {
      console.warn("[whiteboard] addFiles initialFiles th\u1EA5t b\u1EA1i:", err);
    }
  }, [api]);
  useEffect(() => {
    if (!api || !persistEnabled) return;
    let cancelled = false;
    void readFiles(storageKey).then(
      (files) => {
        if (cancelled) return;
        const entries = Object.entries(files);
        if (entries.length === 0) return;
        if (cancelled) return;
        try {
          api.addFiles(
            entries.map(([id, f]) => ({
              id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              dataURL: f.dataURL,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              mimeType: f.mimeType,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              created: f.created ?? Date.now()
            }))
          );
          if (cancelled) return;
          entries.forEach(([id]) => knownFileIdsRef.current.add(id));
        } catch (err) {
          if (cancelled) return;
          console.warn("[whiteboard] addFiles t\u1EEB IDB th\u1EA5t b\u1EA1i:", err);
        }
      },
      (err) => {
        if (cancelled) return;
        console.warn("[whiteboard] readFiles th\u1EA5t b\u1EA1i:", err);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [api, persistEnabled, storageKey]);
  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      try {
        const elements = api.getSceneElements();
        if (!elements || elements.length === 0) return;
        if (cancelled) return;
        await restoreMissingStampFiles(api, elements, stampsRef.current);
      } catch (err) {
        if (cancelled) return;
        console.warn("Math stamp restore pass failed:", err);
      }
    };
    void run();
    const t = setTimeout(() => {
      void run();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [api, persistedInitial]);
  useEffect(
    () => () => {
      if (sceneThrottleRef.current) {
        clearTimeout(sceneThrottleRef.current);
        sceneThrottleRef.current = null;
        flushSceneRef.current();
      }
      if (fileThrottleRef.current) {
        clearTimeout(fileThrottleRef.current);
        fileThrottleRef.current = null;
        flushFilesRef.current();
      }
      if (pruneThrottleRef.current) {
        clearTimeout(pruneThrottleRef.current);
        pruneThrottleRef.current = null;
        flushPruneRef.current();
      }
    },
    []
  );
  const handlePointerDown = useStampDoubleClick({
    enabled: !readOnly,
    stamps,
    onOpen: openStamp
  });
  useShortcuts({
    enabled: !readOnly,
    onToggle: toggleStampByKind,
    stamps
  });
  useEffect(() => {
    if (!api) return;
    if (activeStamp) {
      try {
        const cur = api.getAppState?.()?.activeTool?.type ?? "selection";
        if (cur && cur !== "hand") prevExcalidrawToolRef.current = cur;
        api.setActiveTool?.({ type: "hand" });
      } catch {
      }
    } else {
      try {
        api.setActiveTool?.({ type: prevExcalidrawToolRef.current });
      } catch {
      }
    }
  }, [activeStamp, api]);
  useStampShortcutBlocker({ activeStamp, stamps });
  useEffect(() => {
    if (!activeStamp) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === "TEXTAREA" || ae.isContentEditable)) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      closeStamp();
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [activeStamp, closeStamp]);
  useStampClickOutside({ activeStamp, hostRef, onClose: closeStamp });
  const handlePdfPick = useCallback(
    async (file) => {
      if (readOnly || pdfBusy) return;
      setPdfBusy(true);
      try {
        const doc = await loadPdfDocument(file);
        setPdfPending({ doc, fileName: file.name, totalPages: doc.numPages });
      } catch (err) {
        console.warn("[whiteboard] \u0110\u1ECDc PDF th\u1EA5t b\u1EA1i:", err);
        window.alert("Kh\xF4ng \u0111\u1ECDc \u0111\u01B0\u1EE3c PDF. File c\xF3 th\u1EC3 \u0111\xE3 h\u1ECFng ho\u1EB7c b\u1ECB m\u1EADt kh\u1EA9u b\u1EA3o v\u1EC7.");
      } finally {
        setPdfBusy(false);
      }
    },
    [readOnly, pdfBusy]
  );
  const handlePdfConfirm = useCallback(
    async (pages) => {
      if (!pdfPending || !api) return;
      const { doc } = pdfPending;
      setPdfPending(null);
      setPdfBusy(true);
      const scale = 2;
      try {
        const rendered = await rasterizePdf(doc, { pages, scale });
        await closePdfDocument(doc);
        insertRasterizedPagesIntoScene(api, rendered, { scale });
      } catch (err) {
        console.warn("[whiteboard] Ch\xE8n PDF th\u1EA5t b\u1EA1i:", err);
        window.alert("Ch\xE8n PDF th\u1EA5t b\u1EA1i. Xem console \u0111\u1EC3 bi\u1EBFt chi ti\u1EBFt.");
      } finally {
        setPdfBusy(false);
      }
    },
    [pdfPending, api]
  );
  const handlePdfCancel = useCallback(() => {
    if (pdfPending) {
      void closePdfDocument(pdfPending.doc);
    }
    setPdfPending(null);
  }, [pdfPending]);
  useEffect(() => {
    if (readOnly) return;
    const root = document.querySelector(".excalidraw");
    if (!root) return;
    const onDragOver = (e) => {
      const items = e.dataTransfer?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === "file" && items[i].type === "application/pdf") {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
          return;
        }
      }
    };
    const onDrop = (e) => {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      const pdf = Array.from(files).find((f) => f.type === "application/pdf");
      if (!pdf) return;
      e.preventDefault();
      e.stopPropagation();
      void handlePdfPick(pdf);
    };
    root.addEventListener("dragover", onDragOver, { capture: true });
    root.addEventListener("drop", onDrop, { capture: true });
    return () => {
      root.removeEventListener("dragover", onDragOver, { capture: true });
      root.removeEventListener("drop", onDrop, { capture: true });
    };
  }, [readOnly, handlePdfPick, api]);
  return /* @__PURE__ */ jsxs("div", { className: `relative h-full w-full${isDarkTheme ? " theme--dark" : ""}`, children: [
    /* @__PURE__ */ jsx(Suspense, { fallback: /* @__PURE__ */ jsx(ExcalidrawLoadingFallback, {}), children: /* @__PURE__ */ jsx(
      Excalidraw,
      {
        excalidrawAPI: (a) => {
          if (apiRef.current === a) return;
          apiRef.current = a;
          queueMicrotask(() => {
            setApi(a);
            onApi?.(a);
          });
        },
        langCode,
        viewModeEnabled: readOnly,
        initialData: effectiveInitialScene ? {
          elements: effectiveInitialScene.elements,
          appState: {
            ...effectiveInitialScene.appState,
            gridSize: effectiveInitialScene.appState.gridSize ?? void 0
          }
        } : { appState: { viewBackgroundColor: "#ffffff" } },
        onChange: handleChange,
        onPointerDown: handlePointerDown
      }
    ) }),
    /* @__PURE__ */ jsx(
      ToolbarInjector,
      {
        enabled: !readOnly,
        activeStampKind: activeStamp,
        onToggle: toggleStampByKind,
        stamps
      }
    ),
    /* @__PURE__ */ jsx(PdfImporterButton, { enabled: !readOnly, onPick: handlePdfPick }),
    pdfPending && /* @__PURE__ */ jsx(
      PageRangeDialog,
      {
        doc: pdfPending.doc,
        fileName: pdfPending.fileName,
        onConfirm: handlePdfConfirm,
        onCancel: handlePdfCancel
      }
    ),
    pdfBusy && !pdfPending && /* @__PURE__ */ jsx(
      "div",
      {
        "aria-live": "polite",
        role: "status",
        style: {
          position: "fixed",
          bottom: 16,
          right: 16,
          padding: "8px 14px",
          background: "rgba(0,0,0,0.75)",
          color: "#fff",
          borderRadius: 6,
          fontSize: 12,
          zIndex: 1e4
        },
        children: "\u0110ang x\u1EED l\xFD PDF\u2026"
      }
    ),
    HostComponent && /* @__PURE__ */ jsx(
      HostComponent,
      {
        ref: hostRef,
        api,
        editingElement,
        onClose: closeStamp,
        isDark: isDarkTheme
      }
    )
  ] });
}

export { ALL_STAMPS, DEFAULT_STAMPS, EXPERIMENTAL_STAMPS, STABLE_STAMPS, Whiteboard, closePdfDocument, configurePdfWorker, findStampForCustomData, insertPdfPages, insertRasterizedPagesIntoScene, isStampElement, loadPdfDocument, parsePageRange, pickSyncableAppState, rasterizePdf, restoreMissingStampFiles };
//# sourceMappingURL=index.mjs.map
//# sourceMappingURL=index.mjs.map