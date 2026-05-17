import type { CollectedArg } from '../spec';
import type { Scene3D } from '../../scene/Scene3D';
import { ensurePoint } from './_ensurePoint';

export function buildSegment(args: CollectedArg[], scene: Scene3D): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, scene);
  const p2 = ensurePoint(args[1].hit, scene);
  if (!p1 || !p2 || p1 === p2) return null;
  return scene.addObject('segment', { p1, p2 });
}

export function buildLine(args: CollectedArg[], scene: Scene3D): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const p1 = ensurePoint(args[0].hit, scene);
  const p2 = ensurePoint(args[1].hit, scene);
  if (!p1 || !p2 || p1 === p2) return null;
  return scene.addObject('line', { p1, p2 });
}

export function buildRay(args: CollectedArg[], scene: Scene3D): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const origin = ensurePoint(args[0].hit, scene);
  const through = ensurePoint(args[1].hit, scene);
  if (!origin || !through || origin === through) return null;
  return scene.addObject('ray', { origin, through });
}

export function buildVector(args: CollectedArg[], scene: Scene3D): string | null {
  if (args.length < 2 || !args[0].hit || !args[1].hit) return null;
  const from = ensurePoint(args[0].hit, scene);
  const to = ensurePoint(args[1].hit, scene);
  if (!from || !to || from === to) return null;
  return scene.addObject('vector', { from, to });
}
