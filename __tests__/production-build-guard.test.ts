import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
const roots: string[] = [];
function fixture(fail = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tsumiage-production-guard-")); roots.push(root);
  fs.mkdirSync(path.join(root, "scripts")); fs.mkdirSync(path.join(root, "bin"));
  fs.copyFileSync("scripts/start-production-build.mjs", path.join(root, "scripts/start-production-build.mjs"));
  fs.writeFileSync(path.join(root, "scripts/check-build.mjs"), "if (process.argv[2] !== 'production') process.exit(1);");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ version: "1.4.1" }));
  fs.writeFileSync(path.join(root, "bin/eas"), `#!${process.execPath}\nconst fs = require('node:fs'); fs.appendFileSync('calls.jsonl', JSON.stringify(process.argv.slice(2)) + '\\n'); ${fail ? "process.exit(1);" : "console.log(JSON.stringify([{id:'fake-production',status:'NEW'}]));"}`, { mode: 0o755 });
  const run = () => spawnSync(process.execPath, ["scripts/start-production-build.mjs", "--attempt-id", "authorized-production"], { cwd: root, env: { ...process.env, PATH: path.join(root, "bin") + path.delimiter + process.env.PATH }, encoding: "utf8" });
  return { root, run };
}
afterEach(() => roots.splice(0).forEach(root => fs.rmSync(root, { recursive: true, force: true })));
describe("one-attempt production AAB guard", () => {
  it("submits the production profile once and blocks a repeated attempt", () => {
    const { root, run } = fixture(); expect(run().status).toBe(0); expect(run().status).toBe(1);
    const calls = fs.readFileSync(path.join(root, "calls.jsonl"), "utf8").trim().split("\n");
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0])).toEqual(["build", "--platform", "android", "--profile", "production", "--non-interactive", "--no-wait", "--json"]);
    const ledger = JSON.parse(fs.readFileSync(path.join(root, "logs/production-build-1.4.1-authorized-production.json"), "utf8"));
    expect(ledger).toMatchObject({ name: "積み上げ", applicationId: "space.manus.tsumage.app.t20251223162223", artifact: "aab", automaticRetryAllowed: false });
  });
  it("preserves a failed attempt and never resubmits it", () => {
    const { root, run } = fixture(true); expect(run().status).toBe(1); expect(run().status).toBe(1);
    expect(fs.readFileSync(path.join(root, "calls.jsonl"), "utf8").trim().split("\n")).toHaveLength(1);
    const ledger = JSON.parse(fs.readFileSync(path.join(root, "logs/production-build-1.4.1-authorized-production.json"), "utf8"));
    expect(ledger.status).toBe("submission-error");
  });
});
