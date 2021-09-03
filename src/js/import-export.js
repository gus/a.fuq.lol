async function ExportDBToZipBlob(db) {
    let w = new zip.ZipWriter(new zip.BlobWriter("application/zip"));

    for (let i = 0; i < db.manifest.length; i++) {
        const doc = db.loadDocument(db.manifest[i]);
        await w.add(doc.id + ".json", new zip.TextReader(MarshalDocument(doc)));
        console.debug("fuqdocs: added doc to zip file: ", doc.title);
    }

    return w.close();
}