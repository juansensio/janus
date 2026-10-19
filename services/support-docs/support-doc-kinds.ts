export const SUPPORT_DOC_KIND_WORLDBUILDING = "worldbuilding";

export type SupportDocKind = typeof SUPPORT_DOC_KIND_WORLDBUILDING;

export const SUPPORT_DOC_KINDS: readonly SupportDocKind[] = [
    SUPPORT_DOC_KIND_WORLDBUILDING,
];

export function assertSupportDocKind(kind: string): SupportDocKind {
    if (!SUPPORT_DOC_KINDS.includes(kind as SupportDocKind)) {
        throw Object.assign(new Error("Invalid support document kind"), {
            code: "INVALID_SUPPORT_DOC_KIND",
        });
    }
    return kind as SupportDocKind;
}

export function supportDocRelativePath(kind: SupportDocKind): string {
    return `support/${kind}.md`;
}
