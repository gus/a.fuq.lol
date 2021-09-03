const Events = {
    // document-level
    DocumentNew: "fuq-document-new",
    DocumentSave: "fuq-document-save",
    DocumentDelete: "fuq-document-delete",
    DocumentChange: "fuq-document-change",
    DocumentTitleChange: "fuq-document-title-change",
    DocumentContentChange: "fuq-document-content-change",

    // user-triggered
    UserSaveDocument: "fuq-user-save-document",
    UserNewDocument: "fuq-user-new-document",
    UserDeleteDocument: "fuq-user-delete-document",
    UserExportDocument: "fuq-user-export-document",
    UserToggle: "fuq-user-toggle",
    UserToggleTheme: "fuq-user-toggle-theme",
}

function keycombo(ev) {
    return [ev.code, ev.shiftKey, ev.ctrlKey, ev.altKey, ev.metaKey].join('|')
}

/**
 * keycombo(code|shift|ctrl|alt|meta) => struct {
 *   "event": Events.<EventName>,
 *   Optional("scope"): "prompt"|"view",
 *   Optional("key"): "<key>"
 * }
 */
const Shortcuts = {
    // documents
    "KeyS|false|false|true|false": { "event": Events.UserSaveDocument },
    "KeyS|false|true|false|false": { "event": Events.UserSaveDocument },
    "KeyN|false|false|true|false": { "event": Events.UserNewDocument },
    "KeyX|true|false|true|false": { "event": Events.UserExportDocument },
    "KeyT|false|true|true|false": { "event": Events.UserToggleTheme },

    // prompts
    "KeyP|false|false|true|false": { "event": Events.UserToggle, "scope": "view" },
    "KeyP|false|true|false|false": { "event": Events.UserToggle, "scope": "view" },
    "KeyT|false|false|true|false": { "event": Events.UserToggle, "scope": "prompt", "key": "title" },
    "Delete|false|false|true|false": { "event": Events.UserToggle, "scope": "prompt", "key": "confirm-delete" },
    "KeyO|false|false|true|false": { "event": Events.UserToggle, "scope": "prompt", "key": "browser" },
    "Escape|false|false|false|false": { "event": Events.UserToggle, "scope": "prompt" },
    "Slash|false|true|false|false": { "event": Events.UserToggle, "scope": "prompt", "key": "help" },
    "Slash|false|false|true|false": { "event": Events.UserToggle, "scope": "prompt", "key": "help" },
    "Slash|true|false|true|false": { "event": Events.UserToggle, "scope": "prompt", "key": "about" },
};
