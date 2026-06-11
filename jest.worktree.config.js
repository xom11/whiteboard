// Config cho phiên làm việc TRONG .claude/worktrees/<name>: base config ignore
// '/.claude/worktrees/' (để jest chạy từ repo chính không quét worktree) nên mọi
// đường dẫn tuyệt đối trong worktree bị loại. Chạy: npx jest -c jest.worktree.config.js
const base = require('./jest.config.js');

module.exports = {
  ...base,
  testPathIgnorePatterns: base.testPathIgnorePatterns.filter((p) => !p.includes('worktrees')),
  modulePathIgnorePatterns: [],
};
