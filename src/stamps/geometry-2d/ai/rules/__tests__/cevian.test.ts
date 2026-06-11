import { cevianRule } from '../cevian';
import { segmentClauses } from '../../deterministic/coverage';

function run(problem: string) {
  return cevianRule.match({ problem, clauses: segmentClauses(problem) });
}

/** Lấy RuleMatch đầu tiên có add-point với kind cho trước. */
function findByKind(matches: ReturnType<typeof run>, kind: string) {
  return matches.find((m) =>
    m.intents.some((i) => (i as any).op === 'add-point' && (i as any).constraint.kind === kind),
  );
}

describe('cevianRule', () => {
  it('"đường cao AH" → perpFoot(from A, onLine BC) + connect A-H segment', () => {
    const m = run('Cho tam giác ABC. Kẻ đường cao AH.');
    expect(m.length).toBe(1);
    const [pt, con] = m[0].intents as any[];
    expect(pt.op).toBe('add-point');
    expect(pt.name).toBe('H');
    expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect(con.op).toBe('connect');
    expect(con.from).toBe('A');
    expect(con.to).toBe('H');
    expect(con.style).toBe('segment');
  });

  it('"AH là đường cao" (tên trước) → perpFoot H', () => {
    const m = run('Cho tam giác ABC, AH là đường cao.');
    const match = findByKind(m, 'perpFoot');
    expect(match).toBeTruthy();
    const pt = match!.intents[0] as any;
    expect(pt.name).toBe('H');
    expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('"trung tuyến AM" → midpoint(of BC) + connect A-M', () => {
    const m = run('Cho tam giác ABC. Vẽ trung tuyến AM.');
    expect(m.length).toBe(1);
    const [pt, con] = m[0].intents as any[];
    expect(pt.name).toBe('M');
    expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    expect(con.from).toBe('A');
    expect(con.to).toBe('M');
    expect(con.style).toBe('segment');
  });

  it('"AM là trung tuyến" (tên trước) → midpoint M', () => {
    const m = run('Cho tam giác ABC, AM là trung tuyến.');
    const match = findByKind(m, 'midpoint');
    expect(match).toBeTruthy();
    const pt = match!.intents[0] as any;
    expect(pt.name).toBe('M');
    expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
  });

  it('"đường phân giác AD" → angleBisectorFoot(from A, onLine BC) + connect A-D', () => {
    const m = run('Cho tam giác ABC. Dựng đường phân giác AD.');
    expect(m.length).toBe(1);
    const [pt, con] = m[0].intents as any[];
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
    expect(con.from).toBe('A');
    expect(con.to).toBe('D');
  });

  it('"tia phân giác BD" → angleBisectorFoot(from B, onLine AC) — cạnh đối B', () => {
    const m = run('Cho tam giác ABC. Vẽ tia phân giác BD.');
    const match = findByKind(m, 'angleBisectorFoot');
    expect(match).toBeTruthy();
    const pt = match!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'B', onLine: 'AC' });
  });

  it('nhiều cevian trong 1 đề → mỗi cevian 1 RuleMatch', () => {
    const m = run('Cho tam giác ABC. Kẻ đường cao AH và trung tuyến BM.');
    expect(findByKind(m, 'perpFoot')).toBeTruthy();
    const median = findByKind(m, 'midpoint');
    expect(median).toBeTruthy();
    const pt = median!.intents[0] as any;
    expect(pt.name).toBe('M');
    expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'AC' });
  });

  it('2 cevian KHÁC loại cùng 1 clause, tên chân KHÁC → emit ĐỦ 2', () => {
    // "đường cao AH và trung tuyến BK" — foot H≠K, không xung đột → cả 2 emit.
    const m = run('Cho tam giác ABC. Kẻ đường cao AH và trung tuyến BK.');
    const alt = findByKind(m, 'perpFoot');
    const med = findByKind(m, 'midpoint');
    expect(alt).toBeTruthy();
    expect(med).toBeTruthy();
    expect((alt!.intents[0] as any).name).toBe('H');
    expect((alt!.intents[0] as any).constraint).toEqual({
      kind: 'perpFoot',
      from: 'A',
      onLine: 'BC',
    });
    expect((med!.intents[0] as any).name).toBe('K');
    expect((med!.intents[0] as any).constraint).toEqual({ kind: 'midpoint', of: 'AC' });
  });

  it('reverse-LIST "AD,BE,CF là các đường cao" → perpFoot D,E,F (tên trước, list)', () => {
    // hinh9 #119: "Gọi AD,BE,CF là các đường cao và H là trực tâm của tam giác ABC".
    // Danh sách tên ĐỨNG TRƯỚC "đường cao" → DISTRIB_LIST (keyword trước) bỏ sót.
    const m = run(
      'Cho tam giác ABC. Gọi AD,BE,CF là các đường cao và H là trực tâm của tam giác ABC.',
    );
    const feet = m
      .map((rm) => rm.intents[0] as any)
      .filter((p) => p.op === 'add-point' && p.constraint.kind === 'perpFoot');
    const byName = new Map(feet.map((p) => [p.name, p.constraint]));
    expect([...byName.keys()].sort()).toEqual(['D', 'E', 'F']);
    expect(byName.get('D')).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    expect(byName.get('E')).toEqual({ kind: 'perpFoot', from: 'B', onLine: 'AC' });
    expect(byName.get('F')).toEqual({ kind: 'perpFoot', from: 'C', onLine: 'AB' });
  });

  it('2 cevian CÙNG loại cùng 1 clause → emit ĐỦ 2 (matchAll, không drop)', () => {
    // "đường cao AH và đường cao BK" — 2 perpFoot khác chân → cả 2 phải emit.
    const m = run('Cho tam giác ABC. Kẻ đường cao AH và đường cao BK.');
    const perpFeet = m
      .map((rm) => rm.intents[0] as any)
      .filter((p) => p.op === 'add-point' && p.constraint.kind === 'perpFoot')
      .map((p) => p.name)
      .sort();
    expect(perpFeet).toEqual(['H', 'K']);
  });

  it('2 cevian KHÁC nhau ĐẶT CÙNG tên chân → XUNG ĐỘT → escalate (rỗng)', () => {
    // "đường cao AH" (foot=H) + "trung tuyến BH" (foot=H, ràng buộc midpoint AC)
    // mâu thuẫn cùng tên H → KHÔNG claim cả 2 (escalate), tránh mis-render.
    const m = run('Cho tam giác ABC. Kẻ đường cao AH và trung tuyến BH.');
    expect(m).toEqual([]);
  });

  it('foot trùng đỉnh tam giác ("đường cao AB") → SKIP (escalate)', () => {
    const m = run('Cho tam giác ABC. Kẻ đường cao AB.');
    expect(m).toEqual([]);
  });

  it('trung tuyến AC (foot=C trùng đỉnh) → SKIP (escalate)', () => {
    const m = run('Cho tam giác ABC. Vẽ trung tuyến AC.');
    expect(m).toEqual([]);
  });

  it('không có tam giác → escalate (rỗng)', () => {
    const m = run('Vẽ đường cao AH của hình.');
    expect(m).toEqual([]);
  });

  it('apex ngoài tam giác → bỏ qua clause', () => {
    // "PQ" — P không phải đỉnh tam giác ABC → không claim.
    const m = run('Cho tam giác ABC. Kẻ đường cao PQ.');
    expect(m).toEqual([]);
  });

  // ── Mức 2: "phân giác trong AD" (từ "trong" chen) + fail-safe "ngoài" ──

  it('"Vẽ phân giác trong AD" → angleBisectorFoot from A + connect A-D', () => {
    const m = run('Cho tam giác ABC. Vẽ phân giác trong AD.');
    const match = findByKind(m, 'angleBisectorFoot');
    expect(match).toBeTruthy();
    const [pt, con] = match!.intents as any[];
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
    expect(con.from).toBe('A');
    expect(con.to).toBe('D');
  });

  it('"Dựng đường phân giác trong AD" → D from A', () => {
    const m = run('Cho tam giác ABC. Dựng đường phân giác trong AD.');
    const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
  });

  it('"Kẻ tia phân giác trong BD" → D from B onLine AC', () => {
    const m = run('Cho tam giác ABC. Kẻ tia phân giác trong BD.');
    const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'B', onLine: 'AC' });
  });

  it('"AD là phân giác trong" (suffix) → D from A', () => {
    const m = run('Cho tam giác ABC, AD là phân giác trong.');
    const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
  });

  it('"phân giác trong" KHÔNG bị nhánh external nuốt (không nhận nhầm)', () => {
    // Đảm bảo internal vẫn chỉ emit angleBisectorFoot, không kèm external.
    const m = run('Cho tam giác ABC. Vẽ phân giác trong AD.');
    expect(findByKind(m, 'angleBisectorFoot')).toBeTruthy();
    expect(findByKind(m, 'externalAngleBisectorFoot')).toBeUndefined();
  });

  // ── Issue #46 nhóm A: "phân giác ngoài AD" (external bisector) → DET ──

  it('"Vẽ phân giác ngoài AD" → externalAngleBisectorFoot(from A, onLine BC) + connect A-D', () => {
    const m = run('Cho tam giác ABC. Vẽ phân giác ngoài AD.');
    const match = findByKind(m, 'externalAngleBisectorFoot');
    expect(match).toBeTruthy();
    const [pt, con] = match!.intents as any[];
    expect(pt.op).toBe('add-point');
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'externalAngleBisectorFoot', from: 'A', onLine: 'BC' });
    expect(con.op).toBe('connect');
    expect(con.from).toBe('A');
    expect(con.to).toBe('D');
    expect(con.style).toBe('segment');
    // Không kèm phân giác trong.
    expect(findByKind(m, 'angleBisectorFoot')).toBeUndefined();
  });

  it('"Kẻ phân giác ngoài AD" → externalAngleBisectorFoot from A', () => {
    const m = run('Cho tam giác ABC. Kẻ phân giác ngoài AD.');
    const pt = findByKind(m, 'externalAngleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'externalAngleBisectorFoot', from: 'A', onLine: 'BC' });
  });

  it('"Dựng đường phân giác ngoài BD" → from B onLine AC (cạnh đối B)', () => {
    const m = run('Cho tam giác ABC. Dựng đường phân giác ngoài BD.');
    const pt = findByKind(m, 'externalAngleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'externalAngleBisectorFoot', from: 'B', onLine: 'AC' });
  });

  it('"AD là phân giác ngoài" (suffix) → externalAngleBisectorFoot from A', () => {
    const m = run('Cho tam giác ABC, AD là phân giác ngoài.');
    const pt = findByKind(m, 'externalAngleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'externalAngleBisectorFoot', from: 'A', onLine: 'BC' });
    // KHÔNG nhận nhầm thành internal.
    expect(findByKind(m, 'angleBisectorFoot')).toBeUndefined();
  });

  it('FAIL-SAFE: "phân giác ngoài AD" KHÔNG có tam giác → escalate (rỗng)', () => {
    expect(run('Vẽ phân giác ngoài AD của hình.')).toEqual([]);
  });

  it('FAIL-SAFE: "phân giác ngoài AB" (foot=B trùng đỉnh) → SKIP (escalate)', () => {
    expect(run('Cho tam giác ABC. Vẽ phân giác ngoài AB.')).toEqual([]);
  });

  it('FAIL-SAFE: "phân giác ngoài PD" (apex P ngoài tam giác) → bỏ qua', () => {
    expect(run('Cho tam giác ABC. Vẽ phân giác ngoài PD.')).toEqual([]);
  });

  // ── Mức 2: keyword HOA đầu câu ("Đường cao"/"Trung tuyến"/"Phân giác") ──

  it('"Đường cao AH" (hoa đầu câu) → perpFoot H', () => {
    const m = run('Cho tam giác ABC. Đường cao AH từ A.');
    const pt = findByKind(m, 'perpFoot')!.intents[0] as any;
    expect(pt.name).toBe('H');
    expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
  });

  it('"Trung tuyến AM" (hoa đầu câu) → midpoint M', () => {
    const m = run('Cho tam giác ABC. Trung tuyến AM.');
    const pt = findByKind(m, 'midpoint')!.intents[0] as any;
    expect(pt.name).toBe('M');
    expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
  });

  it('"Phân giác trong AD" (hoa đầu câu) → angleBisectorFoot D', () => {
    const m = run('Cho tam giác ABC. Phân giác trong AD.');
    const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
    expect(pt.name).toBe('D');
    expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
  });

  it('SILENT-WRONG FIX: "Đường cao AH ... trung tuyến BH" (xung đột chân H) → escalate', () => {
    // Trước fix hoa-đầu-câu: "Đường cao AH" không khớp → chỉ median BH khớp →
    // xung đột KHÔNG phát hiện → render midpoint(H) SAI. Sau fix: cả 2 khớp →
    // footCount[H]=2 → bỏ cả 2 → escalate (đúng fail-safe).
    expect(run('Cho tam giác ABC. Đường cao AH từ A và trung tuyến BH từ B.')).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Issue #46 nhóm B — EN support (median / altitude / internal bisector).
  // External bisector EN DEFER (guard reject). Tam giác gate EN = TRI_EN.
  // ═══════════════════════════════════════════════════════════════════════════

  describe('EN (issue #46 group B)', () => {
    // ── median ──
    it('"Triangle ABC. Draw the median AM." → midpoint(of BC) + connect A-M', () => {
      const m = run('Triangle ABC. Draw the median AM.');
      expect(m.length).toBe(1);
      const [pt, con] = m[0].intents as any[];
      expect(pt.op).toBe('add-point');
      expect(pt.name).toBe('M');
      expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
      expect(con.op).toBe('connect');
      expect(con.from).toBe('A');
      expect(con.to).toBe('M');
      expect(con.style).toBe('segment');
    });

    it('median bare "Triangle ABC. Median AM." (no leading verb) → midpoint M', () => {
      const m = run('Triangle ABC. Median AM.');
      const pt = findByKind(m, 'midpoint')!.intents[0] as any;
      expect(pt.name).toBe('M');
      expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    });

    it('median apex B → onLine AC (cạnh đối B): "Draw the median BN."', () => {
      const m = run('Triangle ABC. Draw the median BN.');
      const pt = findByKind(m, 'midpoint')!.intents[0] as any;
      expect(pt.name).toBe('N');
      expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'AC' });
    });

    // ── altitude ──
    it('"Triangle ABC. Draw the altitude AH." → perpFoot(from A, onLine BC) + connect A-H', () => {
      const m = run('Triangle ABC. Draw the altitude AH.');
      expect(m.length).toBe(1);
      const [pt, con] = m[0].intents as any[];
      expect(pt.op).toBe('add-point');
      expect(pt.name).toBe('H');
      expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
      expect(con.op).toBe('connect');
      expect(con.from).toBe('A');
      expect(con.to).toBe('H');
      expect(con.style).toBe('segment');
    });

    it('altitude bare "Triangle ABC. Altitude AH." → perpFoot H', () => {
      const m = run('Triangle ABC. Altitude AH.');
      const pt = findByKind(m, 'perpFoot')!.intents[0] as any;
      expect(pt.name).toBe('H');
      expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    });

    // ── internal bisector (forward) ──
    it('"Triangle ABC. Draw the angle bisector AD." → angleBisectorFoot(from A, onLine BC) + connect A-D', () => {
      const m = run('Triangle ABC. Draw the angle bisector AD.');
      expect(m.length).toBe(1);
      const [pt, con] = m[0].intents as any[];
      expect(pt.name).toBe('D');
      expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
      expect(con.from).toBe('A');
      expect(con.to).toBe('D');
      expect(con.style).toBe('segment');
      // KHÔNG external.
      expect(findByKind(m, 'externalAngleBisectorFoot')).toBeUndefined();
    });

    it('bisector sans "angle": "Triangle ABC. Draw the bisector AD." → angleBisectorFoot D', () => {
      const m = run('Triangle ABC. Draw the bisector AD.');
      const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
      expect(pt.name).toBe('D');
      expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
    });

    // ── reverse forms ("AM is the median" etc.) ──
    it('reverse median "Triangle ABC. AM is the median." → midpoint M', () => {
      const m = run('Triangle ABC. AM is the median.');
      const pt = findByKind(m, 'midpoint')!.intents[0] as any;
      expect(pt.name).toBe('M');
      expect(pt.constraint).toEqual({ kind: 'midpoint', of: 'BC' });
    });

    it('reverse altitude "Triangle ABC. AH is the altitude." → perpFoot H', () => {
      const m = run('Triangle ABC. AH is the altitude.');
      const pt = findByKind(m, 'perpFoot')!.intents[0] as any;
      expect(pt.name).toBe('H');
      expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    });

    it('reverse bisector "Triangle ABC. AD is the angle bisector." → angleBisectorFoot D', () => {
      const m = run('Triangle ABC. AD is the angle bisector.');
      const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
      expect(pt.name).toBe('D');
      expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
      expect(findByKind(m, 'externalAngleBisectorFoot')).toBeUndefined();
    });

    it('reverse bisector sans "angle" "AD is the bisector." → angleBisectorFoot D', () => {
      const m = run('Triangle ABC. AD is the bisector.');
      const pt = findByKind(m, 'angleBisectorFoot')!.intents[0] as any;
      expect(pt.name).toBe('D');
      expect(pt.constraint).toEqual({ kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' });
    });

    // ── adjective trước "triangle" (TRI_EN khớp vì adjective chỉ đứng trước) ──
    it('"Right triangle ABC. Draw the altitude AH." (adjective) → perpFoot H', () => {
      const m = run('Right triangle ABC. Draw the altitude AH.');
      const pt = findByKind(m, 'perpFoot')!.intents[0] as any;
      expect(pt.name).toBe('H');
      expect(pt.constraint).toEqual({ kind: 'perpFoot', from: 'A', onLine: 'BC' });
    });

    // ── collisions: cevian must emit NOTHING (owned by other rules) ──
    it('COLLISION perpFoot: "foot of the altitude from A to BC" → cevian emits NOTHING', () => {
      // perpFoot.ts owns "foot of the (perpendicular|altitude) from A to BC".
      // Sau "altitude" là "from" (chữ thường), KHÔNG cặp HOA → cevian forward
      // không khớp; "let H be" cũng không phải reverse-cevian.
      const m = run('Triangle ABC. Let H be the foot of the altitude from A to BC.');
      expect(m).toEqual([]);
    });

    it('COLLISION angleBisectorAngle: "Draw the bisector of angle BAC." → cevian emits NOTHING', () => {
      // angleBisectorAngle.ts owns "bisector of angle BAC". Sau "bisector" là "of"
      // (chữ thường) → cevian forward (cần cặp HOA NGAY sau "bisector") không khớp.
      const m = run('Triangle ABC. Draw the bisector of angle BAC.');
      expect(m).toEqual([]);
    });

    it('COLLISION perpBisector: "Draw the perpendicular bisector AD." → cevian emits NOTHING', () => {
      // perpBisector.ts owns "perpendicular bisector AD". Lookbehind (?<!perpendicular\s)
      // chặn cevian forward → KHÔNG double-emit, KHÔNG nhận nhầm là internal.
      const m = run('Triangle ABC. Draw the perpendicular bisector AD.');
      expect(m).toEqual([]);
    });

    it('COLLISION perpBisector HOA đầu clause: "Perpendicular bisector AD …" → cevian NOTHING', () => {
      // Regression: lookbehind PHẢI first-letter flex [Pp]. Bản lowercase-only
      // (?<!perpendicular\s) BỎ SÓT "Perpendicular" HOA đầu clause → cevian khớp
      // "bisector AD" → double-emit với perpBisector (D vừa là chân trung trực vừa
      // là chân phân giác) = silent-wrong. [Pp] chặn đúng → escalate fail-safe.
      const m = run('Triangle ABC. Perpendicular bisector AD is the axis.');
      expect(m).toEqual([]);
    });

    it('DEFER external HOA đầu clause: "External bisector AD …" → cevian NOTHING', () => {
      // Cùng lý do: lookbehind first-letter flex [Ee] chặn "External" HOA đầu clause.
      const m = run('Triangle ABC. External bisector AD is drawn.');
      expect(m).toEqual([]);
    });

    // ── defer / fail-safe: external bisector EN unsupported → escalate ──
    it('DEFER external: "Draw the external bisector AD." → cevian emits NOTHING', () => {
      // External EN chưa hỗ trợ. Lookbehind (?<!external\s) chặn forward nhận nhầm
      // thành internal (silent-wrong) → cevian rỗng → end-to-end escalate.
      const m = run('Triangle ABC. Draw the external bisector AD.');
      expect(m).toEqual([]);
    });

    it('DEFER exterior: "Draw the exterior bisector AD." → cevian emits NOTHING', () => {
      const m = run('Triangle ABC. Draw the exterior bisector AD.');
      expect(m).toEqual([]);
    });

    it('DEFER reverse external: "AD is the external bisector." → cevian emits NOTHING', () => {
      // "external" nằm giữa "the" và "bisector" → phá (?:angle\s+)?bisector của
      // reverse internal → không khớp → escalate (không nhận nhầm internal).
      const m = run('Triangle ABC. AD is the external bisector.');
      expect(m).toEqual([]);
    });

    // ── foot trùng đỉnh / apex ngoài tam giác (parity VN guards) ──
    it('EN foot trùng đỉnh "Draw the altitude AB." → SKIP (escalate)', () => {
      expect(run('Triangle ABC. Draw the altitude AB.')).toEqual([]);
    });

    it('EN apex ngoài tam giác "Draw the median PQ." → bỏ qua', () => {
      expect(run('Triangle ABC. Draw the median PQ.')).toEqual([]);
    });

    // ── no-triangle fail-safe ──
    it('EN cevian phrase KHÔNG có tam giác → escalate (rỗng)', () => {
      expect(run('Draw the altitude AH of the shape.')).toEqual([]);
    });

    // ── reverse internal bisector "is the bisector of …" KHÔNG bị grab ──
    it('"AD is the bisector of angle BAC" → cevian reverse KHÔNG grab (escalate qua angleBisectorAngle)', () => {
      // (?!\s+of) ở reverse chặn nắm "is the bisector of …" (thuộc angleBisectorAngle).
      const m = run('Triangle ABC. AD is the bisector of angle BAC.');
      expect(m).toEqual([]);
    });

    // ── nhiều cevian EN trong 1 đề ──
    it('nhiều cevian EN: "Draw the altitude AH and the median BM." → emit ĐỦ 2', () => {
      const m = run('Triangle ABC. Draw the altitude AH and the median BM.');
      const alt = findByKind(m, 'perpFoot');
      const med = findByKind(m, 'midpoint');
      expect(alt).toBeTruthy();
      expect(med).toBeTruthy();
      expect((alt!.intents[0] as any).name).toBe('H');
      expect((alt!.intents[0] as any).constraint).toEqual({
        kind: 'perpFoot',
        from: 'A',
        onLine: 'BC',
      });
      expect((med!.intents[0] as any).name).toBe('M');
      expect((med!.intents[0] as any).constraint).toEqual({ kind: 'midpoint', of: 'AC' });
    });
  });
});
