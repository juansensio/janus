export type EditorSaveStatus = "idle" | "saving" | "saved" | "error";

export type AutosaveController = {
    markLoaded(text: string): void;
    onInput(text: string): void;
    flush(): Promise<void>;
    dispose(): void;
    isDirty(): boolean;
};

export function createAutosaveController(options: {
    save: (text: string) => Promise<void>;
    getText: () => string;
    intervalMs: number;
    onStatus: (status: EditorSaveStatus) => void;
}): AutosaveController {
    let lastSaved = "";
    let dirty = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let inFlight = false;
    let chainAfterFlight = false;

    function stopTimer(): void {
        if (intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }

    function ensureTimer(): void {
        if (intervalId !== null) {
            return;
        }
        intervalId = setInterval(() => {
            if (!dirty || inFlight) {
                return;
            }
            void performSave(options.getText());
        }, options.intervalMs);
    }

    async function performSave(text: string): Promise<void> {
        if (inFlight) {
            chainAfterFlight = true;
            return;
        }
        if (text === lastSaved) {
            dirty = false;
            stopTimer();
            return;
        }
        inFlight = true;
        options.onStatus("saving");
        try {
            await options.save(text);
        } catch (error) {
            inFlight = false;
            options.onStatus("error");
            throw error;
        }
        inFlight = false;
        const current = options.getText();
        if (current === text) {
            lastSaved = text;
            dirty = false;
            options.onStatus("saved");
            stopTimer();
        } else {
            dirty = true;
            options.onStatus("idle");
            ensureTimer();
        }
        if (chainAfterFlight) {
            chainAfterFlight = false;
            await performSave(options.getText());
        }
    }

    return {
        markLoaded(text: string) {
            lastSaved = text;
            dirty = false;
            stopTimer();
            options.onStatus("idle");
        },
        onInput(text: string) {
            dirty = text !== lastSaved;
            if (dirty) {
                ensureTimer();
            } else {
                stopTimer();
                options.onStatus("idle");
            }
        },
        async flush() {
            stopTimer();
            await performSave(options.getText());
        },
        dispose() {
            stopTimer();
        },
        isDirty() {
            return dirty;
        },
    };
}
