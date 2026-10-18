import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "happy-dom",
        include: [
            "packages/**/*.test.ts",
            "apps/**/*.test.ts",
            "services/**/*.test.ts",
            "scripts/**/*.test.ts",
        ],
    },
});
