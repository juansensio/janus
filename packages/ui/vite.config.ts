import path from "node:path";
import { defineConfig } from "vite";

// UI build output: repo-root dist/ui (consumed by Electron and Capacitor webDir).
export default defineConfig({
    root: path.resolve(__dirname),
    // Relative URLs so Electron loadFile(file://) and Capacitor both resolve assets.
    base: "./",
    build: {
        outDir: path.resolve(__dirname, "../../dist/ui"),
        emptyOutDir: true,
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, "index.html"),
                mobile: path.resolve(__dirname, "mobile.html"),
            },
        },
    },
    resolve: {
        alias: {
            "@janus/mobile-entry": path.resolve(
                __dirname,
                "../../apps/mobile/src/entry.ts",
            ),
        },
    },
});
