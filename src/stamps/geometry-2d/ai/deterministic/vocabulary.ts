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
  // tangentFromExt EN (issue #46 group B). Clause "Draw the tangents from A to
  // (O)" dùng ký hiệu "(O)" — KHÔNG có text keyword nào khác → coverage gate = 0
  // → escalate dù rule match. "tangent" (≥7 ký tự, phân biệt, KHÔNG substring của
  // từ VN/EN nào hiện có) đánh dấu clause là geo-clause. indexOf nên "tangent" tự
  // khớp trong "tangents"/"tangent lines" — KHÔNG cần thêm "tangents" riêng.
  'tangent',
  // perpFoot EN (issue #46 group B). Clause "Let H be the projection of A onto
  // BC" / "foot of the perpendicular from A to BC" / "Draw AH perpendicular to
  // BC" → đánh dấu geo-clause để coverage gate fail-safe: nếu rule EN miss thì
  // geo-clause không phủ → escalate, KHÔNG silent-incomplete (triangle-only bỏ
  // điểm H). Cả hai ≥10 ký tự, phân biệt, không substring của từ VN/EN nào hiện
  // có. "perpendicular bisector of BC" đã có 'bisector' → 'perpendicular' chỉ
  // tăng count, không đổi hành vi.
  'perpendicular',
  'projection',
  // pointAtDistance EN (issue #46 group B). Clause "On ray BA extended beyond A,
  // take D such that AD = AB" / "Extend AB beyond B to D ..." / "On the opposite
  // ray of ray BA, take D ..." → mark geo-clause. "extend" (indexOf also matches
  // "extended"/"extending") + the phrase "opposite ray" (geometry-specific). If
  // the rule misses a malformed clause → geo-clause unclaimed → escalate
  // (fail-safe), NOT silent-drop of point D. No harmful substring collision with
  // any existing VN/EN keyword.
  'extend',
  'opposite ray',
  // cevian EN (issue #46 group B). Clause "Draw the median AM" / "Draw the
  // altitude AH" → mark geo-clause. Nếu rule không parse được clause median/
  // altitude bị lỗi → geo-clause không phủ → escalate (fail-safe), KHÔNG
  // silent-incomplete (triangle-only bỏ điểm chân). ('bisector' đã có ở trên.)
  // Cả hai đều là danh từ hình học riêng, không substring va chạm có hại.
  'median',
  'altitude',
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
