import { defineConfig } from "@playwright/test";

const e2eWatch = process.env.JANUS_E2E_WATCH === "1";

export default defineConfig({
    testDir: "e2e/flows",
    timeout: 90_000,
    expect: { timeout: 15_000 },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [["list"], ["github"]] : [["list"]],
    use: {
        trace: e2eWatch ? "on" : "retain-on-failure",
        video: "off",
        screenshot: "off",
    },
    outputDir: "e2e/test-results",
});
