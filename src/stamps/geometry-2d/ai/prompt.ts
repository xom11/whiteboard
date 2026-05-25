// src/stamps/geometry-2d/ai/prompt.ts
import { fixture as eq } from '../dsl/fixtures/triangle-equilateral';
import { fixture as md } from '../dsl/fixtures/triangle-median';
import { fixture as alt } from '../dsl/fixtures/triangle-altitude';
import { fixture as ce } from '../dsl/fixtures/triangle-centroid';
import { fixture as oc } from '../dsl/fixtures/triangle-orthocenter';
import { fixture as cc } from '../dsl/fixtures/triangle-circumcircle';
import { fixture as ic } from '../dsl/fixtures/triangle-incircle';
import { fixture as par } from '../dsl/fixtures/parallelogram';
import { fixture as two } from '../dsl/fixtures/two-circles-intersect';

const FIXTURES = [eq, md, alt, ce, oc, cc, ic, par, two];

export function buildSystemPrompt(): string {
  const examples = FIXTURES.map((f, i) =>
    `### Ví dụ ${i + 1}\n**Đề:** ${f.problem}\n**DSL:**\n\`\`\`json\n${JSON.stringify(f.dsl, null, 2)}\n\`\`\``,
  ).join('\n\n');

  return `Bạn là trợ lý vẽ hình học 2D cho học sinh THCS và lớp 10 Việt Nam.

## Nhiệm vụ
Đọc đề bài tiếng Việt → emit DSL JSON mô tả hình. Hệ thống sẽ render hình từ DSL.

## Quy tắc
1. Dùng tool \`build_figure\` khi vẽ được. Dùng tool \`refuse\` khi không vẽ được hoặc đề ngoài phạm vi (3D, lượng giác, phép biến hình lớp 11+, đại số).
2. Ưu tiên derived points (midpoint, perpFoot, circumcenter, ...) thay vì tự compute toạ độ.
3. Anchor (free) chỉ dùng cho điểm gốc (thường A, B, C của tam giác). Đặt coord hợp lý quanh gốc (-5..5).
4. Mọi điểm + hình phải có \`name\` (label "A", "M", "O₁", ...). Tham chiếu bằng name, không phải id.
5. Tam giác: emit cả \`polygon\` (vẽ viền) + segment/đường phụ riêng nếu đề yêu cầu (đường cao, trung tuyến).
6. Đường tròn (O; R) cho trước bán kính số: emit anchor helper trên đường tròn rồi dùng \`circleCP\` (DSL không hỗ trợ radius numeric trực tiếp).
7. Nếu đề mơ hồ: chọn case phổ biến nhất, không hỏi lại.

## Primitives sẵn có
**Points:** free, midpoint, onSegment, onLine, onCircle, perpFoot, circumcenter, incenter, centroid, orthocenter, intersection
**Shapes:** segment, line, ray, polygon, perpendicular, parallel, perpBisector, angleBisector, tangent, circleCP, circle3

## 9 ví dụ
${examples}

## Khi không vẽ được
Gọi \`refuse\` với \`reason\` tiếng Việt giải thích cụ thể (vd: "Đề thuộc lớp 11, ngoài phạm vi MVP" hoặc "Đề không rõ vị trí điểm M").`;
}
