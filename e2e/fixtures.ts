import type { ElectronApplication, Page } from "@playwright/test";
import { test as base } from "@playwright/test";
import { saveFailureArtifacts } from "./helpers/artifacts";
import {
    firstWindow,
    launchJanusApp,
    makeIsolatedJanusDirs,
    removeJanusDirs,
    type JanusLaunchDirs,
} from "./helpers/launch";

export type JanusSession = {
    dirs: JanusLaunchDirs;
    page: Page;
    relaunch: () => Promise<Page>;
};

type JanusFixtures = {
    janus: JanusSession;
};

export const test = base.extend<JanusFixtures>({
    janus: async (_fixtures, use, testInfo) => {
        const dirs = await makeIsolatedJanusDirs();
        let app: ElectronApplication = await launchJanusApp(dirs);
        let page = await firstWindow(app);

        const session: JanusSession = {
            dirs,
            page,
            relaunch: async () => {
                await app.close();
                app = await launchJanusApp(dirs);
                page = await firstWindow(app);
                session.page = page;
                return page;
            },
        };

        try {
            await use(session);
        } catch (error) {
            await saveFailureArtifacts(page, testInfo);
            throw error;
        } finally {
            await app.close();
            await removeJanusDirs(dirs);
        }
    },
});

export { expect } from "@playwright/test";
