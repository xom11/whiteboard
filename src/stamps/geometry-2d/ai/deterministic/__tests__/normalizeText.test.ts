import { normalizeProblemText } from '../normalizeText';

describe('normalizeProblemText', () => {
  it('Δ/∆ trước chữ HOA → "tam giác "', () => {
    expect(normalizeProblemText('tâm nội tiếp ΔMAB')).toBe('tâm nội tiếp tam giác MAB');
    expect(normalizeProblemText('ΔABC ~ ΔASQ')).toBe('tam giác ABC ~ tam giác ASQ');
  });
  it('"vòng tròn" → "đường tròn" (mọi hoa/thường)', () => {
    expect(normalizeProblemText('I là tâm vòng tròn nội tiếp')).toBe('I là tâm đường tròn nội tiếp');
    expect(normalizeProblemText('Vòng tròn (O)')).toBe('đường tròn (O)');
  });
  it('idempotent + không đụng text khác', () => {
    const s = 'Cho tam giác ABC nội tiếp đường tròn (O)';
    expect(normalizeProblemText(s)).toBe(s);
  });
  it('bỏ ký hiệu căn √ (nhiễu OCR) → khoảng trắng, không dính chữ', () => {
    expect(normalizeProblemText('hình chiếu của H lên √ √ √ AB,AC').replace(/\s+/g, ' ')).toBe(
      'hình chiếu của H lên AB,AC',
    );
    expect(normalizeProblemText('√3')).not.toContain('√');
  });

  it('prime cong ’ / ′ / ´ sau chữ-số → ASCII apostrophe (canonical)', () => {
    expect(normalizeProblemText('(O’) và (O′)')).toBe("(O') và (O')");
    expect(normalizeProblemText('đường thẳng AO’ cắt (O)')).toBe("đường thẳng AO' cắt (O)");
    expect(normalizeProblemText('điểm A´')).toBe("điểm A'");
    // KHÔNG đổi dấu nháy không đứng sau chữ-số (tránh nuốt dấu câu khác).
    expect(normalizeProblemText('’abc')).toBe('’abc');
  });

  it('OCR glue: tách từ-vựng hình học dính nhãn HOA + nhãn HOA dính từ-khoá', () => {
    expect(normalizeProblemText('cắtBC')).toBe('cắt BC');
    expect(normalizeProblemText('tâmF bán kính')).toBe('tâm F bán kính');
    expect(normalizeProblemText('điểm Asao cho')).toBe('điểm A sao cho');
    expect(normalizeProblemText('điểm Anằm ngoài')).toBe('điểm A nằm ngoài');
    expect(normalizeProblemText('P,Qlần lượt')).toBe('P,Q lần lượt');
    // KHÔNG tách chữ thường HOA-đầu-câu ("Cho", "Trên", "Gọi", "Đường").
    expect(normalizeProblemText('Cho tam giác')).toBe('Cho tam giác');
    expect(normalizeProblemText('Trên cạnh AB')).toBe('Trên cạnh AB');
    expect(normalizeProblemText('Đường tròn (O)')).toBe('Đường tròn (O)');
    // KHÔNG tách cặp đỉnh "AB" (nhãn + nhãn).
    expect(normalizeProblemText('đoạn AB')).toBe('đoạn AB');
  });

  it('OCR multi-word-glue: tách chuỗi từ-vựng hình-học dính liền theo whitelist', () => {
    // son123:36 — "Chođườngtròn(O)vàbadâycung..."
    expect(
      normalizeProblemText('Chođườngtròn(O)vàbadâycungAB,AC,ADbấtkì.').replace(/\s+/g, ' '),
    ).toBe('Cho đường tròn (O) và ba dây cung AB,AC,AD bất kì.');
    // son123:66 — "(IMO1985)ChotamgiácABC,mộtđườngtròntâmO điquaA,C vàcắtlạicáccạnhBA,BC tạiK,N."
    expect(
      normalizeProblemText(
        '(IMO1985)ChotamgiácABC,mộtđườngtròntâmO điquaA,C vàcắtlạicáccạnhBA,BC tạiK,N.',
      ).replace(/\s+/g, ' '),
    ).toBe('(IMO1985) Cho tam giác ABC,một đường tròn tâm O đi qua A,C và cắt lại các cạnh BA,BC tại K,N.');
    // son123:97 — "ChotamgiácABC nhọncóAB <AC nội tiếp đường tròn (O)."
    expect(
      normalizeProblemText('ChotamgiácABC nhọncóAB <AC nội tiếp đường tròn (O).').replace(/\s+/g, ' '),
    ).toBe('Cho tam giác ABC nhọn có AB <AC nội tiếp đường tròn (O).');
  });

  it('multi-word-glue: idempotent + KHÔNG phá text đã có dấu cách / cặp đỉnh', () => {
    // Đã sạch → giữ nguyên (không chèn cách giữa từ-khoá rời).
    const clean = 'Cho tam giác ABC nội tiếp đường tròn (O) có ba dây cung AB,AC,AD';
    expect(normalizeProblemText(clean)).toBe(clean);
    // KHÔNG cắt giữa từ ("Cho"→"C ho", "Đường"→"Đ ường").
    expect(normalizeProblemText('Cho đường tròn')).toBe('Cho đường tròn');
    expect(normalizeProblemText('Đường tròn (O)')).toBe('Đường tròn (O)');
    // KHÔNG tách cặp đỉnh (HOA+HOA) — "AB" không có từ-khoá whitelist sau.
    expect(normalizeProblemText('dây AB và dây CD')).toBe('dây AB và dây CD');
  });
});
