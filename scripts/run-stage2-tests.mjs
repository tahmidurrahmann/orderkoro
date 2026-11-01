#!/usr/bin/env node
/**
 * Standalone Stage 2 test runner for CI and automated verification.
 * Usage:
 *   npm run test:vm
 */

import { spawn } from "node:child_process";

console.log("🧪 Running Stage 2 Test Suite...\n");

const child = spawn("npx", ["vitest", "run"], {
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: "test",
    MOCK_INTEGRATIONS: "1",
  },
});

child.on("close", (code) => {
  if (code === 0) {
    console.log("\n✅ All Stage 2 tests passed successfully.\n");
    process.exit(0);
  } else {
    console.error(`\n❌ Stage 2 tests failed with exit code ${code}.\n`);
    process.exit(code || 1);
  }
});
