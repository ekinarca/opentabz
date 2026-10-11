// Applies the saved theme before the first paint to avoid a flash of the wrong theme.
// Kept as a tiny external file because the Content-Security-Policy forbids inline scripts.
(function () {
  var theme = 'system';
  try {
    var saved = JSON.parse(localStorage.getItem('opentabz.preferences.v1') || '{}');
    if (['system', 'light', 'dark', 'sepia', 'stage'].indexOf(saved.theme) >= 0) theme = saved.theme;
  } catch {
    // Storage unavailable: use the system theme.
  }
  if (theme === 'system')
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme);
})();
