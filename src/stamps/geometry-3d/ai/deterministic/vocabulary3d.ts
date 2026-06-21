export const GEOMETRY_KEYWORDS_3D: string[] = [
  // solids
  'hình chóp', 'tứ diện', 'lăng trụ', 'hình hộp', 'lập phương', 'hình lập phương',
  'chóp', 'hộp chữ nhật', 'chóp đều', 'tứ diện đều',
  // planes / lines / relations
  'mặt phẳng', 'giao tuyến', 'giao điểm', 'thiết diện', 'song song', 'vuông góc',
  'chéo nhau', 'đồng phẳng', 'cắt', 'đi qua', 'chứa',
  // points / derived
  'trung điểm', 'trọng tâm', 'hình chiếu', 'đối xứng', 'chân đường', 'đường cao',
  // metric / solids of revolution (recognized early so clauses aren't dropped; constructs come later phases)
  'khoảng cách', 'góc', 'mặt cầu', 'hình cầu', 'bán kính', 'đường kính',
  'hình trụ', 'hình nón', 'ngoại tiếp', 'nội tiếp',
  'khối cầu', 'khối nón', 'khối trụ', 'đường sinh', 'trục',
  // generic geometry nouns
  'cạnh', 'đáy', 'đỉnh', 'điểm', 'đoạn', 'tam giác', 'hình vuông', 'hình chữ nhật',
  'hình bình hành', 'hình thang', 'hình thoi', 'đường thẳng', 'tia',
  // symbols
  '⊥', '∩', '∥', '//', '∈',
];

export function countGeometryKeywords3D(text: string): number {
  const t = text.toLowerCase();
  let n = 0;
  for (const kw of GEOMETRY_KEYWORDS_3D) {
    let from = 0;
    for (;;) {
      const i = t.indexOf(kw, from);
      if (i < 0) break;
      n += 1;
      from = i + kw.length;
    }
  }
  return n;
}
