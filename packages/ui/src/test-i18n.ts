import { buildUiLanguageForCode } from "@janus/bridge";
import { initI18n } from "./i18n";

export function initTestI18n(locale: "en" | "es" = "en"): void {
    initI18n(buildUiLanguageForCode(locale));
}
