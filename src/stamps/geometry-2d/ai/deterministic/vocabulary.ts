// src/stamps/geometry-2d/ai/deterministic/vocabulary.ts
//
// Tập từ khóa "geometry-relevant" để confidence.ts đo coverage.
// Format: lowercase, có dấu. countGeometryKeywords lowercase input rồi match.

export const GEOMETRY_KEYWORDS: readonly string[] = [
  // Base shapes
  'tam giác', 'đường tròn', 'hình chữ nhật', 'hình vuông',
  'hình bình hành', 'hình thoi', 'hình thang', 'tứ giác',
  // Triangle variants
  'vuông tại', 'cân tại', 'đều',
  // Circle parts
  'bán kính', 'tâm', 'đường kính',
  // Segments / on-segment
  'đoạn',
  // Derived points
  'trung điểm', 'chân đường cao', 'hình chiếu',
  'trọng tâm', 'trực tâm', 'tâm nội tiếp', 'tâm ngoại tiếp',
  // Cevian names
  'đường cao', 'trung tuyến', 'phân giác', 'trung trực',
  // Special lines/circles
  'tiếp tuyến', 'tiếp điểm', 'tiếp xúc',
  'nội tiếp', 'ngoại tiếp',
  // Relations
  'song song', 'vuông góc', 'giao điểm', 'cắt',
  // Ký hiệu (symbol-only phrasing tương đương từ chữ): "⊥" ≡ "vuông góc".
  // perpFoot rule đã nhận "⊥" ở tầng construct (PERP_DRAW), nhưng gate
  // hasGeometry trước đây CHỈ nhận chữ "vuông góc" → clause mà "⊥" là tín hiệu
  // hình học DUY NHẤT bị coi là văn xuôi (hasGeometry=false). Thêm "⊥" để 2
  // phrasing hành xử như nhau ở gate coverage (issue #46 nhóm A).
  '⊥',

  // === EN keywords (issue #46 group B) =======================================
  // Bộ từ khoá tiếng Anh để 1 clause TOÀN tiếng Anh được tính là geo-clause
  // (countGeometryKeywords > 0) → coverage gate không escalate sai dù rule EN đã
  // match. countGeometryKeywords lowercase input nên lưu lowercase ở đây.
  //
  // CHỈ thêm danh từ construct ĐA-KÝ-TỰ phân biệt, KHÔNG va chạm có hại như
  // substring của text tiếng Việt hay của nhau. KHÔNG thêm từ ngắn mơ hồ ("on",
  // "at", "line", "point", "right") vì dễ false-positive ("point" ⊂ "appoint",
  // "at" ⊂ "tại"…). Một danh từ construct / clause là đủ để đánh dấu geo.
  //
  // GOTCHA substring: "centre" ⊃ "center" KHÔNG xảy ra (khác chính tả); "circle"
  // KHÔNG ⊂ từ VN. "radius"/"diameter"/"center" là danh từ riêng cho circle.
  'triangle',
  'circle',
  'square',
  'rectangle',
  'parallelogram',
  'rhombus',
  'trapezoid',
  'trapezium',
  'quadrilateral',
  'midpoint',
  'radius',
  'diameter',
  'center',
  'centre',
  'equilateral',
  'isosceles',
  // Triangle centers (issue #46 group B). "orthocenter"/"circumcenter"/
  // "incenter" already contain "center" (already a keyword) — but list all four
  // explicitly for clarity + robustness. British -centre spellings included.
  'centroid',
  'orthocenter',
  'orthocentre',
  'circumcenter',
  'circumcentre',
  'incenter',
  'incentre',
  // perpBisector + reflection EN (issue #46 group B). Hai danh từ này biến clause
  // "perpendicular bisector …" / "reflection …" tiếng Anh thành geo-clause để
  // coverage gate hoạt động: nếu rule EN match đủ thì clause được phủ; nếu clause
  // malformed (thiếu cặp đỉnh / thiếu trục) thì geo-clause không được phủ →
  // escalate (fail-safe), KHÔNG silent-incomplete. Đều ≥8 ký tự, phân biệt, không
  // substring của từ VN/EN nào hiện có (không va chạm).
  'bisector',
  'reflection',
];

export function countGeometryKeywords(text: string): number {
  const lower = text.toLowerCase();
  let count = 0;
  for (const kw of GEOMETRY_KEYWORDS) {
    let from = 0;
    while (true) {
      const i = lower.indexOf(kw, from);
      if (i < 0) break;
      count++;
      from = i + kw.length;
    }
  }
  return count;
}
