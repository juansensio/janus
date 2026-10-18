import type { JanusBridge } from "@janus/bridge";
import { contextBridge } from "electron";

const bridge: JanusBridge = {
    platform: () => "desktop",
};

contextBridge.exposeInMainWorld("janus", bridge);
