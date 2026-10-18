import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function uiIndexPath(): string {
    return path.resolve(__dirname, "../../../dist/ui/index.html");
}

function isAllowedNavigation(url: string): boolean {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "file:";
    } catch {
        return false;
    }
}

function attachSecureNavigationPolicy(win: BrowserWindow): void {
    const contents = win.webContents;

    contents.setWindowOpenHandler(({ url }) => {
        if (!isAllowedNavigation(url)) {
            console.warn(
                `[desktop] blocked window.open to disallowed URL: ${url}`,
            );
            return { action: "deny" };
        }
        return { action: "allow" };
    });

    contents.on("will-navigate", (event, url) => {
        if (!isAllowedNavigation(url)) {
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

    attachSecureNavigationPolicy(win);

    void win.loadFile(uiIndexPath());
}

app.whenReady().then(() => {
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
