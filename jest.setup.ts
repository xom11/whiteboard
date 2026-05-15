import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';

// jsdom không expose structuredClone — polyfill từ Node global
if (typeof globalThis.structuredClone === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).structuredClone = <T>(val: T): T => JSON.parse(JSON.stringify(val));
}
