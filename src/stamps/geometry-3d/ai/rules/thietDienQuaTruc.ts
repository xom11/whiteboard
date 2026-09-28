// Kích thước nón/trụ đứng một mình theo HÌNH DẠNG thiết diện qua trục (dữ kiện hình dạng
// phải đúng trên hình): nón — tam giác đều (h = r√3), tam giác vuông/vuông cân (h = r), góc ở đỉnh
// N° (h = r / tan(N/2)), đường sinh bằng đường kính (đều); trụ — hình vuông (h = 2r).
// Mặc định (không nêu hình dạng) giữ r = 1.4, h = 2.4 như cũ.
export interface KichThuoc { r: number; h: number }

const R = 1.4;
const H = 2.4;

export function kichThuocNon(problem: string): KichThuoc {
  const p = problem.replace(/[◦º]/gu, '°');
  const axial = /(?:thiết\s*diện\s*qua\s*trục|mặt\s*phẳng\s*(?:đi\s+)?qua\s*trục)[^.;]{0,60}?(?:là|được)\s+(?:một\s+)?(?:tam\s+giác\s+)?(vuông\s+cân|vuông|đều)/iu.exec(p);
  if (axial) {
    if (/đều/iu.test(axial[1])) return { r: R, h: R * Math.sqrt(3) };
    return { r: R, h: R };                           // tam giác cân có góc vuông ⟹ vuông cân tại đỉnh
  }
  if (/đường\s*sinh\s+bằng\s+đường\s*kính\s+(?:của\s+)?đáy/iu.test(p)) return { r: R, h: R * Math.sqrt(3) };
  const g = /góc\s+ở\s+đỉnh(?:\s+(?:của\s+)?(?:hình|khối)\s+nón)?\s+(?:bằng|là)\s+(\d{2,3})\s*°/iu.exec(p);
  if (g) {
    const a = Number(g[1]);
    if (a > 0 && a < 180) {
      const h = R / Math.tan((a * Math.PI) / 360);
      // giữ trong khung camera: co r nếu h quá lớn
      return h > 3.2 ? { r: (R * 3.2) / h, h: 3.2 } : { r: R, h };
    }
  }
  return { r: R, h: H };
}

export function kichThuocTru(problem: string): KichThuoc {
  if (/(?:thiết\s*diện\s*qua\s*trục|mặt\s*phẳng\s*(?:đi\s+)?qua\s*trục)[^.;]{0,60}?(?:là|được)\s+(?:một\s+)?hình\s+vuông/iu.test(problem)) {
    return { r: 1.2, h: 2.4 };
  }
  return { r: R, h: H };
}
