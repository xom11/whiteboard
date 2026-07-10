# E2E tests (Playwright)

Smoke tests cho whiteboard demo, chạy qua headless Chromium.

## Chạy

```bash
# Chạy tất cả E2E specs (tự start vite demo qua webServer config).
npm run test:e2e

# Chạy UI mode (debug interactive).
npx playwright test --ui

# Chạy 1 spec cụ thể.
npx playwright test tests/e2e/smoke.spec.ts

# Mở HTML report sau khi chạy.
npx playwright show-report
```

Lần đầu phải cài browser binary:

```bash
npx playwright install chromium
```

## Cấu trúc

- `playwright.config.ts` — config root (chromium headless, webServer auto-start `npm run e2e:serve`).
- `tests/e2e/*.spec.ts` — specs.

## Lưu ý

- Harness vite serve ở `http://127.0.0.1:5173` (xem `scripts/demo/vite.config.ts`).
- Jest (`*.test.{ts,tsx}`) và Playwright (`*.spec.ts`) tách biệt theo extension —
  Jest cũng được cấu hình `testPathIgnorePatterns: /tests/e2e/` để chắc chắn
  không nuốt file Playwright.
- Một số test đang `test.skip()` vì selector chưa stable (xem TODO trong spec).
