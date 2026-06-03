import {
  ClaudeAgentSdkProvider,
  type ClaudeAgentSdkMessage,
  type ClaudeAgentSdkQueryFn,
} from '../claude-agent-sdk';
import type { ProviderRequest } from '../types';

const baseReq: ProviderRequest = {
  systemPrompt: 'SYS',
  userPrompt: 'USR',
  schema: { type: 'object' },
  model: 'claude-sonnet-4-6',
  maxTokens: 1024,
};

function makeAsyncIter(msgs: ClaudeAgentSdkMessage[]): AsyncIterable<ClaudeAgentSdkMessage> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const m of msgs) yield m;
    },
  };
}

describe('ClaudeAgentSdkProvider', () => {
  it('happy path: extract text từ assistant message + parse JSON', async () => {
    const queryImpl: ClaudeAgentSdkQueryFn = () =>
      makeAsyncIter([
        { type: 'system' } as ClaudeAgentSdkMessage,
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: '{"hello":"world"}' }] },
        },
        {
          type: 'result',
          subtype: 'success',
          usage: { input_tokens: 100, output_tokens: 5 },
        },
      ]);
    const p = new ClaudeAgentSdkProvider({ queryImpl });
    const r = await p.call(baseReq);
    expect(r.kind).toBe('json');
    if (r.kind === 'json') {
      expect(r.data).toEqual({ hello: 'world' });
      expect(r.usage?.inputTokens).toBe(100);
      expect(r.usage?.outputTokens).toBe(5);
    }
  });

  it('strip markdown fence ```json``` defensive', async () => {
    const queryImpl: ClaudeAgentSdkQueryFn = () =>
      makeAsyncIter([
        {
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: '```json\n{"x":1}\n```' }],
          },
        },
        { type: 'result', subtype: 'success' },
      ]);
    const r = await new ClaudeAgentSdkProvider({ queryImpl }).call(baseReq);
    expect(r.kind).toBe('json');
    if (r.kind === 'json') expect(r.data).toEqual({ x: 1 });
  });

  it('empty assistant response → kind=error', async () => {
    const queryImpl: ClaudeAgentSdkQueryFn = () =>
      makeAsyncIter([{ type: 'result', subtype: 'success' }]);
    const r = await new ClaudeAgentSdkProvider({ queryImpl }).call(baseReq);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.message).toMatch(/rỗng/i);
  });

  it('invalid JSON output → kind=error với preview', async () => {
    const queryImpl: ClaudeAgentSdkQueryFn = () =>
      makeAsyncIter([
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: 'not json at all' }] },
        },
        { type: 'result', subtype: 'success' },
      ]);
    const r = await new ClaudeAgentSdkProvider({ queryImpl }).call(baseReq);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') {
      expect(r.message).toMatch(/parse JSON/);
      expect(r.message).toContain('not json');
    }
  });

  it('result subtype != success → kind=error', async () => {
    const queryImpl: ClaudeAgentSdkQueryFn = () =>
      makeAsyncIter([
        { type: 'result', subtype: 'error_during_execution' },
      ]);
    const r = await new ClaudeAgentSdkProvider({ queryImpl }).call(baseReq);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.message).toContain('error_during_execution');
  });

  it('query throws → kind=error với message', async () => {
    const queryImpl: ClaudeAgentSdkQueryFn = () => {
      throw new Error('connection lost');
    };
    const r = await new ClaudeAgentSdkProvider({ queryImpl }).call(baseReq);
    expect(r.kind).toBe('error');
    if (r.kind === 'error') expect(r.message).toContain('connection lost');
  });

  it('append constrained system prompt với schema vào systemPrompt', async () => {
    let capturedSystem = '';
    const queryImpl: ClaudeAgentSdkQueryFn = (args) => {
      capturedSystem = args.options.systemPrompt ?? '';
      return makeAsyncIter([
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: '{}' }] },
        },
        { type: 'result', subtype: 'success' },
      ]);
    };
    await new ClaudeAgentSdkProvider({ queryImpl }).call({
      ...baseReq,
      schema: { type: 'object', properties: { hello: { type: 'string' } } },
    });
    expect(capturedSystem).toContain('SYS');
    expect(capturedSystem).toContain('JSON');
    expect(capturedSystem).toContain('"hello"');
  });

  it('inject CLAUDE_CODE_OAUTH_TOKEN vào env khi opts.oauthToken set', async () => {
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    const queryImpl: ClaudeAgentSdkQueryFn = () =>
      makeAsyncIter([
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: '{}' }] },
        },
        { type: 'result', subtype: 'success' },
      ]);
    const p = new ClaudeAgentSdkProvider({
      queryImpl,
      oauthToken: 'sk-ant-oat01-test-token',
    });
    await p.call(baseReq);
    expect(process.env.CLAUDE_CODE_OAUTH_TOKEN).toBe('sk-ant-oat01-test-token');
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
  });

  it('default model = claude-sonnet-4-6 khi req.model unset', async () => {
    let capturedModel = '';
    const queryImpl: ClaudeAgentSdkQueryFn = (args) => {
      capturedModel = args.options.model ?? '';
      return makeAsyncIter([
        {
          type: 'assistant',
          message: { content: [{ type: 'text', text: '{}' }] },
        },
        { type: 'result', subtype: 'success' },
      ]);
    };
    const reqNoModel = { ...baseReq };
    delete (reqNoModel as { model?: string }).model;
    await new ClaudeAgentSdkProvider({ queryImpl }).call(
      reqNoModel as ProviderRequest,
    );
    expect(capturedModel).toBe('claude-sonnet-4-6');
  });
});

describe('ClaudeAgentSdkProvider — onToken', () => {
  test('emits onToken for each assistant text block', async () => {
    const chunks: string[] = [];
    const queryImpl = async function* () {
      yield {
        type: 'assistant' as const,
        message: { content: [{ type: 'text' as const, text: 'hello ' }] },
      };
      yield {
        type: 'assistant' as const,
        message: { content: [{ type: 'text' as const, text: 'world' }] },
      };
      yield { type: 'result' as const, subtype: 'success' as const };
    };
    const p = new ClaudeAgentSdkProvider({ queryImpl: queryImpl as never });

    // Final text "hello world" is not valid JSON → parse_error expected.
    // We only care that onToken fired for each block during streaming.
    await p.call({
      systemPrompt: 'sys',
      userPrompt: 'usr',
      schema: { type: 'object' } as never,
      model: 'm',
      maxTokens: 100,
      onToken: (c) => chunks.push(c),
    });

    expect(chunks).toEqual(['hello ', 'world']);
  });
});
