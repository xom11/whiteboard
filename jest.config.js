/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}', '**/*.test.{ts,tsx}'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { diagnostics: false, isolatedModules: true }],
  },
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '^jsxgraph$': '<rootDir>/__mocks__/jsxgraphMock.js',
  },
  transformIgnorePatterns: ['/node_modules/(?!(katex|@excalidraw)/)'],
};
