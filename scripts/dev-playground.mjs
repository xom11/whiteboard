// Chạy playground Next dev (:3030) rồi mở đúng route trong trình duyệt.
//
// Nếu :3030 ĐÃ phản hồi → chỉ mở tab, KHÔNG spawn. Nhờ vậy `dev:board` và
// `dev:figure` không tranh cổng: đang chạy cái này, gõ cái kia ở terminal khác
// thì nó chỉ mở thêm tab.
//
//   node scripts/dev-playground.mjs /
//   node scripts/dev-playground.mjs /ve-hinh
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const PORT = 3030;
const ORIGIN = `http://localhost:${PORT}`;
const route = process.argv[2] ?? '/';
const url = ORIGIN + route;

const here = path.dirname(fileURLToPath(import.meta.url));
const playgroundDir = path.resolve(here, '..', 'playground');

function openBrowser(target) {
  // Guard cho kiểm thử tự động: đừng bật tab thật.
  if (process.env.DEV_PLAYGROUND_NO_OPEN) {
    console.log(`[dev-playground] (bỏ qua mở trình duyệt) ${target}`);
    return;
  }
  const cmd =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [target], {
    stdio: 'ignore',
    detached: true,
    shell: process.platform === 'win32',
  }).unref();
}

async function isUp() {
  try {
    const res = await fetch(ORIGIN, { method: 'HEAD' });
    return res.status < 500;
  } catch {
    return false;
  }
}

async function waitUntilUp(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await isUp()) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

if (await isUp()) {
  console.log(`[dev-playground] :${PORT} đã chạy — chỉ mở ${url}`);
  openBrowser(url);
  process.exit(0);
}

console.log(`[dev-playground] khởi động Next dev tại ${playgroundDir} …`);
const child = spawn('npm', ['run', 'dev'], { cwd: playgroundDir, stdio: 'inherit' });

const stop = () => child.kill('SIGINT');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));

if (await waitUntilUp()) {
  console.log(`[dev-playground] mở ${url}`);
  openBrowser(url);
} else {
  console.error(`[dev-playground] :${PORT} không lên sau 90s — xem log Next ở trên.`);
}
