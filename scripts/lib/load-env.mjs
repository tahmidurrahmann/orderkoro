/**
 * Shared Environment Loader for CLI scripts.
 * Loads .env then .env.local (where .env.local values take precedence).
 * Never overrides environment variables already set in the executing shell.
 * Ignores missing files without crashing.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");

export function loadScriptEnv() {
  if (typeof process.loadEnvFile !== "function") {
    return;
  }

  const envLocalPath = path.join(ROOT_DIR, ".env.local");
  const envPath = path.join(ROOT_DIR, ".env");

  // In Node.js, process.loadEnvFile() does not overwrite existing process.env variables.
  // Loading .env.local first gives it precedence over .env, while preserving any
  // variables already present in the calling shell environment.
  if (fs.existsSync(envLocalPath)) {
    try {
      process.loadEnvFile(envLocalPath);
    } catch {
      // Ignore syntax or read issues in missing/unreadable files
    }
  }

  if (fs.existsSync(envPath)) {
    try {
      process.loadEnvFile(envPath);
    } catch {
      // Ignore syntax or read issues in missing/unreadable files
    }
  }
}

/**
 * Validates that all required environment variables are set and non-empty.
 * Prints ONLY variable names (never values or secrets) and exits with code 1 if missing.
 */
export function requireEnvVars(varNames) {
  const missing = varNames.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    console.error(`Missing required environment variable(s): ${missing.join(", ")}`);
    console.error("Please configure them in your shell or in .env / .env.local.");
    process.exit(1);
  }
}
