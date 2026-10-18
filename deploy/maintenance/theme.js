try { document.documentElement.dataset.theme = localStorage.getItem('isDarkTheme') === 'false' ? 'light' : 'dark'; }
catch { document.documentElement.dataset.theme = 'dark'; }
