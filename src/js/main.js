const PromptClassMap = {
    "help": FuqComponent,
    "about": FuqComponent,
    "title": FuqTitlePrompt,
    "browser": FuqDocumentBrowserPrompt,
    "confirm-delete": FuqConfirmDeletePrompt,
}

function main() {
    runMigrations(Migrations);

    const db = new FuqDB();
    const curDoc = new CurrentDocument();
    const storageObs = new FuqStorageObserver(curDoc, db);
    const editor = new FuqMonacoEditor(document.querySelector("#editor"), curDoc);
    const reader = new FuqReader(document.querySelector("#reader"), curDoc);

    const $viewer = new FuqComponentSwapper(editor, reader);

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
        db.deleteDocument(curDoc.document);
    });

    document.addEventListener(Events.UserExportDocument, async ev => {
        ExportDBToZipBlob(db).then(zfile => {
            const fname = "fuqdocs-export-" + (+new Date()) + ".zip";
            console.debug("fuqdocs: exporting zip file", fname);
            saveAs(zfile, fname)
        });
    });

    document.addEventListener(Events.UserToggleTheme, ev => {
        const savedTheme = db.load(FuqDBThemeKey);
        const newTheme = savedTheme === "dark" ? "light" : "dark";

        let $html = document.querySelector("html");
        $html.classList.remove(savedTheme);
        $html.classList.add(newTheme);
        editor.updateTheme(newTheme);
        db.save(FuqDBThemeKey, newTheme);
    });

    curDoc.addEventListener(Events.DocumentChange, ev => {
        curDoc.empty() ? $viewer.primary() : $viewer.secondary();
    });

    db.addEventListener(Events.DocumentDelete, ev => {
        if (ev.detail.key === curDoc.key) {
            const lastDoc = db.lastSavedDocument();
            if (lastDoc) {
                curDoc.document = lastDoc;
            } else {
                document.dispatchEvent(new CustomEvent(Events.UserNewDocument));
            }
        }
    });

    // default theme handling
    document.querySelector("html").classList.add(db.load(FuqDBThemeKey));
    editor.updateTheme(db.load(FuqDBThemeKey));

    // default document handling
    curDoc.document = db.lastSavedDocument(); // try and open the last saved document
    if (curDoc.isOpen()) {
        // there is a current document, but if it has no content just start editing
        curDoc.empty() ? $viewer.primary() : $viewer.secondary();
    } else {
        // probably a new session; build the default doc and stuff
        console.debug("fuqdocs: creating hello,world doc");
        let defDoc = db.newDocument();
        defDoc.content = DefaultDocument;
        defDoc.title = "Hello, World!";
        curDoc.document = defDoc;
        db.saveDocument(defDoc);
        $viewer.secondary(); // read mode
    }

    // attempt to save every 5 seconds
    setInterval(() => { document.dispatchEvent(new CustomEvent(Events.UserSaveDocument)) }, AUTOSAVE_MILLIS);
}

window.addEventListener("DOMContentLoaded", main);

function deflate(zipURI) {
    const zr = new zip.ZipReader(new zip.Data64URIReader(zipURI));
    zr.getEntries().then(entries => {
        entries[0].getData(new zip.TextWriter()).then(data => {
            zr.close().then(() => {
                console.log(data);
            });
        });
    });
}
