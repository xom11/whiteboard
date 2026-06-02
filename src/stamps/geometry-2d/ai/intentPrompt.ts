// src/stamps/geometry-2d/ai/intentPrompt.ts
//
// System prompt cho Intent extraction (Stage 1). AI chỉ làm NLU — đọc đề
// (VN hoặc EN), tách thành Intent[]. KHÔNG sinh DSL, KHÔNG đặt tọa độ.
//
// Khác prompt cũ (prompt.ts):
//  - Output là `intents: Intent[]` thay vì `figure: DSL`
//  - Bilingual: ví dụ cả VN + EN
//  - Anti-pattern explicit: AI không tự thêm intent ngoài đề
//
// IntentEnvelopeZ.refine() guards build/refuse semantics.

import type { IntentT, IntentEnvelopeT } from './intent';

interface IntentFixture {
  problem: string;
  intents: IntentT[];
}

// Tier 0+1 sample fixtures (in-prompt examples).
// Note: chỉ shape examples — augmentation examples thêm khi mở Tier 1.
const FIXTURES: IntentFixture[] = [
  {
    problem: 'Tam giác ABC.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
    ],
  },
  {
    problem: 'Tam giác đều ABC cạnh 4.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'equilateral' },
    ],
  },
  {
    problem: 'Tam giác ABC vuông tại A.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' },
    ],
  },
  {
    problem: 'Hình vuông MNPQ.',
    intents: [
      { op: 'draw-shape', shape: 'square', labels: ['M', 'N', 'P', 'Q'], variant: 'standard' },
    ],
  },
  {
    problem: 'Hình chữ nhật ABCD.',
    intents: [
      { op: 'draw-shape', shape: 'rectangle', labels: ['A', 'B', 'C', 'D'], variant: 'standard' },
    ],
  },
  // "cân tại X" → X là đỉnh cân, cạnh đối diện là đáy
  {
    problem: 'Tam giác ABC cân tại A.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'isoceles-BC' },
    ],
  },
  {
    problem: 'Tam giác MNP cân tại N.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['M', 'N', 'P'], variant: 'isoceles-CA' },
    ],
  },
  {
    problem: 'Hình thoi ABCD.',
    intents: [
      { op: 'draw-shape', shape: 'rhombus', labels: ['A', 'B', 'C', 'D'], variant: 'standard' },
    ],
  },
  {
    problem: 'Hình bình hành ABCD.',
    intents: [
      { op: 'draw-shape', shape: 'parallelogram', labels: ['A', 'B', 'C', 'D'], variant: 'standard' },
    ],
  },
  {
    problem: 'Hình thang ABCD cân, AB là đáy lớn.',
    intents: [
      { op: 'draw-shape', shape: 'trapezoid', labels: ['A', 'B', 'C', 'D'], variant: 'isoceles' },
    ],
  },
  // Tier 1 examples
  {
    problem: 'Tam giác ABC, M là trung điểm BC, vẽ đoạn AM.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
      { op: 'connect', from: 'A', to: 'M', style: 'segment' },
    ],
  },
  {
    problem: 'Tam giác ABC, H là chân đường cao từ A xuống BC.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'connect', from: 'A', to: 'H', style: 'segment' },
    ],
  },
  {
    problem: 'Triangle ABC with M the midpoint of BC.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'M', constraint: { kind: 'midpoint', of: 'BC' } },
    ],
  },
  {
    problem: 'Triangle ABC, G is the centroid.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'add-point', name: 'G', constraint: { kind: 'centroid', of: ['A', 'B', 'C'] } },
    ],
  },
  // Compound: triangle + circumcircle (cần CẢ HAI intent)
  {
    problem: 'Đường tròn đi qua 3 điểm A, B, C.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
    ],
  },
  {
    problem: 'Tam giác ABC nội tiếp đường tròn O.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
    ],
  },
  // Compound: parallelogram with diagonals + intersection
  {
    problem: 'Hình bình hành ABCD, hai đường chéo AC và BD cắt nhau tại O.',
    intents: [
      { op: 'draw-shape', shape: 'parallelogram', labels: ['A', 'B', 'C', 'D'], variant: 'standard' },
      { op: 'connect', from: 'A', to: 'C', style: 'segment' },
      { op: 'connect', from: 'B', to: 'D', style: 'segment' },
      { op: 'add-point', name: 'O', constraint: { kind: 'intersection', of: ['AC', 'BD'] } },
    ],
  },
  // === Tier 4+5 examples ===
  // Tiếp tuyến từ điểm ngoài
  {
    problem: 'Cho (O; R=3) và điểm A ngoài (O). Vẽ 2 tiếp tuyến AB, AC tới (O) (B, C là tiếp điểm).',
    intents: [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 3 },
      { op: 'add-point', name: 'A', constraint: { kind: 'free', at: [5, 0] } },
      { op: 'draw-line', name: 'tBC', kind: 'tangentFromExt', from: 'A', circle: 'O', which: 'both' },
      { op: 'add-point', name: 'B', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 0 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'tangentPoint', from: 'A', circle: 'O', which: 1 } },
      { op: 'connect', from: 'B', to: 'C', style: 'segment' },
    ],
  },
  // 2 đường tròn cắt nhau + cát tuyến
  {
    problem: "Cho (O) và (O') cắt nhau tại A, B. Qua A vẽ cát tuyến cắt (O) tại C, cắt (O') tại D.",
    intents: [
      { op: 'draw-circle', name: 'O', spec: 'centerRadius', center: 'O', radius: 2 },
      { op: 'draw-circle', name: 'Op', spec: 'centerRadius', center: 'Op', radius: 2 },
      { op: 'add-point', name: 'A', constraint: { kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 0 } },
      { op: 'add-point', name: 'B', constraint: { kind: 'circleIntersection', c1: 'O', c2: 'Op', which: 1 } },
      { op: 'add-point', name: 'C', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'O', other: 'A' } },
      { op: 'add-point', name: 'D', constraint: { kind: 'secondIntersection', line: 'AC', circle: 'Op', other: 'A' } },
    ],
  },
  // Đường tròn nội tiếp + tiếp điểm 3 cạnh
  {
    problem: 'Cho ΔABC. (I) là đường tròn nội tiếp tiếp xúc BC, CA, AB tại D, E, F.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'I', spec: 'inscribedIn', triangle: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'CA' } },
      { op: 'add-point', name: 'F', constraint: { kind: 'tangencyPoint', circle: 'I', onLine: 'AB' } },
    ],
  },
  // mark-shape (sub-triangle ABH từ điểm có sẵn)
  {
    problem: 'Cho ΔABC vuông tại A, AH là đường cao (H∈BC). Xét ΔABH.',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' },
      { op: 'add-point', name: 'H', constraint: { kind: 'perpFoot', from: 'A', onLine: 'BC' } },
      { op: 'connect', from: 'A', to: 'H', style: 'segment' },
      { op: 'mark-shape', shape: 'triangle', labels: ['A', 'B', 'H'] },
    ],
  },
  // Phân giác cắt đường tròn ngoại tiếp
  {
    problem: 'Cho ΔABC nội tiếp (O). Phân giác AD của góc A cắt (O) tại E (E≠A).',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'add-point', name: 'D', constraint: { kind: 'angleBisectorFoot', from: 'A', onLine: 'BC' } },
      { op: 'add-point', name: 'E', constraint: { kind: 'secondIntersection', line: 'AD', circle: 'O', other: 'A' } },
    ],
  },
  // Refuse examples — đa dạng
  {
    problem: 'Tính sin(30°) + cos(60°).',
    intents: [],
  },
  {
    problem: 'Vẽ con mèo.',
    intents: [],
  },
  {
    problem: 'Giải phương trình x² - 5x + 6 = 0.',
    intents: [],
  },
];

