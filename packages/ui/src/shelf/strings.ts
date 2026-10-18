export const SHELF_STRINGS = {
    newBook: "New book",
    empty: "No books yet",
    delete: "Delete",
    deleteConfirm: (title: string) =>
        `Delete "${title}"? This cannot be undone.`,
    loadFailed: "Could not load books.",
    createFailed: "Could not create a book.",
    deleteFailed: "Could not delete the book.",
} as const;
