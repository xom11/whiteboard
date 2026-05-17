import { cylinderFaces, coneFaces, CURVED_SEGMENTS } from '../../editor/renderer/faceted';

test('cylinderFaces produces 2 ring caps + N side faces', () => {
  const result = cylinderFaces([0, 0, 0], [0, 0, 5], 1);
  expect(result.vertices).toHaveLength(CURVED_SEGMENTS * 2);
  // 2 caps + CURVED_SEGMENTS side rectangles
  expect(result.faces).toHaveLength(2 + CURVED_SEGMENTS);
  // First face = base ring vertex indices [0..N-1]
  expect(result.faces[0]).toEqual(Array.from({ length: CURVED_SEGMENTS }, (_, i) => i));
});

test('coneFaces produces 1 base cap + N triangular side faces', () => {
  const result = coneFaces([0, 0, 0], [0, 0, 5], 1);
  expect(result.vertices).toHaveLength(CURVED_SEGMENTS + 1);
  expect(result.faces).toHaveLength(1 + CURVED_SEGMENTS);
  // Last vertex is the apex
  expect(result.vertices[CURVED_SEGMENTS]).toEqual([0, 0, 5]);
});
