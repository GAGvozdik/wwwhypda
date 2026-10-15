export function readThemePreference(): boolean {
    const early = document.documentElement.dataset.theme;
    if (early === 'dark' || early === 'light') return early === 'dark';
    try {
        const saved = localStorage.getItem('isDarkTheme');
        return saved ? saved === 'true' : true;
    } catch { return true; }
}

export function applyTheme(dark: boolean): void {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function saveThemePreference(dark: boolean): void {
    applyTheme(dark);
    try { localStorage.setItem('isDarkTheme', String(dark)); } catch { /* Keep this session usable. */ }
}
