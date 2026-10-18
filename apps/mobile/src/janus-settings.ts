import {
    normalizeJanusSettings,
    type JanusSettings,
} from "@janus/bridge";
import {
    Directory,
    Encoding,
    Filesystem,
} from "@capacitor/filesystem";

export const JANUS_SETTINGS_FILENAME = "janus-settings.json";

export type { JanusSettings };

const DATA_DIRECTORY = Directory.Data;

export async function loadJanusSettings(): Promise<JanusSettings> {
    try {
        const result = await Filesystem.readFile({
            path: JANUS_SETTINGS_FILENAME,
            directory: DATA_DIRECTORY,
            encoding: Encoding.UTF8,
        });
        const raw =
            typeof result.data === "string" ? result.data : "";
        return normalizeJanusSettings(JSON.parse(raw));
    } catch {
        return {};
    }
}

export async function saveJanusSettings(
    settings: JanusSettings,
): Promise<void> {
    await Filesystem.writeFile({
        path: JANUS_SETTINGS_FILENAME,
        directory: DATA_DIRECTORY,
        encoding: Encoding.UTF8,
        data: JSON.stringify(settings, null, 2),
    });
}