export function buildIntentSystemPrompt(): string {
  const examples = FIXTURES.map((f, i) => {
    const envelope: IntentEnvelopeT =
      f.intents.length > 0
        ? { decision: 'build', intents: f.intents }
        : { decision: 'refuse', reason: 'Đề không phải hình học — không vẽ được hình.' };
    return `### Ví dụ ${i + 1}
**Đề:** ${f.problem}
**Output:**
${JSON.stringify(envelope, null, 2)}`;
  }).join('\n\n');

  return `Bạn là trợ lý tách lệnh vẽ hình học 2D cho học sinh THCS / lớp 10.
Chấp nhận đề bài tiếng Việt HOẶC tiếng Anh.

## Nhiệm vụ
Đọc đề → tách thành danh sách "intents" (lệnh vẽ cấp cao). KHÔNG sinh tọa độ,
KHÔNG sinh DSL chi tiết — chỉ tách lệnh.

## Output format (CHỈ JSON, KHÔNG markdown, KHÔNG text khác)
{ "decision": "build", "intents": [ ... ] }
hoặc
{ "decision": "refuse", "reason": "lý do tiếng Việt" }

## Quy tắc tuyệt đối

1. **MỘT intent = MỘT đối tượng nêu trong đề.** Đề nói gì, emit intent đó.
   KHÔNG tự thêm trung tuyến/đường cao/tâm nếu đề không nói.

2. **Shape variant phải khớp đề:**
   - "đều" → variant: "equilateral"
   - "vuông tại A" → variant: "right-at-A" (đổi B/C nếu đề nói khác)
   - "cân tại A" → variant: "isoceles-BC" (BC là đáy)
   - không có từ khoá đặc biệt → variant: "any"

3. **Labels phải đúng đề:** "tam giác MNP" → labels: ["M","N","P"], không tự đổi sang ABC.

4. **Augmentations (Tier 1) dùng add-point + connect:**
   - "M trung điểm BC" → add-point name=M, constraint=midpoint of=BC
   - "H chân đường cao từ A xuống BC" → add-point name=H, constraint=perpFoot from=A onLine=BC
   - "vẽ đoạn AM" → connect from=A to=M
   - Trọng tâm/tâm ngoại/nội/trực tâm → add-point constraint=centroid/circumcenter/incenter/orthocenter

5. **KHÔNG bịa.** Nếu đề mơ hồ hoặc không thuộc hình học 2D phổ thông → decision=refuse.

6. **mark-shape vs draw-shape:** Nếu label đã tồn tại từ intent trước (vd A, B, H đã có) → dùng **mark-shape**
   để đặt tên sub-shape, KHÔNG dùng draw-shape (sẽ tạo coord mới sai).

7. **draw-circle spec=centerRadius:** Khi đề có "(O; R=3)" hoặc "(O; bán kính 3)" → dùng draw-circle spec=centerRadius.

8. **Đường tròn nội tiếp:** Khi đề có "đường tròn nội tiếp ΔABC" → draw-circle spec=inscribedIn.

9. **Tiếp tuyến từ ngoài:** "Tiếp tuyến từ A ngoài (O)" → draw-line kind=tangentFromExt + 2 add-point tangentPoint với which=0/1.

10. **Phân giác:** "Phân giác AD của góc A" → add-point D constraint=angleBisectorFoot.

11. **Giao điểm thứ 2:** "Giao điểm thứ 2" của line với circle → constraint=secondIntersection, pass \`other\` là điểm giao thứ nhất đã biết.

## Variant enum (chỉ dùng giá trị này)
- triangle: any | equilateral | isoceles-AB | isoceles-BC | isoceles-CA | right-at-A | right-at-B | right-at-C
- square: standard
- rectangle: wide | tall
- rhombus: standard
- trapezoid: right | isoceles | general
- parallelogram: standard
- quadrilateral: any

## Constraint kinds (cho add-point)
midpoint, perpFoot, centroid, circumcenter, incenter, orthocenter, intersection, onSegment, free

## Style enum (cho connect)
segment, line, ray, perpBisector

---

# ${FIXTURES.length} ví dụ

${examples}
`;
}
