import { spawnSync } from "node:child_process";
import path from "node:path";
import { isE2eWatchMode, resolveElectronSlowMoMs } from "../e2e/helpers/launch-mode";

const root = path.resolve(import.meta.dir, "..");

function run(command: string, args: string[], env = process.env): number {
    const result = spawnSync(command, args, {
        cwd: root,
        stdio: "inherit",
        env,
    });
    return result.status ?? 1;
}

function main(): void {
    const steps: Array<[string, string[]]> = [
        ["bun", ["run", "ensure:electron"]],
        ["bun", ["run", "build:ui"]],
        ["bun", ["run", "--filter", "@janus/desktop", "build"]],
    ];

    for (const [cmd, args] of steps) {
        const code = run(cmd, args);
        if (code !== 0) {
            process.exit(code);
        }
    }

    if (isE2eWatchMode()) {
        const slowMo = resolveElectronSlowMoMs();
        console.log(
            `[e2e:watch] Visible run with slowMo=${slowMo}ms. CI uses: bun run e2e`,
        );
        console.log(
            "[e2e:watch] Add -- --debug to step through with the Playwright Inspector.",
        );
    }

    const playwrightArgs = [
        "playwright",
        "test",
        ...process.argv.slice(2),
    ];

    const useXvfb =
        process.platform === "linux" &&
        !process.env.DISPLAY?.trim();

    const code = useXvfb
        ? run("xvfb-run", ["-a", "bunx", ...playwrightArgs], {
              ...process.env,
              PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
          })
        : run("bunx", playwrightArgs, {
              ...process.env,
              PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
          });

    process.exit(code);
}

main();
