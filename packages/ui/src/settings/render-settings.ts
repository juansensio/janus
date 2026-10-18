import type { JanusBridge } from "@janus/bridge";
import { initI18n, t } from "../i18n";
import { aiConnectErrorKey } from "./ai-connect-error";
import { openAiModelOptionLabel } from "./open-ai-model-label";

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

function nextSettingsSession(host: HTMLElement): string {
    const session = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    host.dataset.settingsSession = session;
    return session;
}

function isSettingsSession(host: HTMLElement, session: string): boolean {
    return host.dataset.settingsSession === session;
}

function setSelectLoading(select: HTMLSelectElement): void {
    select.replaceChildren();
    const option = document.createElement("option");
    option.value = "";
    option.textContent = t("settings.loading");
    select.append(option);
    select.value = "";
    select.disabled = true;
    select.setAttribute("aria-busy", "true");
}

function clearSelectLoading(select: HTMLSelectElement): void {
    select.removeAttribute("aria-busy");
}

export async function renderSettings(
    host: HTMLElement,
    bridge: JanusBridge,
    options: RenderSettingsOptions,
): Promise<void> {
    host.replaceChildren();
    host.className = "janus-settings";
    const session = nextSettingsSession(host);

    const uiLanguage = await bridge.getUiLanguage();
    if (!isSettingsSession(host, session)) {
        return;
    }
    initI18n(uiLanguage);

    const header = document.createElement("header");
    header.className = "settings-header";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "settings-back";
    backButton.textContent = t("settings.backToShelf");
    backButton.addEventListener("click", () => options.onBack());

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

    const editorZoom = await bridge.getEditorZoom();
    if (!isSettingsSession(host, session)) {
        return;
    }

    const zoomLabel = document.createElement("p");
    zoomLabel.className = "settings-label";
    zoomLabel.textContent = t("settings.editorZoom");

    const zoomSelect = document.createElement("select");
    zoomSelect.className = "settings-editor-zoom";
    zoomSelect.setAttribute("aria-label", t("settings.editorZoom"));
    for (const level of editorZoom.levels) {
        const option = document.createElement("option");
        option.value = String(level);
        option.textContent = t("settings.editorZoomPercent", {
            percent: String(level),
        });
        zoomSelect.append(option);
    }
    zoomSelect.value = String(editorZoom.percent);
    zoomSelect.addEventListener("change", () => {
        void (async () => {
            try {
                await bridge.setEditorZoom(Number(zoomSelect.value));
            } catch {
                error.textContent = t("settings.chooseFailed");
            }
        })();
    });
    host.append(zoomLabel, zoomSelect);

    const isDesktop = bridge.platform() === "desktop";

    let aiConnected = false;
    let providerConnected: boolean | undefined;
    let aiToggle: HTMLButtonElement | null = null;

    if (isDesktop) {
        const aiTitle = document.createElement("p");
        aiTitle.className = "settings-label";
        aiTitle.textContent = t("ai.settingsTitle");

        const aiStatus = document.createElement("p");
        aiStatus.className = "settings-source settings-pending";
        aiStatus.textContent = t("settings.loading");
        aiStatus.setAttribute("aria-busy", "true");

        const aiActions = document.createElement("div");
        aiActions.className = "settings-ai-actions";
        aiToggle = document.createElement("button");
        aiToggle.type = "button";
        aiToggle.className = "settings-choose";
        aiToggle.textContent = t("settings.loading");
        aiToggle.disabled = true;
        aiActions.append(aiToggle);

        const modelLabel = document.createElement("p");
        modelLabel.className = "settings-label";
        modelLabel.textContent = t("ai.modelLabel");

        const modelSelect = document.createElement("select");
        modelSelect.className = "settings-openai-model";
        modelSelect.setAttribute("aria-label", t("ai.modelLabel"));
        setSelectLoading(modelSelect);

        const modelHint = document.createElement("p");
        modelHint.className = "settings-note";

        const syncModelNotConnectedHint = () => {
            if (providerConnected === false) {
                modelHint.textContent = t("ai.modelNotConnectedHint");
            }
        };

        host.append(
            aiTitle,
            aiStatus,
            aiActions,
            modelLabel,
            modelSelect,
            modelHint,
        );

        const wireAiToggle = (connected: boolean) => {
            if (!aiToggle || !isSettingsSession(host, session)) {
                return;
            }
            aiConnected = connected;
            aiToggle.disabled = false;
            aiToggle.textContent = connected
                ? t("ai.disconnect")
                : t("ai.connect");
            aiToggle.onclick = () => {
                void (async () => {
                    error.textContent = "";
                    aiToggle!.disabled = true;
                    try {
                        if (aiConnected) {
                            await bridge.disconnectOpenAiCodex();
                        } else {
                            await bridge.connectOpenAiCodex();
                        }
                        await renderSettings(host, bridge, options);
                    } catch (connectError) {
                        aiToggle!.disabled = false;
                        error.textContent = t(
                            aiConnectErrorKey(connectError),
                        );
                    }
                })();
            };
        };

        void (async () => {
            try {
                const status = await bridge.getAiProviderStatus();
                if (!isSettingsSession(host, session)) {
                    return;
                }
                aiStatus.textContent = status.connected
                    ? t("ai.connected")
                    : t("ai.notConnected");
                aiStatus.classList.remove("settings-pending");
                aiStatus.removeAttribute("aria-busy");
                providerConnected = status.connected;
                wireAiToggle(status.connected);
                syncModelNotConnectedHint();
            } catch {
                if (!isSettingsSession(host, session)) {
                    return;
                }
                aiStatus.textContent = t("ai.notConnected");
                aiStatus.classList.remove("settings-pending");
                aiStatus.removeAttribute("aria-busy");
                providerConnected = false;
                wireAiToggle(false);
                syncModelNotConnectedHint();
            }
        })();

        void (async () => {
            try {
                const modelSettings = await bridge.getOpenAiModelSettings();
                if (!isSettingsSession(host, session)) {
                    return;
                }
                modelSelect.replaceChildren();
                for (const value of modelSettings.options) {
                    const option = document.createElement("option");
                    option.value = value;
                    option.textContent = openAiModelOptionLabel(value);
                    modelSelect.append(option);
                }
                modelSelect.value = modelSettings.preference;
                modelSelect.disabled = false;
                clearSelectLoading(modelSelect);
                syncModelNotConnectedHint();
                modelSelect.addEventListener("change", () => {
                    void (async () => {
                        error.textContent = "";
                        modelSelect.disabled = true;
                        try {
                            const result =
                                await bridge.setOpenAiModelPreference(
                                    modelSelect.value,
                                );
                            modelSelect.value = result.preference;
                        } catch {
                            error.textContent = t("ai.modelSaveFailed");
                        } finally {
                            if (isSettingsSession(host, session)) {
                                modelSelect.disabled = false;
                            }
                        }
                    })();
                });
            } catch {
                if (!isSettingsSession(host, session)) {
                    return;
                }
                modelHint.textContent = t("ai.modelLoadFailed");
                setSelectLoading(modelSelect);
            }
        })();
    }

    const locationLabel = document.createElement("p");
    locationLabel.className = "settings-label";
    locationLabel.textContent = t("settings.libraryLocation");

    const pathEl = document.createElement("p");
    pathEl.className = "settings-path settings-pending";
    pathEl.textContent = t("settings.loading");
    pathEl.setAttribute("aria-busy", "true");

    const sourceEl = document.createElement("p");
    sourceEl.className = "settings-source settings-pending";
    sourceEl.textContent = t("settings.loading");

    const libraryActions = document.createElement("div");
    libraryActions.className = "settings-library-actions";

    const choosePlaceholder = document.createElement("button");
    choosePlaceholder.type = "button";
    choosePlaceholder.className = "settings-choose";
    choosePlaceholder.textContent = t("settings.loading");
    choosePlaceholder.disabled = true;
    libraryActions.append(choosePlaceholder);

    host.append(locationLabel, pathEl, sourceEl, libraryActions);

    void (async () => {
        try {
            const rootInfo = await bridge.getLibraryRoot();
            if (!isSettingsSession(host, session)) {
                return;
            }
            pathEl.textContent = rootInfo.path;
            pathEl.title = rootInfo.path;
            pathEl.classList.remove("settings-pending");
            pathEl.removeAttribute("aria-busy");
            sourceEl.textContent = formatSourceLabel(rootInfo.source);
            sourceEl.classList.remove("settings-pending");

            libraryActions.replaceChildren();
            const canChoose = isDesktop && rootInfo.source !== "env";

            if (rootInfo.source === "dev-default") {
                const note = document.createElement("p");
                note.className = "settings-note";
                note.textContent = t("settings.devDefaultNote");
                libraryActions.append(note);
            }

            if (canChoose) {
                const chooseButton = document.createElement("button");
                chooseButton.type = "button";
                chooseButton.className = "settings-choose";
                chooseButton.textContent = t("settings.chooseFolder");
                chooseButton.addEventListener("click", () => {
                    void (async () => {
                        error.textContent = "";
                        chooseButton.disabled = true;
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
                                chooseButton.disabled = false;
                                return;
                            }
                            if (code === "LIBRARY_ROOT_NOT_EMPTY") {
                                error.textContent = t(
                                    "settings.libraryRootNotEmpty",
                                );
                                chooseButton.disabled = false;
                                return;
                            }
                            error.textContent = t("settings.chooseFailed");
                            chooseButton.disabled = false;
                        }
                    })();
                });
                libraryActions.append(chooseButton);
            }
        } catch {
            if (!isSettingsSession(host, session)) {
                return;
            }
            error.textContent = t("settings.chooseFailed");
            pathEl.textContent = "—";
            pathEl.classList.remove("settings-pending");
            pathEl.removeAttribute("aria-busy");
            sourceEl.textContent = "";
            sourceEl.classList.remove("settings-pending");
            libraryActions.replaceChildren();
        }
    })();
}
