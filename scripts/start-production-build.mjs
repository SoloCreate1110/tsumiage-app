// Submit exactly one Google Play production AAB for an explicitly identified attempt.
// A failed or interrupted attempt stays recorded; the same command cannot retry it.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const attemptIndex = process.argv.indexOf("--attempt-id");
const attemptId = attemptIndex >= 0 ? process.argv[attemptIndex + 1] : "";
if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(attemptId)) {
  console.error("Specify --attempt-id <authorized-attempt-name>. This command consumes one EAS build. Never retry a failed attempt automatically.");
  process.exit(1);
}
execFileSync(process.execPath, ["scripts/check-build.mjs", "production"], { stdio: "inherit" });
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
fs.mkdirSync("logs", { recursive: true });
const ledgerPath = path.join("logs", `production-build-${pkg.version}-${attemptId}.json`);
const record = { attemptId, version: pkg.version, profile: "production", name: "積み上げ",
  applicationId: "space.manus.tsumage.app.t20251223162223", artifact: "aab",
  startedAt: new Date().toISOString(), status: "submitting", automaticRetryAllowed: false };
try {
  fs.writeFileSync(ledgerPath, JSON.stringify(record, null, 2), { flag: "wx" });
} catch (error) {
  if (error.code === "EEXIST") {
    console.error(`Stopped: attempt already recorded in ${ledgerPath}. No build was submitted.`);
    process.exit(1);
  }
  throw error;
}
try {
  const raw = execFileSync("eas", ["build", "--platform", "android", "--profile", "production",
    "--non-interactive", "--no-wait", "--json"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  fs.writeFileSync(ledgerPath.replace(/\.json$/, "-submission.json"), raw);
  const builds = JSON.parse(raw);
  const build = Array.isArray(builds) ? builds[0] : builds;
  record.buildId = build.id;
  record.status = build.status;
  fs.writeFileSync(ledgerPath, JSON.stringify(record, null, 2));
  console.log(JSON.stringify({ buildId: build.id, status: build.status, cloudBuildsSubmitted: 1,
    ledger: ledgerPath, automaticRetryAllowed: false }, null, 2));
} catch (error) {
  record.status = "submission-error";
  record.message = "Submission failed or was interrupted. Check existing builds; do not run this attempt again.";
  fs.writeFileSync(ledgerPath, JSON.stringify(record, null, 2));
  console.error(record.message);
  process.exit(1);
}
