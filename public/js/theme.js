'use strict';

(function restorePreferences() {
  let theme = null;
  let sidebar = null;
  try {
    theme = localStorage.getItem('hrms-theme');
    sidebar = localStorage.getItem('hrms-sidebar');
  } catch {
    return;
  }
  if (theme === 'dark') document.documentElement.dataset.theme = 'dark';
  if (sidebar === 'collapsed') document.documentElement.classList.add('sidebar-collapsed');
})();
