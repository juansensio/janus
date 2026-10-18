import {
    BrowserWindow,
    Menu,
    type MenuItemConstructorOptions,
} from "electron";
import { ZOOM_IPC_CHANNELS } from "./zoom-ipc";

export type EditorZoomMenuAction = "in" | "out" | "reset";

function focusedWebContents(): Electron.WebContents | null {
    const win =
        BrowserWindow.getFocusedWindow() ??
        BrowserWindow.getAllWindows()[0] ??
        null;
    return win?.webContents ?? null;
}

export function sendEditorZoomMenuAction(action: EditorZoomMenuAction): void {
    const contents = focusedWebContents();
    contents?.send(ZOOM_IPC_CHANNELS.menuAction, action);
}

export function buildZoomMenuItems(): MenuItemConstructorOptions[] {
    return [
        {
            label: "Zoom In",
            accelerator: "CmdOrCtrl+=",
            click: () => sendEditorZoomMenuAction("in"),
        },
        {
            label: "Zoom Out",
            accelerator: "CmdOrCtrl+-",
            click: () => sendEditorZoomMenuAction("out"),
        },
        {
            label: "Actual Size",
            accelerator: "CmdOrCtrl+0",
            click: () => sendEditorZoomMenuAction("reset"),
        },
    ];
}

export function installDesktopZoomMenu(): void {
    const template: MenuItemConstructorOptions[] = [
        ...(process.platform === "darwin"
            ? [
                  {
                      label: "Janus",
                      submenu: [{ role: "quit" }],
                  } as MenuItemConstructorOptions,
              ]
            : []),
        {
            label: "View",
            submenu: buildZoomMenuItems(),
        },
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
