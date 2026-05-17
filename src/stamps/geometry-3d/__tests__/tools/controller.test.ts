import { ToolController } from '../../editor/tools/controller';
import { Scene3D } from '../../editor/scene/Scene3D';

test('selectTool resets state', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('segment');
  expect(ctrl.getState().tool?.key).toBe('segment');
  expect(ctrl.getState().stepIndex).toBe(0);
  expect(ctrl.getState().collected).toHaveLength(0);
});

test('consumeHit advances stepIndex on matched ground hit', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('segment');
  const accepted = ctrl.consumeHit({ kind: 'onGround', world: [1, 1, 0] });
  expect(accepted).toBe(true);
  expect(ctrl.getState().stepIndex).toBe(1);
});

test('consumeHit rejects when step expects point but hit is empty', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('point');
  const accepted = ctrl.consumeHit({ kind: 'empty' });
  expect(accepted).toBe(false);
  expect(ctrl.getState().stepIndex).toBe(0);
});

test('consumeHit rejects existingPoint when step.allowExisting is false', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('point'); // point tool has allowExisting: false
  const accepted = ctrl.consumeHit({ kind: 'existingPoint', pointId: 'p1' });
  expect(accepted).toBe(false);
});

test('consumeNumber requires a number step', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('segment'); // no number steps
  expect(ctrl.consumeNumber(5)).toBe(false);
});

test('consumeNumber accepts when step is number and value passes min/max', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('cylinder'); // step 0 is point — number is step 2
  ctrl.consumeHit({ kind: 'onGround', world: [0, 0, 0] }); // step 0
  ctrl.consumeHit({ kind: 'onGround', world: [0, 0, 5] }); // step 1
  // Now at step 2 (number, min 0.0001)
  expect(ctrl.consumeNumber(0)).toBe(false);    // below min
  expect(ctrl.consumeNumber(1.5)).toBe(true);   // accepted; this also completes the tool → returns to 'move'
  expect(ctrl.getState().tool?.key).toBe('move');
});

test('completing all steps invokes build() and returns to move tool', () => {
  const scene = new Scene3D();
  const ctrl = new ToolController(scene);
  ctrl.selectTool('point');
  ctrl.consumeHit({ kind: 'onGround', world: [1, 2, 0] });
  // Stub build() returns null but advance() still resets tool to 'move' after the last step
  expect(ctrl.getState().tool?.key).toBe('move');
});
