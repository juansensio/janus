export function formatMessage(
    template: string,
    vars?: Record<string, string>,
): string {
    if (!vars) {
        return template;
    }
    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
        const value = vars[key];
        return value === undefined ? match : value;
    });
}
