// src/core/scene/__tests__/migrations.test.ts
import { migrateState } from '../migrations/runMigrations';
import { registerKind, __clearRegistryForTests } from '../registry';
import { __clearStateMigrationsForTests, registerStateMigration } from '../migrations/state';
import type { KindDef } from '../types';

const pointV3Def: KindDef = {
  type: 'point',
  schemaVersion: 3,
  migrate: {
    1: (v0) => ({ ...v0, label: '' }),
    2: (v1) => ({ ...v1, locked: false }),
    3: (v2) => ({ ...v2, layer: 'default' }),
  },
  dependsOn: () => [], describe: () => '', render: () => null,
};

describe('migrations', () => {
  beforeEach(() => {
    __clearRegistryForTests();
    __clearStateMigrationsForTests();
    registerKind(pointV3Def);
  });

  test('migrate chain v0 → v3 chạy đủ 3 step', () => {
    const raw = {
      objects: { p1: { id: 'p1', kind: 'point', schemaVersion: 0, attrs: { x: 0, y: 0 } } },
      order: ['p1'],
      counter: 1,
      meta: { domain: '3d', version: 1 },
    };
    const state = migrateState(raw);
    const obj = state.objects.p1;
    expect(obj.schemaVersion).toBe(3);
    expect(obj.label).toBe('');
    expect(obj.locked).toBe(false);
    expect(obj.layer).toBe('default');
  });

  test('throw nếu kind không có trong registry', () => {
    const raw = {
      objects: { x: { id: 'x', kind: 'unknown', schemaVersion: 1, attrs: {} } },
      order: ['x'], counter: 1, meta: { domain: '3d', version: 1 },
    };
    expect(() => migrateState(raw)).toThrow(/unknown/);
  });

  test('throw nếu version gap không có migration', () => {
    const raw = {
      objects: { p1: { id: 'p1', kind: 'point', schemaVersion: 10, attrs: {} } },
      order: ['p1'], counter: 1, meta: { domain: '3d', version: 1 },
    };
    expect(() => migrateState(raw)).toThrow(/migration/i);
  });

  test('state-level migration chạy trước per-object', () => {
    registerStateMigration(2, (s) => ({ ...s, meta: { ...s.meta, version: 2 } }));
    const raw = {
      objects: {}, order: [], counter: 0,
      meta: { domain: '3d', version: 1 },
    };
    const state = migrateState(raw);
    expect(state.meta.version).toBe(2);
  });
});
