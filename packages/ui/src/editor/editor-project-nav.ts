import { t } from "../i18n";

export type BookProjectDoc = "manuscript" | "worldbuilding";

export type MountProjectNavOptions = {
    active: BookProjectDoc;
    onSelect: (doc: BookProjectDoc) => void;
};

export type ProjectNavHandle = {
    setActive: (doc: BookProjectDoc) => void;
    dispose: () => void;
};

export function mountProjectNav(
    host: HTMLElement,
    options: MountProjectNavOptions,
): ProjectNavHandle {
    const nav = document.createElement("div");
    nav.className = "editor-project-nav";
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", t("supportDocs.projectNavAria"));

    const manuscriptButton = document.createElement("button");
    manuscriptButton.type = "button";
    manuscriptButton.className = "editor-project-nav-item";
    manuscriptButton.setAttribute("role", "tab");
    manuscriptButton.dataset.doc = "manuscript";
    manuscriptButton.textContent = t("supportDocs.manuscriptTab");

    const worldbuildingButton = document.createElement("button");
    worldbuildingButton.type = "button";
    worldbuildingButton.className = "editor-project-nav-item";
    worldbuildingButton.setAttribute("role", "tab");
    worldbuildingButton.dataset.doc = "worldbuilding";
    worldbuildingButton.textContent = t("supportDocs.worldbuildingTab");

    nav.append(manuscriptButton, worldbuildingButton);
    host.append(nav);

    function setActive(doc: BookProjectDoc): void {
        for (const button of [manuscriptButton, worldbuildingButton]) {
            const isActive = button.dataset.doc === doc;
            button.setAttribute("aria-selected", isActive ? "true" : "false");
            button.classList.toggle("is-active", isActive);
        }
    }

    function onClick(event: Event): void {
        const target = event.currentTarget;
        if (!(target instanceof HTMLButtonElement)) {
            return;
        }
        const doc = target.dataset.doc;
        if (doc === "manuscript" || doc === "worldbuilding") {
            options.onSelect(doc);
        }
    }

    manuscriptButton.addEventListener("click", onClick);
    worldbuildingButton.addEventListener("click", onClick);
    setActive(options.active);

    return {
        setActive,
        dispose() {
            manuscriptButton.removeEventListener("click", onClick);
            worldbuildingButton.removeEventListener("click", onClick);
            nav.remove();
        },
    };
}

export type MountSupportDocCreatePanelOptions = {
    onCreate: () => void | Promise<void>;
};

export function mountSupportDocCreatePanel(
    host: HTMLElement,
    options: MountSupportDocCreatePanelOptions,
): { dispose: () => void } {
    const panel = document.createElement("div");
    panel.className = "editor-support-create";

    const message = document.createElement("p");
    message.className = "editor-support-create-message";
    message.textContent = t("supportDocs.worldbuildingCreatePrompt");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "editor-support-create-button";
    button.textContent = t("supportDocs.worldbuildingCreate");

    panel.append(message, button);
    host.append(panel);

    const onCreate = (): void => {
        void options.onCreate();
    };
    button.addEventListener("click", onCreate);

    return {
        dispose() {
            button.removeEventListener("click", onCreate);
            panel.remove();
        },
    };
}
