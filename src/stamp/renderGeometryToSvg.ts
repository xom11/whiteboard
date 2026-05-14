export function renderGeometryToSvg(boardContainer: HTMLElement): string {
  const svgEl = boardContainer.querySelector('svg');
  if (!svgEl) throw new Error('renderGeometryToSvg: no SVG found in board container');
  const clone = svgEl.cloneNode(true) as SVGElement;
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  return new XMLSerializer().serializeToString(clone);
}
