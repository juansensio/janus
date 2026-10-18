import type { JanusBridge } from "@janus/bridge";
import { contextBridge, ipcRenderer } from "electron";
import { invokeLibraryIpc } from "./library-ipc-error";

const invoke = (channel: string, ...args: unknown[]) =>
    invokeLibraryIpc(ipcRenderer.invoke.bind(ipcRenderer), channel, ...args);

const bridge: JanusBridge = {
    platform: () => "desktop",
    listBooks: () => invoke("janus:library:listBooks"),
    suggestNewBookTitle: () => invoke("janus:library:suggestNewBookTitle"),
    createBook: (title: string) => invoke("janus:library:createBook", title),
    renameBook: (id: string, title: string) =>
        invoke("janus:library:renameBook", id, title),
    deleteBook: (id: string) => invoke("janus:library:deleteBook", id),
    readManuscript: (id: string) => invoke("janus:manuscript:readManuscript", id),
    writeManuscript: (id: string, text: string) =>
        invoke("janus:manuscript:writeManuscript", id, text),
    getLibraryRoot: () => invoke("janus:settings:getLibraryRoot"),
    chooseLibraryRoot: () => invoke("janus:settings:chooseLibraryRoot"),
};

contextBridge.exposeInMainWorld("janus", bridge);
