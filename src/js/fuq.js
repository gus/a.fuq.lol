const UUIDRe = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

function uuidv4() {
    // @see https://stackoverflow.com/a/2117523 (2017-06-28 update)
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function ymd(d) {
    const Y = d.getFullYear().toString().padStart(4, "0");
    const M = (d.getMonth() + 1).toString().padStart(2, "0");
    const D = (d.getDate() + 1).toString().padStart(2, "0");
    return `${Y}-${M}-${D}`;
}

/*
 * struct Document {
 *   id: uuid - an internal id for this document
 *   created_at: int - milli-seconds since epoch (UTC) when this document was created
 *   updated_at: int - milli-seconds since epoch (UTC) when this document was last updated
 *   title: string - the document's title
 *   content: string - the document's contents
 * }
 */

function MarshalDocument(doc) {
    if (!doc.id) {
        throw new Error("missing id");
    }
    return JSON.stringify({
        id: doc.id,
        created_at: doc.created_at || 0,
        updated_at: doc.updated_at || 0,
        title: doc.title || "",
        content: doc.content || "",
    })
}

function UnmarshalDocument(str) {
    const j = JSON.parse(str);
    if (!j.id) {
        throw new Error("missing id");
    } else if (typeof (j.id) !== "string" || !UUIDRe.test(j.id)) {
        throw new Error("id is not a valid uuid");
    } else if (typeof (j.content) !== "string") {
        throw new Error("content is not a string");
    }
    return {
        id: j.id,
        created_at: j.created_at || 0,
        updated_at: j.updated_at || 0,
        title: j.title || "",
        content: j.content,
    }
}

const FuqDBNamespace = "fuqdocs";
const FuqDBThemeKey = [FuqDBNamespace, "theme"].join(".");
const FuqDBManifestKey = [FuqDBNamespace, "manifest"].join(".");
const FuqDBDocPrefix = [FuqDBNamespace, "docs"].join(".");

function documentKey(doc) {
    return [FuqDBDocPrefix, doc.id].join("/");
}

class FuqDB extends EventTarget {
    constructor() {
        super();
        this.loadManifest();
    }

    load(key) {
        return localStorage.getItem(key);
    }

    save(key, str) {
        localStorage.setItem(key, str);
    }

    remove(key) {
        localStorage.removeItem(key);
    }

    loadManifest() {
        const manifestStr = this.load(FuqDBManifestKey);
        this.manifest = manifestStr ? JSON.parse(manifestStr) : [];
    }

    saveManifest() {
        this.save(FuqDBManifestKey, JSON.stringify(this.manifest));
    }

    newDocument() {
        return {
            id: uuidv4(),
            created_at: Date.now(),
            updated_at: Date.now(),
            title: "",
            content: "",
        };
    }

    loadDocument(docKey) {
        const docStr = this.load(docKey);
        if (!docStr) {
            return null;
        }
        return UnmarshalDocument(docStr);
    }

    lastSavedDocument() {
        const lastSaved = this.manifest[0];
        return lastSaved ? this.loadDocument(lastSaved) : null;
    }

    saveDocument(doc) {
        if (typeof (doc) !== "object") {
            throw new Error("document must be an object")
        }

        const docKey = documentKey(doc);
        doc.updated_at = Date.now();
        this.save(docKey, MarshalDocument(doc));

        this.manifest = [docKey, ...this.manifest.filter(dk => dk !== docKey)];
        this.saveManifest();

        this.dispatchEvent(new CustomEvent(Events.DocumentSave, {
            detail: { key: docKey, "doc": doc }
        }));
    }

    deleteDocument(doc) {
        if (typeof (doc) !== "object") {
            throw new Error("document must be an object")
        }
        const docKey = documentKey(doc);
        console.debug("fuqdocs/db: deleting doc", docKey, doc);

        // update the manifest before we remove the doc
        this.manifest = [...this.manifest.filter(dk => dk !== docKey)];
        this.saveManifest();

        this.remove(docKey);

        this.dispatchEvent(new CustomEvent(Events.DocumentDelete, {
            detail: { key: docKey }
        }));
    }
}

/**
 * CurrentDocument is a wrapper around the currently open document. The
 * underlying document can change, but any users of this CurrentDocument
 * will not need to get any new object to use. ...
 */
class CurrentDocument extends EventTarget {
    constructor(doc) {
        super();
        this._doc = doc;
    }

    isOpen() {
        return !!this._doc
    }

    get key() {
        return documentKey(this._doc);
    }

    get document() {
        return this._doc;
    }

    set document(doc) {
        this._doc = doc;
        this.dispatchEvent(new CustomEvent(Events.DocumentChange))
    }

    get id() {
        return this.isOpen() ? this._doc.id : null;
    }

    get created_at() {
        return this.isOpen() ? this._doc.created_at : 0;
    }

    get updated_at() {
        return this.isOpen() ? this._doc.updated_at : 0;
    }

    get title() {
        return this.isOpen() ? this._doc.title : "";
    }

    set title(str) {
        if (this.isOpen()) {
            this._doc.title = str;
            this.dispatchEvent(new CustomEvent(Events.DocumentTitleChange));
        }
    }

    empty() {
        return this.content.trim().length === 0;
    }

    get content() {
        return this.isOpen() ? this._doc.content : "";
    }

    set content(str) {
        if (this.isOpen()) {
            this._doc.content = str;
            this.dispatchEvent(new CustomEvent(Events.DocumentContentChange));
        }
    }
}

// FuqStorageObserver observes storage, looking for changes to the manifest
// or the current document. This can happen if Fuq Docs is open in another tab.
class FuqStorageObserver {
    constructor(curDoc, db) {
        this.curDoc = curDoc;
        this.db = db;

        let self = this;
        window.addEventListener("storage", (ev) => { self.handleStorageChange(ev) });
    }

    handleStorageChange(ev) {
        if (ev.key.startsWith(FuqDBNamespace)) {
            if (ev.key === FuqDBManifestKey) {
                console.debug("fuqdocs/storage-observer: manifest updated elsewhere");
                this.db.loadManifest();
            } else if (ev.key.startsWith(FuqDBDocPrefix)) {
                this.handleDocumentChange(ev);
            } else if (ev.key === FuqDBThemeKey) {
                console.debug("fuqdocs/storage-observer: theme changed");
                let $html = document.querySelector("html");
                $html.classList.remove(ev.oldValue);
                $html.classList.add(ev.newValue);
            }
        }
    }

    handleDocumentChange(ev) {
        const docKey = ev.key;
        if (ev.newValue == null) {
            console.debug("fuqdocs/storage-observer: current document deleted elsewhere");
            this.db.dispatchEvent(new CustomEvent(Events.DocumentDelete, {
                detail: { key: docKey }
            }));
        } else if (docKey === this.curDoc.key) {
            console.debug("fuqdocs/storage-observer: current document updated elsewhere");
            // re-open the current doc
            this.curDoc.document = this.db.loadDocument(docKey);
        } else {
            // nothing to do
            console.debug(`fuqdocs/storage: document ${docKey} updated elsewhere`);
        }
    }
}

class FuqComponent extends EventTarget {
    constructor($panel, doc) {
        super();
        this.$panel = $panel;
        this.doc = doc;

        let self = this;
        this.doc.addEventListener(Events.DocumentChange, ev => { self.handleDocumentChange(ev) })
        this.doc.addEventListener(Events.DocumentContentChange, ev => { self.handleContentChange(ev) })
        this.doc.addEventListener(Events.DocumentTitleChange, ev => { self.handleTitleChange(ev) })
    }

    handleDocumentChange(ev) {
        // noop
    }

    handleContentChange(ev) {
        // noop
    }

    handleTitleChange(ev) {
        // noop
    }

    toggle() {
        this.hidden() ? this.show() : this.hide();
    }

    show() {
        this.$panel.style.display = null;
    }

    hide() {
        this.$panel.style.display = "none";
    }

    hidden() {
        return this.$panel.style.display === "none";
    }

    blur() {
        this.$panel.blur();
    }

    focus() {
        this.$panel.focus();
    }
}

class FuqMonacoEditor extends FuqComponent {
    constructor($panel, curDoc) {
        super($panel, curDoc);
        this.doc = curDoc;
        this.$editor = $panel.querySelector("#textarea");

        this.monaco = monaco.editor.create(this.$editor, {
            language: "markdown",
            theme: "vs-dark",
            automaticLayout: true,
            fontFamily: "Fira Code",
            formatOnPaste: true,
            formatOnType: true,
            scrollBeyondLastLine: true,
            renderWhitespace: "none"
        });
    
        let self = this;
        this.monaco.onDidChangeModelContent(ev => { self.handleInputChange(ev) })
    }

    handleDocumentChange(ev) {
        this.monaco.setValue(this.doc.content);
    }

    handleInputChange(ev) {
        this.doc.content = this.monaco.getValue();
    }

    focus() {
        this.monaco.focus();
    }

    updateTheme(theme) {
        this.monaco.updateOptions({theme: "vs-"+theme})
    }
}

class FuqReader extends FuqComponent {
    constructor($panel, curDoc) {
        super($panel, curDoc);
    }

    handleDocumentChange(ev) {
        this.handleContentChange(ev);
    }

    handleContentChange(ev) {
        this.$panel.innerHTML = marked.parse(this.doc.content);
    }
}

class FuqComponentSwapper {
    // one-and-only-one component is in view at a time
    constructor(primaryView, secondaryView) {
        this.primaryView = primaryView;
        this.secondaryView = secondaryView;
    }

    toggle() {
        this.primaryView.hidden() ? this.primary() : this.secondary();
    }

    primary() {
        this.secondaryView.blur();
        this.secondaryView.hide();
        this.primaryView.show();
        this.primaryView.focus();
    }

    secondary() {
        this.primaryView.blur();
        this.primaryView.hide();
        this.secondaryView.show();
        this.secondaryView.focus();
    }

    focus() {
        this.primaryView.hidden() ? this.secondaryView.focus() : this.primaryView.focus();
    }
}

class FuqComponentToggler {
    // only one component can be in view at time, though none have to be in view
    constructor() {
        this.components = {};
        this.activeKey = null;
        this.activeComponent = null;
    }

    register(name, $component) {
        this.components[name] = $component;
    }

    hidden() {
        return this.activeComponent === null;
    }

    toggle(key) {
        if (key && this.activeKey == key) {
            this.activeComponent.toggle();
        } else {
            this.show(key);
        }
    }

    hide(key) {
        // really doesn't matter what's being shown, just hide it
        if (this.activeComponent) {
            this.activeComponent.hide();
        }
        this.activeKey = null;
        this.activeComponent = null;
    }

    show(key) {
        this.hide(); // hide current component regardless
        if (key && key !== this.activeKey) {
            const comp = this.components[key];
            if (comp) {
                this.activeKey = key;
                this.activeComponent = comp;
            }
        }

        if (this.activeComponent) {
            this.activeComponent.show();
        }
    }
}

class FuqTitlePrompt extends FuqComponent {
    constructor($panel, curDoc) {
        super($panel, curDoc);
        this.doc = curDoc;
        this.$title = $panel.querySelector("input");

        let self = this;
        this.doc.addEventListener(Events.DocumentChange, ev => { self.handleDocumentChange(ev) })
        this.$title.addEventListener("input", ev => { self.handleInputChange(ev) })
        this.$title.addEventListener("keypress", ev => { self.handleEnterKey(ev) })
    }

    handleDocumentChange(ev) {
        this.$title.value = this.doc.title;
    }

    handleInputChange(ev) {
        this.doc.title = this.$title.value;
    }

    handleEnterKey(ev) {
        if (ev.code === "Enter") {
            document.dispatchEvent(new CustomEvent(Events.UserToggle, { detail: { "scope": "prompt" } }));
        }
    }

    show() {
        super.show();
        this.focus();
    }

    focus() {
        this.$title.focus();
    }
}

class FuqConfirmDeletePrompt extends FuqComponent {
    constructor($panel, curDoc) {
        super($panel, curDoc);
        let $confirm = $panel.querySelector("button.confirm");
        let $cancel = $panel.querySelector("button.cancel");

        $confirm.addEventListener("click", ev => {
            document.dispatchEvent(new CustomEvent(Events.UserToggle, { detail: { "scope": "prompt" } }));
            document.dispatchEvent(new CustomEvent(Events.UserDeleteDocument));
        })
        $cancel.addEventListener("click", ev => {
            document.dispatchEvent(new CustomEvent(Events.UserToggle, { detail: { "scope": "prompt" } }));
        })
    }
}

class FuqDocumentBrowserPrompt extends FuqComponent {
    constructor($panel, curDoc, db) {
        super($panel, curDoc);
        this.db = db;
        this.$filter = this.$panel.querySelector("input.filter");
        this.$table = this.$panel.querySelector(".table");

        let self = this;
        this.db.addEventListener(Events.DocumentDelete, ev => { self.handleFilter(ev) })
        this.$filter.addEventListener("input", ev => { self.handleFilter(ev) })
        this.$table.addEventListener("click", ev => { self.handleClick(ev) })
    }

    createListingFromDoc(key, doc) {
        let t = document.querySelector("#browser-document-listing").content.cloneNode(true);
        t.querySelector("slot[name=title]").outerHTML = doc.title || doc.id;
        t.querySelector("slot[name=created_at]").outerHTML = ymd(new Date(doc.created_at));
        t.querySelector("slot[name=updated_at]").outerHTML = ymd(new Date(doc.updated_at));
        let $tr = t.querySelector(".tr");
        $tr.id = `browser-doc-${doc.id}`;
        let $title = t.querySelector(".title");
        $title.dataset.key = key;
        return t;
    }

    show() {
        this.$table.innerHTML = "";
        this.db.manifest.forEach(docKey => {
            this.$table.appendChild(this.createListingFromDoc(docKey, this.db.loadDocument(docKey)));
        });
        super.show();
        this.$filter.focus();
    }

    hide() {
        this.$filter.blur();
        super.hide();
    }

    handleFilter(ev) {
        const search = this.$filter.value.toLowerCase();
        this.$table.innerHTML = "";
        this.db.manifest.forEach(docKey => {
            const doc = this.db.loadDocument(docKey);
            const ltitle = doc.title.toLowerCase()
            if (search.length < 2 || (search.length > 1 && ltitle.includes(search))) {
                this.$table.appendChild(this.createListingFromDoc(docKey, doc));
            }
        });
    }

    handleClick(ev) {
        if (ev.target.dataset.key) {
            ev.preventDefault();
            ev.stopPropagation();
            const tgt = ev.target;
            this.doc.document = this.db.loadDocument(tgt.dataset.key);
            this.hide();
        }
    }
}

class FuqStatusBar extends FuqComponent {
    constructor($panel, curDoc, db) {
        super($panel, curDoc);
        this.db = db;
        this.$message = $panel.querySelector(".message");
        this.$saveStatus = $panel.querySelector("i.save");

        let self = this;
        this.db.addEventListener(Events.DocumentNew, ev => { self.handleContentChange(ev) })
        this.db.addEventListener(Events.DocumentSave, ev => { self.handleSaveDocument(ev) })
    }

    message(level, msg) {
        this.$message.innerHTML = `<span class="${level}">${msg}</span>`;
    }

    clearMessage() {
        this.$message.innerHTML = "";
    }

    handleTitleChange(ev) {
        this.handleContentChange(ev)
    }

    handleContentChange(ev) {
        this.$saveStatus.classList.add("ALERT");
    }

    handleSaveDocument(ev) {
        this.$saveStatus.classList.remove("ALERT");
    }
}
