import type { CapacitorConfig } from "@capacitor/cli";

export function resolveCapacitorServer(
    devServerUrl: string | undefined,
): CapacitorConfig["server"] {
    if (!devServerUrl) {
        return undefined;
    }
    return {
        url: devServerUrl,
        cleartext: true,
    };
}
