/**
 * Ad-hoc sign the .app after pack so Gatekeeper does not report "damaged"
 * for unsigned CI builds. Not a substitute for Developer ID + notarization.
 */
const { execFileSync } = require("node:child_process");
const path = require("node:path");

/** @param {import("electron-builder").AfterPackContext} context */
exports.default = async function afterPackAdhocSign(context) {
    if (context.electronPlatformName !== "darwin") {
        return;
    }
    const appFile = `${context.packager.appInfo.productFilename}.app`;
    const appPath = path.join(context.appOutDir, appFile);
    execFileSync(
        "codesign",
        ["--force", "--deep", "--sign", "-", appPath],
        { stdio: "inherit" },
    );
};
