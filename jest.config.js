// Ignore bản sao worktree ('/.claude/worktrees/' VÀ '/.worktrees/') CHỈ khi chạy
// từ repo chính — nếu không jest quét worktree con (chạy code CŨ → làm chậm + sai
// số test/regression). Khi rootDir CHÍNH LÀ một worktree, path mọi test đều chứa
// chuỗi đó → giữ ignore sẽ ra "No tests found" (gotcha đã gặp 2026-06).
const WORKTREE_DIRS = ['/.claude/worktrees/', '/.worktrees/'];
const inWorktree = WORKTREE_DIRS.some((d) => __dirname.includes(d));
const worktreeIgnores = inWorktree ? [] : WORKTREE_DIRS;

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/tests/e2e/', ...worktreeIgnores],
  modulePathIgnorePatterns: worktreeIgnores,
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { diagnostics: false, isolatedModules: true }],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '^jsxgraph$': '<rootDir>/__mocks__/jsxgraphMock.js',
  },
  transformIgnorePatterns: ['/node_modules/(?!(katex|@excalidraw)/)'],
};
