import { describe, expect, it } from "vitest";
import { createShellLabel } from "./index";

describe("createShellLabel", () => {
    it('returns "Janus"', () => {
        expect(createShellLabel()).toBe("Janus");
    });
});
