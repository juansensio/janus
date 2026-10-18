import { describe, expect, it } from "vitest";
import { initI18n, t } from "./i18n";

describe("i18n", () => {
    it("looks up messages after init", () => {
        initI18n({
            locale: "es",
            messages: { "library.shelfLabel": "Libros" },
            languages: [{ code: "es", nativeName: "Español" }],
        });
        expect(t("library.shelfLabel")).toBe("Libros");
        expect(document.documentElement.lang).toBe("es");
    });
});
