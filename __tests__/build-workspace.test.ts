import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { checkBuildWorkspace } from "../scripts/build-workspace.mjs";
const tempDirs: string[] = [];
function workspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tsumiage-workspace-test-"));
  tempDirs.push(dir); return dir;
}
afterEach(() => { tempDirs.splice(0).forEach(dir => fs.rmSync(dir, { recursive: true, force: true })); });
describe("build workspace preflight", () => {
  it("rejects a snapshot without Git before a build can be submitted", () => {
    expect(() => checkBuildWorkspace(workspace(), {})).toThrow("No Git repository");
  });
  it("accepts a real Git repository", () => {
    const dir = workspace(); execFileSync("git", ["init", "--quiet", dir]);
    expect(checkBuildWorkspace(dir, {})).toMatchObject({ mode: "git", projectDir: fs.realpathSync(dir) });
  });
  it("accepts an explicitly configured snapshot", () => {
    const dir = workspace();
    expect(checkBuildWorkspace(dir, { EAS_NO_VCS: "1", EAS_PROJECT_ROOT: dir })).toMatchObject({ mode: "snapshot" });
  });
  it("rejects a snapshot pointed at a different upload directory", () => {
    expect(() => checkBuildWorkspace(workspace(), { EAS_NO_VCS: "1", EAS_PROJECT_ROOT: workspace() })).toThrow("checked source snapshot");
  });
  it("requires an explicit absolute upload root for snapshots", () => {
    expect(() => checkBuildWorkspace(workspace(), { EAS_NO_VCS: "1" })).toThrow("explicit absolute");
  });
});
