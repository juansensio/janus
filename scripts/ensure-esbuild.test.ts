import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

describe("ensure-esbuild prerequisites", () => {
    it("finds esbuild shim when node_modules is present", () => {
        const root = path.resolve(scriptDir, "..");
        const shim = path.join(root, "node_modules", "esbuild", "bin", "esbuild");
        expect(existsSync(shim)).toBe(true);
    });
});
