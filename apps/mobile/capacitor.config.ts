import type { CapacitorConfig } from "@capacitor/cli";
import { resolveCapacitorServer } from "./src/capacitor-server";

const config: CapacitorConfig = {
    appId: "com.janus.app",
    appName: "Janus",
    webDir: "../../dist/ui",
    ios: {
        path: "ios",
    },
    server: resolveCapacitorServer(process.env.CAPACITOR_SERVER_URL),
};

export default config;
