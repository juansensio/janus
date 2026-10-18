const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function validateBookId(id: unknown): boolean {
    if (typeof id !== "string") {
        return false;
    }
    if (id.length === 0) {
        return false;
    }
    if (id.includes("..") || id.includes("/") || id.includes("\\")) {
        return false;
    }
    return UUID_V4.test(id);
}
