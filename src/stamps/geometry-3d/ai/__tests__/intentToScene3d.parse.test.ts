import { intentToScene3d } from '../intentToScene3d';
import { solid } from '../intent';
import { ZodError } from 'zod';

it('rejects a structurally invalid intent with a ZodError', () => {
  // missing required field `plane` for cross-section → Intent3DZ.parse must throw ZodError
  expect(() => intentToScene3d([{ op: 'cross-section' } as any])).toThrow(ZodError);
});

it('still builds a valid figure unchanged', () => {
  const st = intentToScene3d([
    solid({ flavor:'pyramid', baseLabels:['A','B','C','D'], baseVariant:'square', apex:'S', apexVariant:'regular' }),
  ]);
  expect(Object.values(st.objects).filter((o:any)=>o.kind==='point3d').length).toBe(5);
});
