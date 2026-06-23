import { test, expect } from '@playwright/test';

// Render-verify for the AI-generated 3D figure pipeline.
// Catches the plane3d-class render bugs that unit mocks miss (a misaligned/absent
// solid surfaces only in a real JSXGraph view3d). Mirrors the manual Playwright-MCP
// verification done during T17.
test('AI dựng hình: hình chóp render đúng trong editor 3D', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');
  // toolbar ready
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({
    timeout: 15_000,
  });

  // open the 3D geometry stamp editor
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as { JXG?: unknown }).JXG, undefined, {
    timeout: 10_000,
  });

  // type a pyramid + midpoint problem and generate
  await page
    .locator('[data-testid="ai-generate-3d-input"]')
    .fill('Cho hình chóp S.ABCD có đáy ABCD là hình vuông. Gọi M là trung điểm của SC.');
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  // wait for the pyramid faces (1 base + 4 lateral = 5 polygon3d) to populate the board
  await page.waitForFunction(
    () => {
      const JXG = (window as { JXG?: { boards?: Record<string, unknown> } }).JXG;
      if (!JXG?.boards) return false;
      for (const b of Object.values(JXG.boards) as Array<{ objects: Record<string, { elType?: string }> }>) {
        const polys = Object.values(b.objects).filter((o) => o.elType === 'polygon3d');
        if (polys.length >= 5) return true;
      }
      return false;
    },
    undefined,
    { timeout: 8_000 },
  );

  const counts = await page.evaluate(() => {
    const JXG = (window as { JXG: { boards: Record<string, unknown> } }).JXG;
    let best = { point3d: 0, polygon3d: 0 };
    for (const b of Object.values(JXG.boards) as Array<{ objects: Record<string, { elType?: string }> }>) {
      const objs = Object.values(b.objects);
      const c = {
        point3d: objs.filter((o) => o.elType === 'point3d').length,
        polygon3d: objs.filter((o) => o.elType === 'polygon3d').length,
      };
      if (c.polygon3d > best.polygon3d) best = c;
    }
    return best;
  });

  expect(counts.polygon3d).toBeGreaterThanOrEqual(5); // 1 base + 4 lateral faces
  expect(counts.point3d).toBeGreaterThanOrEqual(6); // A,B,C,D,S + M
  // the plane3d [point,dir1,dir2] bug class manifests as a thrown render error
  expect(errors.join('\n')).not.toMatch(/plane3d|Cannot read|undefined is not/i);
});

// Render-verify for the Phase-2 cross-section (thiết diện) pipeline.
// A pyramid problem with an explicit cutting plane (MBD) should produce ≥6 polygon3d
// (5 solid faces + ≥1 section polygon). Catches any regression in crossSection3d rendering.
test('renders a cross-section polygon for a thiết diện problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto('/');
  // toolbar ready
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({
    timeout: 15_000,
  });

  // open the 3D geometry stamp editor
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as { JXG?: unknown }).JXG, undefined, {
    timeout: 10_000,
  });

  // type a pyramid thiết diện problem with an explicit cutting plane (MBD)
  await page
    .locator('[data-testid="ai-generate-3d-input"]')
    .fill(
      'Cho hình chóp S.ABCD có đáy là hình vuông. Gọi M là trung điểm của SA. ' +
      'Xác định thiết diện của hình chóp cắt bởi mặt phẳng (MBD).',
    );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  // pyramid = 5 face polygons; the section adds ≥1 → expect ≥6 polygon3d
  await page.waitForFunction(
    () => {
      const JXG = (window as { JXG?: { boards?: Record<string, unknown> } }).JXG;
      if (!JXG?.boards) return false;
      for (const b of Object.values(JXG.boards) as Array<{ objects: Record<string, { elType?: string }> }>) {
        const polys = Object.values(b.objects).filter((o) => o.elType === 'polygon3d');
        if (polys.length >= 6) return true;
      }
      return false;
    },
    undefined,
    { timeout: 8_000 },
  );

  // the plane3d [point,dir1,dir2] bug class manifests as a thrown render error
  expect(errors.join('\n')).not.toMatch(/plane3d|Cannot read|undefined is not/i);
});

// Render-verify for Phase-4 mặt cầu ngoại tiếp: a tetrahedron + circumscribed sphere
// should produce a sphere3d element + tetra faces, no render error.
test('renders a circumscribed sphere for a mặt cầu ngoại tiếp problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });

  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho tứ diện đều ABCD. Mặt cầu ngoại tiếp tứ diện ABCD.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const spheres = Object.values(b.objects).filter((o: any) => o.elType === 'sphere3d');
      if (spheres.length >= 1) return true;
    }
    return false;
  }, undefined, { timeout: 8_000 });

  expect(errors.join('\n')).not.toMatch(/sphere3d|circumsphere|Cannot read|undefined is not/i);
});

// Render-verify for Phase-4 standalone cone: a faceted cone3d mesh (≥8 polygon3d faces).
test('renders a standalone cone for a hình nón problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });

  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho hình nón đỉnh S có chiều cao bằng 2.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (polys.length >= 8) return true; // faceted cone (16 segments)
    }
    return false;
  }, undefined, { timeout: 8_000 });

  expect(errors.join('\n')).not.toMatch(/cone3d|Cannot read|undefined is not/i);
});

