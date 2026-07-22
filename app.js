// OneClick v3 — Bootstrapper Entry Point

// OneClick Dashboard & Dataset Workspace Interactive Logic

// Clean up any remaining AI/Copilot-related local/session storage keys
try {
  localStorage.removeItem('oneclick_copilot_position');
  localStorage.removeItem('aiHistory');
  localStorage.removeItem('chatHistory');
  localStorage.removeItem('copilotHistory');
  localStorage.removeItem('promptCache');
  localStorage.removeItem('conversationCache');
  localStorage.removeItem('assistantMemory');

  sessionStorage.removeItem('aiHistory');
  sessionStorage.removeItem('chatHistory');
  sessionStorage.removeItem('copilotHistory');
  sessionStorage.removeItem('promptCache');
  sessionStorage.removeItem('conversationCache');
  sessionStorage.removeItem('assistantMemory');
} catch (e) {
  console.warn("Storage cleanup failed:", e);
}

// ═══════════════════════════ THEME MANAGEMENT ═══════════════════════════
themeBtn = document.getElementById('theme-btn');
themeIcon = themeBtn ? themeBtn.querySelector('svg') : null;
isDarkMode = true;

themeBtn.addEventListener('click', () => {
  isDarkMode = !isDarkMode;
  if (!isDarkMode) {
    document.body.classList.add('light-theme');
    themeIcon.innerHTML = `
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    `;
  } else {
    document.body.classList.remove('light-theme');
    themeIcon.innerHTML = `
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    `;
  }

  // Sync settings theme choice to cloud if signed in
  if (typeof currentFirebaseUser !== 'undefined' && currentFirebaseUser) {
    const uid = currentFirebaseUser.uid || currentFirebaseUser.email;
    const settingsObj = {
      theme: isDarkMode ? 'dark-theme' : 'light-theme',
      username: localStorage.getItem('oneclick_username') || 'Nishant S.',
      autosaveDelay: localStorage.getItem('oneclick_autosave_delay') || '5000',
      exportFormat: localStorage.getItem('oneclick_export_format') || 'CSV',
      updatedAt: Date.now()
    };
    if (typeof saveSettingsToFirestore === 'function') {
      saveSettingsToFirestore(uid, settingsObj);
    }
  }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• NAVIGATION CONTROL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
window.setActive = function(element) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  
  const parentLi = element.closest('.nav-item');
  if (parentLi) {
    parentLi.classList.add('active');
  }

  // Handle section switching if needed
  const labelText = element.querySelector('.nav-label-text').innerText.trim();
  const breadcrumbItem = document.querySelector('.breadcrumb-item:not(.muted)');
  if (breadcrumbItem) {
    breadcrumbItem.innerText = labelText;
  }

  // Hide all main views
  document.getElementById('workspace-view-container').style.display = 'none';
  document.getElementById('dashboard-view-container').style.display = 'none';
  
  const projectsView = document.getElementById('projects-view-container');
  if (projectsView) projectsView.style.display = 'none';
  
  const datasetsView = document.getElementById('datasets-view-container');
  if (datasetsView) datasetsView.style.display = 'none';
  
  const reportsView = document.getElementById('reports-view-container');
  if (reportsView) reportsView.style.display = 'none';
  
  const settingsView = document.getElementById('settings-view-container');
  if (settingsView) settingsView.style.display = 'none';

  const historyView = document.getElementById('history-view-container');
  if (historyView) historyView.style.display = 'none';

  // Toggle active view
  if (labelText === 'Dashboard') {
    document.getElementById('dashboard-view-container').style.display = 'block';
    if (typeof loadAndRenderDashboard === 'function') {
      loadAndRenderDashboard();
    }
  } else if (labelText === 'Projects') {
    if (projectsView) projectsView.style.display = 'block';
    if (typeof loadAndRenderProjects === 'function') {
      loadAndRenderProjects();
    }
  } else if (labelText === 'Datasets') {
    if (datasetsView) datasetsView.style.display = 'block';
    if (typeof loadAndRenderDatasets === 'function') {
      loadAndRenderDatasets();
    }
  } else if (labelText === 'Reports') {
    if (reportsView) reportsView.style.display = 'block';
    if (typeof loadAndRenderReportsList === 'function') {
      loadAndRenderReportsList();
    }
  } else if (labelText === 'Settings') {
    if (settingsView) settingsView.style.display = 'block';
    if (typeof loadAndRenderSettings === 'function') {
      loadAndRenderSettings();
    }
  } else if (labelText === 'History') {
    if (historyView) {
      historyView.style.display = 'flex';
      if (typeof initHistoryView === 'function') initHistoryView();
    }
  }
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• LEFT SIDEBAR COLLAPSE LOGIC â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
sidebar = document.getElementById('sidebar');
sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
sidebarToggleIcon = sidebarCollapseBtn.querySelector('.sidebar-toggle-icon');

const setSidebarState = (isCollapsed) => {
  if (isCollapsed) {
    sidebar.classList.add('collapsed-sidebar');
    sidebarToggleIcon.innerHTML = `
      <polyline points="13 17 18 12 13 7"></polyline>
      <polyline points="6 17 11 12 6 7"></polyline>
    `;
  } else {
    sidebar.classList.remove('collapsed-sidebar');
    sidebarToggleIcon.innerHTML = `
      <polyline points="11 17 6 12 11 7"></polyline>
      <polyline points="18 17 13 12 18 7"></polyline>
    `;
  }
  // Force grid layout update
  if (window.renderGridTable) window.renderGridTable();
};

sidebarCollapseBtn.addEventListener('click', () => {
  const isCurrentlyCollapsed = sidebar.classList.contains('collapsed-sidebar');
  const targetCollapsed = !isCurrentlyCollapsed;
  setSidebarState(targetCollapsed);
  sessionStorage.setItem('sidebar-collapsed', targetCollapsed ? 'true' : 'false');
});

// Restore sidebar state on load
const savedSidebarState = sessionStorage.getItem('sidebar-collapsed');
if (savedSidebarState === 'true') {
  setSidebarState(true);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TIME RANGE & CHARTS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
window.setTimeRange = function(btn) {
  const timeBtns = document.querySelectorAll('.time-btn');
  timeBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const sparklines = document.querySelectorAll('.sparkline path');
  sparklines.forEach(path => {
    path.style.animation = 'none';
    path.offsetHeight;
    path.style.animation = 'drawLine 1.5s forwards';
  });
};

const barGroups = document.querySelectorAll('.bar-group');
const tooltip = document.getElementById('chart-tooltip');

barGroups.forEach(group => {
  group.addEventListener('mouseenter', (e) => {
    barGroups.forEach(bg => {
      bg.querySelector('.bar-label').classList.remove('active-label');
      bg.querySelector('.bar-primary').classList.remove('active-bar');
    });

    const label = group.querySelector('.bar-label');
    const barPrimary = group.querySelector('.bar-primary');
    label.classList.add('active-label');
    barPrimary.classList.add('active-bar');

    const month = label.innerText;
    let rev = '284k';
    let users = '48.3k';

    switch (month) {
      case 'Jan': rev = '120k'; users = '28.1k'; break;
      case 'Feb': rev = '165k'; users = '31.5k'; break;
      case 'Mar': rev = '145k'; users = '29.8k'; break;
      case 'Apr': rev = '210k'; users = '38.2k'; break;
      case 'May': rev = '195k'; users = '36.9k'; break;
      case 'Jun': rev = '284k'; users = '48.3k'; break;
      case 'Jul': rev = '245k'; users = '44.0k'; break;
      case 'Aug': rev = '260k'; users = '46.1k'; break;
      case 'Sep': rev = '220k'; users = '41.2k'; break;
      case 'Oct': rev = '275k'; users = '47.8k'; break;
      case 'Nov': rev = '262k'; users = '45.9k'; break;
      case 'Dec': rev = '290k'; users = '51.2k'; break;
    }

    tooltip.querySelector('.tooltip-date').innerText = month + ' 2026';
    tooltip.querySelector('.tooltip-row:nth-child(2) strong').innerText = '$' + rev;
    tooltip.querySelector('.tooltip-row:nth-child(3) strong').innerText = users;
    tooltip.classList.add('visible');
  });

  group.addEventListener('mouseleave', () => {
    const junGroup = Array.from(barGroups).find(bg => bg.querySelector('.bar-label').innerText === 'Jun');
    if (junGroup && group !== junGroup) {
      group.querySelector('.bar-label').classList.remove('active-label');
      group.querySelector('.bar-primary').classList.remove('active-bar');
      junGroup.querySelector('.bar-label').classList.add('active-label');
      junGroup.querySelector('.bar-primary').classList.add('active-bar');
    }
  });
});

window.setFilter = function(btn) {
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const chartArea = document.getElementById('chart-area');
  chartArea.style.opacity = '0.3';
  setTimeout(() => {
    chartArea.style.opacity = '1';
  }, 200);
};

window.toggleTask = function(checkbox) {
  const label = checkbox.closest('.task-item');
  label.style.opacity = checkbox.checked ? '0.5' : '1';
};

searchInput = document.getElementById('search-input');
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (document.getElementById('workspace-view-container').style.display === 'flex') {
      document.getElementById('ws-search-input').focus();
    } else {
      searchInput.focus();
    }
  }
});

