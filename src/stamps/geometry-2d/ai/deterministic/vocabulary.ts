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
