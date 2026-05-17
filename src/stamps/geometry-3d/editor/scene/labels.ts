import type { ObjectKind } from './types';

const A = 'A'.charCodeAt(0);

export function nextPointLabel(existing: string[]): string {
  const used = new Set(existing);
  for (let suffix = 0; suffix < 1000; suffix++) {
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(A + i);
      const candidate = suffix === 0 ? letter : `${letter}_${suffix}`;
      if (!used.has(candidate)) return candidate;
    }
  }
  return `P_${used.size}`;
}

const LOWERCASE_KINDS: ObjectKind[] = ['segment', 'line', 'ray', 'vector'];
const PREFIX: Partial<Record<ObjectKind, string>> = {
  sphere: 's',
  polyhedron: 'h',
  cylinder: 'c',
  cone: 'k',
  polygon: 'g',
  plane: 'π',
};

export function nextDerivedLabel(kind: ObjectKind, existing: string[]): string {
  const used = new Set(existing);
  if (LOWERCASE_KINDS.includes(kind)) {
    for (let i = 0; i < 26; i++) {
      const c = String.fromCharCode('a'.charCodeAt(0) + i);
      if (!used.has(c)) return c;
    }
    for (let n = 1; n < 1000; n++) {
      const c = `a_${n}`;
      if (!used.has(c)) return c;
    }
  }
  const prefix = PREFIX[kind] ?? kind[0];
  for (let n = 1; n < 1000; n++) {
    const candidate = `${prefix}_${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefix}_x`;
}
