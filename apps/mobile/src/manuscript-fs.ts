import {
    Directory,
    Encoding,
    Filesystem,
} from "@capacitor/filesystem";
import type { ManuscriptFs } from "@janus/manuscript";
import { createCapacitorShelfFs } from "./library-fs";

const DATA_DIRECTORY = Directory.Data;

export function createCapacitorManuscriptFs(): ManuscriptFs {
    const shelf = createCapacitorShelfFs();
    return {
        join: shelf.join,
        readFile: (path, encoding) => shelf.readFile(path, encoding),
        writeFile: (path, data, encoding) => shelf.writeFile(path, data, encoding),
        async rename(from, to) {
            await Filesystem.rename({
                from,
                to,
                directory: DATA_DIRECTORY,
            });
        },
    };
}
