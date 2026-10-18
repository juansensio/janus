export const SHELF_STRINGS = {
    newBook: "New book",
    empty: "No books yet",
    delete: "Delete",
    deleteConfirm: (title: string) =>
        `Delete "${title}"? This cannot be undone.`,
} as const;
