// src/stamps/geometry-2d/ai/providers/claude-cli.ts
//
// AIProvider impl qua `claude` CLI subprocess (Claude Code) — dev/eval only.
// Tận dụng OAuth subscription Claude Pro/Max/Team đã đăng nhập sẵn ở máy,
// charge vào quota subscription thay vì API console credits.
//
// LƯU Ý: Theo Anthropic ToS (cập nhật 02/2026), OAuth token từ subscription
// chỉ legal cho Claude Code CLI / claude.ai. KHÔNG dùng provider này trong
// production third-party app — chỉ dùng cho dev/eval local. Production phải
// dùng AnthropicProvider với API key từ console.anthropic.com.
//
// CLI flags dùng:
//   --print                     batch mode (stdin → stdout)
//   --output-format json        single-result JSON envelope
//   --json-schema <schema>      structured-output constraint
//   --tools ""                  disable built-in Bash/Read/Write/Edit/...
//   --append-system-prompt      inject DSL system prompt
//   --model <id>                model id (alias 'sonnet'/'opus' hoặc full)
//   --max-budget-usd <usd>      cost cap per call (safety)
//
// Parse `structured_output` field từ stdout JSON (không phải `result` —
// `result` empty khi có --json-schema).

import type {
  AIProvider,
  ProviderOutput,
  ProviderRequest,
  ProviderTokenUsage,
} from './types';

// Lazy node:child_process — tránh bundle vào browser build (provider này
// chỉ chạy ở Node env dev/eval).
type SpawnFn = typeof import('node:child_process').spawn;

export interface ClaudeCliProviderOptions {
  /** Binary path. Default 'claude'. Override qua env CLAUDE_CLI_BIN. */
  bin?: string;
  /** Default model id khi request không truyền. Default 'claude-sonnet-4-6'. */
  defaultModel?: string;
  /** Cost cap per call (USD). Default 0.50. */
  maxBudgetUsd?: number;
  /** Custom spawn impl (test mock). */
  spawnImpl?: SpawnFn;
}

interface ClaudeCliResultEnvelope {
  type: 'result';
  subtype: 'success' | 'error_during_execution' | 'error_max_turns' | string;
  is_error: boolean;
  api_error_status?: string | null;
  result?: string;
  structured_output?: unknown;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  total_cost_usd?: number;
}

const DEFAULT_BIN = 'claude';
const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_BUDGET_USD = 0.5;

export class ClaudeCliProvider implements AIProvider {
  readonly name = 'claude-cli';
  readonly defaultModel: string;
  private readonly bin: string;
  private readonly maxBudgetUsd: number;
  private readonly spawnImpl: SpawnFn | null;

  constructor(opts: ClaudeCliProviderOptions = {}) {
    this.bin = opts.bin ?? DEFAULT_BIN;
    this.defaultModel = opts.defaultModel ?? DEFAULT_MODEL;
    this.maxBudgetUsd = opts.maxBudgetUsd ?? DEFAULT_MAX_BUDGET_USD;
    this.spawnImpl = opts.spawnImpl ?? null;
  }

  private async resolveSpawn(): Promise<SpawnFn> {
    if (this.spawnImpl) return this.spawnImpl;
    const mod = await import('node:child_process');
    return mod.spawn;
  }

  async call(req: ProviderRequest): Promise<ProviderOutput> {
    let spawn: SpawnFn;
    try {
      spawn = await this.resolveSpawn();
    } catch (e) {
      return {
        kind: 'error',
        message:
          'ClaudeCliProvider: node:child_process không khả dụng (chỉ chạy được ở Node env). ' +
          ((e as { message?: string }).message ?? ''),
      };
    }

    const args = [
      '--print',
      '--output-format', 'json',
      '--json-schema', JSON.stringify(req.schema),
      '--append-system-prompt', req.systemPrompt,
      '--tools', '',
      '--model', req.model,
      '--max-budget-usd', String(this.maxBudgetUsd),
    ];

    return new Promise<ProviderOutput>((resolve) => {
      let child;
      try {
        child = spawn(this.bin, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      } catch (e) {
        resolve({
          kind: 'error',
          message:
            `ClaudeCliProvider: spawn '${this.bin}' thất bại. ` +
            ((e as { message?: string }).message ?? 'Kiểm tra claude CLI đã cài chưa.'),
        });
        return;
      }

      let stdout = '';
      let stderr = '';
      let settled = false;
      const settle = (out: ProviderOutput) => {
        if (settled) return;
        settled = true;
        resolve(out);
      };

      const onAbort = () => {
        child.kill('SIGTERM');
        settle({ kind: 'error', message: 'ClaudeCliProvider: aborted' });
      };
      if (req.signal) {
        if (req.signal.aborted) {
          onAbort();
          return;
        }
        req.signal.addEventListener('abort', onAbort, { once: true });
      }

      child.stdout?.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8');
      });
      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8');
      });

      child.on('error', (e: Error) => {
        settle({
          kind: 'error',
          message: `ClaudeCliProvider: subprocess error: ${e.message}`,
        });
      });

      child.on('close', (code: number | null) => {
        if (settled) return;
        if (code !== 0) {
          settle({
            kind: 'error',
            message:
              `ClaudeCliProvider: exit code ${code}. stderr: ${stderr.trim() || '(empty)'}`,
            ...(typeof code === 'number' ? { status: code } : {}),
          });
          return;
        }

        let env: ClaudeCliResultEnvelope;
        try {
          env = JSON.parse(stdout.trim()) as ClaudeCliResultEnvelope;
        } catch (e) {
          settle({
            kind: 'error',
            message:
              'ClaudeCliProvider: stdout không parse được JSON: ' +
              ((e as { message?: string }).message ?? '?'),
          });
          return;
        }

        if (env.is_error) {
          settle({
            kind: 'error',
            message:
              `ClaudeCliProvider: CLI báo lỗi (subtype=${env.subtype}, api_status=${env.api_error_status ?? 'n/a'})`,
          });
          return;
        }

        if (env.structured_output === undefined || env.structured_output === null) {
          settle({
            kind: 'error',
            message:
              'ClaudeCliProvider: thiếu structured_output trong response. ' +
              `result="${(env.result ?? '').slice(0, 200)}"`,
          });
          return;
        }

        const usage = toUsage(env.usage);
        settle({ kind: 'json', data: env.structured_output, usage });
      });

      // User prompt qua stdin (cleaner than arg cho prompt dài + escape).
      try {
        child.stdin?.write(req.userPrompt);
        child.stdin?.end();
      } catch (e) {
        settle({
          kind: 'error',
          message:
            'ClaudeCliProvider: ghi stdin thất bại: ' +
            ((e as { message?: string }).message ?? '?'),
        });
      }
    });
  }
}

function toUsage(u: ClaudeCliResultEnvelope['usage']): ProviderTokenUsage {
  return {
    inputTokens: u?.input_tokens ?? 0,
    outputTokens: u?.output_tokens ?? 0,
    cacheReadTokens: u?.cache_read_input_tokens ?? 0,
    cacheCreationTokens: u?.cache_creation_input_tokens ?? 0,
  };
}
