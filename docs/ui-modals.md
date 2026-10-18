# Modal UX contract (Janus UI)

Reference for **any** modal or dialog in `packages/ui`. The book-name dialog (`openBookNameDialog`) is the reference implementation.

## Keyboard

| Key | Behavior |
|-----|----------|
| **Escape** | Close without saving (cancel). Remove overlay, restore focus to the opener. |
| **Enter** | In a single-field form, submit the primary action (same as **Create** / **Save**). Use a `<form>` with `type="submit"` on the primary button—not click-only handlers. |
| **Tab** | Cycle focus within the dialog (field, cancel, primary). |

Backdrop click may cancel when product spec says so (book-name dialog: yes).

## Errors

1. **Where:** Validation and submit failures appear **inside the modal** (e.g. `.shelf-dialog-validation` under the field). Never close the modal and push the same failure to a page-level banner (`.shelf-error`) for that submit.
2. **What:** Messages must state **what went wrong** and **what to do next** (e.g. duplicate name → “already on your shelf” + “choose a different book name”). Avoid generic “Could not create…” when a specific `code` or message exists.
3. **Bridge / IPC:** Desktop must preserve `code` on reject (`library-ipc-error.ts` + serializable `{ message, code }` from main). UI maps codes in `dialog-submit-error.ts` (with message fallback for wrapped IPC text).
4. **Accessibility:** On error, set `aria-invalid="true"` on the field and `aria-describedby` pointing at the error element; clear when the user edits or the error clears.

## Tests (required for new modals)

Colocated Vitest + jsdom tests must cover at minimum:

- Escape closes without calling confirm/save
- Enter (or form submit) calls confirm when input is valid
- Failed confirm keeps modal open and shows the expected inline message
- Success closes modal

See `packages/ui/src/shelf/book-name-dialog.test.ts`.

## Spec linkage

Library naming: `docs/specs/SPEC-library.md` (slice 1c — dialog a11y and errors).
