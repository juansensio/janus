import fs from "node:fs/promises";
import path from "node:path";

const repoArtifacts = path.resolve(import.meta.dir, "../e2e/artifacts");
const cloudArtifacts = "/opt/cursor/artifacts";

async function copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const from = path.join(src, entry.name);
        const to = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(from, to);
        } else if (entry.isFile()) {
            await fs.copyFile(from, to);
        }
    }
}

async function main(): Promise<void> {
    try {
        await fs.access(cloudArtifacts);
    } catch {
        console.log(
            `e2e:shots: ${cloudArtifacts} does not exist; skipping copy.`,
        );
        return;
    }

    try {
        await fs.access(repoArtifacts);
    } catch {
        console.log(`e2e:shots: no screenshots at ${repoArtifacts}`);
        return;
    }

    const dest = path.join(cloudArtifacts, "e2e-screenshots");
    await fs.rm(dest, { recursive: true, force: true });
    await copyDir(repoArtifacts, dest);
    console.log(`e2e:shots: copied screenshots to ${dest}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
