function migrationSetDefaultTheme() {
    let savedTheme = localStorage.getItem(FuqDBThemeKey);
    if (!savedTheme) {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
        localStorage.setItem(FuqDBThemeKey, prefersDark ? "dark" : "light");
    }
}

const Migrations = [
    // 2021-03-12
    migrationSetDefaultTheme,

    // 2021-09-02
];

function runMigrations(migrations) {
    console.debug("fuqdocs: migrations starting");
    migrations.forEach(m => m());
    console.debug("fuqdocs: migrations complete");
}