const addNoteBtn = document.getElementById('add-note-btn');
const notesList = document.querySelector('.notes-list');
if (addNoteBtn) {
  addNoteBtn.addEventListener('click', () => {
    const noteTexts = [
      "Verify performance optimizations on API v3 pipelines.",
      "Refactor SVG charts to use dynamic sizing systems.",
      "Prep slide deck structure for SaaS stakeholder review.",
      "Investigate user growth anomaly within Conversion sub-indices."
    ];
    const colors = ['nc-purple', 'nc-green', 'nc-amber'];
    const randomText = noteTexts[Math.floor(Math.random() * noteTexts.length)];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    const newNote = document.createElement('div');
    newNote.className = 'note-item';
    newNote.style.opacity = '0';
    newNote.style.transform = 'translateY(10px)';
    newNote.style.transition = 'all 0.3s ease';
    newNote.innerHTML = `
      <div class="note-color ${randomColor}"></div>
      <div class="note-text">${randomText}</div>
    `;

    notesList.prepend(newNote);
    setTimeout(() => {
      newNote.style.opacity = '1';
      newNote.style.transform = 'translateY(0)';
    }, 50);

    if (notesList.children.length > 5) {
      notesList.lastElementChild.remove();
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  // Bind global DOM element references and initial configurations
  themeBtn = document.getElementById('theme-btn');
  themeIcon = themeBtn ? themeBtn.querySelector('svg') : null;
  sidebar = document.getElementById('sidebar');
  sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
  sidebarToggleIcon = sidebarCollapseBtn ? sidebarCollapseBtn.querySelector('.sidebar-toggle-icon') : null;
  searchInput = document.getElementById('search-input');
  loadingOverlay = document.getElementById('loading-overlay');
  loadingTitleText = document.getElementById('loading-title-text');
  loadingSubtitleText = document.getElementById('loading-subtitle-text');
  loadingProgressBar = document.getElementById('loading-progress-bar');
  loadingProgressPct = document.getElementById('loading-progress-pct');
  viewport = document.getElementById('spreadsheet-viewport');
  datasetInfoPanel = document.getElementById('ws-sidebar-dataset-info');
  columnStatsPanel = document.getElementById('ws-sidebar-column-stats');
  resetStatsBtn = document.getElementById('btn-reset-stats');
  columnMenu = document.getElementById('column-menu');
  filterTypeSelect = document.getElementById('ccm-filter-type');
  filterOpSelect = document.getElementById('ccm-filter-operator');
  filterValueInput = document.getElementById('ccm-filter-value');
  filterValue2Input = document.getElementById('ccm-filter-value2');
  filterApplyBtn = document.getElementById('ccm-filter-apply');
  filterClearBtn = document.getElementById('ccm-filter-clear');
  sortAscBtn = document.getElementById('ccm-sort-asc');
  sortDescBtn = document.getElementById('ccm-sort-desc');
  freezeBtn = document.getElementById('ccm-freeze-col');
  toolbarFilterBtn = document.getElementById('tb-filter');
  contextMenu = document.getElementById('grid-context-menu');
  sidebarResizer = document.getElementById('ws-sidebar-resizer');
  analyzeBtn = document.getElementById('ws-btn-analyze');
  qualityPanel = document.getElementById('ws-sidebar-data-quality');
  resetQualityBtn = document.getElementById('btn-reset-quality');
  qualityTabButtons = document.querySelectorAll('.quality-tab-btn');
  bannerCloseBtn = document.getElementById('banner-close-btn');
  btnSwitchSheet = document.getElementById('btn-switch-sheet');
  btnSwitchDash = document.getElementById('btn-switch-dash');
  wsBtnVisualize = document.getElementById('ws-btn-visualize');
  dashboardCanvasViewport = document.getElementById('dashboard-canvas-viewport');
  wsSidebarVisualization = document.getElementById('ws-sidebar-visualization');
  resetVizBtn = document.getElementById('btn-quick-reset');
  btnSaveWidgetSettings = document.getElementById('btn-save-widget-settings');
  vizWidgetTypeSelect = document.getElementById('viz-widget-type');
  btnAddWidgetTrigger = document.getElementById('btn-add-widget-trigger');
  btnClearGlobalVizFilters = document.getElementById('btn-clear-global-viz-filters');
  btnCalcValidate = document.getElementById('btn-calc-validate');
  btnCalcSave = document.getElementById('btn-calc-save');
  btnDrillSave = document.getElementById('btn-drill-save');
  btnDrillUp = document.getElementById('btn-drill-up');
  btnDrillReset = document.getElementById('btn-drill-reset');

  const autosaveDelaySelect = document.getElementById('settings-autosave-delay');
  if (autosaveDelaySelect) {
    const savedDelay = localStorage.getItem('oneclick_autosave_delay') || '5000';
    autosaveDelaySelect.value = savedDelay;
  }

  const exportFormatSelect = document.getElementById('settings-export-format');
  if (exportFormatSelect) {
    const savedFormat = localStorage.getItem('oneclick_export_format') || 'CSV';
    exportFormatSelect.value = savedFormat;
  }
  
  if (typeof initHistoryView === 'function') initHistoryView();
  if (typeof initFloatingCopilot === 'function') initFloatingCopilot();
});
