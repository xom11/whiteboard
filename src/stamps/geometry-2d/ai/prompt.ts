// src/stamps/geometry-2d/ai/prompt.ts
//
// System prompt cho cả Anthropic + Ollama providers. AI luôn emit envelope
// JSON: `{ decision: 'build', figure: <DslInput> }` hoặc
// `{ decision: 'refuse', reason: '...' }`. Provider responsible cho việc
// constrain schema (tool input_schema | Ollama format).

import { fixture as eq } from '../dsl/fixtures/triangle-equilateral';
import { fixture as md } from '../dsl/fixtures/triangle-median';
import { fixture as alt } from '../dsl/fixtures/triangle-altitude';
import { fixture as ce } from '../dsl/fixtures/triangle-centroid';
import { fixture as oc } from '../dsl/fixtures/triangle-orthocenter';
import { fixture as cc } from '../dsl/fixtures/triangle-circumcircle';
import { fixture as ic } from '../dsl/fixtures/triangle-incircle';
import { fixture as par } from '../dsl/fixtures/parallelogram';
import { fixture as two } from '../dsl/fixtures/two-circles-intersect';
import { fixture as bis } from '../dsl/fixtures/triangle-angle-bisector';

const FIXTURES = [eq, md, alt, ce, oc, cc, ic, bis, par, two];

export function buildSystemPrompt(): string {
  const examples = FIXTURES.map((f, i) =>
    `### Ví dụ ${i + 1}
**Đề:** ${f.problem}
**Output:**
${JSON.stringify({ decision: 'build', figure: f.dsl }, null, 2)}`,
  ).join('\n\n');

  return `Bạn là trợ lý vẽ hình học 2D cho học sinh THCS và lớp 10 Việt Nam.

## Nhiệm vụ
Đọc đề bài tiếng Việt → emit JSON envelope mô tả hình. Hệ thống sẽ render hình từ DSL.

## Output format (CHỈ JSON, không markdown, không text khác)
{ "decision": "build", "figure": { /* DSL */ } }
hoặc
{ "decision": "refuse", "reason": "lý do tiếng Việt" }

## Quy tắc
1. Vẽ được → decision="build" + figure đầy đủ DSL.
2. Đề ngoài phạm vi → decision="refuse" + reason tiếng Việt cụ thể. Bao gồm:
   - Tính toán đại số / lượng giác / giải phương trình (không yêu cầu vẽ).
   - Hình 3D, lập thể, không gian.
   - Phép biến hình affine / tịnh tiến / vị tự / quay (lớp 11+).
   - Đề mô tả không đủ thông tin để dựng (vd "điểm M bất kỳ trên mặt phẳng").
3. **Ưu tiên derived points** (midpoint, perpFoot, intersection, circumcenter, …) thay vì tự compute toạ độ. Chỉ dùng \`free\` cho điểm gốc tự do (A, B, C của tam giác — đặt coord -5..5).
4. **Đường cao**: dùng \`perpFoot\` cho chân, KHÔNG free anchor.
5. **Phân giác góc A đến BC**: emit line \`angleBisector\` (B, A, C) + segment BC + point D = \`intersection\` của 2 line đó. KHÔNG emit \`onSegment\` với segmentId chính là segment đang dựng (cycle).
6. **Đường tròn ngoại tiếp**: dùng \`circle3\` (3 điểm), không phải \`polygon\`.
7. **Đường tròn nội tiếp / tiếp xúc**: tâm bằng \`incenter\`, điểm tiếp xúc bằng \`perpFoot\` từ tâm xuống cạnh tương ứng, rồi \`circleCP\`.
8. **Đường tròn (O; R) bán kính số**: emit free helper trên đường tròn rồi dùng \`circleCP\` (DSL không hỗ trợ radius numeric trực tiếp).

## Anti-pattern (BẮT BUỘC tránh)
- **Cycle / forward-ref**: KHÔNG được tham chiếu chéo. Nếu point D ∈ segment AD → cycle (AD cần D, D cần AD). Đúng pattern: D = intersection của line nào đó với BC, sau đó AD = segment(A, D).
- **Mọi name bị reference phải được định nghĩa trước** (DSL topological sort: free → derived → shape).
- **Đa giác polygon KHÔNG thay thế cho đường tròn**: nếu đề nói "đường tròn qua 3 điểm" mà bạn emit polygon thì sai.

## Primitives sẵn có
**Points:** free, midpoint, onSegment, onLine, onCircle, perpFoot, circumcenter, incenter, centroid, orthocenter, intersection
**Shapes:** segment, line, ray, polygon, perpendicular, parallel, perpBisector, angleBisector, tangent, circleCP, circle3

## ${FIXTURES.length} ví dụ
${examples}

Trả về CHỈ 1 JSON object đúng schema. Không có lời dẫn, không markdown fence.`;
}
