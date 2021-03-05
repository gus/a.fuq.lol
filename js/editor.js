// TODO support local storage
// TODO storage: support compression streams
// TODO support basic editing keystrokes
// TODO maybe support snippets

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
 * ScratchDocument
 * id: uuid - an internal id for this document
 * created_at: int - milli-seconds since epoch (UTC) when this document was created
 * updated_at: int - milli-seconds since epoch (UTC) when this document was last updated
 * title: string - the document's title
 * content: string - the document's contents
 */

function marshalDocument(doc) {
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

function unmarshalDocument(str) {
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

class ScratchDB extends EventTarget {
    static Namespace = "scratchmark"
    static ManifestKey = [ScratchDB.Namespace, "manifest"].join(".")
    static LastSavedKey = [ScratchDB.Namespace, "lastSaved"].join(".")
    static DocPrefix = [ScratchDB.Namespace, "docs"].join(".")

    constructor() {
        super();
        const manifestStr = localStorage.getItem(ScratchDB.ManifestKey);
        this.manifest = manifestStr ? JSON.parse(manifestStr) : [];
    }

    saveManifest() {
        localStorage.setItem(ScratchDB.ManifestKey, JSON.stringify(this.manifest));
    }

    key(doc) {
        return [ScratchDB.DocPrefix, doc.id].join("/")
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

    lastSavedDocument() {
        const lastSaved = localStorage.getItem(ScratchDB.LastSavedKey);
        return lastSaved ? this.loadDocument(lastSaved) : null;
    }

    loadDocument(docKey) {
        const docStr = localStorage.getItem(docKey);
        if (!docStr) {
            return null;
        }
        return unmarshalDocument(docStr);
    }

    saveDocument(doc) {
        if (typeof (doc) !== "object") {
            throw new Error("document must be an object")
        }

        const docKey = this.key(doc);
        doc.updated_at = Date.now();
        localStorage.setItem(docKey, marshalDocument(doc));
        localStorage.setItem(ScratchDB.LastSavedKey, docKey);

        if (!this.manifest.includes(docKey)) {
            this.manifest.push(docKey);
            this.saveManifest();
            this.dispatchEvent(new CustomEvent("new-document", {
                detail: { key: docKey, "doc": doc }
            }));
        } else {
            this.dispatchEvent(new CustomEvent("save-document", {
                detail: { key: docKey, "doc": doc }
            }));
        }
    }
}

/**
 * ScratchDocument is a wrapper around the currently open document.
 * ...
 */
class ScratchDocument extends EventTarget {
    constructor(doc) {
        super();
        this._doc = doc;
    }

    isOpen() {
        return !!this._doc
    }

    get document() {
        return this._doc;
    }

    set document(doc) {
        this._doc = doc;
        this.dispatchEvent(new CustomEvent("document-change"))
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
        return this.isOpen() ? (this._doc.title || this._doc.id) : "";
    }

    set title(str) {
        if (this.isOpen()) {
            this._doc.title = str;
            this.dispatchEvent(new CustomEvent("title-change"))
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
            this.dispatchEvent(new CustomEvent("content-change"))
        }
    }
}

class ScratchComponent extends EventTarget {
    constructor($panel, doc) {
        super();
        this.$panel = $panel;
        this.doc = doc;

        let self = this;
        this.doc.addEventListener("document-change", ev => { self.handleDocumentChange(ev) })
        this.doc.addEventListener("content-change", ev => { self.handleContentChange(ev) })
        this.doc.addEventListener("title-change", ev => { self.handleTitleChange(ev) })
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

class ScratchEditor extends ScratchComponent {
    constructor($panel, curDoc) {
        super($panel, curDoc);
        this.doc = curDoc;
        this.$editor = $panel.querySelector("textarea");

        let self = this;
        this.$editor.addEventListener("input", ev => { self.handleInputChange(ev) })
    }

    handleDocumentChange(ev) {
        this.$editor.value = this.doc.content;
    }

    handleInputChange(ev) {
        this.doc.content = this.$editor.value;
    }

    focus() {
        this.$editor.focus();
    }
}

class ScratchReader extends ScratchComponent {
    constructor($panel, curDoc) {
        super($panel, curDoc);
    }

    handleDocumentChange(ev) {
        this.handleContentChange(ev);
    }

    handleContentChange(ev) {
        this.$panel.innerHTML = marked(this.doc.content);
    }
}

class BinaryToggler {
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

class MultiComponentToggler {
    // only one component can be in view at time, though nothing has to be in view
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

class ScratchTitlePrompt extends ScratchComponent {
    constructor($panel, curDoc) {
        super($panel, curDoc);
        this.doc = curDoc;
        this.$title = $panel.querySelector("input");

        let self = this;
        this.doc.addEventListener("document-change", ev => { self.handleDocumentChange(ev) })
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
            document.dispatchEvent(new CustomEvent("x-toggle", { detail: { "scope": "prompt" } }))
        }
    }

    show() {
        super.show();
        if (!this.hidden()) {
            this.focus();
        }
    }

    focus() {
        this.$title.focus();
    }
}

class ScratchBrowserPrompt extends ScratchComponent {
    constructor($panel, curDoc, db) {
        super($panel, curDoc);
        this.db = db;
        this.$filter = this.$panel.querySelector("input.filter");
        this.$table = this.$panel.querySelector(".table");

        let self = this;
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

class StatusBar extends ScratchComponent {
    constructor($panel, curDoc, db) {
        super($panel, curDoc);
        this.db = db;
        this.$saveStatus = $panel.querySelector("i.save");

        let self = this;
        this.db.addEventListener("new-document", ev => { self.handleContentChange(ev) })
        this.db.addEventListener("save-document", ev => { self.handleSaveDocument(ev) })
    }

    handleTitleChange(ev) {
        this.handleContentChange(ev)
    }

    handleContentChange(ev) {
        this.$saveStatus.classList.add("alert");
    }

    handleSaveDocument(ev) {
        this.$saveStatus.classList.remove("alert");
    }
}