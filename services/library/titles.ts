const BASE_TITLE = "Untitled";

export function allocateUntitledTitle(existingTitles: string[]): string {
    if (!existingTitles.includes(BASE_TITLE)) {
        return BASE_TITLE;
    }
    let n = 2;
    while (existingTitles.includes(`${BASE_TITLE} ${n}`)) {
        n += 1;
    }
    return `${BASE_TITLE} ${n}`;
}
