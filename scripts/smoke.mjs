#!/usr/bin/env node
/**
 * End-to-End Smoke Test Runner (scripts/smoke.mjs)
 * Executes the 5 end-to-end smoke checks with MOCK_INTEGRATIONS=1.
 */

import { spawn } from "node:child_process";

console.log("🚀 Running OrderKoro Stage 3 End-to-End Smoke Test (MOCK_INTEGRATIONS=1)...\n");

const child = spawn("npx", ["vitest", "run", "tests/smoke.test.ts"], {
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
    console.log("\n✅ All 5/5 End-to-End Smoke Checks Passed.\n");
    process.exit(0);
  } else {
    console.error(`\n❌ Smoke tests failed with exit code ${code}.\n`);
    process.exit(code || 1);
  }
});
