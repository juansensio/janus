import type { JanusBridge } from "@janus/bridge";
import { contextBridge, ipcRenderer } from "electron";
import {
    AI_IPC_CHANNELS,
    type AiWriteDraftDeltaPayload,
} from "./ai-ipc-channels";
import { invokeLibraryIpc } from "./library-ipc-error";
import { PDF_EXPORT_IPC_CHANNELS } from "./pdf-export-ipc-channels";
import { ZOOM_IPC_CHANNELS } from "./zoom-ipc";

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
    listSupportDocs: (id: string) =>
        invoke("janus:support-docs:listSupportDocs", id),
    createSupportDoc: (id: string, kind: string) =>
        invoke("janus:support-docs:createSupportDoc", id, kind),
    readSupportDoc: (id: string, kind: string) =>
        invoke("janus:support-docs:readSupportDoc", id, kind),
    writeSupportDoc: (id: string, kind: string, editorHtml: string) =>
        invoke("janus:support-docs:writeSupportDoc", id, kind, editorHtml),
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
    beginHighlightRewrite: (id: string, input: import("@janus/bridge").BeginHighlightRewriteInput) =>
        invoke("janus:manuscript:beginHighlightRewrite", id, input),
    getAiProviderStatus: () => invoke("janus:ai:getAiProviderStatus"),
    connectOpenAiCodex: () => invoke("janus:ai:connectOpenAiCodex"),
    disconnectOpenAiCodex: () => invoke("janus:ai:disconnectOpenAiCodex"),
    getOpenAiModelSettings: () =>
        invoke(AI_IPC_CHANNELS.getOpenAiModelSettings),
    setOpenAiModelPreference: (preference: string) =>
        invoke(AI_IPC_CHANNELS.setOpenAiModelPreference, preference),
    writeForComment: async (
        id: string,
        commentId: string,
        locale: string,
        options?: { onDraftDelta?: (draftHtml: string) => void },
    ) => {
        const onDraftDelta = options?.onDraftDelta;
        if (!onDraftDelta) {
            return invoke(
                AI_IPC_CHANNELS.writeForComment,
                id,
                commentId,
                locale,
            );
        }
        const requestId = crypto.randomUUID();
        const handler = (
            _event: Electron.IpcRendererEvent,
            payload: AiWriteDraftDeltaPayload,
        ) => {
            if (payload.requestId === requestId) {
                onDraftDelta(payload.draftHtml);
            }
        };
        ipcRenderer.on(AI_IPC_CHANNELS.writeDraftDelta, handler);
        try {
            return await invoke(
                AI_IPC_CHANNELS.writeForComment,
                id,
                commentId,
                locale,
                requestId,
            );
        } finally {
            ipcRenderer.removeListener(
                AI_IPC_CHANNELS.writeDraftDelta,
                handler,
            );
        }
    },
    getLibraryRoot: () => invoke("janus:settings:getLibraryRoot"),
    chooseLibraryRoot: () => invoke("janus:settings:chooseLibraryRoot"),
    getUiLanguage: () => invoke("janus:language:getUiLanguage"),
    setUiLanguage: (code: string) =>
        invoke("janus:language:setUiLanguage", code),
    getEditorZoom: () => invoke(ZOOM_IPC_CHANNELS.getEditorZoom),
    setEditorZoom: (percent: number) =>
        invoke(ZOOM_IPC_CHANNELS.setEditorZoom, percent),
    exportManuscriptPdf: (bookId: string) =>
        invoke(PDF_EXPORT_IPC_CHANNELS.exportManuscriptPdf, bookId),
    subscribeEditorZoomMenuAction: (listener) => {
        const handler = (
            _event: Electron.IpcRendererEvent,
            action: unknown,
        ) => {
            if (action === "in" || action === "out" || action === "reset") {
                listener(action);
            }
        };
        ipcRenderer.on(ZOOM_IPC_CHANNELS.menuAction, handler);
        return () => {
            ipcRenderer.removeListener(ZOOM_IPC_CHANNELS.menuAction, handler);
        };
    },
};

contextBridge.exposeInMainWorld("janus", bridge);
