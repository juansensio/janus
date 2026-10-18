import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveUiBundleDir } from "./ui-bundle-dir";

describe("resolveUiBundleDir", () => {
    it("uses resources/ui when packaged", () => {
        const dir = resolveUiBundleDir({
            isPackaged: true,
            resourcesPath: "/Applications/Janus.app/Contents/Resources",
            devDistDir: "/project/dist/ui",
        });
        expect(dir).toBe(
            path.join(
                "/Applications/Janus.app/Contents/Resources",
                "ui",
            ),
        );
    });

    it("uses dev dist dir when not packaged", () => {
        const devDist = path.resolve("/repo/dist/ui");
        expect(
            resolveUiBundleDir({
                isPackaged: false,
                resourcesPath: "/unused",
                devDistDir: devDist,
            }),
        ).toBe(devDist);
    });
});
