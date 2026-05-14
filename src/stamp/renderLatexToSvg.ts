let cachedCss: string | null = null;

// Absolute origin để inlined CSS có thể load fonts khi SVG render trong
// Excalidraw / image context (relative paths fail trong nested URL contexts).
function absoluteOrigin(): string {
  if (typeof window !== 'undefined' && window.location) return window.location.origin;
  return '';
}

async function loadKatexCss(): Promise<string> {
  if (cachedCss !== null) return cachedCss;
  try {
    if (typeof fetch === 'function') {
      const res = await fetch('/katex.min.css');
      if (res.ok) {
        let css = await res.text();
        // Rewrite relative font URLs → absolute origin URLs.
        // KaTeX CSS uses url(fonts/...) — relative to /katex.min.css → /fonts/...
        // Trong SVG <foreignObject> được render thành image, relative resolves
        // tới page URL (/room/...) thay vì root, gây 404.
        const origin = absoluteOrigin();
        if (origin) {
          css = css.replace(/url\((['"]?)(fonts\/)/g, `url($1${origin}/$2`);
        }
        cachedCss = css;
        return css;
      }
    }
  } catch {
    /* ignore */
  }
  cachedCss = '';
  return '';
}

export async function renderLatexToSvg(src: string, displayMode: boolean): Promise<string> {
  const katex = await import('katex');
  const html = katex.default.renderToString(src, { displayMode, throwOnError: true, output: 'html' });

  const measureDiv = document.createElement('div');
  measureDiv.style.cssText = 'position:absolute;top:-9999px;left:-9999px;visibility:hidden;display:inline-block;';
  measureDiv.innerHTML = html;
  document.body.appendChild(measureDiv);
  const rect = measureDiv.getBoundingClientRect();
  const width = Math.ceil(rect.width) || 50;
  const height = Math.ceil(rect.height) || 20;
  document.body.removeChild(measureDiv);

  const cssText = await loadKatexCss();

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '">' +
    '<foreignObject width="100%" height="100%">' +
    '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:16px;line-height:1.2;">' +
    '<style>' + cssText + '</style>' +
    html +
    '</div>' +
    '</foreignObject>' +
    '</svg>';
}
