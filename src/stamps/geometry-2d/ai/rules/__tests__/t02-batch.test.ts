// Batch test cho các pattern thêm khi phủ dataset T02 (olympiad).
import { intersectionRule } from '../intersection';
import { tangentsAtMeetRule } from '../tangentsAtMeet';
import { triangleRule } from '../triangle';
import { onSegmentPointRule } from '../onSegmentPoint';
import { lineCircleIntersectionRule } from '../lineCircleIntersection';
import { parallelPerpRule } from '../parallelPerp';
import { segmentClauses } from '../../deterministic/coverage';
import { tryDeterministicFigure } from '../../deterministic/tryDeterministicFigure';

function run(rule: any, problem: string) {
  return rule.match({ problem, clauses: segmentClauses(problem) }).flatMap((m: any) => m.intents);
}

describe('intersection — phân phối N cặp + ký hiệu ∩', () => {
  it('"M, N, P lần lượt là giao của các cặp đường thẳng AC và BD; AB và CD; AD và BC" (Brokard)', () => {
    const all = run(
      intersectionRule,
      'Gọi M, N, P lần lượt là giao của các cặp đường thẳng AC và BD; AB và CD; AD và BC',
    );
    const by = Object.fromEntries(all.map((i: any) => [i.name, i.constraint.of.join('∩')]));
    expect(by).toEqual({ M: 'AC∩BD', N: 'AB∩CD', P: 'AD∩BC' });
  });

  it('blob KHÔNG vượt dấu chấm (proof phía sau không tạo cặp giả)', () => {
    const all = run(
      intersectionRule,
      'Gọi X, Y, Z lần lượt là giao của các cặp đường thẳng (MP, NQ), (CX, MQ), (BX, PN). Chứng minh rằng AX, BY, CZ đồng quy.',
    );
    expect(all.map((i: any) => i.name).sort()).toEqual(['X', 'Y', 'Z']);
  });

  it('ký hiệu ∩ — "K = AE ∩ BD"', () => {
    const all = run(intersectionRule, 'Gọi K = AE ∩ BD');
    expect(all).toContainEqual(
      expect.objectContaining({ name: 'K', constraint: { kind: 'intersection', of: ['AE', 'BD'] } }),
    );
  });

  it('∩ với điểm CÓ CHỈ SỐ — "A1 = BC ∩ AP", "A2 = BC ∩ B1C1"', () => {
    const all = run(intersectionRule, 'A1 = BC ∩ AP, A2 = BC ∩ B1C1');
    expect(all).toContainEqual(
      expect.objectContaining({ name: 'A1', constraint: { kind: 'intersection', of: ['BC', 'AP'] } }),
    );
    expect(all).toContainEqual(
      expect.objectContaining({ name: 'A2', constraint: { kind: 'intersection', of: ['BC', 'B1C1'] } }),
    );
  });
});

describe('tangentsAtMeet — 2 tiếp tuyến tại B, C cắt nhau', () => {
  it('"Các tiếp tuyến của (O) tại B và C cắt nhau tại J" → tB, tC, J=tB∩tC', () => {
    const all = run(tangentsAtMeetRule, 'Cho tam giác ABC nội tiếp (O). Các tiếp tuyến của (O) tại B và C cắt nhau tại J');
    expect(all).toContainEqual(expect.objectContaining({ op: 'draw-line', kind: 'tangentAt' }));
    expect(all).toContainEqual({ op: 'add-point', name: 'J', constraint: { kind: 'intersection', of: ['tB', 'tC'] } });
  });

  it('chữ HOA đầu "Tiếp tuyến" cũng khớp', () => {
    const all = run(tangentsAtMeetRule, 'Cho (O). Tiếp tuyến tại B và C của (O) cắt nhau tại T');
    expect(all.some((i: any) => i.name === 'T')).toBe(true);
  });
});

describe('triangle — tên đứng trước "ABC là tam giác …"', () => {
  it('"ABC là tam giác vuông tại A" → right-at-A', () => {
    const all = run(triangleRule, 'Cho ABC là tam giác vuông tại A');
    expect(all.some((i: any) => i.op === 'draw-shape' && i.shape === 'triangle')).toBe(true);
  });
});

describe('e2e — điểm có chỉ số + excenter Ja dựng được', () => {
  it('"Ja là tâm đường tròn bàng tiếp góc A" → excenter point tên Ja', () => {
    const r = tryDeterministicFigure('Cho tam giác ABC. Gọi Ja là tâm đường tròn bàng tiếp góc A của tam giác ABC.');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.figure.dsl.points.some((p: any) => p.name === 'Ja' && p.kind === 'excenter')).toBe(true);
  });

  it('điểm chỉ số A1/B1 + cặp B1C1 dựng (splitKnownPair builder)', () => {
    const r = tryDeterministicFigure(
      'Cho P là một điểm nằm trong mặt phẳng chứa tam giác ABC. Gọi A1 = BC ∩ AP, B1 = AC ∩ BP, C1 = AB ∩ CP, A2 = BC ∩ B1C1.',
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const names = r.figure.dsl.points.map((p: any) => p.name);
      expect(names).toEqual(expect.arrayContaining(['A1', 'B1', 'C1', 'A2']));
    }
  });
});

describe('lineCircleIntersection — tên trước + "khác A của"', () => {
  it('"K là giao điểm khác A của AY và (O)" → K secondIntersection(AY,O,other=A)', () => {
    const all = run(lineCircleIntersectionRule, 'Gọi K là giao điểm khác A của AY và (O)');
    expect(all).toContainEqual({
      op: 'add-point',
      name: 'K',
      constraint: { kind: 'secondIntersection', line: 'AY', circle: 'O', other: 'A' },
    });
  });
});

describe('parallelPerp — đường qua P vuông góc cắt đường khác tại F', () => {
  it('"F là giao điểm của đường thẳng qua D vuông góc với BC và đường CE"', () => {
    const all = run(parallelPerpRule, 'F là giao điểm của đường thẳng qua D vuông góc với BC và đường CE');
    expect(all).toContainEqual(expect.objectContaining({ op: 'draw-line', name: 'prpD', kind: 'perpThrough' }));
    expect(all).toContainEqual({ op: 'add-point', name: 'F', constraint: { kind: 'intersection', of: ['prpD', 'CE'] } });
  });

  it('"đường thẳng qua D vuông góc với BC cắt CE tại F" (tên sau)', () => {
    const all = run(parallelPerpRule, 'đường thẳng qua D vuông góc với BC cắt CE tại F');
    expect(all).toContainEqual({ op: 'add-point', name: 'F', constraint: { kind: 'intersection', of: ['prpD', 'CE'] } });
  });
});

describe('onSegment — phân phối + prefix "cạnh" optional', () => {
  it('"Các điểm M, N thuộc BC, các điểm P, Q theo thứ tự thuộc AC, AB"', () => {
    const all = run(onSegmentPointRule, 'Các điểm M, N thuộc BC, các điểm P, Q theo thứ tự thuộc AC, AB');
    const by = Object.fromEntries(all.map((i: any) => [i.name, i.constraint.of]));
    expect(by).toMatchObject({ M: 'BC', N: 'BC', P: 'AC', Q: 'AB' });
  });

  it('"Điểm D thuộc AC" (không chữ cạnh) → D onSegment AC', () => {
    const all = run(onSegmentPointRule, 'Điểm D thuộc AC và E là điểm khác');
    expect(all).toContainEqual({ op: 'add-point', name: 'D', constraint: { kind: 'onSegment', of: 'AC' } });
  });
});
