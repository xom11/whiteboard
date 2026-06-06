// API route server-side cho AI sinh hình. Chạy trên node (máy local qua cloudflared)
// nên token Claude (CLAUDE_CODE_OAUTH_TOKEN trong .env.local) KHÔNG bao giờ ra browser.
// handleGenerateFigure tự selectProvider từ env (WHITEBOARD_AI_PROVIDER=claude-agent-sdk).

import { NextResponse } from 'next/server';
import { handleGenerateFigure } from '../../../../src/stamps/geometry-2d/ai/handleGenerateFigure';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const problem = typeof body?.problem === 'string' ? body.problem.trim() : '';
    if (!problem) {
      return NextResponse.json({ ok: false, message: 'Thiếu đề bài.' }, { status: 400 });
    }
    const result = await handleGenerateFigure({ problem }, {});
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Lỗi server không xác định.';
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
