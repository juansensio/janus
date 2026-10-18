import type { JanusBridge } from "@janus/bridge";
import { SETTINGS_STRINGS } from "./strings";

export type RenderSettingsOptions = {
    onBack: () => void;
};

function formatSourceLabel(source: string): string {
    switch (source) {
        case "env":
            return "Environment override";
        case "dev-default":
            return "Development folder";
        case "settings":
            return "Custom folder";
        default:
            return "Default location";
    }
}

export async function renderSettings(
    host: HTMLElement,
    bridge: JanusBridge,
    options: RenderSettingsOptions,
): Promise<void> {
    host.replaceChildren();
    host.className = "janus-settings";

    const header = document.createElement("header");
    header.className = "settings-header";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "settings-back";
    backButton.textContent = SETTINGS_STRINGS.backToShelf;

    const title = document.createElement("h1");
    title.className = "settings-title";
    title.textContent = SETTINGS_STRINGS.title;

    header.append(backButton, title);
    host.append(header);

    const error = document.createElement("p");
    error.className = "settings-error";
    host.append(error);

    let rootInfo: Awaited<ReturnType<JanusBridge["getLibraryRoot"]>>;
    try {
        rootInfo = await bridge.getLibraryRoot();
    } catch {
        error.textContent = SETTINGS_STRINGS.chooseFailed;
        backButton.addEventListener("click", () => options.onBack());
        return;
    }

    const locationLabel = document.createElement("p");
    locationLabel.className = "settings-label";
    locationLabel.textContent = SETTINGS_STRINGS.libraryLocation;

    const pathEl = document.createElement("p");
    pathEl.className = "settings-path";
    pathEl.textContent = rootInfo.path;
    pathEl.title = rootInfo.path;

    const sourceEl = document.createElement("p");
    sourceEl.className = "settings-source";
    sourceEl.textContent = formatSourceLabel(rootInfo.source);

    host.append(locationLabel, pathEl, sourceEl);

    const isDesktop = bridge.platform() === "desktop";
    const canChoose =
        isDesktop && rootInfo.source !== "env" && rootInfo.source !== "dev-default";

    if (canChoose) {
        const chooseButton = document.createElement("button");
        chooseButton.type = "button";
        chooseButton.className = "settings-choose";
        chooseButton.textContent = SETTINGS_STRINGS.chooseFolder;
        chooseButton.addEventListener("click", () => {
            void (async () => {
                error.textContent = "";
                try {
                    const result = await bridge.chooseLibraryRoot();
                    if (result.needsReload) {
                        window.location.reload();
                    }
                } catch (err) {
                    const code =
                        err !== null &&
                        typeof err === "object" &&
                        "code" in err
                            ? String((err as { code: unknown }).code)
                            : "";
                    if (code === "LIBRARY_ROOT_CANCELLED") {
                        return;
                    }
                    error.textContent = SETTINGS_STRINGS.chooseFailed;
                }
            })();
        });
        host.append(chooseButton);
    }

    backButton.addEventListener("click", () => options.onBack());
}
