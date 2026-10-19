import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initTestI18n } from "../test-i18n";
import { t } from "../i18n";
import {
    mountProjectNav,
    mountSupportDocCreatePanel,
} from "./editor-project-nav";

afterEach(() => {
    document.body.innerHTML = "";
});

beforeEach(() => {
    initTestI18n("en");
});

describe("editor-project-nav", () => {
    it("marks the active tab and notifies on select", () => {
        const host = document.createElement("div");
        document.body.append(host);
        const onSelect = vi.fn();
        const nav = mountProjectNav(host, {
            active: "manuscript",
            onSelect,
        });

        const worldbuilding = host.querySelector<HTMLButtonElement>(
            '[data-doc="worldbuilding"]',
        );
        expect(worldbuilding).toBeTruthy();
        worldbuilding?.click();
        expect(onSelect).toHaveBeenCalledWith("worldbuilding");

        nav.setActive("worldbuilding");
        expect(worldbuilding?.classList.contains("is-active")).toBe(true);
        nav.dispose();
    });

    it("create panel invokes onCreate", () => {
        const host = document.createElement("div");
        document.body.append(host);
        const onCreate = vi.fn();
        const panel = mountSupportDocCreatePanel(host, { onCreate });
        expect(host.textContent).toContain(
            t("supportDocs.worldbuildingCreatePrompt"),
        );
        host.querySelector<HTMLButtonElement>(".editor-support-create-button")?.click();
        expect(onCreate).toHaveBeenCalled();
        panel.dispose();
    });
});
