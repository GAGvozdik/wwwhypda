// Run before the first paint; the palette stays in menu.module.scss.
(() => {
    let dark = true;
    try {
        const saved = localStorage.getItem('isDarkTheme');
        dark = saved ? saved === 'true' : true;
    } catch { /* Storage can be unavailable; preserve the existing dark default. */ }
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
