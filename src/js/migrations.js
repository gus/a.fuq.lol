function migrationRemoveLastSavedKey() {
    // slow migration, delete this key
    console.debug(`fuqdocs/migration: remove scratchmark.lastSaved`);
    localStorage.removeItem("scratchmark.lastSaved");
}

function migrationPortOldNamespaceDocs() {
    const oldNamespaceRE = /^scratchmark\./;
    const renameKeyFn = (oldKey) => {
        return oldKey.replace(oldNamespaceRE, FuqDB.Namespace + ".");
    };
    const migrateManifestFn = (manifestStr) => {
        const oldManifest = manifestStr ? JSON.parse(manifestStr) : [];
        return JSON.stringify(oldManifest.map(renameKeyFn));
    };

    // get the keys ahead of time because we're going to delete things
    const keys = [...Array(localStorage.length).keys()].map(idx => localStorage.key(idx));
    keys.forEach(key => {
        if (oldNamespaceRE.test(key)) {
            let docStr = localStorage.getItem(key);
            if (key === "scratchmark.manifest") {
                // need to rename the docs in the manifest, too
                docStr = migrateManifestFn(docStr);
                console.debug(`fuqdocs/migration: port ${key} to ${docStr}`);
            }
            const newKey = renameKeyFn(key);
            console.debug(`fuqdocs/migration: copy+rename ${key} to ${newKey}`);
            localStorage.setItem(newKey, docStr);
            console.debug(`fuqdocs/migration: delete ${key}`);
            localStorage.removeItem(key);
        }
    });
}

const Migrations = [
    migrationRemoveLastSavedKey,
    migrationPortOldNamespaceDocs,
];

function runMigrations(migrations) {
    console.debug("fuqdocs: migrations starting");
    migrations.forEach(m => m());
    console.debug("fuqdocs: migrations complete");
}
