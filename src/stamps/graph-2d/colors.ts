export const GRAPH_PALETTE = [
  '#2563eb', // blue
  '#dc2626', // red
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#db2777', // pink
  '#65a30d', // lime
] as const;

export const FUNCTION_NAMES = ['f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'] as const;

export const MAX_FUNCTIONS = 8;
export const MAX_PARAMETERS = 8;

export function nextColor(usedColors: readonly string[]): string {
  for (const c of GRAPH_PALETTE) {
    if (!usedColors.includes(c)) return c;
  }
  return GRAPH_PALETTE[usedColors.length % GRAPH_PALETTE.length];
}

export function nextFunctionName(usedNames: readonly string[]): string {
  for (const n of FUNCTION_NAMES) {
    if (!usedNames.includes(n)) return n;
  }
  return FUNCTION_NAMES[usedNames.length % FUNCTION_NAMES.length];
}
