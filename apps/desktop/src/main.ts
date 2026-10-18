import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";
import { registerLibraryIpc } from "./library-ipc";
import {
    evaluateNavigationUrl,
    evaluateWindowOpen,
    type NavigationPolicyOptions,
} from "./navigation-policy";
import { resolveDesktopUiLoadTarget } from "./ui-load-url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const uiBundleDir = path.resolve(__dirname, "../../../dist/ui");

function uiIndexPath(): string {
    return path.join(uiBundleDir, "index.html");
}

function isJanusDevMode(): boolean {
    return process.env.JANUS_DEV === "1";
}

function navigationOptions(): NavigationPolicyOptions {
    return {
        uiBundleDir,
        devMode: isJanusDevMode(),
    };
}

function attachSecureNavigationPolicy(
    contents: Electron.WebContents,
): void {
    const options = navigationOptions();

    contents.setWindowOpenHandler(({ url }) => {
        if (evaluateWindowOpen(url, options) === "deny") {
            console.warn(
                `[desktop] blocked window.open to disallowed URL: ${url}`,
            );
            return { action: "deny" };
        }
        return { action: "allow" };
    });

    contents.on("will-navigate", (event, url) => {
        if (evaluateNavigationUrl(url, options) === "deny") {
            console.warn(
                `[desktop] blocked navigation to disallowed URL: ${url}`,
            );
            event.preventDefault();
        }
    });
}

function createWindow(): void {
    const win = new BrowserWindow({
        width: 900,
        height: 700,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            webSecurity: true,
            preload: path.join(__dirname, "preload.js"),
        },
    });

    const port = Number(process.env.JANUS_UI_DEV_PORT ?? 5173);
    const target = resolveDesktopUiLoadTarget({
        devMode: isJanusDevMode(),
        devPort: port,
        indexHtmlPath: uiIndexPath(),
    });
    if (target.kind === "url") {
        void win.loadURL(target.url);
    } else {
        void win.loadFile(target.path);
    }
}

function libraryRootPath(): string {
    return path.join(app.getPath("userData"), "library");
}

app.whenReady().then(() => {
    registerLibraryIpc(ipcMain, libraryRootPath(), {
        mkdir: (p, options) => fs.mkdir(p, options),
        readdir: (p, options) =>
            fs.readdir(p, options as { withFileTypes?: boolean }),
        readFile: (p, encoding) => fs.readFile(p, encoding),
        writeFile: (p, data, encoding) => fs.writeFile(p, data, encoding),
        rm: (p, options) => fs.rm(p, options),
        stat: (p) => fs.stat(p),
        realpath: (p) => fs.realpath(p),
    });

    app.on("web-contents-created", (_event, contents) => {
        attachSecureNavigationPolicy(contents);
    });

    createWindow();

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});