// Render-verify for Phase-4 standalone cylinder: a faceted cylinder3d mesh.
test('renders a standalone cylinder for a hình trụ problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });

  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho hình trụ có thiết diện qua trục là một hình vuông.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (polys.length >= 8) return true; // faceted cylinder
    }
    return false;
  }, undefined, { timeout: 8_000 });

  expect(errors.join('\n')).not.toMatch(/cylinder3d|Cannot read|undefined is not/i);
});

// Render-verify for the Phase-3a perpendicular-foot (hình chiếu) pipeline.
// A pyramid problem with an explicit foot point should produce ≥6 point3d
// (A,B,C,D,S + H) and ≥1 line3d (the distance segment S→H).
test('renders a perpendicular-foot figure for a hình chiếu problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  // toolbar ready
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({
    timeout: 15_000,
  });

  // open the 3D geometry stamp editor
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, {
    timeout: 10_000,
  });

  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho hình chóp S.ABCD có đáy là hình vuông. Gọi H là hình chiếu vuông góc của S lên mặt đáy. ' +
    'Tính khoảng cách từ S đến mặt phẳng (ABCD).',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  // pyramid (5 base+lateral polys) + a foot point + ≥1 distance segment (line3d/segment3d).
  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const pts = Object.values(b.objects).filter((o: any) => o.elType === 'point3d');
      const segs = Object.values(b.objects).filter((o: any) => o.elType === 'line3d');
      if (pts.length >= 6 && segs.length >= 1) return true;   // 5 base/apex + foot H
    }
    return false;
  }, undefined, { timeout: 8_000 });

  expect(errors.join('\n')).not.toMatch(/plane3d|Cannot read|undefined is not/i);
});

// ───── Phase 5 ─────

// Render-verify cone axial cross-section (thiết diện qua trục): faceted cone (≥8 polygon3d)
// + 1 axial triangle section → ≥9 polygon3d, no render error.
test('renders an axial triangle for a cone thiết diện qua trục problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });

  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho hình nón đỉnh S. Thiết diện qua trục là tam giác đều.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (polys.length >= 9) return true; // faceted cone (≥8) + axial triangle (1)
    }
    return false;
  }, undefined, { timeout: 8_000 });

  expect(errors.join('\n')).not.toMatch(/polygon3d|cone3d|Cannot read|undefined is not/i);
});

// Render-verify cylinder axial cross-section: faceted cylinder (≥8 polygon3d)
// + 1 axial rectangle section → ≥9 polygon3d, no render error.
test('renders an axial rectangle for a cylinder thiết diện qua trục problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });

  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Cho hình trụ có thiết diện qua trục là hình chữ nhật.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (polys.length >= 9) return true; // faceted cylinder (≥8) + axial rectangle (1)
    }
    return false;
  }, undefined, { timeout: 8_000 });

  expect(errors.join('\n')).not.toMatch(/polygon3d|cylinder3d|Cannot read|undefined is not/i);
});

// Render-verify mặt cầu nội tiếp lập phương: a wireframe cube (≥12 line3d edges) + inscribed
// sphere3d, no render error.
test('renders an inscribed sphere for a mặt cầu nội tiếp lập phương problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });

  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Mặt cầu nội tiếp hình lập phương cạnh a.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();

  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const spheres = Object.values(b.objects).filter((o: any) => o.elType === 'sphere3d');
      const edges = Object.values(b.objects).filter((o: any) => o.elType === 'line3d');
      if (spheres.length >= 1 && edges.length >= 12) return true; // inscribed sphere + 12 cube edges
    }
    return false;
  }, undefined, { timeout: 8_000 });

  expect(errors.join('\n')).not.toMatch(/sphere3d|polygon3d|Cannot read|undefined is not/i);
});

// ───── Phase 5b ─────

// Render-verify mặt cầu nội tiếp chóp tứ giác đều (Câu 21): pyramid (5 polygon3d) + inscribed sphere3d.
test('renders an inscribed sphere for a mặt cầu nội tiếp chóp problem', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.locator('[data-testid="dropdown-menu-button"]').first()).toBeVisible({ timeout: 15_000 });
  await page.locator('[data-testid="dropdown-menu-button"]').first().click();
  await page.locator('[data-testid="stamp-toolbar-geometry3d"]').click();
  await expect(page.locator('[data-testid="mini-board-3d"]')).toBeVisible({ timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).JXG, undefined, { timeout: 10_000 });
  await page.locator('[data-testid="ai-generate-3d-input"]').fill(
    'Bán kính của mặt cầu nội tiếp hình chóp tứ giác đều S.ABCD có cạnh đáy và cạnh bên cùng bằng a là bao nhiêu.',
  );
  await page.locator('[data-testid="ai-generate-3d-btn"]').click();
  await page.waitForFunction(() => {
    const JXG = (window as any).JXG;
    if (!JXG?.boards) return false;
    for (const b of Object.values(JXG.boards) as any[]) {
      const spheres = Object.values(b.objects).filter((o: any) => o.elType === 'sphere3d');
      const polys = Object.values(b.objects).filter((o: any) => o.elType === 'polygon3d');
      if (spheres.length >= 1 && polys.length >= 5) return true; // chóp 5 mặt + cầu nội tiếp
    }
    return false;
  }, undefined, { timeout: 8_000 });
  expect(errors.join('\n')).not.toMatch(/sphere3d|polygon3d|Cannot read|undefined is not/i);
});
