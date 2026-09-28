/** @jest-environment jsdom */
import { pointOnSideAtRatioRule } from '../pointOnSideAtRatio';
import { segmentClauses } from '../../deterministic/coverage';
import { toaDoHinh, dist, thuocDoan } from '../../__tests__/helpers/toaDoHinh';

// jsdom thiếu matchMedia — JSXGraph thật gọi nó lúc initBoard.
beforeAll(() => {
  window.matchMedia ??= (() => ({ matches: false, addListener() {}, removeListener() {} })) as never;
});

function intentsOf(problem: string) {
  return pointOnSideAtRatioRule
    .match({ problem, clauses: segmentClauses(problem) })
    .flatMap((m) => m.intents) as any[];
}

/** Điểm P trên đoạn XY đúng tỉ số XP/XY = k (đo toạ độ JSXGraph thật). */
function chiaDung(p: Record<string, [number, number]>, P: string, X: string, Y: string, k: number) {
  expect(thuocDoan(p[P], p[X], p[Y])).toBe(true);
  expect(dist(p[X], p[P]) / dist(p[X], p[Y])).toBeCloseTo(k, 9);
}

describe('pointOnSideAtRatio — điểm chia đoạn theo tỉ số (Thalès)', () => {
  it('bài 32: "điểm M thuộc đoạn thẳng BC sao cho BM = 2MC" → BM/BC = 2/3', () => {
    chiaDung(toaDoHinh('Cho tam giác ABC, điểm M thuộc đoạn thẳng BC sao cho BM = 2MC.'), 'M', 'B', 'C', 2 / 3);
  });

  it('bài 104: "Trên đường chéo AC lấy điểm E sao cho AC = 3AE" (trước đây mệnh đề bị coi văn xuôi, E mất)', () => {
    const p = toaDoHinh('Cho hình bình hành ABCD. Trên đường chéo AC lấy điểm E sao cho AC = 3AE. Qua E vẽ đường thẳng song song với CD, cắt AD và BC theo thứ tự ở M và N.');
    chiaDung(p, 'E', 'A', 'C', 1 / 3);
    // Thalès: M chia AD cùng tỉ số.
    chiaDung(p, 'M', 'A', 'D', 1 / 3);
  });

  it('bài 31: nhiều điểm cùng đoạn "AE = EG = GD" → 1/3, 2/3 đúng thứ tự', () => {
    const p = toaDoHinh('Cho tam giác ABC có đường trung tuyến AD, trên đoạn thẳng AD lấy hai điểm E, G sao cho AE = EG = GD.');
    chiaDung(p, 'E', 'A', 'D', 1 / 3);
    chiaDung(p, 'G', 'A', 'D', 2 / 3);
  });

  it('bài 101: số đo cm quy về tỉ lệ cạnh đề cho "Điểm D nằm trên cạnh BC sao cho BD = 2 cm" (BC = 8 cm)', () => {
    const p = toaDoHinh('Cho tam giác ABC có AB = 5 cm, BC = 8 cm, AC = 7 cm. Điểm D nằm trên cạnh BC sao cho BD = 2 cm. Qua D kẻ các đường thẳng song song với AB và AC, cắt AC và AB lần lượt tại F và E.');
    chiaDung(p, 'D', 'B', 'C', 1 / 4);
    expect(p.E && p.F).toBeTruthy();
  });

  it('phân phối "Trên các cạnh AB, AC lấy lần lượt M, N sao cho AM = 2MB, AN = 2NC"', () => {
    const p = toaDoHinh('Cho tam giác ABC. Trên các cạnh AB, AC lấy lần lượt M, N sao cho AM = 2MB, AN = 2NC.');
    chiaDung(p, 'M', 'A', 'B', 2 / 3);
    chiaDung(p, 'N', 'A', 'C', 2 / 3);
  });

  it('điểm không ràng buộc cùng mệnh đề = điểm tự do trên cạnh; điểm có tỉ số dựng đúng', () => {
    const p = toaDoHinh('Cho tam giác ABC. Trên cạnh AB lấy điểm M, trên cạnh AC lấy điểm N sao cho AN = 2NC.');
    expect(thuocDoan(p.M, p.A, p.B)).toBe(true);
    chiaDung(p, 'N', 'A', 'C', 2 / 3);
  });

  it.each([
    ['BM/MC = 2/3', 'M thuộc cạnh BC sao cho BM/MC = 2/3', 'M', 'B', 'C', 2 / 5],
    ['BM : MC = 1 : 2', 'lấy M trên cạnh BC sao cho BM : MC = 1 : 2', 'M', 'B', 'C', 1 / 3],
    ['AM = 1/3 AB', 'Trên cạnh AB lấy điểm M sao cho AM = 1/3 AB', 'M', 'A', 'B', 1 / 3],
    ['AM = AB/4', 'Trên cạnh AB lấy điểm M sao cho AM = AB/4', 'M', 'A', 'B', 1 / 4],
    ['mốc đầu cuối "CD = 3DB"', 'Trên cạnh BC lấy D sao cho CD = 3DB', 'D', 'B', 'C', 1 / 4],
    ['cạnh nêu ngược "Trên cạnh CA … AD = 3DC"', 'Trên cạnh CA lấy D sao cho AD = 3DC', 'D', 'A', 'C', 3 / 4],
  ])('%s', (_ten, menhDe, P, X, Y, k) => {
    chiaDung(toaDoHinh(`Cho tam giác ABC. ${menhDe}.`), P, X, Y, k);
  });

  it.each([
    ['tỉ số giữa hai đoạn KHÁC đoạn gốc', 'Cho tam giác ABC. Trên cạnh AB lấy D sao cho AD = 2BC.'],
    ['số đo mà không biết độ dài cạnh', 'Cho tam giác ABC. Trên cạnh AC lấy D sao cho AD = 2 cm.'],
    ['nghiệm ngoài đoạn (AD = 2AB)', 'Cho tam giác ABC. Trên cạnh AB lấy D sao cho AD = 2AB.'],
    ['tích — hệ thức, không phải tỉ số', 'Cho tam giác ABC. Trên cạnh BC lấy M sao cho MB.MC = MA.'],
    ['một điểm có quan hệ không đọc được → bỏ CẢ mệnh đề (không vẽ thiếu mà báo đủ)', 'Cho tam giác ABC. Trên các cạnh AB, AC lấy lần lượt M, N sao cho AM = 2MB, AN = BC.'],
    ['hai điểm hai cạnh ràng buộc chéo (AM = CN)', 'Cho hình vuông ABCD. Trên cạnh AB lấy M, trên cạnh CD lấy N sao cho AM = CN.'],
  ])('bỏ qua (%s)', (_ly, de) => {
    expect(intentsOf(de)).toEqual([]);
  });
});
