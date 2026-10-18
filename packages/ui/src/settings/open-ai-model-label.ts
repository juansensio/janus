import { t, tOptional } from "../i18n";

export function openAiModelOptionLabel(value: string): string {
    if (value === "auto") {
        return t("ai.modelAuto");
    }
    const key = `ai.modelSlug.${value}`;
    return tOptional(key) ?? value;
}
