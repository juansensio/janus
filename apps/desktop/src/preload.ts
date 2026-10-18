import type { JanusBridge } from "@janus/bridge";
import { contextBridge, ipcRenderer } from "electron";

const bridge: JanusBridge = {
    platform: () => "desktop",
    listBooks: () => ipcRenderer.invoke("janus:library:listBooks"),
    suggestNewBookTitle: () =>
        ipcRenderer.invoke("janus:library:suggestNewBookTitle"),
    createBook: (title: string) =>
        ipcRenderer.invoke("janus:library:createBook", title),
    renameBook: (id: string, title: string) =>
        ipcRenderer.invoke("janus:library:renameBook", id, title),
    deleteBook: (id: string) =>
        ipcRenderer.invoke("janus:library:deleteBook", id),
};

contextBridge.exposeInMainWorld("janus", bridge);
