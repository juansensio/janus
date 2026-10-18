export const SHELF_STRINGS = {
    shelfLabel: "Books",
    addBook: "New book",
    empty: "No books yet",
    delete: "Delete",
    rename: "Rename",
    deleteConfirm: (title: string) =>
        `Delete "${title}"? This cannot be undone.`,
    loadFailed: "Could not load books.",
    createFailed: "Could not create a book.",
    renameFailed: "Could not rename the book.",
    deleteFailed: "Could not delete the book.",
    dialogCreateTitle: "New book",
    dialogRenameTitle: "Rename book",
    dialogNameLabel: "Book name",
    dialogCreate: "Create",
    dialogSave: "Save",
    dialogCancel: "Cancel",
    dialogInvalidTitle: "Enter a book name.",
    dialogDuplicateTitle:
        "That name is already on your shelf. Choose a different book name.",
} as const;
