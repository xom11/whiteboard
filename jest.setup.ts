import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// jsdom không expose structuredClone — polyfill từ Node global
if (typeof globalThis.structuredClone === 'undefined') {

  (globalThis as any).structuredClone = <T>(val: T): T => JSON.parse(JSON.stringify(val));
}

// jsdom không expose ReadableStream / TextEncoder web — polyfill từ Node để test
// streaming providers (Ollama NDJSON). Node 18+ luôn có node:stream/web + node:util.
if (typeof (globalThis as any).ReadableStream === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { ReadableStream } = require('node:stream/web');
  (globalThis as any).ReadableStream = ReadableStream;
}
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder, TextDecoder } = require('node:util');
  (globalThis as any).TextEncoder = TextEncoder;
  (globalThis as any).TextDecoder = TextDecoder;
}
