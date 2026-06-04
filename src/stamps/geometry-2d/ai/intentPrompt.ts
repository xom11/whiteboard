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
  // Build examples — đề có MỆNH LỆNH proof/tính NHƯNG mô tả hình → vẫn build
  {
    problem: 'Cho tam giác ABC vuông tại A. Chứng minh rằng AB² + AC² = BC².',
    intents: [
      { op: 'draw-shape', shape: 'triangle', labels: ['A', 'B', 'C'], variant: 'right-at-A' },
    ],
  },
  {
    problem: 'Cho tứ giác ABCD nội tiếp (O). Chứng minh rằng AC.BD = AB.CD + AD.BC.',
    intents: [
      { op: 'draw-shape', shape: 'quadrilateral', labels: ['A', 'B', 'C', 'D'], variant: 'any' },
      { op: 'draw-circle', name: 'O', spec: 'through3', points: ['A', 'B', 'C'] },
      { op: 'connect', from: 'A', to: 'C', style: 'segment' },
      { op: 'connect', from: 'B', to: 'D', style: 'segment' },
    ],
  },
  // Refuse examples — đề THUẦN tính / KHÔNG mô tả hình hình học
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
   - "vuông tại X" → variant: "right-at-X" (X là label đầu tiên trong labels[] khớp đề)
   - "cân tại X" — X là ĐỈNH CÂN, base là cạnh đối diện:
       * "tam giác ABC cân tại A" → variant: "isoceles-BC" (BC là đáy, A là apex)
       * "tam giác MNP cân tại N" → variant: "isoceles-CA" (CA là đáy theo canonical position)
       * Rule: variant đặt tên theo position trong labels[], KHÔNG phải tên literal.
         apex ở position 0 → "isoceles-BC"; position 1 → "isoceles-CA"; position 2 → "isoceles-AB".
   - không có từ khoá đặc biệt → variant: "any"

3. **Labels phải đúng đề:** "tam giác MNP" → labels: ["M","N","P"], không tự đổi sang ABC.

4. **Augmentations (Tier 1) dùng add-point + connect:**
   - "M trung điểm BC" → add-point name=M, constraint=midpoint of=BC
   - "H chân đường cao từ A xuống BC" → add-point name=H, constraint=perpFoot from=A onLine=BC
   - "vẽ đoạn AM" → connect from=A to=M
   - Trọng tâm/tâm ngoại/nội/trực tâm → add-point constraint=centroid/circumcenter/incenter/orthocenter

5. **KHÔNG bịa.** Nếu đề mơ hồ hoặc không thuộc hình học 2D phổ thông → decision=refuse.

6. **Đặt tên draw-circle**: nếu đề có ký hiệu rõ ràng "(X)" (vd "(O)", "(I)", "(I1)") → dùng đúng ký hiệu đó làm name. KHÔNG thêm hậu tố như "Ic", "In", "Oc". Nếu đề không có ký hiệu thì name tự do (preprocessor xử lý mọi collision).

7. **Mệnh lệnh "Chứng minh" / "Tính" / "Tìm" / "Hỏi" KHÔNG ảnh hưởng quyết định build/refuse.** Quyết định CHỈ dựa vào việc đề có MÔ TẢ hình vẽ được hay không. Nếu đề bắt đầu / kết thúc bằng "Chứng minh rằng …" hoặc "Tính …" nhưng phần MÔ TẢ (giả thiết) có hình (tam giác, tứ giác, đường tròn, giao điểm …) → vẫn decision=build, vẽ phần giả thiết. KẾT QUẢ proof / phép tính KHÔNG cần biểu diễn. Chỉ refuse khi đề THUẦN tính / đại số không kèm mô tả hình (vd "Tính sin(30°)+cos(60°)", "Giải x²-5x+6=0").

## Variant enum (chỉ dùng giá trị này)
- triangle: any | equilateral | isoceles-AB | isoceles-BC | isoceles-CA | right-at-A | right-at-B | right-at-C
- square: standard
- rectangle: standard (default) | wide | tall
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
