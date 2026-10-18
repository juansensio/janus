import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const mobileRoot = path.join(root, "apps", "mobile");
const port = Number(process.env.JANUS_UI_DEV_PORT ?? 5173);
const devUrl = `http://127.0.0.1:${port}/`;
const capServerUrl = `${devUrl}mobile.html`;

async function waitForDevServer(
    url: string,
    timeoutMs = 60_000,
): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                return;
            }
        } catch {
            // retry
        }
        await Bun.sleep(250);
    }
    throw new Error(`dev-ios: Vite did not respond at ${url}`);
}

const vite = Bun.spawn(["bun", "run", "--filter", "@janus/ui", "dev"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
});

const shutdown = () => {
    vite.kill();
};

process.on("SIGINT", () => {
    shutdown();
    process.exit(130);
});
process.on("SIGTERM", shutdown);

try {
    await waitForDevServer(devUrl);
    const ios = Bun.spawn(["bun", "run", "cap:run:ios"], {
        cwd: mobileRoot,
        env: {
            ...process.env,
            CAPACITOR_SERVER_URL: capServerUrl,
            JANUS_UI_DEV_PORT: String(port),
        },
        stdout: "inherit",
        stderr: "inherit",
    });
    const code = await ios.exited;
    shutdown();
    process.exit(code);
} catch (err) {
    console.error(err);
    shutdown();
    process.exit(1);
}
