export const AI_IPC_CHANNELS = {
    getAiProviderStatus: "janus:ai:getAiProviderStatus",
    connectOpenAiCodex: "janus:ai:connectOpenAiCodex",
    disconnectOpenAiCodex: "janus:ai:disconnectOpenAiCodex",
    writeForComment: "janus:ai:writeForComment",
    writeDraftDelta: "janus:ai:writeDraftDelta",
} as const;

export type AiWriteDraftDeltaPayload = {
    requestId: string;
    draftHtml: string;
};
