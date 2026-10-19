import type { SupportDocFs } from "@janus/support-docs";
import { createCapacitorShelfFs } from "./library-fs";

export function createCapacitorSupportDocFs(): SupportDocFs {
    const shelf = createCapacitorShelfFs();
    return {
        join: shelf.join,
        mkdir: (path, options) => shelf.mkdir(path, options),
        readFile: (path, encoding) => shelf.readFile(path, encoding),
        writeFile: (path, data, encoding) => shelf.writeFile(path, data, encoding),
        stat: async (path) => {
            const entry = await shelf.stat(path);
            return {
                isFile: () => !entry.isDirectory(),
            };
        },
        rename: (from, to) => shelf.rename(from, to),
    };
}
