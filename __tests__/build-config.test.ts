import { afterEach, describe, expect, it, vi } from "vitest";
import eas from "../eas.json";
import pkg from "../package.json";

const productionId = "space.manus.tsumage.app.t20251223162223";
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function configFor(variant: string) {
  vi.resetModules();
  vi.stubEnv("APP_VARIANT", variant);
  return (await import("../app.config")).default;
}
describe("installable Dev build configuration", () => {
  it("uses a separate application ID and URL scheme for the standalone test APK", async () => {
    const config = await configFor(eas.build.preview.env.APP_VARIANT);
    expect(config.name).toBe("積み上げDev");
    expect(config.android?.package).toBe(`${productionId}.dev`);
    expect(config.ios?.bundleIdentifier).toBe(`${productionId}.dev`);
    expect(config.scheme).toBe("manus20251223162223dev");
    expect(config.version).toBe(pkg.version);
    expect(eas.build.preview.android.buildType).toBe("apk");
    expect(eas.build.preview).not.toHaveProperty("developmentClient", true);
  });
  it("preserves the released production identity and emits an App Bundle", async () => {
    const config = await configFor(eas.build.production.env.APP_VARIANT);
    expect(config.name).toBe("積み上げ");
    expect(config.android?.package).toBe(productionId);
    expect(config.scheme).toBe("manus20251223162223");
    expect(eas.build.production.distribution).toBe("store");
    expect(eas.build.production.android.buildType).toBe("app-bundle");
  });
  it("keeps Metro development builds on the Dev identity", async () => {
    const config = await configFor(eas.build.development.env.APP_VARIANT);
    expect(config.android?.package).toBe(`${productionId}.dev`);
    expect(eas.build.development.developmentClient).toBe(true);
  });
  it("rejects misspelled variants instead of silently choosing production", async () => {
    await expect(configFor("developmnt")).rejects.toThrow("Unsupported APP_VARIANT");
  });
});
