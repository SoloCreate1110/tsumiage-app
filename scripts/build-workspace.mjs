import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Read-only. Check the same workspace/VCS decision that EAS uses before any submission.
/** @param {string} [cwd] @param {Record<string, string | undefined>} [env] */
export function checkBuildWorkspace(cwd = process.cwd(), env = process.env) {
  const projectDir = fs.realpathSync(cwd);
  if (env.EAS_NO_VCS) {
    assert.equal(env.EAS_NO_VCS, "1", "Set EAS_NO_VCS=1 explicitly for a temporary source snapshot");
    assert.ok(env.EAS_PROJECT_ROOT && path.isAbsolute(env.EAS_PROJECT_ROOT),
      "A snapshot requires an explicit absolute EAS_PROJECT_ROOT");
    assert.equal(fs.realpathSync(env.EAS_PROJECT_ROOT), projectDir,
      "EAS_PROJECT_ROOT must point to the checked source snapshot");
    return { mode: "snapshot", projectDir };
  }
  try {
    const gitRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return { mode: "git", projectDir, gitRoot };
  } catch {
    throw new Error("No Git repository in build workspace. For a verified temporary snapshot, explicitly set EAS_NO_VCS=1 and EAS_PROJECT_ROOT to that snapshot before running preflight. No build was submitted.");
  }
}
