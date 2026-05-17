"use client";
import './chunk-BJTO5JO5.mjs';
import { Excalidraw, MainMenu, Footer, WelcomeScreen } from '@excalidraw/excalidraw';
import { jsxs, jsx } from 'react/jsx-runtime';

function ExcalidrawWithMenus(props) {
  const { children, ...rest } = props;
  return /* @__PURE__ */ jsxs(Excalidraw, { ...rest, children: [
    /* @__PURE__ */ jsxs(MainMenu, { children: [
      /* @__PURE__ */ jsx(MainMenu.DefaultItems.LoadScene, {}),
      /* @__PURE__ */ jsx(MainMenu.DefaultItems.SaveAsImage, {}),
      /* @__PURE__ */ jsx(MainMenu.DefaultItems.ClearCanvas, {}),
      /* @__PURE__ */ jsx(MainMenu.DefaultItems.ToggleTheme, {})
    ] }),
    /* @__PURE__ */ jsx(Footer, { children: /* @__PURE__ */ jsx("span", {}) }),
    /* @__PURE__ */ jsx(WelcomeScreen, { children: /* @__PURE__ */ jsx("span", {}) }),
    children
  ] });
}

export { ExcalidrawWithMenus };
//# sourceMappingURL=ExcalidrawWithMenus-EAVPOPJZ.mjs.map
//# sourceMappingURL=ExcalidrawWithMenus-EAVPOPJZ.mjs.map