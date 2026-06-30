// TDD: rule twoPerpLinesMeet — giao của HAI đường vuông-góc-qua-điểm.
//   Dạng 1 (gốc, 2 mệnh đề): "Đường thẳng qua M vuông góc với BM cắt đường
//     thẳng qua N vuông góc với CN tại S".
//   Dạng 2 (phân phối — hinh9 #76): "Đường thẳng qua E,F lần lượt vuông góc với
//     OC,OB cắt nhau tại X" → zip E↔OC, F↔OB.
import { twoPerpLinesMeetRule } from '../twoPerpLinesMeet';
import { segmentClauses } from '../../deterministic/coverage';
import { normalizeProblemText } from '../../deterministic/normalizeText';

function ctxOf(text: string) {
  const problem = normalizeProblemText(text);
  const clauses = segmentClauses(problem).filter((c) => c.hasGeometry);
  return { problem, clauses };
}

describe('twoPerpLinesMeetRule — dạng gốc (2 mệnh đề)', () => {
  it('"Đường thẳng qua M vuông góc với BM cắt đường thẳng qua N vuông góc với CN tại S"', () => {
    const p =
      'Đường thẳng qua M vuông góc với BM cắt đường thẳng qua N vuông góc với CN tại S';
    const intents = twoPerpLinesMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'perpThrough', through: 'M', to: 'BM', name: 'prpM' }),
    );
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'perpThrough', through: 'N', to: 'CN', name: 'prpN' }),
    );
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'S', constraint: { kind: 'intersection', of: ['prpM', 'prpN'] } }),
    );
  });
});

describe('twoPerpLinesMeetRule — dạng phân phối (hinh9 #76)', () => {
  it('"Đường thẳng qua E,F lần lượt vuông góc với OC,OB cắt nhau tại X"', () => {
    const p = 'Đường thẳng qua E,F lần lượt vuông góc với OC,OB cắt nhau tại X';
    const intents = twoPerpLinesMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    // line qua E ⊥ OC
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'perpThrough', through: 'E', to: 'OC', name: 'prpE' }),
    );
    // line qua F ⊥ OB
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'perpThrough', through: 'F', to: 'OB', name: 'prpF' }),
    );
    // X = prpE ∩ prpF
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'X', constraint: { kind: 'intersection', of: ['prpE', 'prpF'] } }),
    );
  });

  it('chấp nhận "theo thứ tự" thay cho "lần lượt"', () => {
    const p = 'Đường thẳng qua E,F theo thứ tự vuông góc với OC,OB cắt nhau tại X';
    const intents = twoPerpLinesMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'perpThrough', through: 'E', to: 'OC', name: 'prpE' }),
    );
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'X', constraint: { kind: 'intersection', of: ['prpE', 'prpF'] } }),
    );
  });

  it('chấp nhận thiếu "lần lượt/theo thứ tự"', () => {
    const p = 'Đường thẳng qua E,F vuông góc với OC,OB cắt nhau tại X';
    const intents = twoPerpLinesMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'X', constraint: { kind: 'intersection', of: ['prpE', 'prpF'] } }),
    );
  });

  it('guard: P1 === P2 → không match', () => {
    const p = 'Đường thẳng qua E,E lần lượt vuông góc với OC,OB cắt nhau tại X';
    expect(twoPerpLinesMeetRule.match(ctxOf(p)).flatMap((m) => m.intents)).toHaveLength(0);
  });

  it('guard: S trùng P1/P2 → không match', () => {
    const p = 'Đường thẳng qua E,F lần lượt vuông góc với OC,OB cắt nhau tại E';
    expect(twoPerpLinesMeetRule.match(ctxOf(p)).flatMap((m) => m.intents)).toHaveLength(0);
  });
});

describe('twoPerpLinesMeetRule — dạng 3: mở "Qua/Từ <P> vẽ/kẻ đường thẳng ⊥ <L1>" (C28)', () => {
  it('"Qua A vẽ đường thẳng vuông góc với AN cắt đường thẳng qua O vuông góc BC tại D"', () => {
    const p =
      'Qua A vẽ đường thẳng vuông góc với AN cắt đường thẳng qua O vuông góc BC tại D';
    const intents = twoPerpLinesMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    // line1 = ⊥ AN qua A
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'perpThrough', through: 'A', to: 'AN', name: 'prpA' }),
    );
    // line2 = ⊥ BC qua O
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'draw-line', kind: 'perpThrough', through: 'O', to: 'BC', name: 'prpO' }),
    );
    // D = prpA ∩ prpO
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'D', constraint: { kind: 'intersection', of: ['prpA', 'prpO'] } }),
    );
  });

  it('chấp nhận "Từ" + "kẻ" + thiếu "với" ở vế đầu', () => {
    const p =
      'Từ A kẻ đường thẳng vuông góc AN cắt đường thẳng qua O vuông góc với BC tại D';
    const intents = twoPerpLinesMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    expect(intents).toContainEqual(
      expect.objectContaining({ op: 'add-point', name: 'D', constraint: { kind: 'intersection', of: ['prpA', 'prpO'] } }),
    );
  });

  it('guard: D trùng A/O → không match', () => {
    const p =
      'Qua A vẽ đường thẳng vuông góc với AN cắt đường thẳng qua O vuông góc BC tại A';
    const intents = twoPerpLinesMeetRule.match(ctxOf(p)).flatMap((m) => m.intents) as any[];
    expect(intents).toHaveLength(0);
  });
});
