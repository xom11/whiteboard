// src/stamps/geometry-2d/ai/providers/__tests__/claude-cli.test.ts
//
// Unit test cho ClaudeCliProvider. Mock subprocess qua spawnImpl + EventEmitter.
// Lưu ý: events chỉ emit SAU khi spawn() được gọi (qua setTimeout 0), để provider
// kịp gắn listener — tránh "Unhandled error" do emit('error') không có listener.

import { EventEmitter } from 'node:events';
import { ClaudeCliProvider } from '../claude-cli';
import type { ProviderRequest } from '../types';

interface FakeChildOptions {
  stdout?: string;
  stderr?: string;
  exitCode?: number | null;
  errorBeforeExit?: Error;
  /** Delay (ms) trước khi emit close. Default 0 (= next tick). */
  delay?: number;
}

interface FakeChild extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
  stdin: { write: jest.Mock; end: jest.Mock };
  kill: jest.Mock;
}

function makeFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdin = { write: jest.fn(), end: jest.fn() };
  child.kill = jest.fn();
  return child;
}

function makeSpawnPair(opts: FakeChildOptions = {}): { spawn: jest.Mock; child: FakeChild } {
  const child = makeFakeChild();
  const spawn = jest.fn(() => {
    const run = () => {
      if (opts.stdout) child.stdout.emit('data', Buffer.from(opts.stdout, 'utf8'));
      if (opts.stderr) child.stderr.emit('data', Buffer.from(opts.stderr, 'utf8'));
      if (opts.errorBeforeExit) {
        child.emit('error', opts.errorBeforeExit);
        return;
      }
      child.emit('close', opts.exitCode ?? 0);
    };
    setTimeout(run, opts.delay ?? 0);
    return child;
  });
  return { spawn, child };
}

const baseReq: ProviderRequest = {
  systemPrompt: 'Bạn là chuyên gia hình học.',
  userPrompt: 'Tam giác ABC.',
  schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
  model: 'claude-sonnet-4-6',
  maxTokens: 1024,
};

describe('ClaudeCliProvider.call', () => {
  it('happy path: parse structured_output + map usage', async () => {
    const envelope = {
      type: 'result',
      subtype: 'success',
      is_error: false,
      result: '',
      structured_output: { ok: true, payload: { foo: 1 } },
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 9000,
        cache_creation_input_tokens: 2000,
      },
      total_cost_usd: 0.0123,
    };
    const { spawn } = makeSpawnPair({ stdout: JSON.stringify(envelope), exitCode: 0 });
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never });

    const out = await p.call(baseReq);

    expect(out.kind).toBe('json');
    if (out.kind !== 'json') throw new Error();
    expect(out.data).toEqual({ ok: true, payload: { foo: 1 } });
    expect(out.usage).toEqual({
      inputTokens: 100,
      outputTokens: 50,
      cacheReadTokens: 9000,
      cacheCreationTokens: 2000,
    });
  });

  it('truyền CLI args đúng: --print --output-format json --json-schema ... --tools "" --model ...', async () => {
    const envelope = {
      type: 'result', subtype: 'success', is_error: false,
      structured_output: { ok: true },
    };
    const { spawn } = makeSpawnPair({ stdout: JSON.stringify(envelope), exitCode: 0 });
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never, bin: 'claude-test' });
    await p.call(baseReq);

    expect(spawn).toHaveBeenCalledTimes(1);
    const [bin, args] = spawn.mock.calls[0];
    expect(bin).toBe('claude-test');
    expect(args).toEqual(expect.arrayContaining([
      '--print',
      '--output-format', 'json',
      '--json-schema', JSON.stringify(baseReq.schema),
      '--append-system-prompt', baseReq.systemPrompt,
      '--tools', '',
      '--model', 'claude-sonnet-4-6',
    ]));
    expect(args).toContain('--max-budget-usd');
  });

  it('user prompt được ghi vào stdin (không phải arg)', async () => {
    const envelope = {
      type: 'result', subtype: 'success', is_error: false,
      structured_output: { ok: true },
    };
    const { spawn, child } = makeSpawnPair({ stdout: JSON.stringify(envelope), exitCode: 0 });
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never });
    await p.call(baseReq);

    expect(child.stdin.write).toHaveBeenCalledWith(baseReq.userPrompt);
    expect(child.stdin.end).toHaveBeenCalled();
  });

  it('exit code khác 0 → kind:error kèm stderr', async () => {
    const { spawn } = makeSpawnPair({ stdout: '', stderr: 'auth failed', exitCode: 1 });
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never });
    const out = await p.call(baseReq);

    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('exit code 1');
    expect(out.message).toContain('auth failed');
  });

  it('stdout không phải JSON → kind:error', async () => {
    const { spawn } = makeSpawnPair({ stdout: 'not json', exitCode: 0 });
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never });
    const out = await p.call(baseReq);

    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('không parse được JSON');
  });

  it('envelope.is_error=true → kind:error', async () => {
    const envelope = {
      type: 'result',
      subtype: 'error_during_execution',
      is_error: true,
      api_error_status: 'overloaded',
    };
    const { spawn } = makeSpawnPair({ stdout: JSON.stringify(envelope), exitCode: 0 });
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never });
    const out = await p.call(baseReq);

    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('error_during_execution');
    expect(out.message).toContain('overloaded');
  });

  it('thiếu structured_output → kind:error', async () => {
    const envelope = {
      type: 'result',
      subtype: 'success',
      is_error: false,
      result: 'fallback text',
    };
    const { spawn } = makeSpawnPair({ stdout: JSON.stringify(envelope), exitCode: 0 });
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never });
    const out = await p.call(baseReq);

    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('structured_output');
  });

  it('subprocess emit error event → kind:error', async () => {
    const { spawn } = makeSpawnPair({ errorBeforeExit: new Error('ENOENT: no such binary') });
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never });
    const out = await p.call(baseReq);

    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('ENOENT');
  });

  it('AbortSignal đã abort trước khi gọi → kill subprocess', async () => {
    const { spawn, child } = makeSpawnPair({ delay: 100, exitCode: 0, stdout: '{}' });
    const controller = new AbortController();
    controller.abort();
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never });
    const out = await p.call({ ...baseReq, signal: controller.signal });

    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toMatch(/aborted/i);
    expect(child.kill).toHaveBeenCalled();
  });

  it('AbortSignal abort giữa chừng → kill subprocess', async () => {
    const { spawn, child } = makeSpawnPair({ delay: 200, exitCode: 0, stdout: '{}' });
    const controller = new AbortController();
    const p = new ClaudeCliProvider({ spawnImpl: spawn as never });
    const promise = p.call({ ...baseReq, signal: controller.signal });
    setTimeout(() => controller.abort(), 20);
    const out = await promise;

    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toMatch(/aborted/i);
    expect(child.kill).toHaveBeenCalledWith('SIGTERM');
  });

  it('spawn throws sync → kind:error', async () => {
    const spawnImpl = jest.fn(() => {
      throw new Error('command not found');
    });
    const p = new ClaudeCliProvider({ spawnImpl: spawnImpl as never });
    const out = await p.call(baseReq);

    expect(out.kind).toBe('error');
    if (out.kind !== 'error') throw new Error();
    expect(out.message).toContain('command not found');
  });

  it('default constructor có defaultModel, name, không throw', () => {
    const p = new ClaudeCliProvider();
    expect(p.name).toBe('claude-cli');
    expect(p.defaultModel).toBeTruthy();
  });
});
