// `npm run demo` cũ vốn KHÔNG phải demo — nó là harness E2E cho Playwright
// (webServer của 8 spec, tắt StrictMode có chủ đích). Cái tên lừa người đọc,
// nên đã đổi. Giữ alias này để ~15 tài liệu cũ (và trí nhớ cơ bắp) thất bại kèm
// chỉ dẫn, thay vì `command not found` im lặng.
console.error(`
\`npm run demo\` đã đổi tên — nó vốn là harness E2E, không phải demo.

  npm run e2e:serve    harness cho Playwright (vite, :5173)
  npm run dev:board    xem Whiteboard đầy đủ (:3030)
  npm run dev:figure   xem trang "dán đề → ra hình" (:3030/ve-hinh)
`);
process.exit(1);
