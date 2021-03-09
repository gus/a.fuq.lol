const PromptClassMap = {
    "help": FuqComponent,
    "about": FuqComponent,
    "title": FuqTitlePrompt,
    "browser": FuqDocumentBrowserPrompt,
    "confirm-delete": FuqConfirmDeletePrompt,
}

function main() {
    const db = new DocumentDB();
    const curDoc = new CurrentDocument();

    const $viewer = new FuqComponentSwapper(
        new FuqEditor(document.querySelector("#editor"), curDoc),
        new FuqReader(document.querySelector("#reader"), curDoc));

    const $prompts = new FuqComponentToggler();
    document.querySelectorAll(".prompt").forEach($prompt => {
        const key = $prompt.dataset.key;
        $prompts.register(key, new PromptClassMap[key]($prompt, curDoc, db));
    })

    const $statusbar = new FuqStatusBar(document.querySelector("#statusbar"), curDoc, db);

    // shortcut router
    document.addEventListener("keydown", ev => {
        const sc = Shortcuts[keycombo(ev)];
        if (sc) {
            $statusbar.clearMessage();
            // we have a shortcut for this keycombo, so prevent propagation
            ev.preventDefault();
            ev.stopPropagation();
            document.dispatchEvent(new CustomEvent(sc.event, { detail: sc }));
        }
    });

    document.addEventListener(Events.UserToggle, ev => {
        if (ev.detail.scope === "prompt") {
            $prompts.toggle(ev.detail.key);
            if ($prompts.hidden()) {
                $viewer.focus();
            }
        } else if (ev.detail.scope === "view") {
            $viewer.toggle();
        } else {
            console.error("unrecognized toggle scope", sc)
        }
    });

    document.addEventListener(Events.UserSaveDocument, ev => {
        if (curDoc.title.length === 0) {
            $statusbar.message("ALERT", "Set document title in order to save (Alt + t)");
        } else {
            $statusbar.clearMessage();
            db.saveDocument(curDoc.document);
        }
    });

    document.addEventListener(Events.UserNewDocument, ev => {
        let doc = db.newDocument();
        curDoc.document = doc;
        $viewer.primary();
        $prompts.show("title");
    });

    document.addEventListener(Events.UserDeleteDocument, ev => {
        console.log("document delete attempted", ev)
        db.deleteDocument(curDoc.document);
    });

    curDoc.addEventListener(Events.DocumentChange, ev => {
        curDoc.empty() ? $viewer.primary() : $viewer.secondary();
    });

    db.addEventListener(Events.DocumentDelete, ev => {
        console.log("document deleted", ev)
        const lastDoc = db.lastSavedDocument();
        if (lastDoc) {
            curDoc.document = lastDoc;
        } else {
            document.dispatchEvent(new CustomEvent(Events.UserNewDocument));
        }
    });

    curDoc.document = db.lastSavedDocument(); // try and open the last saved document
    if (curDoc.isOpen()) {
        // there is a current document, but if it has no content just start editing
        curDoc.empty() ? $viewer.primary() : $viewer.secondary();
    } else {
        // probably a new session; build the default doc and stuff
        // TODO: what if they deleted all of their docs (which they can't do yet)
        let defDoc = db.newDocument();
        defDoc.content = DefaultDocument;
        defDoc.title = "Hello, World!";
        curDoc.document = defDoc;
        db.saveDocument(defDoc);
        $viewer.secondary(); // read mode
    }

    // attempt to save every 5 seconds
    setInterval(() => { document.dispatchEvent(new CustomEvent(Events.UserSave)) }, AUTOSAVE_MILLIS);
}

window.addEventListener("DOMContentLoaded", main);
