export const COVER_CLASS_NAMES = [
    "shelf-cover--a",
    "shelf-cover--b",
    "shelf-cover--c",
    "shelf-cover--d",
    "shelf-cover--e",
    "shelf-cover--f",
    "shelf-cover--g",
    "shelf-cover--h",
] as const;

export type ShelfCoverClassName = (typeof COVER_CLASS_NAMES)[number];

export function coverClassForBookId(id: string): ShelfCoverClassName {
    let h = 0;
    for (let i = 0; i < id.length; i++) {
        h = (h + id.charCodeAt(i)) % COVER_CLASS_NAMES.length;
    }
    return COVER_CLASS_NAMES[h];
}
