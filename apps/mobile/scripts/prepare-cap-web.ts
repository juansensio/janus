import path from "node:path";
import { syncCapIndexFromMobile } from "../src/cap-web";

const root = path.resolve(import.meta.dir, "../../..");
const uiDir = path.join(root, "dist", "ui");

try {
    syncCapIndexFromMobile(uiDir);
    console.log("prepare-cap-web: dist/ui/index.html set from mobile.html");
} catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
}
