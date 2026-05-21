// examples/stamp-template/render.ts
// renderSvgFromCustomData: customData → SVG string. SVG được dùng cho:
//   1. Insert lần đầu vào canvas (Excalidraw embed làm image element).
//   2. Restore sau khi reload page (binary files không persist trong appState).
// LƯU Ý: luôn dùng light palette (nét đậm). Excalidraw tự đảo trong dark mode.
export async function renderColorSwatchSvg(color: string): Promise<string> {
  // TODO: thay code này bằng renderer thật (vd JSXGraph, KaTeX, ...).
  const safeColor = /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#cccccc';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
    `<rect width="100" height="100" fill="${safeColor}" stroke="#333" stroke-width="2"/>` +
    '</svg>'
  );
}
