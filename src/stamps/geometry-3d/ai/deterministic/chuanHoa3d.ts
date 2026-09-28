// Chuẩn hoá đề 3D ở ĐẦU pipeline: mọi rule thấy cùng một dạng nhãn (A' thay A′/A’) và
// ký hiệu (ký tự vùng riêng font Symbol khi dán từ PDF → ( ) = ⊥ ° π).
export function chuanHoaDe3d(de: string): string {
  return de
    .replace(/[’‘´`′\uf0a2]/gu, "'")
    // Ký tự vùng riêng của font Symbol khi dán từ PDF: ( ) = ⊥ ° π
    .replace(/\uf028/gu, '(').replace(/\uf029/gu, ')').replace(/\uf03d/gu, '=')
    .replace(/\uf05e/gu, '⊥').replace(/\uf0b0/gu, '°').replace(/\uf070/gu, 'π')
    .replace(/[◦º]/gu, '°')
    .replace(/\u00a0/gu, ' ');
}

