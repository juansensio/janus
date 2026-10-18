import type { JanusBridge } from "@janus/bridge";
import { initI18n, t } from "../i18n";
import { aiConnectErrorKey } from "./ai-connect-error";

export type RenderSettingsOptions = {
    onBack: () => void;
};

function formatSourceLabel(source: string): string {
    switch (source) {
        case "env":
            return t("settings.source.env");
        case "dev-default":
            return t("settings.source.devDefault");
        case "settings":
            return t("settings.source.settings");
        case "documents":
            return t("settings.source.documents");
        default:
            return t("settings.source.userData");
    }
}

export async function renderSettings(
    host: HTMLElement,
    bridge: JanusBridge,
    options: RenderSettingsOptions,
): Promise<void> {
    host.replaceChildren();
    host.className = "janus-settings";

    const uiLanguage = await bridge.getUiLanguage();
    initI18n(uiLanguage);

    const header = document.createElement("header");
    header.className = "settings-header";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "settings-back";
    backButton.textContent = t("settings.backToShelf");

    const title = document.createElement("h1");
    title.className = "settings-title";
    title.textContent = t("settings.title");

    header.append(backButton, title);
    host.append(header);

    const error = document.createElement("p");
    error.className = "settings-error";
    host.append(error);

    const languageLabel = document.createElement("p");
    languageLabel.className = "settings-label";
    languageLabel.textContent = t("settings.language");

    const languageSelect = document.createElement("select");
    languageSelect.className = "settings-language";
    languageSelect.setAttribute("aria-label", t("settings.language"));
    for (const language of uiLanguage.languages) {
        const option = document.createElement("option");
        option.value = language.code;
        option.textContent = language.nativeName;
        languageSelect.append(option);
    }
    languageSelect.value = uiLanguage.locale;
    languageSelect.addEventListener("change", () => {
        void (async () => {
            try {
                const result = await bridge.setUiLanguage(languageSelect.value);
                initI18n(result);
                await renderSettings(host, bridge, options);
            } catch {
                error.textContent = t("settings.chooseFailed");
            }
        })();
    });
    host.append(languageLabel, languageSelect);

    const isDesktop = bridge.platform() === "desktop";
    if (isDesktop) {
        const aiTitle = document.createElement("p");
        aiTitle.className = "settings-label";
        aiTitle.textContent = t("ai.settingsTitle");
        const aiStatus = document.createElement("p");
        aiStatus.className = "settings-source";
        const aiActions = document.createElement("div");
        aiActions.className = "settings-ai-actions";
        try {
            const status = await bridge.getAiProviderStatus();
            aiStatus.textContent = status.connected
                ? t("ai.connected")
                : t("ai.notConnected");
            const toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "settings-choose";
            toggle.textContent = status.connected
                ? t("ai.disconnect")
                : t("ai.connect");
            toggle.addEventListener("click", () => {
                void (async () => {
                    error.textContent = "";
                    try {
                        if (status.connected) {
                            await bridge.disconnectOpenAiCodex();
                        } else {
                            await bridge.connectOpenAiCodex();
                        }
                        await renderSettings(host, bridge, options);
                    } catch (connectError) {
                        error.textContent = t(
                            aiConnectErrorKey(connectError),
                        );
                    }
                })();
            });
            aiActions.append(toggle);
        } catch {
            aiStatus.textContent = t("ai.notConnected");
        }
        host.append(aiTitle, aiStatus, aiActions);
    }

    let rootInfo: Awaited<ReturnType<JanusBridge["getLibraryRoot"]>>;
    try {
        rootInfo = await bridge.getLibraryRoot();
    } catch {
        error.textContent = t("settings.chooseFailed");
        backButton.addEventListener("click", () => options.onBack());
        return;
    }

    const locationLabel = document.createElement("p");
    locationLabel.className = "settings-label";
    locationLabel.textContent = t("settings.libraryLocation");

    const pathEl = document.createElement("p");
    pathEl.className = "settings-path";
    pathEl.textContent = rootInfo.path;
    pathEl.title = rootInfo.path;

    const sourceEl = document.createElement("p");
    sourceEl.className = "settings-source";
    sourceEl.textContent = formatSourceLabel(rootInfo.source);

    host.append(locationLabel, pathEl, sourceEl);

    const canChoose = isDesktop && rootInfo.source !== "env";

    if (rootInfo.source === "dev-default") {
        const note = document.createElement("p");
        note.className = "settings-note";
        note.textContent = t("settings.devDefaultNote");
        host.append(note);
    }

    if (canChoose) {
        const chooseButton = document.createElement("button");
        chooseButton.type = "button";
        chooseButton.className = "settings-choose";
        chooseButton.textContent = t("settings.chooseFolder");
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
                    if (code === "LIBRARY_ROOT_NOT_EMPTY") {
                        error.textContent = t("settings.libraryRootNotEmpty");
                        return;
                    }
                    error.textContent = t("settings.chooseFailed");
                }
            })();
        });
        host.append(chooseButton);
    }

    backButton.addEventListener("click", () => options.onBack());
}
