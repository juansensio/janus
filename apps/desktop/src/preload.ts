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
    acceptAiDraft: (id: string, draftId: string) =>
        invoke("janus:manuscript:acceptAiDraft", id, draftId),
    rejectAiDraft: (id: string, draftId: string) =>
        invoke("janus:manuscript:rejectAiDraft", id, draftId),
    insertOrReplaceDraft: (
        id: string,
        commentId: string,
        draftHtml: string,
        draftId: string,
    ) =>
        invoke(
            "janus:manuscript:insertOrReplaceDraft",
            id,
            commentId,
            draftHtml,
            draftId,
        ),
    getAiProviderStatus: () => invoke("janus:ai:getAiProviderStatus"),
    connectOpenAiCodex: () => invoke("janus:ai:connectOpenAiCodex"),
    disconnectOpenAiCodex: () => invoke("janus:ai:disconnectOpenAiCodex"),
    writeForComment: (id: string, commentId: string, locale: string) =>
        invoke("janus:ai:writeForComment", id, commentId, locale),
    getLibraryRoot: () => invoke("janus:settings:getLibraryRoot"),
    chooseLibraryRoot: () => invoke("janus:settings:chooseLibraryRoot"),
    getUiLanguage: () => invoke("janus:language:getUiLanguage"),
    setUiLanguage: (code: string) =>
        invoke("janus:language:setUiLanguage", code),
};

contextBridge.exposeInMainWorld("janus", bridge);
