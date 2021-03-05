marked.setOptions({
    headerIds: false,
    gfm: true, // ensure github-flavored-markdown
    highlight: function (code, lang) {
        if (!hljs.listLanguages().includes(lang)) {
            return code;
        }

        try {
            return hljs.highlight(lang, code).value;
        } catch (e) {
            return hljs.highlightAuto(code).value;
        }
    }
});

function keycombo(ev) {
    return [ev.code, ev.shiftKey, ev.ctrlKey, ev.altKey, ev.metaKey].join('|')
}

const PromptClassMap = {
    "help": ScratchComponent,
    "title": ScratchTitlePrompt,
    "browser": ScratchBrowserPrompt,
}

// code|shift|ctrl|alt|meta : {"event": "x-<event-name>", ["scope": ("prompt"|"view"), ["key": "<key>"]]}
const Shortcuts = {
    "KeyS|false|false|true|false": { "event": "x-save" },
    "KeyN|false|false|true|false": { "event": "x-new" },
    "KeyP|false|false|true|false": { "event": "x-toggle", "scope": "view" },
    "KeyT|false|false|true|false": { "event": "x-toggle", "scope": "prompt", "key": "title" },
    "KeyO|false|false|true|false": { "event": "x-toggle", "scope": "prompt", "key": "browser" },
    "Slash|false|true|false|false": { "event": "x-toggle", "scope": "prompt", "key": "help" },
    "Escape|false|false|false|false": { "event": "x-toggle", "scope": "prompt" },
}

function main() {
    const db = new ScratchDB();
    const curDoc = new ScratchDocument();

    const $viewer = new BinaryToggler(
        new ScratchEditor(document.querySelector("#editor"), curDoc),
        new ScratchReader(document.querySelector("#reader"), curDoc));

    const $prompts = new MultiComponentToggler();
    document.querySelectorAll(".prompt").forEach($prompt => {
        const key = $prompt.dataset.key;
        $prompts.register(key, new PromptClassMap[key]($prompt, curDoc, db));
    })

    const $statusbar = new StatusBar(document.querySelector("#statusbar"), curDoc, db);

    curDoc.document = db.lastSavedDocument(); // try and open the last saved document
    if (curDoc.isOpen()) {
        // there is a current document, but if it has no content just start editing
        curDoc.empty() ? $viewer.primary() : $viewer.secondary();
    } else {
        // probably a new session; build the default doc and stuff
        // TODO: what if they deleted all of their docs (which they can't do yet)
        let defDoc = db.newDocument();
        curDoc.document = defDoc;
        curDoc.content = DefaultDocument;
        curDoc.title = "Hello, World!";
        db.saveDocument(curDoc.document);
        $viewer.secondary();
    }

    // shortcut router
    document.addEventListener("keydown", ev => {
        const sc = Shortcuts[keycombo(ev)];
        if (sc) {
            // we have a shortcut for this keycombo, so prevent propagation
            ev.preventDefault();
            ev.stopPropagation();
            document.dispatchEvent(new CustomEvent(sc.event, { detail: sc }));
        }
    });

    document.addEventListener("x-toggle", ev => {
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

    document.addEventListener("x-save", ev => {
        db.saveDocument(curDoc.document);
    });

    document.addEventListener("x-new", ev => {
        doc = db.newDocument();
        curDoc.document = doc;
        $viewer.primary();
        $prompts.toggle("title");
    });

    curDoc.addEventListener("document-change", ev => {
        curDoc.empty() ? $viewer.primary() : $viewer.secondary();
    });
}

window.addEventListener("DOMContentLoaded", main);
