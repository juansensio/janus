import { bridgeErrorCode } from "@janus/bridge";
import { t } from "../i18n";

type BookNameDialogMode = "create" | "rename";

export function messageForDialogSubmitError(
    error: unknown,
    mode: BookNameDialogMode,
): string {
    if (bridgeErrorCode(error) === "DUPLICATE_BOOK_TITLE") {
        return t("library.dialog.duplicateTitle");
    }
    if (bridgeErrorCode(error) === "INVALID_BOOK_TITLE") {
        return t("library.dialog.invalidTitle");
    }
    return mode === "create"
        ? t("library.createFailed")
        : t("library.renameFailed");
}
