import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain } from "electron";
import {
    initDesktopLibraryContext,
    type DesktopLibraryContext,
} from "./desktop-library-context";
import { registerLanguageIpc } from "./language-ipc";
import { registerZoomIpc } from "./zoom-ipc";
import {
    createElectronDirectoryPicker,
    registerSettingsIpc,
} from "./settings-ipc";
import { registerLibraryIpc } from "./library-ipc";
import { registerAiIpc } from "./ai-ipc";
import { registerManuscriptIpc } from "./manuscript-ipc";
import {
    evaluateNavigationUrl,
    evaluateWindowOpen,
    type NavigationPolicyOptions,
} from "./navigation-policy";
import { resolveDesktopUiLoadTarget } from "./ui-load-url";
import { resolveUiBundleDir } from "./ui-bundle-dir";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const devUiBundleDir = path.resolve(__dirname, "../../../dist/ui");

function uiBundleDir(): string {
    return resolveUiBundleDir({
        isPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath,
        devDistDir: devUiBundleDir,
    });
}

function uiIndexPath(): string {
    return path.join(uiBundleDir(), "index.html");
}

function isJanusDevMode(): boolean {
    return !app.isPackaged && process.env.JANUS_DEV === "1";
}

function navigationOptions(): NavigationPolicyOptions {
    return {
        uiBundleDir: uiBundleDir(),
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

app.whenReady().then(async () => {
    const libraryFs = {
        mkdir: (p, options) => fs.mkdir(p, options),
        readdir: (p, options) =>
            fs.readdir(p, options as { withFileTypes?: boolean }),
        readFile: (p, encoding) => fs.readFile(p, encoding),
        writeFile: (p, data, encoding) => fs.writeFile(p, data, encoding),
        rm: (p, options) => fs.rm(p, options),
        stat: (p) => fs.stat(p),
        realpath: (p) => fs.realpath(p),
        rename: (from, to) => fs.rename(from, to),
    };
    const userDataPath = app.getPath("userData");
    const documentsPath = app.getPath("documents");
    const rootFs = {
        ...libraryFs,
        readdir: (p: string) =>
            fs.readdir(p).then((entries) => entries as string[]),
    };
    const libraryContextOptions = () => ({
        env: process.env,
        userDataPath,
        documentsPath,
        isDev: isJanusDevMode(),
        isPackaged: app.isPackaged,
        fs: rootFs,
    });
    let libraryContext: DesktopLibraryContext = await initDesktopLibraryContext(
        libraryContextOptions(),
    );
    const reloadLibraryContext = async (): Promise<void> => {
        libraryContext = await initDesktopLibraryContext(
            libraryContextOptions(),
        );
    };
    registerLibraryIpc(
        ipcMain,
        () => libraryContext.resolved.path,
        libraryFs,
    );
    const manuscriptFs = {
        ...libraryFs,
        rename: (from: string, to: string) => fs.rename(from, to),
    };
    registerManuscriptIpc(
        ipcMain,
        () => libraryContext.resolved.path,
        manuscriptFs,
    );
    registerAiIpc(ipcMain, () => libraryContext.resolved.path, manuscriptFs, {
        userDataPath,
        settingsFs: rootFs,
        allowDevOpenAiTokenOverride: !app.isPackaged,
    });
    registerSettingsIpc(
        ipcMain,
        () => libraryContext,
        {
            userDataPath,
            fs: rootFs,
            showDirectoryPicker: createElectronDirectoryPicker(dialog),
            reloadLibraryContext,
        },
    );
    registerLanguageIpc(ipcMain, {
        userDataPath,
        fs: rootFs,
        getSystemLocale: () => app.getLocale(),
    });
    registerZoomIpc(ipcMain, {
        userDataPath,
        fs: rootFs,
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
