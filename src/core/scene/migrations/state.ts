// src/core/scene/migrations/state.ts
import type { State } from '../types';

type StateMigration = (state: any) => any;

const stateMigrations = new Map<number, StateMigration>();

export function registerStateMigration(toVersion: number, fn: StateMigration): void {
  stateMigrations.set(toVersion, fn);
}

export function listStateMigrations(): Map<number, StateMigration> {
  return stateMigrations;
}

export const CURRENT_STATE_VERSION = 1;

export function __clearStateMigrationsForTests(): void {
  stateMigrations.clear();
}
