export {
    SUPPORT_DOC_KINDS,
    SUPPORT_DOC_KIND_WORLDBUILDING,
    assertSupportDocKind,
    supportDocRelativePath,
    type SupportDocKind,
} from "./support-doc-kinds";
export {
    editorHtmlToPlainText,
    plainTextToEditorHtml,
    isEditorHtmlSupportDocSafe,
} from "./editor-binding";
export {
    createSupportDocService,
    SupportDocServiceError,
    type SupportDocFs,
    type SupportDocSummary,
    type SupportDocErrorCode,
} from "./support-doc-service";
