import path from "node:path";

const root = path.resolve(import.meta.dir, "..");
const ensure = Bun.spawn(["bun", "run", "ensure:esbuild"], {
    cwd: root,
    stdout: "inherit",
    stderr: "inherit",
});
if ((await ensure.exited) !== 0) {
    process.exit(ensure.exitCode ?? 1);
}

const port = Number(process.env.JANUS_UI_DEV_PORT ?? 5173);
const devUrl = `http://127.0.0.1:${port}/`;

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
    throw new Error(`dev-desktop: Vite did not respond at ${url}`);
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
    const desktop = Bun.spawn(
        ["bun", "run", "--filter", "@janus/desktop", "start"],
        {
            cwd: root,
            env: { ...process.env, JANUS_DEV: "1", JANUS_UI_DEV_PORT: String(port) },
            stdout: "inherit",
            stderr: "inherit",
        },
    );
    const code = await desktop.exited;
    shutdown();
    process.exit(code);
} catch (err) {
    console.error(err);
    shutdown();
    process.exit(1);
}
