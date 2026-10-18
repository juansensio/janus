import { t } from "../i18n";

export function openAiModelOptionLabel(value: string): string {
    if (value === "auto") {
        return t("ai.modelAuto");
    }
    const key = `ai.modelSlug.${value}`;
    const label = t(key);
    return label === key ? value : label;
}
