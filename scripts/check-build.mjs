// Read-only preflight: this script NEVER starts an EAS build.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { checkBuildWorkspace } from "./build-workspace.mjs";
const workspace = checkBuildWorkspace();
const require = createRequire(import.meta.url);
const profileName = process.argv[2];
assert.ok(["development", "preview", "production"].includes(profileName), "Specify development, preview or production");
const eas = JSON.parse(fs.readFileSync("eas.json", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const profile = eas.build[profileName];
const variant = profile.env?.APP_VARIANT;
const productionId = "space.manus.tsumage.app.t20251223162223";
const devId = `${productionId}.dev`;
const isProduction = profileName === "production";
assert.equal(variant, isProduction ? "production" : "development", "Wrong app variant in EAS profile");
assert.equal(profile.distribution, isProduction ? "store" : "internal", "Wrong distribution target");
assert.equal(profile.android?.buildType, isProduction ? "app-bundle" : "apk", "Wrong artifact format");
if (profileName === "preview") assert.ok(!profile.developmentClient, "Device-test APK must run without Metro");
const expoCli = path.join(path.dirname(require.resolve("expo/package.json")), "bin/cli");
const config = JSON.parse(execFileSync(process.execPath, [expoCli, "config", "--json"], {
  encoding: "utf8", env: { ...process.env, ...profile.env, EXPO_NO_TELEMETRY: "1" },
}));
assert.equal(config.android.package, isProduction ? productionId : devId, "Wrong Android application ID");
assert.equal(config.ios.bundleIdentifier, isProduction ? productionId : devId, "Wrong iOS bundle identifier");
assert.equal(config.name, isProduction ? "積み上げ" : "積み上げDev", "Wrong display name");
assert.equal(config.scheme, isProduction ? "manus20251223162223" : "manus20251223162223dev", "Deep link scheme collision");
assert.equal(config.version, pkg.version, "App and package versions differ");
assert.equal(config.extra.eas.projectId, "9a46088f-88a3-4fa5-a31f-8d55729af0fc", "Wrong Expo project");
assert.ok(config.android.permissions.includes("SCHEDULE_EXACT_ALARM"), "Timer alarm permission is missing");
assert.ok(config.plugins.includes("expo-notifications"), "Notifications plugin is missing");
console.log(JSON.stringify({ checked: true, profile: profileName, name: config.name,
  applicationId: config.android.package, version: config.version,
  artifact: profile.android.buildType === "apk" ? "APK: direct installation" : "AAB: Google Play",
  metroRequired: !!profile.developmentClient, workspace, cloudBuildsStarted: 0 }, null, 2));
