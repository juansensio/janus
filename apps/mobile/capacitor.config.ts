import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.janus.app",
    appName: "Janus",
    webDir: "../../dist/ui",
    ios: {
        path: "ios",
    },
};

export default config;
