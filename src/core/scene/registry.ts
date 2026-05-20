// src/core/scene/registry.ts
import type { KindDef } from './types';

const registry = new Map<string, KindDef>();

export function registerKind<A = Record<string, unknown>>(def: KindDef<A>): void {
  if (registry.has(def.type)) {
    console.warn(`[scene] kind "${def.type}" đã được đăng ký — ghi đè định nghĩa cũ`);
  }
  registry.set(def.type, def as unknown as KindDef);
}

export function getKind(type: string): KindDef {
  const def = registry.get(type);
  if (!def) throw new Error(`[scene] unknown kind: ${type}`);
  return def;
}

export function listKinds(): KindDef[] {
  return Array.from(registry.values());
}

// Chỉ dùng cho test — reset registry giữa các test case.
export function __clearRegistryForTests(): void {
  registry.clear();
}
