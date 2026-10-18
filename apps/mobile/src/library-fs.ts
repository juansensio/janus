import {
    Directory,
    Encoding,
    Filesystem,
    type FileInfo,
} from "@capacitor/filesystem";
import type { ShelfFs, ShelfFsDirent } from "@janus/library";

const DATA_DIRECTORY = Directory.Data;

function joinPath(...parts: string[]): string {
    return parts
        .flatMap((part) => part.split(/[/\\]+/))
        .filter((segment) => segment.length > 0)
        .join("/");
}

function toDirent(file: FileInfo): ShelfFsDirent {
    return {
        name: file.name,
        isDirectory: () => file.type === "directory",
    };
}

export function createCapacitorShelfFs(): ShelfFs {
    return {
        join: joinPath,
        async mkdir(path, options) {
            await Filesystem.mkdir({
                path,
                directory: DATA_DIRECTORY,
                recursive: options?.recursive ?? false,
            });
        },
        async readdir(path, options) {
            const result = await Filesystem.readdir({
                path,
                directory: DATA_DIRECTORY,
            });
            if (options?.withFileTypes) {
                return result.files.map(toDirent);
            }
            return result.files.map((file) => file.name);
        },
        async readFile(path, encoding) {
            const result = await Filesystem.readFile({
                path,
                directory: DATA_DIRECTORY,
                encoding: Encoding.UTF8,
            });
            if (encoding !== "utf8") {
                throw new Error("Only utf8 reads are supported");
            }
            return typeof result.data === "string" ? result.data : "";
        },
        async writeFile(path, data, encoding) {
            if (encoding !== "utf8") {
                throw new Error("Only utf8 writes are supported");
            }
            await Filesystem.writeFile({
                path,
                directory: DATA_DIRECTORY,
                data,
                encoding: Encoding.UTF8,
            });
        },
        async rm(path, options) {
            await Filesystem.rmdir({
                path,
                directory: DATA_DIRECTORY,
                recursive: options?.recursive ?? false,
            });
        },
        async stat(path) {
            const result = await Filesystem.stat({
                path,
                directory: DATA_DIRECTORY,
            });
            return {
                isDirectory: () => result.type === "directory",
            };
        },
    };
}
