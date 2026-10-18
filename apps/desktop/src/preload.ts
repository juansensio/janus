import type { JanusBridge } from "@janus/bridge";
import { contextBridge, ipcRenderer } from "electron";

const bridge: JanusBridge = {
    platform: () => "desktop",
    listBooks: () => ipcRenderer.invoke("janus:library:listBooks"),
    createBook: () => ipcRenderer.invoke("janus:library:createBook"),
    deleteBook: (id: string) =>
        ipcRenderer.invoke("janus:library:deleteBook", id),
};

contextBridge.exposeInMainWorld("janus", bridge);
