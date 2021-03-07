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
    },
    // renderer: markedRenderExtensions,
});

const fuqMarkedExts = {
    checkbox: function (checked) {
        let cls = checked ? "checked" : "";
        return `<i class="fas fa-check-square checkbox ${cls}"></i>`;
    }
};

marked.use({ renderer: fuqMarkedExts });