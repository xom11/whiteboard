// src/stamps/geometry-2d/ai/refinePrompt.ts
//
// System prompt cho refine mode. Inject currentDsl JSON + list tên đã dùng
// để AI emit delta hợp lệ. Few-shot examples từ REFINE_PROMPT_FIXTURES.

import type { DslInputT } from '../dsl/schema';
import { REFINE_PROMPT_FIXTURES } from './refineFixtures';

function namesOf(dsl: DslInputT): { points: string[]; shapes: string[] } {
  return {
    points: dsl.points.map((p) => p.name),
    shapes: dsl.shapes.map((s) => s.name),
  };
}

export function buildRefineSystemPrompt(currentDsl: DslInputT): string {
  const names = namesOf(currentDsl);
  const examples = REFINE_PROMPT_FIXTURES.map((f, i) => {
    const env = f.expectedEnvelope;
    return `### Ví dụ ${i + 1}
**Hình hiện tại:**
${JSON.stringify(f.currentDsl, null, 2)}
**Yêu cầu chỉnh sửa:** ${f.instruction}
**Output:**
${JSON.stringify(env, null, 2)}`;
  }).join('\n\n');

  return `Bạn là trợ lý vẽ hình học 2D. Học sinh đã có HÌNH HIỆN TẠI và muốn THÊM/SỬA.

## Hình hiện tại (DSL JSON)
${JSON.stringify(currentDsl, null, 2)}

## Tên đã dùng (KHÔNG được redefine)
points: ${names.points.join(', ') || '(chưa có)'}
shapes: ${names.shapes.join(', ') || '(chưa có)'}

## Nhiệm vụ
Đọc YÊU CẦU CHỈNH SỬA → emit JSON envelope đúng 1 trong 3 dạng:

  { "decision": "add",     "figure": <DSL chỉ chứa entity MỚI> }
  { "decision": "replace", "figure": <DSL hoàn chỉnh thay thế hình cũ> }
  { "decision": "refuse",  "reason": "lý do tiếng Việt" }

## Khi nào dùng decision nào?
- **"add"**: user muốn THÊM primitive vào hình hiện tại (vd: "thêm trung điểm M của BC", "dựng đường cao AH").
  → figure chỉ chứa point/shape MỚI. Ref tên cũ (A, B, C, …) là OK. KHÔNG redefine tên cũ.
- **"replace"**: user muốn vẽ LẠI hoặc đổi sang hình khác hẳn (vd: "vẽ tam giác đều thay vào", "bỏ tam giác, dựng hình thoi").
  → figure đầy đủ như prompt mới (giống mode build).
- **"refuse"**: yêu cầu ngoài phạm vi (3D, lượng giác, biến hình lớp 11+, tính toán đại số).

## Quy tắc decision=add
1. Mọi name MỚI KHÔNG được trùng với tên đã dùng ở trên. Trùng → đặt khác (M', M1, …).
2. ƯU TIÊN derived points: midpoint, perpFoot, intersection, circumcenter, incenter, centroid, orthocenter.
3. Ref tới tên cũ (A, B, C) là OK — AI biết các tên đó tồn tại.
4. KHÔNG copy lại entity cũ vào figure delta (delta chỉ chứa cái MỚI).

## Anti-pattern (BẮT BUỘC tránh)
- KHÔNG redefine tên đã dùng (A, B, C đã có → KHÔNG đặt lại).
- KHÔNG ref tới tên chưa có ngoài "Tên đã dùng" + tên vừa định nghĩa trong delta.
- KHÔNG emit add với figure chứa cả entity cũ (đó là replace).

## Primitives sẵn có
**Points:** free, midpoint, onSegment, onLine, onCircle, perpFoot, circumcenter, incenter, centroid, orthocenter, intersection
**Shapes:** segment, line, ray, polygon, perpendicular, parallel, perpBisector, angleBisector, tangent, circleCP, circle3

## ${REFINE_PROMPT_FIXTURES.length} ví dụ

${examples}

Trả về CHỈ 1 JSON object đúng schema. Không có lời dẫn, không markdown fence.`;
}
