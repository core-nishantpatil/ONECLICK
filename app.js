// OneClick Dashboard & Dataset Workspace Interactive Logic

// ═══════════════════════════ THEME MANAGEMENT ═══════════════════════════
const themeBtn = document.getElementById('theme-btn');
const themeIcon = themeBtn.querySelector('svg');
let isDarkMode = true;

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
});

// ═══════════════════════════ NAVIGATION CONTROL ═══════════════════════════
window.setActive = function(element) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));
  
  const parentLi = element.closest('.nav-item');
  if (parentLi) {
    parentLi.classList.add('active');
  }

  // Handle section switching if needed
  const labelText = element.querySelector('.nav-label-text').innerText;
  const breadcrumbItem = document.querySelector('.breadcrumb-item:not(.muted)');
  if (breadcrumbItem) {
    breadcrumbItem.innerText = labelText;
  }

  // If user clicks Dashboard nav link, return to dashboard view
  if (labelText === 'Dashboard') {
    document.getElementById('workspace-view-container').style.display = 'none';
    document.getElementById('dashboard-view-container').style.display = 'block';
  }
};

// ═══════════════════════════ LEFT SIDEBAR COLLAPSE LOGIC ═══════════════════════════
const sidebar = document.getElementById('sidebar');
const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn');
const sidebarToggleIcon = sidebarCollapseBtn.querySelector('.sidebar-toggle-icon');

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

// ═══════════════════════════ TIME RANGE & CHARTS ═══════════════════════════
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

const searchInput = document.getElementById('search-input');
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

function animateValue(obj, start, end, duration, formatFn) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = formatFn(Math.floor(progress * (end - start) + start));
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

document.addEventListener('DOMContentLoaded', () => {
  const revEl = document.querySelector('#card-revenue .metric-value');
  const usersEl = document.querySelector('#card-users .metric-value');
  if (revEl) animateValue(revEl, 280000, 284920, 1500, val => '$' + val.toLocaleString());
  if (usersEl) animateValue(usersEl, 47800, 48291, 1500, val => val.toLocaleString());
});


// ═══════════════════════════ UPLOAD FLOW & WORKSPACE ═══════════════════════════

const getStartedBtn = document.getElementById('btn-get-started');
const viewDemoBtn = document.getElementById('btn-view-demo');
const uploadModal = document.getElementById('upload-modal');
const modalClose = document.getElementById('modal-close');
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('dataset-file-input');
const browseBtn = document.getElementById('btn-browse-trigger');

const loadingOverlay = document.getElementById('loading-overlay');
const loadingTitleText = document.getElementById('loading-title-text');
const loadingSubtitleText = document.getElementById('loading-subtitle-text');
const loadingProgressBar = document.getElementById('loading-progress-bar');
const loadingProgressPct = document.getElementById('loading-progress-pct');

// Open Upload Modal
getStartedBtn.addEventListener('click', () => {
  uploadModal.classList.add('open');
});
if (viewDemoBtn) {
  viewDemoBtn.addEventListener('click', () => {
    uploadModal.classList.add('open');
  });
}

// Close Upload Modal
const closeModal = () => {
  uploadModal.classList.remove('open');
};
modalClose.addEventListener('click', closeModal);
uploadModal.addEventListener('click', (e) => {
  if (e.target === uploadModal) closeModal();
});

// Browse Files Trigger
browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  fileInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    processUploadedFile(e.target.files[0]);
  }
});

// Drag & Drop handlers
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    const file = e.dataTransfer.files[0];
    const extension = file.name.split('.').pop().toLowerCase();
    if (['csv', 'xls', 'xlsx'].includes(extension)) {
      processUploadedFile(file);
    } else {
      alert("Unsupported file format. Please upload CSV, XLS or XLSX.");
    }
  }
});

// File Processor
function processUploadedFile(file) {
  closeModal();
  showLoading("Reading File", `Preparing client-side parsing of ${file.name}...`, 20);

  const extension = file.name.split('.').pop().toLowerCase();
  
  setTimeout(() => {
    if (extension === 'csv') {
      showLoading("Parsing CSV", "Converting CSV rows to table structure...", 50);
      Papa.parse(file, {
        skipEmptyLines: 'greedy',
        complete: function(results) {
          showLoading("Rendering Grid", "Generating high-performance spreadsheet workspace...", 90);
          setTimeout(() => {
            loadParsedData(results.data, file.name, "CSV", file.size);
            hideLoading();
          }, 100);
        },
        error: function(err) {
          hideLoading();
          alert("Error parsing CSV file: " + err.message);
        }
      });
    } else {
      showLoading("Parsing Excel", "Reading Excel workbooks and cell formats...", 50);
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const parsed = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          
          showLoading("Rendering Grid", "Generating high-performance spreadsheet workspace...", 90);
          setTimeout(() => {
            loadParsedData(parsed, file.name, extension.toUpperCase(), file.size);
            hideLoading();
          }, 100);
        } catch (err) {
          hideLoading();
          alert("Error parsing Excel file: " + err.message);
        }
      };
      reader.onerror = function() {
        hideLoading();
        alert("Error reading file.");
      };
      reader.readAsArrayBuffer(file);
    }
  }, 100);
}

// ═══════════════════════════ SPREADSHEET ENGINE STATE ═══════════════════════════
let gridData = [];           // Full unmodified current 2D dataset values
let originalGridData = [];   // Initial pristine backup of gridData
let headers = [];            // Column keys A..Z..AA..
let headerNames = {};        // Mapping of key -> label
let originalHeaders = [];
let originalHeaderNames = {};
let columnWidths = {};       // Mapping of key -> pixel width
let isFrozenCol = false;
let activeSelection = null;  // {startRow, startCol, endRow, endCol} (zero-indexed of visual matching rows)
let isDragging = false;
let undoStack = [];
let redoStack = [];

// Column selection and highlight state
let selectedColumnKey = null;
// Hidden columns list
let hiddenColumns = new Set();

// Filter state structure: { colKey: { type: 'text'|'number'|'date', operator: string, val1: string, val2: string } }
let activeFilters = {};
// Sort state structure: { colKey: string, direction: 'asc'|'desc' }
let activeSort = null;
// Global search
let searchQuery = "";
// Filtered/Sorted active view index mapper
let viewIndices = [];

// Column Menus Active Selection Tracker
let activeMenuColKey = null;

// Constant settings
const ROW_HEIGHT = 32;

// Show/Hide Loading Overlay
function showLoading(title, subtitle, percent) {
  loadingOverlay.classList.add('open');
  loadingTitleText.innerText = title;
  loadingSubtitleText.innerText = subtitle;
  loadingProgressBar.style.width = percent + '%';
  loadingProgressPct.innerText = percent + '%';
}

function hideLoading() {
  loadingOverlay.classList.remove('open');
}

// Load dynamic dataset
function loadParsedData(parsedRows, filename, type, sizeBytes) {
  if (!parsedRows || parsedRows.length === 0) {
    alert("Empty file detected.");
    return;
  }

  // Determine headers
  let firstRow = parsedRows[0];
  let colsCount = firstRow.length;
  
  // Clean headers
  headers = [];
  headerNames = {};
  for (let c = 0; c < colsCount; c++) {
    const key = getColumnLetter(c);
    headers.push(key);
    headerNames[key] = String(firstRow[c] || `Column ${key}`).trim();
  }

  // Populate gridData
  gridData = [];
  for (let r = 1; r < parsedRows.length; r++) {
    // Fill row cells to match columns count
    let row = [...parsedRows[r]];
    while (row.length < colsCount) {
      row.push("");
    }
    gridData.push(row);
  }

  // Format file size
  let formattedSize = "142 KB";
  if (sizeBytes > 1024 * 1024) {
    formattedSize = (sizeBytes / (1024 * 1024)).toFixed(2) + " MB";
  } else if (sizeBytes > 1024) {
    formattedSize = (sizeBytes / 1024).toFixed(1) + " KB";
  } else if (sizeBytes > 0) {
    formattedSize = sizeBytes + " Bytes";
  }

  // Setup Workspace Headers
  document.getElementById('ws-dataset-name').innerText = filename;
  document.querySelector('.ws-file-type-badge').innerText = type;
  document.getElementById('ws-info-size').innerText = formattedSize;

  // Initialize engine state
  originalGridData = JSON.parse(JSON.stringify(gridData));
  originalHeaders = [...headers];
  originalHeaderNames = { ...headerNames };
  
  columnWidths = {};
  headers.forEach(h => {
    columnWidths[h] = 120;
  });

  hiddenColumns = new Set();
  resetStatsPanel();
  resetSortAndFilters();

  // Reset Preprocessing State on new load
  if (typeof preprocessingHistory !== 'undefined') {
    preprocessingHistory = [];
    preprocessingRedoHistory = [];
    cellsToFlash.clear();
    rowsToFlash.clear();
    activeQualityTab = 'overview';
    issueStates = {};
    if (typeof activeHighlights !== 'undefined' && activeHighlights) activeHighlights.clear();
    explorerFilters = { missing: 'pending', duplicates: 'pending', types: 'pending', outliers: 'pending' };
    duplicateCheckColumns = new Set();
    activeDuplicateRowsList = [];
    activeNavigatorCategory = null;
    activeNavigatorColKey = null;
    activeNavigatorIndex = -1;
    activeNavigatorCell = { r: -1, c: -1 };
    affectedRowsFilter = null;
    if (typeof activeRowHighlights !== 'undefined' && activeRowHighlights) activeRowHighlights.clear();
    highlightModes = {};
    const banner = document.getElementById('ws-filter-banner');
    if (banner) banner.style.display = 'none';

    if (typeof qualityPanel !== 'undefined' && qualityPanel) {
      qualityPanel.style.display = 'none';
    }

    const qualityTabButtons = document.querySelectorAll('.quality-tab-btn');
    qualityTabButtons.forEach(btn => {
      if (btn.dataset.tab === 'overview') btn.classList.add('active');
      else btn.classList.remove('active');
    });

    const tabContents = document.querySelectorAll('.quality-tab-content');
    tabContents.forEach(content => {
      if (content.id === 'qtab-overview') content.style.display = 'block';
      else content.style.display = 'none';
    });
  }
  
  // Transition views
  document.getElementById('dashboard-view-container').style.display = 'none';
  const workspaceView = document.getElementById('workspace-view-container');
  workspaceView.style.display = 'flex';
  
  initSpreadsheet();
}

// Generate letter mappings like Excel (A, B... Z, AA, AB...)
function getColumnLetter(index) {
  let temp = index;
  let letter = "";
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

// ═══════════════════════════ DEMO DATASETS GENERATION ═══════════════════════════
const demoButtons = document.querySelectorAll('.demo-btn');
demoButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const rows = parseInt(btn.dataset.rows);
    const cols = parseInt(btn.dataset.cols);
    const title = btn.querySelector('.demo-btn-title').innerText;
    
    closeModal();
    generateDemoDatasetChunked(rows, cols, title);
  });
});

function generateDemoDatasetChunked(rowsCount, colsCount, title) {
  gridData = [];
  headers = [];
  headerNames = {};
  
  // Setup headers
  for (let c = 0; c < colsCount; c++) {
    const key = getColumnLetter(c);
    headers.push(key);
    headerNames[key] = getDefaultHeaderName(c);
  }

  showLoading("Generating Demo", "Creating synthetic dataset structure...", 10);

  const chunkSize = 15000;
  let currentOffset = 0;

  const products = ["Apex Analytics", "Quantum Cloud", "Omni Core", "Infinity Suite", "Nexus Engine", "Nova Platform"];
  const categories = ["SaaS Enterprise", "Cloud Infrastructure", "Dev Tools", "Database", "Security"];
  const regions = ["US East", "US West", "Europe", "Asia-Pacific", "Latin America"];
  const statuses = ["Completed", "Pending", "Cancelled", "In Review"];
  const departments = ["Sales", "Engineering", "Marketing", "Support", "HR", "Finance"];
  const countries = ["USA", "India", "Germany", "UK", "Canada", "Japan", "Australia", "Brazil"];

  function processChunk() {
    const limit = Math.min(rowsCount, currentOffset + chunkSize);
    for (let r = currentOffset; r < limit; r++) {
      const row = [];
      for (let c = 0; c < colsCount; c++) {
        if (c === 0) {
          row.push(`OC-${100000 + r}`);
        } else if (c === 1) {
          const day = String((r % 28) + 1).padStart(2, '0');
          row.push(`2026-06-${day}`);
        } else if (c === 2) {
          row.push(products[r % products.length]);
        } else if (c === 3) {
          row.push(categories[r % categories.length]);
        } else if (c === 4) {
          row.push(((r * 12.5 + 45.2) % 450 + 10).toFixed(2)); // Price / Revenue
        } else if (c === 5) {
          row.push((r % 120) + 1); // Units
        } else if (c === 6) {
          row.push(regions[r % regions.length]);
        } else if (c === 7) {
          row.push(statuses[r % statuses.length]);
        } else if (c === 8) {
          row.push(departments[r % departments.length]);
        } else if (c === 9) {
          row.push(countries[r % countries.length]);
        } else {
          // Fill rest with generic high-volume columns
          if (c % 4 === 0) {
            row.push(`DataPoint-${r % 25}`);
          } else if (c % 4 === 1) {
            row.push((r % 2500)); // numeric
          } else if (c % 4 === 2) {
            row.push(`Tag_${(r % 5) + 1}`);
          } else {
            row.push(((r * 1.7) % 100).toFixed(1)); // decimal metrics
          }
        }
      }
      gridData.push(row);
    }

    currentOffset = limit;
    const percent = Math.round((currentOffset / rowsCount) * 100);
    showLoading("Generating Demo", `Generated ${currentOffset.toLocaleString()} of ${rowsCount.toLocaleString()} rows...`, Math.max(10, percent));

    if (currentOffset < rowsCount) {
      setTimeout(processChunk, 5);
    } else {
      // Done generating
      const sizeBytes = rowsCount * colsCount * 25; // estimated bytes
      loadParsedData([headers.map(h => headerNames[h]), ...gridData], title + ".xlsx", "XLSX", sizeBytes);
      hideLoading();
    }
  }

  setTimeout(processChunk, 50);
}

function getDefaultHeaderName(c) {
  const defaults = ["Order ID", "Order Date", "Product", "Category", "Revenue ($)", "Units Sold", "Region", "Status", "Department", "Country"];
  if (c < defaults.length) return defaults[c];
  return `Feature_${c + 1}`;
}


// ═══════════════════════════ SPREADSHEET LAYOUT INTERACTION ═══════════════════════════

// Exit Workspace and return to dashboard
document.getElementById('ws-btn-exit').addEventListener('click', () => {
  document.getElementById('workspace-view-container').style.display = 'none';
  document.getElementById('dashboard-view-container').style.display = 'block';
});

// Collapsible Right Sidebar logic
const sidebarEl = document.getElementById('ws-sidebar');
const sidebarToggleBtn = document.getElementById('ws-sidebar-toggle');
sidebarToggleBtn.addEventListener('click', () => {
  sidebarEl.classList.toggle('collapsed');
  if (typeof currentView !== 'undefined' && currentView === 'dashboard' && typeof renderDashboardCanvas === 'function') {
    setTimeout(renderDashboardCanvas, 220); // 220ms ensures the CSS sidebar transition has completed
  }
});

// Save active grid state to undo stack
function pushToUndo() {
  undoStack.push(JSON.stringify({
    gridData: gridData,
    headers: [...headers],
    headerNames: { ...headerNames },
    columnWidths: { ...columnWidths }
  }));
  redoStack = []; // Clear redo stack on new action
  updateUndoRedoStates();
}

function updateUndoRedoStates() {
  document.getElementById('ws-btn-undo').style.opacity = undoStack.length > 0 ? '1' : '0.4';
  document.getElementById('ws-btn-redo').style.opacity = redoStack.length > 0 ? '1' : '0.4';
}

// Undo action
document.getElementById('ws-btn-undo').addEventListener('click', () => {
  if (undoStack.length > 0) {
    const currentState = JSON.stringify({
      gridData: gridData,
      headers: [...headers],
      headerNames: { ...headerNames },
      columnWidths: { ...columnWidths }
    });
    redoStack.push(currentState);
    
    const prevState = JSON.parse(undoStack.pop());
    gridData = prevState.gridData;
    headers = prevState.headers;
    headerNames = prevState.headerNames;
    columnWidths = prevState.columnWidths;
    
    applySearchSortAndFilters();
    updateUndoRedoStates();
  }
});

// Redo action
document.getElementById('ws-btn-redo').addEventListener('click', () => {
  if (redoStack.length > 0) {
    const currentState = JSON.stringify({
      gridData: gridData,
      headers: [...headers],
      headerNames: { ...headerNames },
      columnWidths: { ...columnWidths }
    });
    undoStack.push(currentState);
    
    const nextState = JSON.parse(redoStack.pop());
    gridData = nextState.gridData;
    headers = nextState.headers;
    headerNames = nextState.headerNames;
    columnWidths = nextState.columnWidths;
    
    applySearchSortAndFilters();
    updateUndoRedoStates();
  }
});

// ═══════════════════════════ SPREADSHEET VIRTUALIZATION ENGINE ═══════════════════════════

const viewport = document.getElementById('spreadsheet-viewport');

// Initialize Spreadsheet UI
function initSpreadsheet() {
  activeSelection = null;
  isDragging = false;
  updateUndoRedoStates();
  renderGridTable();
  setupViewportScroll();
  if (typeof runQualityScan !== 'undefined') {
    runQualityScan();
  }
}

// Setup Scroll synchronization
let ticking = false;
function setupViewportScroll() {
  viewport.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        renderGridTable(true);
        ticking = false;
      });
      ticking = true;
    }
  });
}

// Detect column types programmatically
function detectColumnType(colKey) {
  const name = (headerNames[colKey] || "").toLowerCase();
  
  if (name.includes('$') || name.includes('revenue') || name.includes('profit') || name.includes('sales') || name.includes('price') || name.includes('cost') || name.includes('spend') || name.includes('margin')) {
    return 'currency';
  }
  if (name.includes('date') || name.includes('time') || name.includes('timestamp') || name.includes('updated') || name.includes('created')) {
    return 'date';
  }
  if (name.includes('%') || name.includes('rate') || name.includes('ratio') || name.includes('percent')) {
    return 'percentage';
  }

  // scan values to see if numeric
  const colIdx = headers.indexOf(colKey);
  let numericCount = 0;
  let validCount = 0;
  for (let r = 0; r < Math.min(gridData.length, 100); r++) {
    const val = String(gridData[r][colIdx]).trim();
    if (val !== "") {
      validCount++;
      if (!isNaN(parseFloat(val))) {
        numericCount++;
      }
    }
  }
  if (validCount > 0 && (numericCount / validCount) > 0.8) {
    return 'number';
  }
  return 'text';
}

function getColTypeEmoji(type) {
  switch (type) {
    case 'text': return '🔤';
    case 'number': return '🔢';
    case 'currency': return '💰';
    case 'date': return '📅';
    case 'percentage': return '📊';
    default: return '🔤';
  }
}

// Render Table Structure with spacer virtualization rows
function renderGridTable(isScrollOnly = false) {
  const totalRows = viewIndices.length;
  const colsCount = headers.length;
  
  // Calculate visible rows
  const viewportHeight = viewport.clientHeight || 500;
  const scrollTop = viewport.scrollTop;
  
  let startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 10);
  let endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + 15);
  
  const topSpacerHeight = startRow * ROW_HEIGHT;
  const bottomSpacerHeight = (totalRows - endRow) * ROW_HEIGHT;

  if (isScrollOnly) {
    // If it's a fast scroll, just update the table rows and spacers to avoid reflow overhead
    const table = viewport.querySelector('.spreadsheet-table');
    if (table) {
      const rows = table.querySelectorAll('tr');
      // Remove old spacers and rows
      rows.forEach(r => r.remove());
      
      // Re-append components to the table
      appendHeaderRow(table);
      appendSpacerRow(table, topSpacerHeight, colsCount);
      appendDataRows(table, startRow, endRow);
      appendSpacerRow(table, bottomSpacerHeight, colsCount);
      return;
    }
  }

  // Full re-render of table structure
  viewport.innerHTML = "";
  const table = document.createElement('table');
  table.className = 'spreadsheet-table';
  
  // Set explicit table width based on columnWidths (skip hidden)
  let tableWidth = 48; // row-hdr width
  headers.forEach(h => {
    if (!hiddenColumns.has(h)) {
      tableWidth += (columnWidths[h] || 110);
    }
  });
  table.style.width = tableWidth + 'px';

  appendHeaderRow(table);
  appendSpacerRow(table, topSpacerHeight, colsCount);
  appendDataRows(table, startRow, endRow);
  appendSpacerRow(table, bottomSpacerHeight, colsCount);

  viewport.appendChild(table);
  setupGridGlobalMouseEvents();
  updateMetadata();
}

// Append Header row (column headers letters & names)
function appendHeaderRow(table) {
  const headerTr = document.createElement('tr');
  
  // Corner cell
  const cornerTh = document.createElement('th');
  cornerTh.className = 'corner-hdr';
  cornerTh.innerText = ' ';
  headerTr.appendChild(cornerTh);

  headers.forEach((hdr, colIndex) => {
    if (hiddenColumns.has(hdr)) return; // Skip hidden column

    const th = document.createElement('th');
    th.className = 'col-hdr';
    th.title = headerNames[hdr] || `Column ${hdr}`; // Tooltip on hover
    
    // Column highlighting state
    if (selectedColumnKey === hdr) {
      th.classList.add('highlighted');
    }

    if (isFrozenCol && colIndex === 0) {
      th.classList.add('frozen-col', 'frozen-col-border');
    }
    
    // Set widths
    const colWidth = columnWidths[hdr] || 110;
    th.style.width = colWidth + 'px';
    th.style.minWidth = colWidth + 'px';
    th.style.maxWidth = colWidth + 'px';
    
    // Column header container
    const hDiv = document.createElement('div');
    hDiv.className = 'col-hdr-content';
    
    // Clean column name span without type indicators or letter tags
    const nameSpan = document.createElement('span');
    nameSpan.className = 'col-name';
    nameSpan.innerText = headerNames[hdr] || `Col ${hdr}`;
    nameSpan.contentEditable = true;
    nameSpan.title = headerNames[hdr] || `Col ${hdr}`;
    
    // Rename Column on blur
    nameSpan.addEventListener('blur', (e) => {
      const newName = e.target.innerText.trim();
      if (newName !== headerNames[hdr]) {
        pushToUndo();
        headerNames[hdr] = newName;
        updateMetadata();
        // Update stats panel title too if selected
        if (selectedColumnKey === hdr) {
          updateColumnStats(hdr);
        }
      }
    });
    // Prevent enter key bubbling or new lines
    nameSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameSpan.blur();
      }
    });
    hDiv.appendChild(nameSpan);

    // Filter indicator badge
    if (activeFilters[hdr]) {
      const activeDot = document.createElement('span');
      activeDot.className = 'sort-indicator';
      activeDot.innerHTML = '⚡';
      activeDot.title = 'Filter active on this column';
      hDiv.appendChild(activeDot);
    }
    
    // Sort indicator badge
    if (activeSort && activeSort.colKey === hdr) {
      const sortDot = document.createElement('span');
      sortDot.className = 'sort-indicator';
      sortDot.innerHTML = activeSort.direction === 'asc' ? '▲' : '▼';
      hDiv.appendChild(sortDot);
    }

    th.appendChild(hDiv);

    // Dropdown column menu trigger button (vertical ellipsis ⋮)
    const menuBtn = document.createElement('div');
    menuBtn.className = 'col-hdr-menu-btn';
    menuBtn.innerHTML = '⋮';
    menuBtn.title = 'Column Menu';
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleColumnMenu(e, hdr);
    });
    th.appendChild(menuBtn);

    // Resize handler handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'col-resize-handle';
    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      initColResize(e, th, hdr);
    });
    // Double click to auto-fit width
    resizeHandle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      autoFitColumnWidth(hdr);
    });
    th.appendChild(resizeHandle);

    // Header click highlights the column & statistics panel (unless clicking menu button/input/resizer)
    th.addEventListener('click', (e) => {
      if (e.target.classList.contains('col-hdr-menu-btn') || e.target.classList.contains('col-resize-handle') || e.target.classList.contains('col-name')) {
        return;
      }
      selectedColumnKey = hdr;
      updateColumnStats(hdr);
      
      // Select all rows in this column visually
      activeSelection = { startRow: 0, startCol: headers.indexOf(hdr), endRow: viewIndices.length - 1, endCol: headers.indexOf(hdr) };
      renderGridTable();
    });

    headerTr.appendChild(th);
  });
  table.appendChild(headerTr);
}

// Append Virtualizing Spacer Row
function appendSpacerRow(table, height, colSpan) {
  if (height <= 0) return;
  const tr = document.createElement('tr');
  tr.className = 'v-spacer-row';
  tr.style.height = height + 'px';
  
  const td = document.createElement('td');
  td.className = 'v-spacer-cell';
  td.colSpan = colSpan + 1; // cover corner column too
  tr.appendChild(td);
  
  table.appendChild(tr);
}

// Append data rows slice
function appendDataRows(table, startRow, endRow) {
  const colsCount = headers.length;
  
  for (let r = startRow; r < endRow; r++) {
    const origRowIdx = viewIndices[r];
    const row = gridData[origRowIdx];
    
    const tr = document.createElement('tr');
    tr.style.height = ROW_HEIGHT + 'px';
    if (typeof activeRowHighlights !== 'undefined' && activeRowHighlights.has(origRowIdx)) {
      tr.classList.add('row-highlighted');
    }
    
    // Row header cell
    const rowHdrTd = document.createElement('td');
    rowHdrTd.className = 'row-hdr';
    rowHdrTd.innerText = origRowIdx + 1;
    tr.appendChild(rowHdrTd);

    for (let c = 0; c < colsCount; c++) {
      const hdr = headers[c];
      if (hiddenColumns.has(hdr)) continue; // Skip hidden column

      const cellVal = row[c] !== undefined ? row[c] : "";
      
      const td = document.createElement('td');
      td.className = 'grid-cell';
      td.dataset.row = r; // Map visual filtered row index
      td.dataset.col = c; // Map column index
      td.innerText = cellVal;

      if (typeof cellsToFlash !== 'undefined' && cellsToFlash.has(`${origRowIdx}_${c}`)) {
        td.classList.add('cell-highlight-flash');
      }
      if (typeof rowsToFlash !== 'undefined' && rowsToFlash.has(origRowIdx)) {
        td.classList.add('row-highlight-flash');
      }
      if (typeof activeHighlights !== 'undefined' && activeHighlights.has(`${origRowIdx}_${c}`)) {
        const hlType = activeHighlights.get(`${origRowIdx}_${c}`);
        if (hlType === 'outlier') {
          td.classList.add('cell-outlier-highlight');
        } else if (hlType === 'type') {
          td.classList.add('cell-type-highlight');
        } else if (hlType === 'missing') {
          td.classList.add('cell-missing-highlight');
        } else if (hlType === 'duplicate') {
          td.classList.add('cell-duplicate-highlight');
        }
      }

      if (typeof activeNavigatorCell !== 'undefined' && activeNavigatorCell && activeNavigatorCell.r === origRowIdx && activeNavigatorCell.c === c) {
        td.classList.add('cell-active-issue-highlight');
      }

      if (isFrozenCol && c === 0) {
        td.classList.add('frozen-col', 'frozen-col-border');
      }

      // Check search match
      if (searchQuery !== "" && String(cellVal).toLowerCase().includes(searchQuery)) {
        td.classList.add('search-match');
      }

      // Highlight cell if column is selected
      if (selectedColumnKey === hdr) {
        td.classList.add('col-highlighted');
      }

      // Selection outlines rendering
      if (activeSelection) {
        const minR = Math.min(activeSelection.startRow, activeSelection.endRow);
        const maxR = Math.max(activeSelection.startRow, activeSelection.endRow);
        const minC = Math.min(activeSelection.startCol, activeSelection.endCol);
        const maxC = Math.max(activeSelection.startCol, activeSelection.endCol);
        
        if (r >= minR && r <= maxR && c >= minC && c <= maxC) {
          if (r === activeSelection.startRow && c === activeSelection.startCol) {
            td.classList.add('selected');
          } else {
            td.classList.add('multi-selected');
          }
        }
      }

      // Interaction listeners
      td.addEventListener('mousedown', (e) => handleCellMouseDown(e, r, c));
      td.addEventListener('mouseenter', () => handleCellMouseEnter(r, c));
      td.addEventListener('dblclick', () => makeCellEditable(td, r, c));

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

// Column resize execution
function initColResize(e, th, colKey) {
  const startX = e.clientX;
  const startWidth = th.offsetWidth;
  
  const mouseMoveHandler = (moveEvent) => {
    const newWidth = Math.max(startWidth + (moveEvent.clientX - startX), 50);
    columnWidths[colKey] = newWidth;
    
    // Instant DOM sizing response without full render
    th.style.width = newWidth + 'px';
    th.style.minWidth = newWidth + 'px';
    th.style.maxWidth = newWidth + 'px';
    
    // Resize corresponding cells in viewport table
    const colIndex = headers.indexOf(colKey);
    const table = viewport.querySelector('.spreadsheet-table');
    if (table) {
      // Recalculate table total width
      let tableWidth = 48;
      headers.forEach(h => {
        if (!hiddenColumns.has(h)) tableWidth += columnWidths[h];
      });
      table.style.width = tableWidth + 'px';
    }
  };
  
  const mouseUpHandler = () => {
    document.removeEventListener('mousemove', mouseMoveHandler);
    document.removeEventListener('mouseup', mouseUpHandler);
    renderGridTable(); // finalize and redraw correctly
  };
  
  document.addEventListener('mousemove', mouseMoveHandler);
  document.addEventListener('mouseup', mouseUpHandler);
}

// Global release listener for dragging selection
function setupGridGlobalMouseEvents() {
  const handler = () => {
    if (isDragging) {
      isDragging = false;
      document.removeEventListener('mouseup', handler);
    }
  };
  document.addEventListener('mouseup', handler);
}

// Drag & Multi cell selection handlers
function handleCellMouseDown(e, r, c) {
  const colKey = headers[c];
  selectedColumnKey = colKey;

  if (e.button === 2) {
    // Context Menu trigger
    if (!activeSelection || r < Math.min(activeSelection.startRow, activeSelection.endRow) || r > Math.max(activeSelection.startRow, activeSelection.endRow) || c < Math.min(activeSelection.startCol, activeSelection.endCol) || c > Math.max(activeSelection.startCol, activeSelection.endCol)) {
      activeSelection = { startRow: r, startCol: c, endRow: r, endCol: c };
    }
    showContextMenu(e);
  } else {
    isDragging = true;
    activeSelection = { startRow: r, startCol: c, endRow: r, endCol: c };
    updateStatusBarCoords(r, c);
  }

  updateCellSelectionHighlights();
  updateColumnStats(colKey);
}

// Cell selection highlighting logic
function handleCellMouseEnter(r, c) {
  if (!isDragging) return;
  activeSelection.endRow = r;
  activeSelection.endCol = c;
  updateCellSelectionHighlights();
}

function updateCellSelectionHighlights() {
  if (!activeSelection) return;

  const minR = Math.min(activeSelection.startRow, activeSelection.endRow);
  const maxR = Math.max(activeSelection.startRow, activeSelection.endRow);
  const minC = Math.min(activeSelection.startCol, activeSelection.endCol);
  const maxC = Math.max(activeSelection.startCol, activeSelection.endCol);

  const cells = viewport.querySelectorAll('.grid-cell');
  let selectedCount = 0;
  
  cells.forEach(cell => {
    const cr = parseInt(cell.dataset.row);
    const cc = parseInt(cell.dataset.col);

    cell.classList.remove('selected', 'multi-selected');

    if (cr >= minR && cr <= maxR && cc >= minC && cc <= maxC) {
      selectedCount++;
      if (cr === activeSelection.startRow && cc === activeSelection.startCol) {
        cell.classList.add('selected');
      } else {
        cell.classList.add('multi-selected');
      }
    }
  });

  // Update selection status summary
  const summaryEl = document.getElementById('sb-selection-summary');
  if (selectedCount > 1) {
    const startOrigIdx = viewIndices[minR];
    const endOrigIdx = viewIndices[maxR];
    const startCellLetter = headers[minC] + (startOrigIdx + 1);
    const endCellLetter = headers[maxC] + (endOrigIdx + 1);
    summaryEl.innerText = `Selected: ${selectedCount} cells (${startCellLetter}:${endCellLetter})`;
  } else {
    const cellLetter = headers[activeSelection.startCol] + (viewIndices[activeSelection.startRow] + 1);
    summaryEl.innerText = `Selected: ${cellLetter}`;
  }
}

function updateStatusBarCoords(r, c) {
  const origIdx = viewIndices[r];
  document.getElementById('sb-coords').innerText = `Row: ${origIdx + 1} | Col: ${headers[c]}`;
}

// Cell Editor input
function makeCellEditable(td, r, c) {
  if (td.classList.contains('editing')) return;
  
  td.classList.add('editing');
  const origRowIndex = viewIndices[r];
  const originalVal = gridData[origRowIndex][c];

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cell-editor';
  input.value = originalVal;
  
  td.innerHTML = "";
  td.appendChild(input);
  input.focus();
  input.select();

  const saveEdit = () => {
    const newVal = input.value;
    if (newVal !== originalVal) {
      pushToUndo();
      gridData[origRowIndex][c] = newVal;
      updateMetadata();
      // recalculate stats if selected
      if (selectedColumnKey === headers[c]) {
        updateColumnStats(selectedColumnKey);
      }
    }
    td.classList.remove('editing');
    td.innerText = newVal;
    // Highlight if search query matches new value
    if (searchQuery !== "" && newVal.toLowerCase().includes(searchQuery)) {
      td.classList.add('search-match');
    }
  };

  input.addEventListener('blur', saveEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') {
      td.classList.remove('editing');
      td.innerText = originalVal;
      if (searchQuery !== "" && String(originalVal).toLowerCase().includes(searchQuery)) {
        td.classList.add('search-match');
      }
    }
  });
}

// ═══════════════════════════ DATA LAYOUT PROCESSORS (SEARCH/SORT/FILTER) ═══════════════════════════

// Reset sort and filters back to base state
function resetSortAndFilters() {
  activeFilters = {};
  activeSort = null;
  searchQuery = "";
  hiddenColumns = new Set();
  document.getElementById('ws-search-input').value = "";
  
  // Re-sync filtered dropdown selects
  resetColumnMenuInputs();
  
  viewIndices = gridData.map((_, i) => i);
}

// Global Filter/Sort/Search recalculation trigger
function applySearchSortAndFilters() {
  let matchedIndices = [];

  for (let r = 0; r < gridData.length; r++) {
    const row = gridData[r];
    let isMatch = true;

    // Check search query across all cells in this row
    if (searchQuery !== "") {
      let containsQuery = false;
      for (let c = 0; c < row.length; c++) {
        if (hiddenColumns.has(headers[c])) continue; // Ignore hidden cols in global search
        if (String(row[c]).toLowerCase().includes(searchQuery)) {
          containsQuery = true;
          break;
        }
      }
      if (!containsQuery) isMatch = false;
    }

    // Check column-specific filters
    if (isMatch) {
      for (const colKey in activeFilters) {
        const colIndex = headers.indexOf(colKey);
        if (colIndex === -1) continue;

        const cellValue = String(row[colIndex]).trim();
        const rule = activeFilters[colKey];
        
        if (!evaluateFilterRule(cellValue, rule)) {
          isMatch = false;
          break;
        }
      }
    }

    if (isMatch) {
      matchedIndices.push(r);
    }
  }

  if (typeof affectedRowsFilter !== 'undefined' && affectedRowsFilter) {
    matchedIndices = matchedIndices.filter(r => affectedRowsFilter.has(r));
  }

  // Sort matching rows
  if (activeSort) {
    const colIndex = headers.indexOf(activeSort.colKey);
    if (colIndex !== -1) {
      const dir = activeSort.direction === 'asc' ? 1 : -1;
      
      matchedIndices.sort((idxA, idxB) => {
        let valA = gridData[idxA][colIndex];
        let valB = gridData[idxB][colIndex];
        
        // Handle empty values (push to the bottom regardless of sort order)
        if (valA === undefined || valA === null || String(valA).trim() === "") return 1;
        if (valB === undefined || valB === null || String(valB).trim() === "") return -1;

        // Try numeric sorting
        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return (numA - numB) * dir;
        }

        // Try Date sorting
        const dateA = Date.parse(valA);
        const dateB = Date.parse(valB);
        if (!isNaN(dateA) && !isNaN(dateB)) {
          return (dateA - dateB) * dir;
        }

        // String Sorting
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return -1 * dir;
        if (strA > strB) return 1 * dir;
        return 0;
      });
    }
  }

  viewIndices = matchedIndices;
  
  // Update selected statistics panel if applicable
  if (selectedColumnKey) {
    updateColumnStats(selectedColumnKey);
  }

  // Re-render spreadsheet at current scroll or top
  renderGridTable();

  // Refresh dashboard widgets in real time if visualization view is active
  if (typeof currentView !== 'undefined' && currentView === 'dashboard' && typeof renderDashboardCanvas === 'function') {
    renderDashboardCanvas();
  }
}

// Evaluate single cell value against dynamic filter rules
function evaluateFilterRule(val, rule) {
  if (rule.operator === "clear") return true;

  if (rule.type === "text") {
    const cellStr = val.toLowerCase();
    const filterStr = rule.val1.toLowerCase();
    
    switch (rule.operator) {
      case "contains":
        return cellStr.includes(filterStr);
      case "not_contains":
        return !cellStr.includes(filterStr);
      case "starts_with":
        return cellStr.startsWith(filterStr);
      case "ends_with":
        return cellStr.endsWith(filterStr);
      case "equals":
        return cellStr === filterStr;
      default:
        return true;
    }
  }

  if (rule.type === "number") {
    const cellNum = parseFloat(val);
    const filterNum1 = parseFloat(rule.val1);
    const filterNum2 = parseFloat(rule.val2);

    if (isNaN(cellNum) || isNaN(filterNum1)) return false;

    switch (rule.operator) {
      case "equals":
        return cellNum === filterNum1;
      case "greater_than":
        return cellNum > filterNum1;
      case "less_than":
        return cellNum < filterNum1;
      case "between":
        if (isNaN(filterNum2)) return cellNum >= filterNum1;
        return cellNum >= filterNum1 && cellNum <= filterNum2;
      default:
        return true;
    }
  }

  if (rule.type === "date") {
    const cellDate = Date.parse(val);
    const filterDate1 = Date.parse(rule.val1);
    const filterDate2 = Date.parse(rule.val2);

    if (isNaN(cellDate) || isNaN(filterDate1)) return false;

    switch (rule.operator) {
      case "before":
        return cellDate < filterDate1;
      case "after":
        return cellDate > filterDate1;
      case "between":
        if (isNaN(filterDate2)) return cellDate >= filterDate1;
        return cellDate >= filterDate1 && cellDate <= filterDate2;
      default:
        return true;
    }
  }

  return true;
}

// Global metadata numbers count updates
function updateMetadata() {
  const rowsCount = gridData.length;
  const colsCount = headers.length;
  const filteredCount = viewIndices.length;

  document.getElementById('ws-meta-rows').innerText = `${filteredCount.toLocaleString()} of ${rowsCount.toLocaleString()} Rows`;
  document.getElementById('ws-meta-cols').innerText = `${colsCount} Columns`;

  document.getElementById('ws-info-rows').innerText = rowsCount.toLocaleString();
  document.getElementById('ws-info-cols').innerText = colsCount.toLocaleString();

  // Missing values detection
  let missing = 0;
  gridData.forEach(row => {
    row.forEach(cell => {
      if (cell === undefined || cell === null || String(cell).trim() === "") missing++;
    });
  });
  const totalCells = rowsCount * colsCount;
  const missingPct = totalCells > 0 ? ((missing / totalCells) * 100).toFixed(1) : 0;
  document.getElementById('ws-info-missing').innerText = `${missing.toLocaleString()} (${missingPct}%)`;

  // Duplicate rows detection
  let duplicates = 0;
  const seenRows = new Set();
  gridData.forEach(row => {
    const str = JSON.stringify(row);
    if (seenRows.has(str)) {
      duplicates++;
    } else {
      seenRows.add(str);
    }
  });
  document.getElementById('ws-info-dups').innerText = duplicates.toLocaleString();
}

// ═══════════════════════════ COLUMN STATISTICS CALCULATOR ═══════════════════════════

const datasetInfoPanel = document.getElementById('ws-sidebar-dataset-info');
const columnStatsPanel = document.getElementById('ws-sidebar-column-stats');
const resetStatsBtn = document.getElementById('btn-reset-stats');

function updateColumnStats(colKey) {
  const colIndex = headers.indexOf(colKey);
  if (colIndex === -1) return;

  datasetInfoPanel.style.display = 'none';
  if (qualityPanel) qualityPanel.style.display = 'none';
  columnStatsPanel.style.display = 'flex';
  
  // Expand right sidebar automatically if collapsed
  sidebarEl.classList.remove('collapsed');

  const name = headerNames[colKey] || `Column ${colKey}`;
  document.getElementById('ws-stats-title').innerText = `Column Insights: ${name}`;

  const type = detectColumnType(colKey);
  const typeLabels = {
    text: "Text 🔤",
    number: "Number 🔢",
    currency: "Currency 💰",
    date: "Date 📅",
    percentage: "Percentage 📊"
  };
  document.getElementById('ws-stats-type').innerText = typeLabels[type] || "Text 🔤";

  // Counts calculations
  const totalCount = viewIndices.length;
  document.getElementById('ws-stats-count').innerText = totalCount.toLocaleString();

  const values = viewIndices.map(r => gridData[r][colIndex]);
  let missingCount = 0;
  const uniqueSet = new Set();
  const cleanValues = [];

  values.forEach(v => {
    if (v === undefined || v === null || String(v).trim() === "") {
      missingCount++;
    } else {
      const strVal = String(v).trim();
      uniqueSet.add(strVal);
      cleanValues.push(strVal);
    }
  });

  document.getElementById('ws-stats-unique').innerText = uniqueSet.size.toLocaleString();
  const missingPct = totalCount > 0 ? ((missingCount / totalCount) * 100).toFixed(1) : 0;
  document.getElementById('ws-stats-missing').innerText = `${missingCount.toLocaleString()} (${missingPct}%)`;

  // Get dynamic list element and clear old dynamic cards
  const listEl = columnStatsPanel.querySelector('.ws-info-list');
  while (listEl.children.length > 4) {
    listEl.removeChild(listEl.lastChild);
  }

  const addStatCard = (label, val) => {
    const card = document.createElement('div');
    card.className = 'ws-info-card';
    card.innerHTML = `
      <span class="ws-info-label">${label}</span>
      <span class="ws-info-value">${val}</span>
    `;
    listEl.appendChild(card);
  };

  if (cleanValues.length === 0) {
    return;
  }

  if (type === 'number' || type === 'currency' || type === 'percentage') {
    const nums = cleanValues.map(v => parseFloat(String(v).replace(/[$,%]/g, ""))).filter(n => !isNaN(n));
    if (nums.length === 0) return;

    nums.sort((a, b) => a - b);
    const min = nums[0];
    const max = nums[nums.length - 1];
    const sum = nums.reduce((s, n) => s + n, 0);
    const avg = sum / nums.length;

    // Median
    const midIdx = Math.floor(nums.length / 2);
    const median = nums.length % 2 !== 0 ? nums[midIdx] : (nums[midIdx - 1] + nums[midIdx]) / 2;

    // Standard Deviation
    const sqDiffSum = nums.reduce((s, n) => s + Math.pow(n - avg, 2), 0);
    const stdDev = Math.sqrt(sqDiffSum / nums.length);

    // Q1 & Q3 Percentiles
    const getPercentile = (p) => {
      const idx = (nums.length - 1) * p;
      const base = Math.floor(idx);
      const rest = idx - base;
      if (nums[base + 1] !== undefined) {
        return nums[base] + rest * (nums[base + 1] - nums[base]);
      }
      return nums[base];
    };
    const q1 = getPercentile(0.25);
    const q3 = getPercentile(0.75);

    // Outlier Count
    let outlierCount = 0;
    if (qualityScanResults && qualityScanResults.outliers[colKey]) {
      outlierCount = qualityScanResults.outliers[colKey].count;
    } else {
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      nums.forEach(n => {
        if (n < lower || n > upper) outlierCount++;
      });
    }

    // Formatter
    const fmt = (val) => {
      if (type === 'currency') return "$" + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (type === 'percentage') return val.toFixed(2) + "%";
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    addStatCard("Minimum", fmt(min));
    addStatCard("Maximum", fmt(max));
    addStatCard("Mean / Average", fmt(avg));
    addStatCard("Median", fmt(median));
    addStatCard("Std Deviation", fmt(stdDev));
    addStatCard("Q1 (25th Percentile)", fmt(q1));
    addStatCard("Q3 (75th Percentile)", fmt(q3));
    addStatCard("Outlier Count", outlierCount.toString());
  } else if (type === 'date') {
    const dates = cleanValues.map(v => Date.parse(v)).filter(d => !isNaN(d));
    if (dates.length === 0) return;

    dates.sort((a, b) => a - b);
    const earliest = new Date(dates[0]);
    const latest = new Date(dates[dates.length - 1]);
    const diffDays = Math.round((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24));

    addStatCard("Earliest Date", earliest.toLocaleDateString());
    addStatCard("Latest Date", latest.toLocaleDateString());
    addStatCard("Date Range", `${diffDays.toLocaleString()} Days`);
  } else {
    // Text Columns
    // Find most common value
    const counts = {};
    let maxCount = 0;
    let mostCommon = "-";
    
    cleanValues.forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
      if (counts[v] > maxCount) {
        maxCount = counts[v];
        mostCommon = v;
      }
    });
    
    const commonPct = totalCount > 0 ? ((maxCount / totalCount) * 100).toFixed(1) : 0;

    // Average length
    const totalLen = cleanValues.reduce((s, v) => s + v.length, 0);
    const avgLen = totalLen / cleanValues.length;

    addStatCard("Most Common Value", `${mostCommon} (${maxCount}x - ${commonPct}%)`);
    addStatCard("Avg Text Length", `${avgLen.toFixed(1)} chars`);
  }
}

// Reset stats panel back to dataset info view
function resetStatsPanel() {
  selectedColumnKey = null;
  datasetInfoPanel.style.display = 'flex';
  columnStatsPanel.style.display = 'none';
}

resetStatsBtn.addEventListener('click', () => {
  resetStatsPanel();
  renderGridTable();
});


// ═══════════════════════════ COLUMN DROPDOWN MENU INTERACTION ═══════════════════════════

const columnMenu = document.getElementById('column-menu');
const filterTypeSelect = document.getElementById('ccm-filter-type');
const filterOpSelect = document.getElementById('ccm-filter-operator');
const filterValueInput = document.getElementById('ccm-filter-value');
const filterValue2Input = document.getElementById('ccm-filter-value2');
const filterApplyBtn = document.getElementById('ccm-filter-apply');
const filterClearBtn = document.getElementById('ccm-filter-clear');

const sortAscBtn = document.getElementById('ccm-sort-asc');
const sortDescBtn = document.getElementById('ccm-sort-desc');

// Handle Operator choices population depending on Filter Type
const filterOperators = {
  text: [
    { value: "contains", label: "Contains" },
    { value: "not_contains", label: "Does Not Contain" },
    { value: "starts_with", label: "Starts With" },
    { value: "ends_with", label: "Ends With" },
    { value: "equals", label: "Equals" }
  ],
  number: [
    { value: "greater_than", label: "Greater Than" },
    { value: "less_than", label: "Less Than" },
    { value: "equals", label: "Equals" },
    { value: "between", label: "Between" }
  ],
  date: [
    { value: "before", label: "Before" },
    { value: "after", label: "After" },
    { value: "between", label: "Between" }
  ]
};

filterTypeSelect.addEventListener('change', () => {
  populateOperatorsList();
});

filterOpSelect.addEventListener('change', () => {
  toggleFilterValueFields();
});

function populateOperatorsList(selectedOp = null) {
  const type = filterTypeSelect.value;
  filterOpSelect.innerHTML = "";
  
  filterOperators[type].forEach(op => {
    const opt = document.createElement('option');
    opt.value = op.value;
    opt.innerText = op.label;
    if (selectedOp && op.value === selectedOp) {
      opt.selected = true;
    }
    filterOpSelect.appendChild(opt);
  });
  
  toggleFilterValueFields();
}

function toggleFilterValueFields() {
  const op = filterOpSelect.value;
  if (op === "between") {
    filterValue2Input.style.display = "block";
    filterValueInput.placeholder = "Min / Start Value...";
  } else {
    filterValue2Input.style.display = "none";
    filterValueInput.placeholder = "Filter value...";
  }
}

// Reset/Initialize column dropdown selections
function resetColumnMenuInputs() {
  filterTypeSelect.value = "text";
  populateOperatorsList();
  filterValueInput.value = "";
  filterValue2Input.value = "";
}

// Open/Toggle Column Menu Dropdown
function toggleColumnMenu(e, colKey) {
  if (columnMenu.style.display === 'flex' && activeMenuColKey === colKey) {
    columnMenu.style.display = 'none';
    activeMenuColKey = null;
    return;
  }
  
  activeMenuColKey = colKey;
  
  // Position menu relative to trigger click
  const rect = e.target.getBoundingClientRect();
  columnMenu.style.top = `${rect.bottom + window.scrollY + 6}px`;
  columnMenu.style.left = `${Math.min(window.innerWidth - 240, rect.left + window.scrollX - 10)}px`;
  columnMenu.style.display = 'flex';
  
  // Hide filter form initially on open
  document.getElementById('ccm-filter-form-wrap').style.display = 'none';

  // Load existing filter state if any
  const rule = activeFilters[colKey];
  if (rule) {
    filterTypeSelect.value = rule.type;
    populateOperatorsList(rule.operator);
    filterValueInput.value = rule.val1;
    filterValue2Input.value = rule.val2 || "";
    // Show form if rules are active
    document.getElementById('ccm-filter-form-wrap').style.display = 'flex';
  } else {
    resetColumnMenuInputs();
  }

  // Handle outside click to close dropdown
  const closeMenuHandler = (event) => {
    if (!columnMenu.contains(event.target) && !event.target.classList.contains('col-hdr-menu-btn')) {
      columnMenu.style.display = 'none';
      document.removeEventListener('click', closeMenuHandler);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('click', closeMenuHandler);
  }, 10);
}

// Apply Menu Sort Ascending
sortAscBtn.addEventListener('click', () => {
  if (activeMenuColKey) {
    activeSort = { colKey: activeMenuColKey, direction: 'asc' };
    applySearchSortAndFilters();
    columnMenu.style.display = 'none';
  }
});

// Apply Menu Sort Descending
sortDescBtn.addEventListener('click', () => {
  if (activeMenuColKey) {
    activeSort = { colKey: activeMenuColKey, direction: 'desc' };
    applySearchSortAndFilters();
    columnMenu.style.display = 'none';
  }
});

// Filter... option triggers subform toggle
document.getElementById('ccm-filter-toggle-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const formWrap = document.getElementById('ccm-filter-form-wrap');
  if (formWrap.style.display === 'none') {
    formWrap.style.display = 'flex';
  } else {
    formWrap.style.display = 'none';
  }
});

// Show Statistics menu option
document.getElementById('ccm-show-stats').addEventListener('click', () => {
  if (activeMenuColKey) {
    selectedColumnKey = activeMenuColKey;
    columnMenu.style.display = 'none';
    renderGridTable();
    updateColumnStats(selectedColumnKey);
  }
});

// Hide Column menu option
document.getElementById('ccm-hide-col').addEventListener('click', () => {
  if (activeMenuColKey) {
    pushToUndo();
    hiddenColumns.add(activeMenuColKey);
    if (selectedColumnKey === activeMenuColKey) {
      resetStatsPanel();
    }
    columnMenu.style.display = 'none';
    renderGridTable();
  }
});

// Freeze Column menu option
document.getElementById('ccm-freeze-col').addEventListener('click', () => {
  isFrozenCol = !isFrozenCol;
  document.getElementById('freeze-btn-text').innerText = isFrozenCol ? "Unfreeze Col A" : "Freeze Col A";
  columnMenu.style.display = 'none';
  renderGridTable();
});

// Rename Column menu option
document.getElementById('ccm-rename-col').addEventListener('click', () => {
  if (activeMenuColKey) {
    columnMenu.style.display = 'none';
    const ths = viewport.querySelectorAll('th.col-hdr');
    const colIndex = headers.indexOf(activeMenuColKey);
    if (ths[colIndex]) {
      const nameSpan = ths[colIndex].querySelector('.col-name');
      if (nameSpan) {
        nameSpan.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(nameSpan);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  }
});

// Clear Sort menu option
document.getElementById('ccm-clear-sort').addEventListener('click', () => {
  if (activeMenuColKey && activeSort && activeSort.colKey === activeMenuColKey) {
    activeSort = null;
    columnMenu.style.display = 'none';
    applySearchSortAndFilters();
  }
});

// Clear Filter menu option
document.getElementById('ccm-clear-filter').addEventListener('click', () => {
  if (activeMenuColKey && activeFilters[activeMenuColKey]) {
    delete activeFilters[activeMenuColKey];
    columnMenu.style.display = 'none';
    applySearchSortAndFilters();
  }
});

// Apply Menu Filter Rule from subform
filterApplyBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (activeMenuColKey) {
    const val1 = filterValueInput.value.trim();
    const val2 = filterValue2Input.value.trim();

    if (val1 === "") {
      delete activeFilters[activeMenuColKey];
    } else {
      activeFilters[activeMenuColKey] = {
        type: filterTypeSelect.value,
        operator: filterOpSelect.value,
        val1: val1,
        val2: val2
      };
    }
    applySearchSortAndFilters();
    columnMenu.style.display = 'none';
  }
});

// Clear/Reset subform fields
filterClearBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  if (activeMenuColKey) {
    delete activeFilters[activeMenuColKey];
    resetColumnMenuInputs();
    applySearchSortAndFilters();
    columnMenu.style.display = 'none';
  }
});


// ═══════════════════════════ GRID TOOLBAR ACTIONS ═══════════════════════════

// Add Row below selection or at bottom
document.getElementById('tb-row-add').addEventListener('click', () => {
  pushToUndo();
  let insertIndex = gridData.length;
  if (activeSelection) {
    const minR = Math.min(activeSelection.startRow, activeSelection.endRow);
    const maxR = Math.max(activeSelection.startRow, activeSelection.endRow);
    insertIndex = viewIndices[maxR] + 1;
  }
  
  const emptyRow = Array(headers.length).fill("");
  gridData.splice(insertIndex, 0, emptyRow);
  applySearchSortAndFilters();
});

// Delete selected row
document.getElementById('tb-row-delete').addEventListener('click', () => {
  if (!activeSelection) return;
  pushToUndo();
  
  const minR = Math.min(activeSelection.startRow, activeSelection.endRow);
  const maxR = Math.max(activeSelection.startRow, activeSelection.endRow);
  
  const origIndices = [];
  for (let r = minR; r <= maxR; r++) {
    origIndices.push(viewIndices[r]);
  }
  
  origIndices.sort((a, b) => b - a);
  origIndices.forEach(idx => {
    gridData.splice(idx, 1);
  });
  
  activeSelection = null;
  applySearchSortAndFilters();
});

// Add Column to right of selection
document.getElementById('tb-col-add').addEventListener('click', () => {
  pushToUndo();
  let insertIndex = headers.length;
  if (activeSelection) {
    const maxC = Math.max(activeSelection.startCol, activeSelection.endCol);
    insertIndex = maxC + 1;
  }

  const nextLetter = getColumnLetter(headers.length);
  
  headers.splice(insertIndex, 0, nextLetter);
  headerNames[nextLetter] = `New Column ${nextLetter}`;
  columnWidths[nextLetter] = 120;

  gridData.forEach(row => {
    row.splice(insertIndex, 0, "");
  });

  applySearchSortAndFilters();
});

// Delete selected column
document.getElementById('tb-col-delete').addEventListener('click', () => {
  if (!activeSelection) return;
  pushToUndo();
  
  const minC = Math.min(activeSelection.startCol, activeSelection.endCol);
  const maxC = Math.max(activeSelection.startCol, activeSelection.endCol);
  const deleteCount = (maxC - minC) + 1;

  const deletedHeaders = headers.splice(minC, deleteCount);
  deletedHeaders.forEach(h => {
    delete headerNames[h];
    delete columnWidths[h];
    delete activeFilters[h];
    hiddenColumns.delete(h);
  });
  
  if (activeSort && deletedHeaders.includes(activeSort.colKey)) {
    activeSort = null;
  }
  if (selectedColumnKey && deletedHeaders.includes(selectedColumnKey)) {
    resetStatsPanel();
  }

  gridData.forEach(row => {
    row.splice(minC, deleteCount);
  });

  activeSelection = null;
  applySearchSortAndFilters();
});

// Freeze Column Capability
const freezeBtn = document.getElementById('tb-col-freeze');
freezeBtn.addEventListener('click', () => {
  isFrozenCol = !isFrozenCol;
  document.getElementById('freeze-btn-text').innerText = isFrozenCol ? "Unfreeze Col A" : "Freeze Col A";
  renderGridTable();
});

// Column Sort: Ascending (Toolbar)
document.getElementById('tb-sort-asc').addEventListener('click', () => {
  if (!activeSelection) return;
  pushToUndo();
  const sortColIndex = activeSelection.startCol;
  activeSort = { colKey: headers[sortColIndex], direction: 'asc' };
  applySearchSortAndFilters();
});

// Column Sort: Descending (Toolbar)
document.getElementById('tb-sort-desc').addEventListener('click', () => {
  if (!activeSelection) return;
  pushToUndo();
  const sortColIndex = activeSelection.startCol;
  activeSort = { colKey: headers[sortColIndex], direction: 'desc' };
  applySearchSortAndFilters();
});

// Toggle Header Filter display
const toolbarFilterBtn = document.getElementById('tb-filter');
toolbarFilterBtn.addEventListener('click', () => {
  if (activeSelection) {
    const colKey = headers[activeSelection.startCol];
    const ths = viewport.querySelectorAll('th.col-hdr');
    // Find visible index taking hidden columns into account
    let colIndex = -1;
    let visibleIdx = 0;
    for(let i=0; i<headers.length; i++) {
      if (hiddenColumns.has(headers[i])) continue;
      if (headers[i] === colKey) {
        colIndex = visibleIdx;
        break;
      }
      visibleIdx++;
    }
    if (colIndex !== -1 && ths[colIndex]) {
      const menuBtn = ths[colIndex].querySelector('.col-hdr-menu-btn');
      if (menuBtn) {
        menuBtn.click();
      }
    }
  } else {
    alert("Select a column first to open its filter configuration.");
  }
});

// Toolbar: Reset Filters
document.getElementById('tb-clear-filters').addEventListener('click', () => {
  activeFilters = {};
  hiddenColumns = new Set();
  applySearchSortAndFilters();
});

// Toolbar: Reset Sort
document.getElementById('tb-reset-sort').addEventListener('click', () => {
  activeSort = null;
  applySearchSortAndFilters();
});

// Grid search matcher input
document.getElementById('ws-search-input').addEventListener('input', (e) => {
  searchQuery = e.target.value.toLowerCase().trim();
  applySearchSortAndFilters();
});


// ═══════════════════════════ CONTEXT MENU LOGIC ═══════════════════════════

const contextMenu = document.getElementById('grid-context-menu');

function showContextMenu(e) {
  e.preventDefault();
  contextMenu.style.top = `${e.clientY + window.scrollY}px`;
  contextMenu.style.left = `${e.clientX + window.scrollX}px`;
  contextMenu.style.display = 'block';

  // Add click listener to close menu once action is triggered
  const closeHandler = () => {
    contextMenu.style.display = 'none';
    document.removeEventListener('click', closeHandler);
  };
  setTimeout(() => {
    document.addEventListener('click', closeHandler);
  }, 10);
}

// Context menu actions handler helper
document.getElementById('cm-insert-above').addEventListener('click', () => {
  if (!activeSelection) return;
  pushToUndo();
  const minR = Math.min(activeSelection.startRow, activeSelection.endRow);
  const insertIndex = viewIndices[minR];
  
  const emptyRow = Array(headers.length).fill("");
  gridData.splice(insertIndex, 0, emptyRow);
  applySearchSortAndFilters();
});

document.getElementById('cm-insert-below').addEventListener('click', () => {
  if (!activeSelection) return;
  pushToUndo();
  const maxR = Math.max(activeSelection.startRow, activeSelection.endRow);
  const insertIndex = viewIndices[maxR] + 1;
  
  const emptyRow = Array(headers.length).fill("");
  gridData.splice(insertIndex, 0, emptyRow);
  applySearchSortAndFilters();
});

document.getElementById('cm-delete-row').addEventListener('click', () => {
  if (!activeSelection) return;
  document.getElementById('tb-row-delete').click();
});

document.getElementById('cm-insert-left').addEventListener('click', () => {
  if (!activeSelection) return;
  pushToUndo();
  const minC = Math.min(activeSelection.startCol, activeSelection.endCol);
  
  const nextLetter = getColumnLetter(headers.length);
  headers.splice(minC, 0, nextLetter);
  headerNames[nextLetter] = `New Column ${nextLetter}`;
  columnWidths[nextLetter] = 120;
  
  gridData.forEach(row => row.splice(minC, 0, ""));
  applySearchSortAndFilters();
});

document.getElementById('cm-insert-right').addEventListener('click', () => {
  if (!activeSelection) return;
  pushToUndo();
  const maxC = Math.max(activeSelection.startCol, activeSelection.endCol);
  const insertIndex = maxC + 1;
  
  const nextLetter = getColumnLetter(headers.length);
  headers.splice(insertIndex, 0, nextLetter);
  headerNames[nextLetter] = `New Column ${nextLetter}`;
  columnWidths[nextLetter] = 120;
  
  gridData.forEach(row => row.splice(insertIndex, 0, ""));
  applySearchSortAndFilters();
});

document.getElementById('cm-delete-col').addEventListener('click', () => {
  if (!activeSelection) return;
  document.getElementById('tb-col-delete').click();
});

document.getElementById('cm-clear').addEventListener('click', () => {
  if (!activeSelection) return;
  pushToUndo();
  
  const minR = Math.min(activeSelection.startRow, activeSelection.endRow);
  const maxR = Math.max(activeSelection.startRow, activeSelection.endRow);
  const minC = Math.min(activeSelection.startCol, activeSelection.endCol);
  const maxC = Math.max(activeSelection.startCol, activeSelection.endCol);

  for (let r = minR; r <= maxR; r++) {
    const origRowIdx = viewIndices[r];
    for (let c = minC; c <= maxC; c++) {
      gridData[origRowIdx][c] = "";
    }
  }
  
  if (selectedColumnKey) updateColumnStats(selectedColumnKey);
  renderGridTable();
  updateMetadata();
});

// Copy & Paste support simulated visually
document.addEventListener('keydown', (e) => {
  if (!activeSelection) return;
  
  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    const origRowIndex = viewIndices[activeSelection.startRow];
    window.simulatedClipboard = gridData[origRowIndex][activeSelection.startCol];
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    if (window.simulatedClipboard !== undefined) {
      pushToUndo();
      const minR = Math.min(activeSelection.startRow, activeSelection.endRow);
      const maxR = Math.max(activeSelection.startRow, activeSelection.endRow);
      const minC = Math.min(activeSelection.startCol, activeSelection.endCol);
      const maxC = Math.max(activeSelection.startCol, activeSelection.endCol);

      for (let r = minR; r <= maxR; r++) {
        const origRowIdx = viewIndices[r];
        for (let c = minC; c <= maxC; c++) {
          gridData[origRowIdx][c] = window.simulatedClipboard;
        }
      }
      if (selectedColumnKey) updateColumnStats(selectedColumnKey);
      renderGridTable();
      updateMetadata();
    }
  }
});

// Save simulated notice trigger
document.getElementById('ws-btn-save').addEventListener('click', () => {
  alert("Spreadsheet updates saved successfully!");
});

// Export CSV structure download prompt
document.getElementById('ws-btn-export').addEventListener('click', () => {
  const filename = document.getElementById('ws-dataset-name').innerText;
  
  // Format active gridData view to CSV format (exclude hidden columns)
  const activeHeaders = headers.filter(h => !hiddenColumns.has(h));
  
  const rows = [
    activeHeaders.map(h => headerNames[h]) // headers row
  ];
  
  viewIndices.forEach(idx => {
    const row = gridData[idx];
    const cleanRow = [];
    headers.forEach((h, colIdx) => {
      if (!hiddenColumns.has(h)) {
        cleanRow.push(row[colIdx]);
      }
    });
    rows.push(cleanRow);
  });
  
  try {
    const csvContent = Papa.unparse(rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename.endsWith('.csv') ? filename : filename.split('.')[0] + '_exported.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert("Error exporting CSV: " + err.message);
  }
});

// Auto-fit column width to its contents programmatically
function autoFitColumnWidth(colKey) {
  const colIndex = headers.indexOf(colKey);
  if (colIndex === -1) return;

  // Measure header text length
  let maxCharLength = (headerNames[colKey] || "").length;
  
  // Scan first 1000 visible rows to estimate max cell text length
  const scanLimit = Math.min(gridData.length, 1000);
  for (let r = 0; r < scanLimit; r++) {
    const cellVal = String(gridData[r][colIndex] || "").trim();
    if (cellVal.length > maxCharLength) {
      maxCharLength = cellVal.length;
    }
  }

  // 8px average character width estimation + 24px cell horizontal padding
  const estimatedWidth = Math.max(80, Math.min(350, maxCharLength * 8 + 24));
  
  pushToUndo();
  columnWidths[colKey] = estimatedWidth;
  renderGridTable();
}

// ═══════════════════════════ DATA QUALITY & PREPROCESSING SYSTEM ═══════════════════════════

// Global preprocessing state
let cellsToFlash = new Set();
let rowsToFlash = new Set();
let preprocessingHistory = [];
let preprocessingRedoHistory = []; // Redo tracker specifically for recipe steps
let activeQualityTab = 'overview';
let qualityScanResults = null;
let issueStates = {}; // key (e.g. outlier_A) -> 'pending' | 'resolved' | 'ignored'
let activeHighlights = new Map(); // coordKey (e.g. 5_2) -> 'outlier' | 'type'
let explorerFilters = { missing: 'pending', duplicates: 'pending', types: 'pending', outliers: 'pending' }; // active sub-tab per tab
let duplicateCheckColumns = new Set();
let activeDuplicateRowsList = [];
let activeNavigatorCategory = null;
let activeNavigatorColKey = null;
let activeNavigatorIndex = -1;
let activeNavigatorCell = { r: -1, c: -1 };
let affectedRowsFilter = null; // Set of row indices
let activeRowHighlights = new Set(); // Set of row indices
let highlightModes = {}; // e.g. "missing_ColumnA" -> 'cell' | 'row'

// Initialize Workspace Sidebar Drag-to-Resize Handler
const sidebarResizer = document.getElementById('ws-sidebar-resizer');
const defaultSidebarWidth = 280;
const defaultQualityWidth = 380;

// Apply persisted sidebar width on load if available
const storedWidth = sessionStorage.getItem('ws-sidebar-width');
if (storedWidth) {
  sidebarEl.style.width = storedWidth + 'px';
}

if (sidebarResizer) {
  sidebarResizer.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = sidebarEl.offsetWidth;

    const onMouseMove = (moveEvent) => {
      // Sidebar is on the right side of the screen, so dragging left increases width
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.max(320, Math.min(480, startWidth + deltaX));
      sidebarEl.style.width = newWidth + 'px';
      
      sessionStorage.setItem('ws-sidebar-width', newWidth);
      
      // Update spreadsheet view size
      renderGridTable();
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      if (typeof currentView !== 'undefined' && currentView === 'dashboard' && typeof renderDashboardCanvas === 'function') {
        renderDashboardCanvas();
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
}

// Quality Panel Toggling
const analyzeBtn = document.getElementById('ws-btn-analyze');
const qualityPanel = document.getElementById('ws-sidebar-data-quality');

if (analyzeBtn && qualityPanel) {
  analyzeBtn.addEventListener('click', () => {
    if (qualityPanel.style.display !== 'none' && !sidebarEl.classList.contains('collapsed')) {
      // Toggle collapse if already in Preprocessing
      sidebarEl.classList.add('collapsed');
    } else {
      // Open quality panel
      datasetInfoPanel.style.display = 'none';
      columnStatsPanel.style.display = 'none';
      qualityPanel.style.display = 'block';
      sidebarEl.classList.remove('collapsed');

      // Expand sidebar width to fit tabs if no custom width is stored
      const savedWidth = sessionStorage.getItem('ws-sidebar-width');
      if (!savedWidth) {
        sidebarEl.style.width = defaultQualityWidth + 'px';
      }

      runQualityScan();
      renderGridTable();
    }
  });
}

// Reset Quality panel back to Dataset Info
const resetQualityBtn = document.getElementById('btn-reset-quality');
if (resetQualityBtn) {
  resetQualityBtn.addEventListener('click', () => {
    qualityPanel.style.display = 'none';
    datasetInfoPanel.style.display = 'flex';
    columnStatsPanel.style.display = 'none';

    // Restore standard sidebar width if no custom width is saved
    const savedWidth = sessionStorage.getItem('ws-sidebar-width');
    if (!savedWidth) {
      sidebarEl.style.width = defaultSidebarWidth + 'px';
    }

    renderGridTable();
  });
}

// Preprocessing Tab Navigation Toggles
const qualityTabButtons = document.querySelectorAll('.quality-tab-btn');
qualityTabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    qualityTabButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const tabName = btn.dataset.tab;
    activeQualityTab = tabName;

    // Show selected tab content, hide others
    const tabContents = document.querySelectorAll('.quality-tab-content');
    tabContents.forEach(content => {
      if (content.id === `qtab-${tabName}`) {
        content.style.display = 'block';
      } else {
        content.style.display = 'none';
      }
    });

    renderActiveTabContent();
  });
});

// Helper: check if a value is missing or empty placeholder
function isMissingValue(val) {
  if (val === undefined || val === null) return true;
  const s = String(val).trim().toLowerCase();
  return s === "" || s === "null" || s === "nan" || s === "n/a" || s === "na" || s === "-" || s === "--" || s === "?";
}

// Helper: detect matching data type for a cell
function getCellDataType(val) {
  const s = String(val).trim();
  if (s === "") return null;
  
  const lower = s.toLowerCase();
  if (lower === "true" || lower === "false" || lower === "yes" || lower === "no") {
    return "Boolean";
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    return "Email";
  }
  if (/^(https?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/.test(s)) {
    return "URL";
  }
  if (/^\+?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/.test(s) && s.replace(/[-.\s\+()]/g, "").length >= 7) {
    return "Phone";
  }
  if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(s) || /^\d{2}[-/]\d{2}[-/]\d{4}/.test(s)) {
    if (!isNaN(Date.parse(s))) return "Date";
  }
  if (/^\$[-+]?[0-9,]+(\.[0-9]{2})?$/.test(s)) {
    return "Currency";
  }
  if (/^[-+]?[0-9,]+(\.[0-9]+)?%$/.test(s)) {
    return "Percentage";
  }
  if (/^-?\d+$/.test(s)) {
    return "Integer";
  }
  if (/^-?\d*\.\d+$/.test(s)) {
    return "Decimal";
  }
  if (s.length > 5 && !isNaN(Date.parse(s)) && !/^\d+$/.test(s)) {
    return "Date";
  }
  
  return "Text";
}

// Core Quality Scanner Engine
function runQualityScan() {
  const totalRows = gridData.length;
  const totalCols = headers.length;
  const totalCells = totalRows * totalCols;

  if (totalCells === 0) return;

  const results = {
    missingValues: {}, // colKey -> { count, pct, severity, list: [rowIndices] }
    duplicates: [],     // List of duplicate row indices
    typeIssues: {},    // colKey -> { detectedType, confidence, issues: [ { rIdx, val } ] }
    outliers: {},      // colKey -> { count, list: [rowIndices], bounds, Q1, Q3, IQR }
    totalMissing: 0,
    totalTypeIssues: 0,
    totalOutliers: 0
  };

  // 1. Scan Missing Values and Data Type Issues
  headers.forEach(colKey => {
    const colIndex = headers.indexOf(colKey);
    const missingRows = [];
    const typeFrequencies = {};
    const cellsWithData = [];

    gridData.forEach((row, rIdx) => {
      const val = row[colIndex];
      if (isMissingValue(val)) {
        missingRows.push(rIdx);
      } else {
        cellsWithData.push({ rIdx, val });
        const type = getCellDataType(val);
        if (type) {
          typeFrequencies[type] = (typeFrequencies[type] || 0) + 1;
        }
      }
    });

    // Save missing stats
    if (missingRows.length > 0) {
      const pct = (missingRows.length / totalRows) * 100;
      let severity = "low";
      if (pct > 25) severity = "high";
      else if (pct > 5) severity = "medium";

      results.missingValues[colKey] = {
        count: missingRows.length,
        pct: pct.toFixed(1),
        severity,
        list: missingRows
      };
      results.totalMissing += missingRows.length;
    }

    // Determine column primary type and type issues
    if (cellsWithData.length > 0) {
      let primaryType = "Text";
      let maxCount = 0;
      for (const t in typeFrequencies) {
        if (typeFrequencies[t] > maxCount) {
          maxCount = typeFrequencies[t];
          primaryType = t;
        }
      }

      const confidence = (maxCount / cellsWithData.length) * 100;
      const invalidRows = [];

      cellsWithData.forEach(item => {
        const itemType = getCellDataType(item.val);
        // If it doesn't match primary type (e.g. Integer/Decimal are compatible, other incompatibilities)
        let isCompatible = (itemType === primaryType);
        if (primaryType === "Decimal" && itemType === "Integer") isCompatible = true;
        if (primaryType === "Text") isCompatible = true; // Text accepts everything

        if (!isCompatible) {
          invalidRows.push({ rIdx: item.rIdx, val: item.val });
        }
      });

      results.typeIssues[colKey] = {
        detectedType: primaryType,
        confidence: confidence.toFixed(0),
        issues: invalidRows
      };
      results.totalTypeIssues += invalidRows.length;
    } else {
      results.typeIssues[colKey] = {
        detectedType: "Text",
        confidence: "100",
        issues: []
      };
    }
  });

  // 2. Scan Duplicate Rows (Exact match across all columns by default)
  if (duplicateCheckColumns.size === 0) {
    headers.forEach(h => duplicateCheckColumns.add(h));
  }
  const seenRows = new Map();
  const colIndices = Array.from(duplicateCheckColumns).map(h => headers.indexOf(h)).filter(idx => idx !== -1);
  gridData.forEach((row, rIdx) => {
    const key = JSON.stringify(colIndices.map(idx => row[idx]));
    if (seenRows.has(key)) {
      results.duplicates.push(rIdx);
    } else {
      seenRows.set(key, rIdx);
    }
  });

  // 3. Scan Outliers (IQR Method)
  headers.forEach(colKey => {
    const colIndex = headers.indexOf(colKey);
    const numericVals = [];

    gridData.forEach((row, rIdx) => {
      const val = row[colIndex];
      if (!isMissingValue(val)) {
        const cleanStr = String(val).replace(/[$,%]/g, "").trim();
        const num = parseFloat(cleanStr);
        if (!isNaN(num)) {
          numericVals.push({ rIdx, num });
        }
      }
    });

    if (numericVals.length >= 4) {
      numericVals.sort((a, b) => a.num - b.num);
      
      const getP = (p) => {
        const idx = (numericVals.length - 1) * p;
        const base = Math.floor(idx);
        const rest = idx - base;
        if (numericVals[base + 1]) {
          return numericVals[base].num + rest * (numericVals[base + 1].num - numericVals[base].num);
        }
        return numericVals[base].num;
      };

      const Q1 = getP(0.25);
      const Q3 = getP(0.75);
      const IQR = Q3 - Q1;
      const lower = Q1 - 1.5 * IQR;
      const upper = Q3 + 1.5 * IQR;

      const outlierRows = [];
      numericVals.forEach(item => {
        if (item.num < lower || item.num > upper) {
          outlierRows.push(item.rIdx);
        }
      });

      if (outlierRows.length > 0) {
        results.outliers[colKey] = {
          count: outlierRows.length,
          list: outlierRows,
          bounds: { lower, upper },
          Q1, Q3, IQR
        };
        results.totalOutliers += outlierRows.length;
      }
    }
  });

  qualityScanResults = results;
  activeDuplicateRowsList = results.duplicates || [];

  // Render score and metrics in HTML
  updateQualityScoreBadge();
}

function updateQualityScoreBadge() {
  resolveIssueStatuses();

  let pendingMissing = 0;
  let pendingTypes = 0;
  let pendingOutliers = 0;
  
  headers.forEach(colKey => {
    if (issueStates[`missing_${colKey}`] === 'pending') {
      pendingMissing += qualityScanResults.missingValues[colKey]?.count || 0;
    }
    if (issueStates[`type_${colKey}`] === 'pending') {
      pendingTypes += qualityScanResults.typeIssues[colKey]?.issues?.length || 0;
    }
    if (issueStates[`outlier_${colKey}`] === 'pending') {
      pendingOutliers += qualityScanResults.outliers[colKey]?.count || 0;
    }
  });

  const isDupsPending = issueStates['duplicate_rows'] === 'pending';
  const pendingDups = isDupsPending ? (qualityScanResults.duplicates?.length || 0) : 0;

  const totalCells = gridData.length * headers.length || 1;
  const missingPenalty = (pendingMissing / totalCells) * 100 * 0.4;
  const duplicatePenalty = (pendingDups / (gridData.length || 1)) * 100 * 1.2;
  const typePenalty = (pendingTypes / totalCells) * 100 * 0.8;
  const outlierPenalty = (pendingOutliers / totalCells) * 100 * 0.6;

  const score = Math.max(12, Math.round(100 - (missingPenalty + duplicatePenalty + typePenalty + outlierPenalty)));
  
  const scoreValEl = document.getElementById('quality-score-val');
  if (scoreValEl) {
    scoreValEl.innerText = `${score}%`;
    const circle = document.querySelector('.quality-score-circle');
    if (circle) {
      if (score >= 85) circle.style.borderColor = 'var(--success)';
      else if (score >= 60) circle.style.borderColor = 'var(--warning)';
      else circle.style.borderColor = 'var(--error)';
    }
  }

  // Update Overview tab counts reflecting PENDING issues only
  document.getElementById('q-stat-missing').innerText = pendingMissing.toLocaleString();
  document.getElementById('q-stat-dups').innerText = pendingDups.toLocaleString();
  document.getElementById('q-stat-types').innerText = pendingTypes.toLocaleString();
  document.getElementById('q-stat-outliers').innerText = pendingOutliers.toLocaleString();
}

// Issue Status Lifecycle Resolver
function resolveIssueStatuses() {
  if (!qualityScanResults) return;

  // 1. Missing Values
  headers.forEach(colKey => {
    const key = `missing_${colKey}`;
    const stat = qualityScanResults.missingValues[colKey];
    const hasIssue = stat && stat.count > 0;

    if (hasIssue) {
      if (!issueStates[key] || issueStates[key] === 'resolved') {
        issueStates[key] = 'pending';
      }
    } else {
      issueStates[key] = 'resolved';
    }
  });

  // 2. Duplicates
  {
    const key = `duplicate_rows`;
    const hasIssue = qualityScanResults.duplicates && qualityScanResults.duplicates.length > 0;
    if (hasIssue) {
      if (!issueStates[key] || issueStates[key] === 'resolved') {
        issueStates[key] = 'pending';
      }
    } else {
      issueStates[key] = 'resolved';
    }
  }

  // 3. Data Types
  headers.forEach(colKey => {
    const key = `type_${colKey}`;
    const stat = qualityScanResults.typeIssues[colKey];
    const hasIssue = stat && stat.issues && stat.issues.length > 0;

    if (hasIssue) {
      if (!issueStates[key] || issueStates[key] === 'resolved') {
        issueStates[key] = 'pending';
      }
    } else {
      issueStates[key] = 'resolved';
    }
  });

  // 4. Outliers
  headers.forEach(colKey => {
    const key = `outlier_${colKey}`;
    const stat = qualityScanResults.outliers[colKey];
    const hasIssue = stat && stat.count > 0;

    if (hasIssue) {
      if (!issueStates[key] || issueStates[key] === 'resolved') {
        issueStates[key] = 'pending';
      }
    } else {
      issueStates[key] = 'resolved';
    }
  });
}

// Global active tab dispatcher
function renderActiveTabContent() {
  if (activeQualityTab === 'overview') {
    // Overview metrics populated during quality scanner updates
  } else if (activeQualityTab === 'missing') {
    renderMissingTab();
  } else if (activeQualityTab === 'duplicates') {
    renderDuplicatesTab();
  } else if (activeQualityTab === 'types') {
    renderTypesTab();
  } else if (activeQualityTab === 'outliers') {
    renderOutliersTab();
  } else if (activeQualityTab === 'history') {
    renderHistoryTab();
  }
}

// Generic Issue Explorer Sub-tabs Builder
function renderIssueExplorerSubtabs(category, container, renderCardsCallback) {
  let pendingCount = 0;
  let resolvedCount = 0;
  let ignoredCount = 0;

  const currentFilter = explorerFilters[category] || 'pending';
  const matchedKeys = [];

  if (category === 'missing') {
    headers.forEach(colKey => {
      const key = `missing_${colKey}`;
      const status = issueStates[key] || 'pending';
      const stat = qualityScanResults.missingValues[colKey];
      const hasIssue = stat && stat.count > 0;

      if (hasIssue || status === 'ignored' || status === 'resolved') {
        if (status === 'pending') pendingCount++;
        else if (status === 'resolved') resolvedCount++;
        else if (status === 'ignored') ignoredCount++;

        if (status === currentFilter && (hasIssue || currentFilter !== 'pending')) {
          matchedKeys.push(colKey);
        }
      }
    });
  } else if (category === 'duplicates') {
    const key = `duplicate_rows`;
    const status = issueStates[key] || 'pending';
    const stat = qualityScanResults.duplicates;
    const hasIssue = stat && stat.length > 0;

    if (hasIssue || status === 'ignored' || status === 'resolved') {
      if (status === 'pending') pendingCount++;
      else if (status === 'resolved') resolvedCount++;
      else if (status === 'ignored') ignoredCount++;

      if (status === currentFilter && (hasIssue || currentFilter !== 'pending')) {
        matchedKeys.push('duplicate_rows');
      }
    }
  } else if (category === 'types') {
    headers.forEach(colKey => {
      const key = `type_${colKey}`;
      const status = issueStates[key] || 'pending';
      const stat = qualityScanResults.typeIssues[colKey];
      const hasIssue = stat && stat.issues && stat.issues.length > 0;

      if (hasIssue || status === 'ignored' || status === 'resolved') {
        if (status === 'pending') pendingCount++;
        else if (status === 'resolved') resolvedCount++;
        else if (status === 'ignored') ignoredCount++;

        if (status === currentFilter && (hasIssue || currentFilter !== 'pending')) {
          matchedKeys.push(colKey);
        }
      }
    });
  } else if (category === 'outliers') {
    headers.forEach(colKey => {
      const key = `outlier_${colKey}`;
      const status = issueStates[key] || 'pending';
      const stat = qualityScanResults.outliers[colKey];
      const hasIssue = stat && stat.count > 0;

      if (hasIssue || status === 'ignored' || status === 'resolved') {
        if (status === 'pending') pendingCount++;
        else if (status === 'resolved') resolvedCount++;
        else if (status === 'ignored') ignoredCount++;

        if (status === currentFilter && (hasIssue || currentFilter !== 'pending')) {
          matchedKeys.push(colKey);
        }
      }
    });
  }

  const tabsDiv = document.createElement('div');
  tabsDiv.className = 'issue-explorer-tabs';
  
  tabsDiv.innerHTML = `
    <button class="issue-explorer-pill ${currentFilter === 'pending' ? 'active' : ''}" data-filter="pending">
      Pending <span class="issue-explorer-count">${pendingCount}</span>
    </button>
    <button class="issue-explorer-pill ${currentFilter === 'resolved' ? 'active' : ''}" data-filter="resolved">
      Resolved <span class="issue-explorer-count">${resolvedCount}</span>
    </button>
    <button class="issue-explorer-pill ${currentFilter === 'ignored' ? 'active' : ''}" data-filter="ignored">
      Ignored <span class="issue-explorer-count">${ignoredCount}</span>
    </button>
  `;

  tabsDiv.querySelectorAll('.issue-explorer-pill').forEach(pill => {
    pill.onclick = () => {
      explorerFilters[category] = pill.dataset.filter;
      renderActiveTabContent();
    };
  });

  container.appendChild(tabsDiv);
  renderCardsCallback(matchedKeys, currentFilter);
}

// 1. Missing Values Renderer
function renderMissingTab() {
  const container = document.getElementById('missing-columns-list');
  if (!container) return;
  container.innerHTML = "";

  renderIssueExplorerSubtabs('missing', container, (colKeys, filterStatus) => {
    if (colKeys.length === 0) {
      container.appendChild(createEmptyStateDiv(`No ${filterStatus} missing value issues found.`));
      return;
    }

    colKeys.forEach(colKey => {
      const stat = qualityScanResults.missingValues[colKey] || { count: 0, pct: "0.0", severity: "low", list: [] };
      const name = headerNames[colKey] || `Column ${colKey}`;
      const type = detectColumnType(colKey);
      const key = `missing_${colKey}`;

      const card = document.createElement('div');
      card.className = 'quality-card';

      // Header
      const hdr = document.createElement('div');
      hdr.className = 'quality-card-header';
      hdr.innerHTML = `
        <span class="quality-card-title">${name}</span>
        <span class="quality-card-badge severity-${stat.severity}">${filterStatus.toUpperCase()}</span>
      `;
      card.appendChild(hdr);

      // Meta & Description
      const meta = document.createElement('div');
      meta.className = 'quality-card-meta';
      meta.innerText = filterStatus === 'resolved' 
        ? "All missing values imputed successfully!" 
        : `${stat.count} values missing (${stat.pct}%)`;
      card.appendChild(meta);

      if (filterStatus === 'pending' || filterStatus === 'ignored') {
        const navBlock = createIssueNavigatorBlock('missing', colKey);
        card.appendChild(navBlock);

        // Actions
        const actions = document.createElement('div');
        actions.className = 'quality-card-actions';

        const select = document.createElement('select');
        select.className = 'quality-select';

        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.className = 'quality-input';
        customInput.placeholder = 'Enter custom value...';
        customInput.style.display = 'none';

        if (type === 'currency' || type === 'number' || type === 'percentage') {
          select.innerHTML = `
            <option value="mean">Impute Mean</option>
            <option value="median">Impute Median</option>
            <option value="mode">Impute Mode</option>
            <option value="custom">Fill Custom Value...</option>
            <option value="delete">Delete Rows</option>
            <option value="ignore">Ignore</option>
          `;
        } else if (type === 'date') {
          select.innerHTML = `
            <option value="prev">Fill Previous Value</option>
            <option value="next">Fill Next Value</option>
            <option value="mode">Fill Most Common Date</option>
            <option value="custom">Fill Custom Date...</option>
            <option value="delete">Delete Rows</option>
            <option value="ignore">Ignore</option>
          `;
          customInput.placeholder = 'YYYY-MM-DD...';
        } else {
          select.innerHTML = `
            <option value="mode">Impute Mode</option>
            <option value="unknown">Fill "Unknown"</option>
            <option value="custom">Fill Custom Value...</option>
            <option value="delete">Delete Rows</option>
            <option value="ignore">Ignore</option>
          `;
        }

        select.addEventListener('change', () => {
          if (select.value === 'custom') customInput.style.display = 'block';
          else customInput.style.display = 'none';
        });

        const applyBtn = document.createElement('button');
        applyBtn.className = 'ccm-btn ccm-btn-primary';
        applyBtn.style.marginTop = '4px';
        applyBtn.innerText = 'Apply Action';
        applyBtn.onclick = () => applyMissingAction(colKey, select.value, customInput.value);

        actions.appendChild(select);
        actions.appendChild(customInput);
        actions.appendChild(applyBtn);
        card.appendChild(actions);
      }

      // Lifecycle status trigger links
      const lifecycleRow = document.createElement('div');
      lifecycleRow.style.marginTop = '10px';
      lifecycleRow.style.display = 'flex';
      lifecycleRow.style.justifyContent = 'flex-end';

      if (filterStatus === 'pending') {
        const ignoreBtn = document.createElement('span');
        ignoreBtn.className = 'card-action-link ignore-link';
        ignoreBtn.innerHTML = '🚫 Ignore Issue';
        ignoreBtn.onclick = () => {
          issueStates[key] = 'ignored';
          clearHighlightsForIssue('missing', colKey);
          updateQualityScoreBadge();
          renderActiveTabContent();
          renderGridTable();
        };
        lifecycleRow.appendChild(ignoreBtn);
      } else if (filterStatus === 'ignored') {
        const restoreBtn = document.createElement('span');
        restoreBtn.className = 'card-action-link';
        restoreBtn.innerHTML = '🔄 Restore to Pending';
        restoreBtn.onclick = () => {
          issueStates[key] = 'pending';
          updateQualityScoreBadge();
          renderActiveTabContent();
          renderGridTable();
        };
        lifecycleRow.appendChild(restoreBtn);
      }

      card.appendChild(lifecycleRow);
      container.appendChild(card);
    });
  });
}

function applyMissingAction(colKey, action, customVal) {
  if (action === 'ignore') {
    issueStates[`missing_${colKey}`] = 'ignored';
    clearHighlightsForIssue('missing', colKey);
    updateQualityScoreBadge();
    renderActiveTabContent();
    renderGridTable();
    return;
  }

  const colIdx = headers.indexOf(colKey);
  if (colIdx === -1) return;

  const stat = qualityScanResults.missingValues[colKey];
  if (!stat || stat.count === 0) return;

  pushToUndo();

  const colName = headerNames[colKey] || `Column ${colKey}`;
  let actionDesc = "";
  const modifiedCoords = [];
  const rowsToDelete = new Set();

  const nonMissingVals = [];
  const freqMap = {};
  let modeVal = "";
  let modeCount = 0;

  gridData.forEach(row => {
    const val = row[colIdx];
    if (!isMissingValue(val)) {
      nonMissingVals.push(val);
      const strVal = String(val).trim();
      freqMap[strVal] = (freqMap[strVal] || 0) + 1;
      if (freqMap[strVal] > modeCount) {
        modeCount = freqMap[strVal];
        modeVal = strVal;
      }
    }
  });

  const getMean = () => {
    const nums = nonMissingVals.map(v => parseFloat(String(v).replace(/[$,%]/g, ""))).filter(n => !isNaN(n));
    if (nums.length === 0) return 0;
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  };

  const getMedian = () => {
    const nums = nonMissingVals.map(v => parseFloat(String(v).replace(/[$,%]/g, ""))).filter(n => !isNaN(n));
    if (nums.length === 0) return 0;
    nums.sort((a, b) => a - b);
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  };

  let fillValue = "";

  if (action === 'mean') {
    const mean = getMean();
    const isCurrency = colName.toLowerCase().includes('$') || colName.toLowerCase().includes('price');
    fillValue = isCurrency ? mean.toFixed(2) : mean.toFixed(1);
    actionDesc = `Imputed mean (${fillValue}) in ${colName}`;
  } else if (action === 'median') {
    const median = getMedian();
    fillValue = String(median);
    actionDesc = `Imputed median (${fillValue}) in ${colName}`;
  } else if (action === 'mode') {
    fillValue = modeVal || "Unknown";
    actionDesc = `Imputed mode (${fillValue}) in ${colName}`;
  } else if (action === 'custom') {
    fillValue = customVal || "";
    actionDesc = `Filled custom value "${fillValue}" in ${colName}`;
  } else if (action === 'unknown') {
    fillValue = "Unknown";
    actionDesc = `Filled "Unknown" placeholders in ${colName}`;
  } else if (action === 'prev') {
    actionDesc = `Imputed previous value in ${colName}`;
  } else if (action === 'next') {
    actionDesc = `Imputed next value in ${colName}`;
  } else if (action === 'delete') {
    stat.list.forEach(rIdx => rowsToDelete.add(rIdx));
    actionDesc = `Removed ${stat.count} rows with missing values in ${colName}`;
  }

  if (action === 'delete') {
    const sorted = Array.from(rowsToDelete).sort((a, b) => b - a);
    sorted.forEach(rIdx => {
      gridData.splice(rIdx, 1);
    });
  } else {
    gridData.forEach((row, rIdx) => {
      if (isMissingValue(row[colIdx])) {
        let valToFill = fillValue;
        if (action === 'prev') {
          let found = "";
          for (let p = rIdx - 1; p >= 0; p--) {
            if (!isMissingValue(gridData[p][colIdx])) {
              found = gridData[p][colIdx];
              break;
            }
          }
          valToFill = found || modeVal || "";
        } else if (action === 'next') {
          let found = "";
          for (let n = rIdx + 1; n < gridData.length; n++) {
            if (!isMissingValue(gridData[n][colIdx])) {
              found = gridData[n][colIdx];
              break;
            }
          }
          valToFill = found || modeVal || "";
        }
        gridData[rIdx][colIdx] = valToFill;
        modifiedCoords.push({ r: rIdx, c: colIdx });
      }
    });
  }

  logPreprocessingAction(actionDesc);
  clearHighlightsForIssue('missing', colKey);

  applySearchSortAndFilters();
  recalcMissing(colKey);
  renderActiveTabContent();

  if (modifiedCoords.length > 0) {
    flashCells(modifiedCoords);
  }
}

// 2. Duplicate Rows Explorer
function renderDuplicatesTab() {
  const checkContainer = document.getElementById('dup-columns-checks-container');
  if (!checkContainer) return;
  checkContainer.innerHTML = "";

  const btnFirst = document.getElementById('btn-dup-action-first');
  const btnLast = document.getElementById('btn-dup-action-last');
  const btnReview = document.getElementById('btn-dup-action-review');
  if (btnFirst) btnFirst.onclick = () => applyDuplicateAction('keep_first');
  if (btnLast) btnLast.onclick = () => applyDuplicateAction('keep_last');
  if (btnReview) btnReview.onclick = () => applyDuplicateAction('highlight');

  if (duplicateCheckColumns.size === 0) {
    headers.forEach(h => duplicateCheckColumns.add(h));
  }

  headers.forEach(colKey => {
    const name = headerNames[colKey] || `Column ${colKey}`;
    const div = document.createElement('div');
    div.className = 'dup-check-item';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = `dup-chk-${colKey}`;
    input.checked = duplicateCheckColumns.has(colKey);
    input.addEventListener('change', () => {
      if (input.checked) duplicateCheckColumns.add(colKey);
      else duplicateCheckColumns.delete(colKey);
      recalculateDuplicateRowList();
    });

    const label = document.createElement('label');
    label.htmlFor = `dup-chk-${colKey}`;
    label.innerText = name;

    div.appendChild(input);
    div.appendChild(label);
    checkContainer.appendChild(div);
  });

  document.getElementById('btn-dup-select-all').onclick = () => {
    headers.forEach(h => duplicateCheckColumns.add(h));
    renderDuplicatesTab();
  };

  document.getElementById('btn-dup-select-none').onclick = () => {
    duplicateCheckColumns.clear();
    renderDuplicatesTab();
  };

  // Run Explorer tabs inside the wrapper below checks
  let explorerWrapper = document.getElementById('dup-explorer-wrapper');
  if (!explorerWrapper) {
    explorerWrapper = document.createElement('div');
    explorerWrapper.id = 'dup-explorer-wrapper';
    explorerWrapper.style.marginTop = '16px';
    checkContainer.parentNode.insertBefore(explorerWrapper, checkContainer.nextSibling);
  }
  explorerWrapper.innerHTML = "";

  renderIssueExplorerSubtabs('duplicates', explorerWrapper, (keys, filterStatus) => {
    if (keys.length === 0) {
      explorerWrapper.appendChild(createEmptyStateDiv(`No ${filterStatus} duplicate records found.`));
      return;
    }

    const key = `duplicate_rows`;
    const card = document.createElement('div');
    card.className = 'quality-card';

    const hdr = document.createElement('div');
    hdr.className = 'quality-card-header';
    hdr.innerHTML = `
      <span class="quality-card-title">Duplicate Rows</span>
      <span class="quality-card-badge severity-medium">${filterStatus.toUpperCase()}</span>
    `;
    card.appendChild(hdr);

    const meta = document.createElement('div');
    meta.className = 'quality-card-meta';
    meta.innerText = filterStatus === 'resolved' 
      ? "All duplicates removed successfully!" 
      : `${activeDuplicateRowsList.length} matching duplicate rows found`;
    card.appendChild(meta);

    if (filterStatus === 'pending' || filterStatus === 'ignored') {
      const navBlock = createIssueNavigatorBlock('duplicates', 'duplicates');
      card.appendChild(navBlock);

      const actions = document.createElement('div');
      actions.className = 'quality-card-actions';
      actions.style.marginTop = '10px';

      const keepFirstBtn = document.createElement('button');
      keepFirstBtn.className = 'ccm-btn ccm-btn-primary';
      keepFirstBtn.innerText = 'Keep First, Delete Rest';
      keepFirstBtn.onclick = () => applyDuplicateAction('keep_first');

      const keepLastBtn = document.createElement('button');
      keepLastBtn.className = 'ccm-btn ccm-btn-primary';
      keepLastBtn.style.marginTop = '4px';
      keepLastBtn.innerText = 'Keep Last, Delete Rest';
      keepLastBtn.onclick = () => applyDuplicateAction('keep_last');

      actions.appendChild(keepFirstBtn);
      actions.appendChild(keepLastBtn);
      card.appendChild(actions);
    }

    const lifecycleRow = document.createElement('div');
    lifecycleRow.style.marginTop = '10px';
    lifecycleRow.style.display = 'flex';
    lifecycleRow.style.justifyContent = 'flex-end';

    if (filterStatus === 'pending') {
      const ignoreBtn = document.createElement('span');
      ignoreBtn.className = 'card-action-link ignore-link';
      ignoreBtn.innerHTML = '🚫 Ignore Issue';
      ignoreBtn.onclick = () => {
        issueStates[key] = 'ignored';
        updateQualityScoreBadge();
        renderActiveTabContent();
      };
      lifecycleRow.appendChild(ignoreBtn);
    } else if (filterStatus === 'ignored') {
      const restoreBtn = document.createElement('span');
      restoreBtn.className = 'card-action-link';
      restoreBtn.innerHTML = '🔄 Restore to Pending';
      restoreBtn.onclick = () => {
        issueStates[key] = 'pending';
        updateQualityScoreBadge();
        renderActiveTabContent();
      };
      lifecycleRow.appendChild(restoreBtn);
    }

    card.appendChild(lifecycleRow);
    explorerWrapper.appendChild(card);
  });
}

// 3. Data Types Explorer
function renderTypesTab() {
  const container = document.getElementById('type-columns-list');
  if (!container) return;
  container.innerHTML = "";

  renderIssueExplorerSubtabs('types', container, (colKeys, filterStatus) => {
    if (colKeys.length === 0) {
      container.appendChild(createEmptyStateDiv(`No ${filterStatus} type issues found.`));
      return;
    }

    colKeys.forEach(colKey => {
      const typeStat = qualityScanResults.typeIssues[colKey] || { detectedType: "Text", confidence: "100", issues: [] };
      const name = headerNames[colKey] || `Column ${colKey}`;
      const key = `type_${colKey}`;

      const card = document.createElement('div');
      card.className = 'quality-card';

      const hdr = document.createElement('div');
      hdr.className = 'quality-card-header';
      hdr.innerHTML = `
        <span class="quality-card-title">${name}</span>
        <span class="quality-card-badge severity-${typeStat.issues.length > 0 ? "medium" : "low"}">${filterStatus.toUpperCase()}</span>
      `;
      card.appendChild(hdr);

      const meta = document.createElement('div');
      meta.className = 'quality-card-meta';
      meta.innerHTML = `Detected: <strong>${typeStat.detectedType}</strong> (${typeStat.confidence}% confidence)`;
      if (typeStat.issues.length > 0 && filterStatus !== 'resolved') {
        meta.innerHTML += `<br/><span style="color: var(--warning); font-size: 11px;">⚠️ ${typeStat.issues.length} invalid values format issues</span>`;
      }
      card.appendChild(meta);

      if (filterStatus === 'pending' || filterStatus === 'ignored') {
        const navBlock = createIssueNavigatorBlock('types', colKey);
        card.appendChild(navBlock);

        const actions = document.createElement('div');
        actions.className = 'quality-card-actions';

        const select = document.createElement('select');
        select.className = 'quality-select';
        select.innerHTML = `
          <option value="">Convert column type...</option>
          <option value="Text">Text 🔤</option>
          <option value="Integer">Integer 🔢</option>
          <option value="Decimal">Decimal 🔢</option>
          <option value="Currency">Currency 💰</option>
          <option value="Percentage">Percentage 📊</option>
          <option value="Date">Date 📅</option>
          <option value="Boolean">Boolean 🔀</option>
          <option value="Email">Email 📧</option>
          <option value="Phone">Phone 📞</option>
          <option value="URL">URL 🔗</option>
        `;

        const applyBtn = document.createElement('button');
        applyBtn.className = 'ccm-btn ccm-btn-primary';
        applyBtn.style.marginTop = '4px';
        applyBtn.innerText = 'Convert Type';
        applyBtn.onclick = () => {
          if (select.value) applyTypeConversion(colKey, select.value);
        };

        actions.appendChild(select);
        actions.appendChild(applyBtn);
        card.appendChild(actions);
      }

      const lifecycleRow = document.createElement('div');
      lifecycleRow.style.marginTop = '10px';
      lifecycleRow.style.display = 'flex';
      lifecycleRow.style.justifyContent = 'flex-end';

      if (filterStatus === 'pending') {
        const ignoreBtn = document.createElement('span');
        ignoreBtn.className = 'card-action-link ignore-link';
        ignoreBtn.innerHTML = '🚫 Ignore Issue';
        ignoreBtn.onclick = () => {
          issueStates[key] = 'ignored';
          clearHighlightsForIssue('types', colKey);
          updateQualityScoreBadge();
          renderActiveTabContent();
          renderGridTable();
        };
        lifecycleRow.appendChild(ignoreBtn);
      } else if (filterStatus === 'ignored') {
        const restoreBtn = document.createElement('span');
        restoreBtn.className = 'card-action-link';
        restoreBtn.innerHTML = '🔄 Restore to Pending';
        restoreBtn.onclick = () => {
          issueStates[key] = 'pending';
          updateQualityScoreBadge();
          renderActiveTabContent();
          renderGridTable();
        };
        lifecycleRow.appendChild(restoreBtn);
      }

      card.appendChild(lifecycleRow);
      container.appendChild(card);
    });
  });
}

// 4. Outliers Explorer
function renderOutliersTab() {
  const container = document.getElementById('outlier-columns-list');
  if (!container) return;
  container.innerHTML = "";

  renderIssueExplorerSubtabs('outliers', container, (colKeys, filterStatus) => {
    if (colKeys.length === 0) {
      container.appendChild(createEmptyStateDiv(`No ${filterStatus} outlier issues found.`));
      return;
    }

    colKeys.forEach(colKey => {
      const stat = qualityScanResults.outliers[colKey] || { count: 0, bounds: { lower: 0, upper: 0 }, list: [] };
      const name = headerNames[colKey] || `Column ${colKey}`;
      const key = `outlier_${colKey}`;

      const card = document.createElement('div');
      card.className = 'quality-card';

      const hdr = document.createElement('div');
      hdr.className = 'quality-card-header';
      hdr.innerHTML = `
        <span class="quality-card-title">${name}</span>
        <span class="quality-card-badge severity-medium">${filterStatus.toUpperCase()}</span>
      `;
      card.appendChild(hdr);

      const meta = document.createElement('div');
      meta.className = 'quality-card-meta';
      meta.innerHTML = filterStatus === 'resolved'
        ? "All outliers capped or removed successfully!"
        : `<strong>${stat.count} outliers detected</strong><br/>IQR Bounds: [${stat.bounds.lower.toFixed(1)} , ${stat.bounds.upper.toFixed(1)}]`;
      card.appendChild(meta);

      if (filterStatus === 'pending' || filterStatus === 'ignored') {
        const navBlock = createIssueNavigatorBlock('outliers', colKey);
        card.appendChild(navBlock);

        const actions = document.createElement('div');
        actions.className = 'quality-card-actions';

        const select = document.createElement('select');
        select.className = 'quality-select';
        select.innerHTML = `
          <option value="cap">Cap Outlier Values</option>
          <option value="delete">Remove Outlier Rows</option>
          <option value="ignore">Ignore</option>
        `;

        const applyBtn = document.createElement('button');
        applyBtn.className = 'ccm-btn ccm-btn-primary';
        applyBtn.style.marginTop = '4px';
        applyBtn.innerText = 'Apply Action';
        applyBtn.onclick = () => applyOutlierAction(colKey, select.value);

        actions.appendChild(select);
        actions.appendChild(applyBtn);
        card.appendChild(actions);
      }

      const lifecycleRow = document.createElement('div');
      lifecycleRow.style.marginTop = '10px';
      lifecycleRow.style.display = 'flex';
      lifecycleRow.style.justifyContent = 'flex-end';

      if (filterStatus === 'pending') {
        const ignoreBtn = document.createElement('span');
        ignoreBtn.className = 'card-action-link ignore-link';
        ignoreBtn.innerHTML = '🚫 Ignore Issue';
        ignoreBtn.onclick = () => {
          issueStates[key] = 'ignored';
          clearHighlightsForIssue('outliers', colKey);
          updateQualityScoreBadge();
          renderActiveTabContent();
          renderGridTable();
        };
        lifecycleRow.appendChild(ignoreBtn);
      } else if (filterStatus === 'ignored') {
        const restoreBtn = document.createElement('span');
        restoreBtn.className = 'card-action-link';
        restoreBtn.innerHTML = '🔄 Restore to Pending';
        restoreBtn.onclick = () => {
          issueStates[key] = 'pending';
          updateQualityScoreBadge();
          renderActiveTabContent();
          renderGridTable();
        };
        lifecycleRow.appendChild(restoreBtn);
      }

      card.appendChild(lifecycleRow);
      container.appendChild(card);
    });
  });
}



// Custom affected checks Recalculators (Auto Reanalysis)
function recalcMissing(colKey) {
  const colIdx = headers.indexOf(colKey);
  if (colIdx === -1) return;

  const missingRows = [];
  gridData.forEach((row, rIdx) => {
    if (isMissingValue(row[colIdx])) {
      missingRows.push(rIdx);
    }
  });

  if (missingRows.length > 0) {
    const pct = (missingRows.length / gridData.length) * 100;
    let severity = "low";
    if (pct > 25) severity = "high";
    else if (pct > 5) severity = "medium";

    qualityScanResults.missingValues[colKey] = {
      count: missingRows.length,
      pct: pct.toFixed(1),
      severity,
      list: missingRows
    };
  } else {
    delete qualityScanResults.missingValues[colKey];
  }

  let total = 0;
  for (const c in qualityScanResults.missingValues) {
    total += qualityScanResults.missingValues[c].count;
  }
  qualityScanResults.totalMissing = total;

  resolveIssueStatuses();
  updateQualityScoreBadge();
}

function recalcDuplicates() {
  qualityScanResults.duplicates = [];
  const seen = new Map();
  const colIndices = Array.from(duplicateCheckColumns).map(h => headers.indexOf(h)).filter(idx => idx !== -1);

  if (colIndices.length === 0) {
    resolveIssueStatuses();
    updateQualityScoreBadge();
    return;
  }

  gridData.forEach((row, rIdx) => {
    const key = JSON.stringify(colIndices.map(idx => row[idx]));
    if (seen.has(key)) {
      qualityScanResults.duplicates.push(rIdx);
    } else {
      seen.set(key, rIdx);
    }
  });

  resolveIssueStatuses();
  updateQualityScoreBadge();
}

function recalcTypeIssues(colKey) {
  const colIdx = headers.indexOf(colKey);
  if (colIdx === -1) return;

  const cellsWithData = [];
  const typeFrequencies = {};

  gridData.forEach((row, rIdx) => {
    const val = row[colIdx];
    if (!isMissingValue(val)) {
      cellsWithData.push({ rIdx, val });
      const type = getCellDataType(val);
      if (type) {
        typeFrequencies[type] = (typeFrequencies[type] || 0) + 1;
      }
    }
  });

  if (cellsWithData.length > 0) {
    let primaryType = "Text";
    let maxCount = 0;
    for (const t in typeFrequencies) {
      if (typeFrequencies[t] > maxCount) {
        maxCount = typeFrequencies[t];
        primaryType = t;
      }
    }

    const confidence = (maxCount / cellsWithData.length) * 100;
    const invalidRows = [];

    cellsWithData.forEach(item => {
      const itemType = getCellDataType(item.val);
      let isCompatible = (itemType === primaryType);
      if (primaryType === "Decimal" && itemType === "Integer") isCompatible = true;
      if (primaryType === "Text") isCompatible = true;

      if (!isCompatible) {
        invalidRows.push({ rIdx: item.rIdx, val: item.val });
      }
    });

    qualityScanResults.typeIssues[colKey] = {
      detectedType: primaryType,
      confidence: confidence.toFixed(0),
      issues: invalidRows
    };
  } else {
    qualityScanResults.typeIssues[colKey] = {
      detectedType: "Text",
      confidence: "100",
      issues: []
    };
  }

  let total = 0;
  for (const c in qualityScanResults.typeIssues) {
    total += qualityScanResults.typeIssues[c].issues.length;
  }
  qualityScanResults.totalTypeIssues = total;

  resolveIssueStatuses();
  updateQualityScoreBadge();
}

function recalcOutliers(colKey) {
  const colIdx = headers.indexOf(colKey);
  if (colIdx === -1) return;

  const numericVals = [];
  gridData.forEach((row, rIdx) => {
    const val = row[colIdx];
    if (!isMissingValue(val)) {
      const clean = String(val).replace(/[$,%]/g, "").trim();
      const num = parseFloat(clean);
      if (!isNaN(num)) {
        numericVals.push({ rIdx, num });
      }
    }
  });

  if (numericVals.length >= 4) {
    numericVals.sort((a, b) => a.num - b.num);
    const getP = (p) => {
      const idx = (numericVals.length - 1) * p;
      const base = Math.floor(idx);
      const rest = idx - base;
      if (numericVals[base + 1]) {
        return numericVals[base].num + rest * (numericVals[base + 1].num - numericVals[base].num);
      }
      return numericVals[base].num;
    };

    const Q1 = getP(0.25);
    const Q3 = getP(0.75);
    const IQR = Q3 - Q1;
    const lower = Q1 - 1.5 * IQR;
    const upper = Q3 + 1.5 * IQR;

    const outlierRows = [];
    numericVals.forEach(item => {
      if (item.num < lower || item.num > upper) {
        outlierRows.push(item.rIdx);
      }
    });

    if (outlierRows.length > 0) {
      qualityScanResults.outliers[colKey] = {
        count: outlierRows.length,
        list: outlierRows,
        bounds: { lower, upper },
        Q1, Q3, IQR
      };
    } else {
      delete qualityScanResults.outliers[colKey];
    }
  } else {
    delete qualityScanResults.outliers[colKey];
  }

  let total = 0;
  for (const c in qualityScanResults.outliers) {
    total += qualityScanResults.outliers[c].count;
  }
  qualityScanResults.totalOutliers = total;

  resolveIssueStatuses();
  updateQualityScoreBadge();
}

function createEmptyStateDiv(text) {
  const div = document.createElement('div');
  div.style.textAlign = 'center';
  div.style.color = 'var(--text-muted)';
  div.style.padding = '24px';
  div.style.fontSize = '12.5px';
  div.innerHTML = `✨ ${text}`;
  return div;
}

// 5. Action History Tab Renderer and Step Control
function renderHistoryTab() {
  const container = document.getElementById('history-steps-container');
  if (!container) return;
  container.innerHTML = "";

  if (preprocessingHistory.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 24px; font-size: 12.5px;">
        📜 No preprocessing steps applied yet.
      </div>
    `;
    return;
  }

  preprocessingHistory.forEach((step, idx) => {
    const card = document.createElement('div');
    card.className = 'history-step-card';
    if (step.isUndone) {
      card.style.opacity = '0.5';
      card.style.textDecoration = 'line-through';
    }

    card.innerHTML = `
      <div class="history-step-title">${step.desc}</div>
      <div class="history-step-time">${step.time}</div>
      <div class="history-step-actions">
        <button class="history-step-btn" title="Undo Step" ${step.isUndone ? "disabled style='opacity:0.3; cursor:not-allowed;'" : ""}>Undo</button>
        <button class="history-step-btn" title="Redo Step" ${!step.isUndone ? "disabled style='opacity:0.3; cursor:not-allowed;'" : ""}>Redo</button>
      </div>
      <div class="history-step-details" style="display:none; font-size:11px; margin-top:8px; color:var(--text-secondary); border-top:1px solid var(--border-color); padding-top:4px;">
        <strong>Recipe Step ${idx + 1}:</strong> ${step.desc}. Verified on ${headers.length} columns and ${gridData.length} rows. Click again to hide details.
      </div>
    `;

    // Toggle Details on card click (excluding action buttons)
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('history-step-btn')) return;
      const details = card.querySelector('.history-step-details');
      if (details.style.display === 'none') {
        details.style.display = 'block';
      } else {
        details.style.display = 'none';
      }
    });

    const [undoBtn, redoBtn] = card.querySelectorAll('.history-step-btn');
    undoBtn.onclick = (e) => {
      e.stopPropagation();
      undoHistoryStep(step.id);
    };

    redoBtn.onclick = (e) => {
      e.stopPropagation();
      redoHistoryStep(step.id);
    };

    container.appendChild(card);
  });
}

function undoHistoryStep(stepId) {
  const stepIdx = preprocessingHistory.findIndex(s => s.id === stepId);
  if (stepIdx === -1) return;

  const step = preprocessingHistory[stepIdx];
  if (step.isUndone) return;

  // Revert state
  const prevState = JSON.parse(step.stateBefore);
  gridData = prevState.gridData;
  headers = prevState.headers;
  headerNames = prevState.headerNames;
  columnWidths = prevState.columnWidths;

  // Mark this and all later steps as undone
  for (let i = stepIdx; i < preprocessingHistory.length; i++) {
    preprocessingHistory[i].isUndone = true;
  }

  applySearchSortAndFilters();
  runQualityScan();
  renderActiveTabContent();
}

function redoHistoryStep(stepId) {
  const stepIdx = preprocessingHistory.findIndex(s => s.id === stepId);
  if (stepIdx === -1) return;

  const step = preprocessingHistory[stepIdx];
  if (!step.isUndone) return;

  // Restore state
  const nextState = JSON.parse(step.stateAfter);
  gridData = nextState.gridData;
  headers = nextState.headers;
  headerNames = nextState.headerNames;
  columnWidths = nextState.columnWidths;

  // Mark this and all earlier undone steps as active
  for (let i = 0; i <= stepIdx; i++) {
    preprocessingHistory[i].isUndone = false;
  }

  applySearchSortAndFilters();
  runQualityScan();
  renderActiveTabContent();
}

function logPreprocessingAction(desc) {
  const stateBefore = undoStack[undoStack.length - 1] || JSON.stringify({
    gridData: gridData,
    headers: [...headers],
    headerNames: { ...headerNames },
    columnWidths: { ...columnWidths }
  });

  const stepId = 'step-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

  preprocessingHistory.push({
    id: stepId,
    desc: desc,
    time: new Date().toLocaleTimeString(),
    stateBefore: stateBefore,
    stateAfter: null,
    isUndone: false
  });

  // Short delay to capture state AFTER current cleaning mutates gridData
  setTimeout(() => {
    finalizePreprocessingAction();
  }, 10);
}

function finalizePreprocessingAction() {
  if (preprocessingHistory.length === 0) return;
  const lastStep = preprocessingHistory[preprocessingHistory.length - 1];
  if (lastStep.stateAfter === null) {
    lastStep.stateAfter = JSON.stringify({
      gridData: gridData,
      headers: [...headers],
      headerNames: { ...headerNames },
      columnWidths: { ...columnWidths }
    });
  }
}

// 6. Action Handlers and Flashing Helpers
function flashCells(coords) {
  cellsToFlash.clear();
  coords.forEach(coord => {
    cellsToFlash.add(`${coord.r}_${coord.c}`);
  });
  renderGridTable();
  setTimeout(() => {
    coords.forEach(coord => {
      cellsToFlash.delete(`${coord.r}_${coord.c}`);
    });
    renderGridTable();
  }, 1500);
}

function recalculateDuplicateRowList() {
  recalcDuplicates();
  activeDuplicateRowsList = qualityScanResults.duplicates || [];
  renderActiveTabContent();
}

function applyDuplicateAction(action) {
  if (action === 'highlight') {
    if (activeDuplicateRowsList.length === 0) return;
    rowsToFlash.clear();
    activeDuplicateRowsList.forEach(rIdx => {
      rowsToFlash.add(rIdx);
    });
    // Scroll viewport to the first duplicate row
    viewport.scrollTop = activeDuplicateRowsList[0] * ROW_HEIGHT - 60;
    renderGridTable();
    setTimeout(() => {
      activeDuplicateRowsList.forEach(rIdx => {
        rowsToFlash.delete(rIdx);
      });
      renderGridTable();
    }, 2500);
    return;
  }

  if (action === 'keep_first') {
    if (activeDuplicateRowsList.length === 0) return;
    pushToUndo();

    const sortedIdx = [...activeDuplicateRowsList].sort((a, b) => b - a);
    sortedIdx.forEach(rIdx => {
      gridData.splice(rIdx, 1);
    });

    logPreprocessingAction(`Removed ${activeDuplicateRowsList.length} duplicate rows (kept first occurrence)`);
    clearHighlightsForIssue('duplicates', 'duplicates');

    applySearchSortAndFilters();
    recalcDuplicates();
    activeDuplicateRowsList = qualityScanResults.duplicates || [];
    renderActiveTabContent();
  } else if (action === 'keep_last') {
    const seen = new Map();
    const colIndices = Array.from(duplicateCheckColumns).map(h => headers.indexOf(h)).filter(idx => idx !== -1);
    const rowsToDelete = [];

    for (let rIdx = gridData.length - 1; rIdx >= 0; rIdx--) {
      const row = gridData[rIdx];
      const key = JSON.stringify(colIndices.map(idx => row[idx]));
      if (seen.has(key)) {
        rowsToDelete.push(rIdx);
      } else {
        seen.set(key, rIdx);
      }
    }

    if (rowsToDelete.length === 0) return;
    pushToUndo();

    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(rIdx => {
      gridData.splice(rIdx, 1);
    });

    logPreprocessingAction(`Removed ${rowsToDelete.length} duplicate rows (kept last occurrence)`);
    clearHighlightsForIssue('duplicates', 'duplicates');

    applySearchSortAndFilters();
    recalcDuplicates();
    activeDuplicateRowsList = qualityScanResults.duplicates || [];
    renderActiveTabContent();
  }
}

function applyTypeConversion(colKey, targetType) {
  const colIdx = headers.indexOf(colKey);
  if (colIdx === -1) return;

  pushToUndo();

  const colName = headerNames[colKey] || `Column ${colKey}`;
  const modifiedCoords = [];

  gridData.forEach((row, rIdx) => {
    const val = row[colIdx];
    if (isMissingValue(val)) return;

    let newVal = String(val);
    const cleanNum = String(val).replace(/[^\d.-]/g, "");

    if (targetType === 'Text') {
      newVal = String(val);
    } else if (targetType === 'Integer') {
      const num = Math.round(parseFloat(cleanNum));
      newVal = isNaN(num) ? "" : String(num);
    } else if (targetType === 'Decimal') {
      const num = parseFloat(cleanNum);
      newVal = isNaN(num) ? "" : String(num);
    } else if (targetType === 'Currency') {
      const num = parseFloat(cleanNum);
      newVal = isNaN(num) ? "" : "$" + num.toFixed(2);
    } else if (targetType === 'Percentage') {
      const num = parseFloat(cleanNum);
      newVal = isNaN(num) ? "" : num + "%";
    } else if (targetType === 'Date') {
      const parsed = Date.parse(val);
      if (!isNaN(parsed)) {
        const d = new Date(parsed);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        newVal = `${yyyy}-${mm}-${dd}`;
      } else {
        newVal = "";
      }
    } else if (targetType === 'Boolean') {
      const lower = String(val).trim().toLowerCase();
      newVal = (lower === 'true' || lower === 'yes' || lower === '1') ? 'True' : 'False';
    } else if (targetType === 'Email') {
      const match = String(val).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
      newVal = match ? match[0] : "";
    } else if (targetType === 'Phone') {
      newVal = String(val).replace(/[^\d+]/g, "");
    } else if (targetType === 'URL') {
      newVal = String(val).trim();
      if (newVal && !/^https?:\/\//i.test(newVal)) {
        newVal = "https://" + newVal;
      }
    }

    if (newVal !== String(val)) {
      gridData[rIdx][colIdx] = newVal;
      modifiedCoords.push({ r: rIdx, c: colIdx });
    }
  });

  logPreprocessingAction(`Converted type of ${colName} to ${targetType}`);
  clearHighlightsForIssue('types', colKey);

  applySearchSortAndFilters();
  
  // Auto Reanalysis
  recalcTypeIssues(colKey);
  recalcMissing(colKey);
  recalcOutliers(colKey);
  recalcDuplicates();

  renderActiveTabContent();

  if (modifiedCoords.length > 0) {
    flashCells(modifiedCoords);
  }
}

function applyOutlierAction(colKey, action) {
  if (action === 'ignore') {
    issueStates[`outlier_${colKey}`] = 'ignored';
    clearHighlightsForIssue('outliers', colKey);
    updateQualityScoreBadge();
    renderActiveTabContent();
    renderGridTable();
    return;
  }

  const colIdx = headers.indexOf(colKey);
  if (colIdx === -1) return;

  const stat = qualityScanResults.outliers[colKey];
  if (!stat) return;

  pushToUndo();

  const colName = headerNames[colKey] || `Column ${colKey}`;
  const { lower, upper } = stat.bounds;
  const modifiedCoords = [];
  const rowsToDelete = new Set();
  let actionDesc = "";

  if (action === 'cap') {
    gridData.forEach((row, rIdx) => {
      const val = row[colIdx];
      if (isMissingValue(val)) return;

      const cleanStr = String(val).replace(/[$,%]/g, "").trim();
      const num = parseFloat(cleanStr);
      if (!isNaN(num)) {
        let capped = false;
        let newVal = num;
        if (num < lower) {
          newVal = lower;
          capped = true;
        } else if (num > upper) {
          newVal = upper;
          capped = true;
        }

        if (capped) {
          const hasDollar = String(val).includes('$');
          const hasPercent = String(val).includes('%');
          let valToFill = String(newVal);
          if (hasDollar) {
            valToFill = "$" + newVal.toFixed(2);
          } else if (hasPercent) {
            valToFill = newVal.toFixed(1) + "%";
          } else {
            const decPlaces = (String(val).split('.')[1] || "").length;
            valToFill = decPlaces > 0 ? newVal.toFixed(decPlaces) : newVal.toFixed(0);
          }
          gridData[rIdx][colIdx] = valToFill;
          modifiedCoords.push({ r: rIdx, c: colIdx });
        }
      }
    });
    actionDesc = `Capped outlier values in ${colName} within bounds [${lower.toFixed(1)}, ${upper.toFixed(1)}]`;
  } else if (action === 'delete') {
    stat.list.forEach(rIdx => rowsToDelete.add(rIdx));
    actionDesc = `Removed ${stat.count} rows containing outliers in ${colName}`;
  }

  if (action === 'delete') {
    const sorted = Array.from(rowsToDelete).sort((a, b) => b - a);
    sorted.forEach(rIdx => {
      gridData.splice(rIdx, 1);
    });
  }

  logPreprocessingAction(actionDesc);
  clearHighlightsForIssue('outliers', colKey);

  applySearchSortAndFilters();
  
  // Auto Reanalysis
  recalcOutliers(colKey);
  recalcMissing(colKey);
  recalcTypeIssues(colKey);
  recalcDuplicates();

  renderActiveTabContent();

  if (modifiedCoords.length > 0) {
    flashCells(modifiedCoords);
  }
}

// ═══════════════════════════ NAVIGATION & HIGH-VOLUME HIGHLIGHTS ENGINE ═══════════════════════════

function getIssueRowIndices(category, colKey) {
  if (!qualityScanResults) return [];
  if (category === 'missing') {
    const stat = qualityScanResults.missingValues[colKey];
    return stat ? stat.list : [];
  } else if (category === 'types') {
    const stat = qualityScanResults.typeIssues[colKey];
    return stat ? stat.issues.map(issue => issue.rIdx) : [];
  } else if (category === 'outliers') {
    const stat = qualityScanResults.outliers[colKey];
    return stat ? stat.list : [];
  } else if (category === 'duplicates') {
    return activeDuplicateRowsList || [];
  }
  return [];
}

function navigateIssue(category, colKey, action) {
  const rowIndices = getIssueRowIndices(category, colKey);
  const count = rowIndices.length;
  if (count === 0) return;

  // Set active navigator card state if changed
  if (activeNavigatorCategory !== category || activeNavigatorColKey !== colKey) {
    activeNavigatorCategory = category;
    activeNavigatorColKey = colKey;
    activeNavigatorIndex = 0;
  }

  if (action === 'first') {
    activeNavigatorIndex = 0;
  } else if (action === 'last') {
    activeNavigatorIndex = count - 1;
  } else if (action === 'prev') {
    activeNavigatorIndex = (activeNavigatorIndex - 1 + count) % count;
  } else if (action === 'next') {
    activeNavigatorIndex = (activeNavigatorIndex + 1) % count;
  } else if (action === 'current') {
    if (activeNavigatorIndex === -1) activeNavigatorIndex = 0;
  }

  const targetRow = rowIndices[activeNavigatorIndex];
  const targetCol = category === 'duplicates' ? 0 : headers.indexOf(colKey);

  activeNavigatorCell = { r: targetRow, c: targetCol };

  // Scroll to and select target cell in visual grid
  const visualRowIdx = viewIndices.indexOf(targetRow);
  if (visualRowIdx !== -1) {
    activeSelection = {
      startRow: visualRowIdx,
      startCol: targetCol,
      endRow: visualRowIdx,
      endCol: targetCol
    };
    
    // Centering calculation:
    // Scroll Top = rowVisualOffset - viewportHeight/2 + rowHeight/2
    const targetScrollTop = visualRowIdx * ROW_HEIGHT - (viewport.clientHeight / 2) + (ROW_HEIGHT / 2);
    
    // Scroll Left = colVisualOffset - viewportWidth/2 + colWidth/2
    let colLeft = 48;
    for (let i = 0; i < targetCol; i++) {
      if (!hiddenColumns.has(headers[i])) {
        colLeft += columnWidths[headers[i]] || 120;
      }
    }
    const colWidth = columnWidths[headers[targetCol]] || 120;
    const targetScrollLeft = colLeft - (viewport.clientWidth / 2) + (colWidth / 2);

    viewport.scrollTo({
      top: Math.max(0, targetScrollTop),
      left: Math.max(0, targetScrollLeft),
      behavior: 'smooth'
    });
  }

  // Update card navigator UI text
  const cardBlock = document.getElementById(`nav-block-${category}-${colKey}`);
  if (cardBlock) {
    const label = cardBlock.querySelector('.navigator-count-label');
    if (label) {
      const singularName = category === 'outliers' ? 'Outlier' :
                           category === 'types' ? 'Type Issue' :
                           category === 'missing' ? 'Missing Value' : 'Duplicate';
      label.innerText = `${singularName} ${activeNavigatorIndex + 1} of ${count}`;
    }
  }

  renderGridTable();
}

function updateIssueHighlights(category, colKey, mode, forceClear = false) {
  const rowIndices = getIssueRowIndices(category, colKey);
  const colIdx = headers.indexOf(colKey);

  // Clear existing highlights for this specific card
  if (colIdx !== -1) {
    for (const key of activeHighlights.keys()) {
      if (key.endsWith(`_${colIdx}`)) {
        activeHighlights.delete(key);
      }
    }
  } else if (category === 'duplicates') {
    for (const key of activeHighlights.keys()) {
      if (activeHighlights.get(key) === 'duplicate') {
        activeHighlights.delete(key);
      }
    }
  }

  // Clear row highlights for these row indices
  rowIndices.forEach(r => activeRowHighlights.delete(r));

  if (forceClear) {
    highlightModes[`${category}_${colKey}`] = null;
    renderGridTable();
    // Re-render panel to reset active buttons
    renderActiveTabContent();
    return;
  }

  // Apply new highlight mode
  if (mode === 'cell') {
    rowIndices.forEach(r => {
      if (colIdx !== -1) {
        let hlType = 'type';
        if (category === 'outliers') hlType = 'outlier';
        else if (category === 'missing') hlType = 'missing';
        activeHighlights.set(`${r}_${colIdx}`, hlType);
      } else if (category === 'duplicates') {
        headers.forEach((_, cIdx) => {
          activeHighlights.set(`${r}_${cIdx}`, 'duplicate');
        });
      }
    });
  } else if (mode === 'row') {
    rowIndices.forEach(r => {
      activeRowHighlights.add(r);
    });
  }

  renderGridTable();
}

function clearHighlightsForIssue(category, colKey) {
  const rowIndices = getIssueRowIndices(category, colKey);
  const colIdx = headers.indexOf(colKey);

  if (colIdx !== -1) {
    for (const key of activeHighlights.keys()) {
      if (key.endsWith(`_${colIdx}`)) {
        activeHighlights.delete(key);
      }
    }
  } else if (category === 'duplicates') {
    for (const key of activeHighlights.keys()) {
      if (activeHighlights.get(key) === 'duplicate') {
        activeHighlights.delete(key);
      }
    }
  }

  rowIndices.forEach(r => activeRowHighlights.delete(r));
  highlightModes[`${category}_${colKey}`] = null;

  if (activeNavigatorCategory === category && activeNavigatorColKey === colKey) {
    activeNavigatorCategory = null;
    activeNavigatorColKey = null;
    activeNavigatorIndex = -1;
    activeNavigatorCell = { r: -1, c: -1 };
  }
}

function toggleAffectedRowsFilter(category, colKey) {
  const rowIndices = getIssueRowIndices(category, colKey);
  if (rowIndices.length === 0) return;

  const isCurrentFilter = affectedRowsFilter && activeNavigatorCategory === category && activeNavigatorColKey === colKey;

  if (isCurrentFilter) {
    affectedRowsFilter = null;
    document.getElementById('ws-filter-banner').style.display = 'none';
  } else {
    activeNavigatorCategory = category;
    activeNavigatorColKey = colKey;
    activeNavigatorIndex = 0;
    affectedRowsFilter = new Set(rowIndices);

    // Show filter banner
    const banner = document.getElementById('ws-filter-banner');
    const textEl = document.getElementById('ws-filter-banner-text-content');
    if (textEl) {
      const singularName = category === 'outliers' ? 'outlier' :
                           category === 'types' ? 'type issue' :
                           category === 'missing' ? 'missing value' : 'duplicate';
      const colName = colKey === 'duplicates' ? 'rows' : `cells in column ${headerNames[colKey] || colKey}`;
      textEl.innerHTML = `Showing only <strong>${rowIndices.length}</strong> rows containing ${singularName} ${colName}.`;
    }
    if (banner) banner.style.display = 'flex';
  }

  applySearchSortAndFilters();
}

function clearAffectedRowsFilter() {
  affectedRowsFilter = null;
  document.getElementById('ws-filter-banner').style.display = 'none';
  applySearchSortAndFilters();
  renderActiveTabContent();
}

function createIssueNavigatorBlock(category, colKey) {
  const rowIndices = getIssueRowIndices(category, colKey);
  const count = rowIndices.length;
  if (count === 0) {
    const empty = document.createElement('div');
    return empty;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'issue-navigator-card-block';
  wrapper.id = `nav-block-${category}-${colKey}`;

  let currentIdx = 0;
  if (activeNavigatorCategory === category && activeNavigatorColKey === colKey) {
    currentIdx = activeNavigatorIndex !== -1 ? activeNavigatorIndex : 0;
  }

  const singularName = category === 'outliers' ? 'Outlier' :
                       category === 'types' ? 'Type Issue' :
                       category === 'missing' ? 'Missing Value' : 'Duplicate';

  wrapper.innerHTML = `
    <div class="navigator-header">
      <span class="navigator-count-label">${singularName} ${currentIdx + 1} of ${count}</span>
      <span class="navigator-clear-hl" title="Clear highlights for this issue">Clear Highlights</span>
    </div>
    <div class="navigator-controls">
      <button class="nav-control-btn btn-first" title="Jump to First">⏮</button>
      <button class="nav-control-btn btn-prev" title="Previous">◀</button>
      <button class="nav-control-btn btn-next" title="Next">▶</button>
      <button class="nav-control-btn btn-last" title="Jump to Last">⏭</button>
    </div>
    <div class="navigator-options">
      <button class="nav-option-btn btn-hl-cell" title="Highlight Cells">Highlight Cell</button>
      <button class="nav-option-btn btn-hl-row" title="Highlight Rows">Highlight Row</button>
      <button class="nav-option-btn btn-view-rows" title="Filter to Affected Rows">View Affected Rows</button>
    </div>
  `;

  // Bind controls
  wrapper.querySelector('.btn-first').onclick = (e) => { e.stopPropagation(); navigateIssue(category, colKey, 'first'); };
  wrapper.querySelector('.btn-prev').onclick = (e) => { e.stopPropagation(); navigateIssue(category, colKey, 'prev'); };
  wrapper.querySelector('.btn-next').onclick = (e) => { e.stopPropagation(); navigateIssue(category, colKey, 'next'); };
  wrapper.querySelector('.btn-last').onclick = (e) => { e.stopPropagation(); navigateIssue(category, colKey, 'last'); };
  wrapper.querySelector('.navigator-clear-hl').onclick = (e) => { e.stopPropagation(); updateIssueHighlights(category, colKey, null, true); };

  // Bind options and set active states
  const key = `${category}_${colKey}`;
  const mode = highlightModes[key];
  const cellBtn = wrapper.querySelector('.btn-hl-cell');
  const rowBtn = wrapper.querySelector('.btn-hl-row');
  const viewBtn = wrapper.querySelector('.btn-view-rows');

  if (mode === 'cell') cellBtn.classList.add('active');
  else if (mode === 'row') rowBtn.classList.add('active');

  if (affectedRowsFilter && activeNavigatorCategory === category && activeNavigatorColKey === colKey) {
    viewBtn.classList.add('active');
  }

  cellBtn.onclick = (e) => {
    e.stopPropagation();
    const isAlreadyActive = highlightModes[key] === 'cell';
    highlightModes[key] = isAlreadyActive ? null : 'cell';
    updateIssueHighlights(category, colKey, highlightModes[key]);
    renderActiveTabContent();
  };

  rowBtn.onclick = (e) => {
    e.stopPropagation();
    const isAlreadyActive = highlightModes[key] === 'row';
    highlightModes[key] = isAlreadyActive ? null : 'row';
    updateIssueHighlights(category, colKey, highlightModes[key]);
    renderActiveTabContent();
  };

  viewBtn.onclick = (e) => {
    e.stopPropagation();
    toggleAffectedRowsFilter(category, colKey);
    renderActiveTabContent();
  };

  return wrapper;
}

// Bind visual filter banner close click
const bannerCloseBtn = document.getElementById('ws-filter-banner-close');
if (bannerCloseBtn) {
  bannerCloseBtn.addEventListener('click', () => {
    clearAffectedRowsFilter();
  });
}

// ═══════════════════════════ ONECLICK VISUALIZATION LOGIC ═══════════════════════════

// Global visualization state
let dashboardWidgets = [];
let activeVizTab = 'structure';
let selectedWidgetId = null;
let globalVizFilters = {};
let currentView = 'sheet'; // 'sheet' | 'dashboard'
let activeChartInstances = {};

// Phase 2 State
let calculatedFields = {}; // fieldId -> { id, title, formula }
let drillHierarchies = []; // list of { id, name, columns }
let activeDrillState = {}; // widgetId -> { hierarchy, currentLevelIdx, originalXCol, filterPath }


// Helper: Clean values for numeric aggregation
function getCleanNumericValue(val) {
  if (val === undefined || val === null || val === "") return 0;
  const cleaned = String(val).replace(/[^\d.-]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// Intercept row values for calculated fields or regular headers
function getRowValueByHeader(row, colHeader) {
  if (!colHeader) return "";
  if (calculatedFields && calculatedFields[colHeader]) {
    return evaluateCalculatedField(calculatedFields[colHeader], row);
  }
  const idx = headers.indexOf(colHeader);
  return idx !== -1 ? row[idx] : "";
}

// Evaluate a calculated field formula for a given row
function evaluateCalculatedField(field, row) {
  const rowValue = (colName) => {
    let colIdx = headers.findIndex(h => 
      (headerNames[h] || "").toLowerCase() === colName.toLowerCase() || 
      h.toLowerCase() === colName.toLowerCase()
    );
    if (colIdx === -1) return 0;
    const val = row[colIdx];
    if (val === undefined || val === null || val === "") return "";
    const cleanNum = String(val).replace(/[^\d.-]/g, "").trim();
    if (cleanNum !== "" && !isNaN(cleanNum)) {
      return parseFloat(cleanNum);
    }
    return val;
  };

  const IF = (cond, t, f) => cond ? t : f;
  const ROUND = (v, d) => {
    const num = parseFloat(v);
    if (isNaN(num)) return 0;
    return Math.round(num * Math.pow(10, d || 0)) / Math.pow(10, d || 0);
  };
  const YEAR = (d) => {
    const date = new Date(d);
    return isNaN(date.getTime()) ? 0 : date.getFullYear();
  };
  const MONTH = (d) => {
    const date = new Date(d);
    return isNaN(date.getTime()) ? 0 : date.getMonth() + 1;
  };
  const DAY = (d) => {
    const date = new Date(d);
    return isNaN(date.getTime()) ? 0 : date.getDate();
  };
  const UPPER = (t) => String(t).toUpperCase();
  const LOWER = (t) => String(t).toLowerCase();
  const CONCAT = (...args) => args.join("");

  let cleanFormula = field.formula
    .replace(/\bAND\b/gi, " && ")
    .replace(/\bOR\b/gi, " || ");

  let jsExpr = cleanFormula.replace(/\[([^\]]+)\]/g, (match, colName) => {
    return `rowValue(${JSON.stringify(colName)})`;
  });

  try {
    const fn = new Function('rowValue', 'IF', 'ROUND', 'YEAR', 'MONTH', 'DAY', 'UPPER', 'LOWER', 'CONCAT', `return (${jsExpr});`);
    const res = fn(rowValue, IF, ROUND, YEAR, MONTH, DAY, UPPER, LOWER, CONCAT);
    return res === undefined ? null : res;
  } catch (e) {
    return null;
  }
}


// Helper: Find matching column in list by regex
function findColInList(regex, list) {
  return list.find(h => regex.test((headerNames[h] || "").toLowerCase()));
}

// Column Type Profiler for Auto-Drafting and Recommendations
function profileColumns() {
  let dateCols = [];
  let catCols = [];
  let numCols = [];
  let currencyCols = [];
  let pctCols = [];
  let textCols = [];

  headers.forEach(h => {
    const type = detectColumnType(h);
    if (type === 'date') {
      dateCols.push(h);
    } else if (type === 'currency') {
      currencyCols.push(h);
      numCols.push(h);
    } else if (type === 'percentage') {
      pctCols.push(h);
      numCols.push(h);
    } else if (type === 'number') {
      numCols.push(h);
    } else {
      // Check if categorical text (low unique values ratio)
      const colIdx = headers.indexOf(h);
      const uniqueVals = new Set();
      let nonBlank = 0;
      for (let r = 0; r < Math.min(gridData.length, 100); r++) {
        const val = String(gridData[r][colIdx] || "").trim();
        if (val !== "") {
          nonBlank++;
          uniqueVals.add(val);
        }
      }
      if (nonBlank > 0 && uniqueVals.size / nonBlank < 0.4 && uniqueVals.size <= 15) {
        catCols.push(h);
      } else {
        textCols.push(h);
      }
    }
  });
  return { dateCols, catCols, numCols, currencyCols, pctCols, textCols };
}

// Generate Intelligent Business Dashboard Auto-Draft (KPIs, Trend, Categorical share, region distribution, details table)
function generateDefaultDashboardDraft() {
  dashboardWidgets = [];
  const profile = profileColumns();

  const revCol = findColInList(/revenue|sales|spend|price|amount|cost/i, headers) || profile.currencyCols[0] || profile.numCols[0];
  const secondMetricCol = findColInList(/profit|margin|income|units|quantity/i, headers) || profile.numCols[1] || profile.numCols[0];
  const idCol = findColInList(/id|order|transaction|cust/i, headers) || headers[0];
  const dateCol = profile.dateCols[0];
  const catCol = profile.catCols[0] || findColInList(/category|product|type|region/i, headers) || headers[0];
  const catCol2 = profile.catCols[1] || findColInList(/segment|channel|brand/i, headers);
  const regionCol = findColInList(/region|country|state|city/i, headers) || profile.catCols[1] || null;

  // ─── ROW 1: KPI Cards (4 × span-3) ───────────────────────────────────────

  // KPI 1: Total Revenue/Sales
  if (revCol) {
    dashboardWidgets.push({
      id: 'widget-kpi-1',
      title: 'Total Revenue',
      type: 'kpi',
      xCol: null,
      yCol: revCol,
      agg: 'sum',
      w: 3
    });
  }

  // KPI 2: Average Order Value or Total Units
  if (secondMetricCol) {
    dashboardWidgets.push({
      id: 'widget-kpi-2',
      title: secondMetricCol === revCol ? 'Avg Order Value' : 'Total Units',
      type: 'kpi',
      xCol: null,
      yCol: secondMetricCol,
      agg: secondMetricCol === revCol ? 'avg' : 'sum',
      w: 3
    });
  }

  // KPI 3: Total Orders
  dashboardWidgets.push({
    id: 'widget-kpi-3',
    title: 'Total Orders',
    type: 'kpi',
    xCol: null,
    yCol: idCol,
    agg: 'count',
    w: 3
  });

  // KPI 4: Unique Categories
  dashboardWidgets.push({
    id: 'widget-kpi-4',
    title: 'Unique Categories',
    type: 'kpi',
    xCol: null,
    yCol: catCol,
    agg: 'count_dist',
    w: 3
  });

  // ─── ROW 2: Hero Trend Chart (span-12) ───────────────────────────────────

  if (dateCol && revCol) {
    dashboardWidgets.push({
      id: 'widget-trend-line',
      title: 'Revenue Trend over Time',
      type: 'line',
      xCol: dateCol,
      yCol: revCol,
      agg: 'sum',
      w: 12
    });
  } else if (catCol && revCol) {
    // No date? Use a full-width bar as the hero
    dashboardWidgets.push({
      id: 'widget-hero-bar',
      title: `Revenue by ${headerNames[catCol] || catCol}`,
      type: 'bar',
      xCol: catCol,
      yCol: revCol,
      agg: 'sum',
      w: 12
    });
  }

  // ─── ROW 3: Category breakdown (span-6 + span-6) ─────────────────────────

  if (catCol && revCol) {
    dashboardWidgets.push({
      id: 'widget-cat-donut',
      title: `Sales by ${headerNames[catCol] || catCol}`,
      type: 'donut',
      xCol: catCol,
      yCol: revCol,
      agg: 'sum',
      w: 6
    });
  }

  if (regionCol && revCol && regionCol !== catCol) {
    dashboardWidgets.push({
      id: 'widget-region-bar',
      title: `Revenue by ${headerNames[regionCol] || regionCol}`,
      type: 'bar',
      xCol: regionCol,
      yCol: revCol,
      agg: 'sum',
      w: 6
    });
  } else if (catCol2 && revCol && catCol2 !== catCol) {
    // Fill the second half with a secondary category bar
    dashboardWidgets.push({
      id: 'widget-cat2-bar',
      title: `Revenue by ${headerNames[catCol2] || catCol2}`,
      type: 'bar',
      xCol: catCol2,
      yCol: revCol,
      agg: 'sum',
      w: 6
    });
  } else if (secondMetricCol && revCol && secondMetricCol !== revCol) {
    // Fallback: comparison metric bar
    dashboardWidgets.push({
      id: 'widget-metric2-bar',
      title: `${headerNames[secondMetricCol] || secondMetricCol} by ${headerNames[catCol] || catCol}`,
      type: 'bar',
      xCol: catCol,
      yCol: secondMetricCol,
      agg: 'sum',
      w: 6
    });
  }

  // ─── ROW 4: Full-width Report Table (span-12) ─────────────────────────────

  dashboardWidgets.push({
    id: 'widget-report-table',
    title: 'Transaction Detail Table',
    type: 'table',
    xCol: null,
    yCol: null,
    agg: null,
    w: 12
  });
}

// Helper: Calculate data aggregation for charts
function getAggregatedData(widget) {
  if (!widget.xCol && widget.type !== 'table') {
    return { labels: [], data: [] };
  }

  const groups = {};
  
  gridData.forEach(row => {
    // Respect global viz filters
    let matchesFilters = true;
    for (const filterColKey in globalVizFilters) {
      const fVal = globalVizFilters[filterColKey];
      if (fVal !== "") {
        const rowFilterVal = getRowValueByHeader(row, filterColKey);
        if (String(rowFilterVal).trim() !== fVal) {
          matchesFilters = false;
          break;
        }
      }
    }
    
    if (!matchesFilters) return;

    const xVal = widget.xCol ? String(getRowValueByHeader(row, widget.xCol) || "Blank").trim() : "All Data";
    const yVal = widget.yCol ? getRowValueByHeader(row, widget.yCol) : null;

    if (!groups[xVal]) {
      groups[xVal] = [];
    }
    if (yVal !== null) {
      groups[xVal].push(yVal);
    }
  });

  const labels = [];
  const data = [];

  for (const label in groups) {
    const vals = groups[label];
    let aggVal = 0;
    
    if (widget.agg === 'sum') {
      aggVal = vals.reduce((sum, v) => sum + getCleanNumericValue(v), 0);
    } else if (widget.agg === 'avg') {
      const numVals = vals.map(v => getCleanNumericValue(v));
      const sum = numVals.reduce((s, n) => s + n, 0);
      aggVal = numVals.length > 0 ? sum / numVals.length : 0;
    } else if (widget.agg === 'count') {
      aggVal = vals.length;
    } else if (widget.agg === 'count_dist') {
      const distinct = new Set(vals.map(v => String(v).trim()));
      aggVal = distinct.size;
    } else if (widget.agg === 'min') {
      const numVals = vals.map(v => getCleanNumericValue(v));
      aggVal = numVals.length > 0 ? Math.min(...numVals) : 0;
    } else if (widget.agg === 'max') {
      const numVals = vals.map(v => getCleanNumericValue(v));
      aggVal = numVals.length > 0 ? Math.max(...numVals) : 0;
    } else {
      aggVal = vals.length;
    }

    labels.push(label);
    data.push(aggVal);
  }

  const xColType = widget.xCol ? detectColumnType(widget.xCol) : 'text';
  if (xColType === 'date') {
    const combined = labels.map((l, i) => ({ label: l, val: data[i] }));
    combined.sort((a, b) => {
      const dA = Date.parse(a.label);
      const dB = Date.parse(b.label);
      if (isNaN(dA) || isNaN(dB)) return a.label.localeCompare(b.label);
      return dA - dB;
    });
    return {
      labels: combined.map(c => c.label),
      data: combined.map(c => c.val)
    };
  } else {
    const combined = labels.map((l, i) => ({ label: l, val: data[i] }));
    combined.sort((a, b) => b.val - a.val);
    
    // Pie and Donut top slices binning
    if ((widget.type === 'pie' || widget.type === 'donut') && combined.length > 8) {
      const top = combined.slice(0, 7);
      const rest = combined.slice(7);
      const otherSum = rest.reduce((sum, item) => sum + item.val, 0);
      top.push({ label: 'Other', val: otherSum });
      return {
        labels: top.map(c => c.label),
        data: top.map(c => c.val)
      };
    }

    return {
      labels: combined.map(c => c.label),
      data: combined.map(c => c.val)
    };
  }
}

// Helper: Calculate single KPI metric aggregate value
function getKpiValue(widget) {
  let filteredRows = gridData.filter(row => {
    for (const filterColKey in globalVizFilters) {
      const fVal = globalVizFilters[filterColKey];
      if (fVal !== "") {
        const rowFilterVal = getRowValueByHeader(row, filterColKey);
        if (String(rowFilterVal).trim() !== fVal) {
          return false;
        }
      }
    }
    return true;
  });

  if (!widget.yCol) {
    if (widget.agg === 'count') return filteredRows.length;
    return 0;
  }

  const values = filteredRows.map(row => getRowValueByHeader(row, widget.yCol));

  if (widget.agg === 'count') {
    return values.length;
  } else if (widget.agg === 'count_dist') {
    const distinct = new Set(values.map(v => String(v).trim()));
    return distinct.size;
  }

  const numVals = values.map(v => getCleanNumericValue(v));
  if (widget.agg === 'sum') {
    return numVals.reduce((s, n) => s + n, 0);
  } else if (widget.agg === 'avg') {
    const sum = numVals.reduce((s, n) => s + n, 0);
    return numVals.length > 0 ? sum / numVals.length : 0;
  } else if (widget.agg === 'min') {
    return numVals.length > 0 ? Math.min(...numVals) : 0;
  } else if (widget.agg === 'max') {
    return numVals.length > 0 ? Math.max(...numVals) : 0;
  }
  return 0;
}

// Helper: Formatter for KPI values
function formatKpiValue(val, colKey, agg) {
  if (agg === 'count' || agg === 'count_dist') {
    return Math.round(val).toLocaleString();
  }
  const type = detectColumnType(colKey);
  if (type === 'currency') {
    return "$" + val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else if (type === 'percentage') {
    return val.toFixed(1) + "%";
  } else {
    return val.toLocaleString(undefined, { maximumFractionDigits: 1 });
  }
}

// Color Palette generator
function getChartColors(count) {
  const baseColors = [
    { border: '#6366F1', bg: 'rgba(99, 102, 241, 0.85)', lightBg: 'rgba(99, 102, 241, 0.1)' },
    { border: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.85)', lightBg: 'rgba(139, 92, 246, 0.1)' },
    { border: '#22C55E', bg: 'rgba(34, 197, 94, 0.85)', lightBg: 'rgba(34, 197, 94, 0.1)' },
    { border: '#F59E0B', bg: 'rgba(245, 158, 11, 0.85)', lightBg: 'rgba(245, 158, 11, 0.1)' },
    { border: '#06B6D4', bg: 'rgba(6, 182, 212, 0.85)', lightBg: 'rgba(6, 182, 212, 0.1)' },
    { border: '#F43F5E', bg: 'rgba(244, 63, 94, 0.85)', lightBg: 'rgba(244, 63, 94, 0.1)' },
    { border: '#EC4899', bg: 'rgba(236, 72, 153, 0.85)', lightBg: 'rgba(236, 72, 153, 0.1)' },
    { border: '#3B82F6', bg: 'rgba(59, 130, 246, 0.85)', lightBg: 'rgba(59, 130, 246, 0.1)' }
  ];
  
  if (count === 1) {
    return baseColors[0].bg;
  }
  
  const borders = [];
  const bgs = [];
  for (let i = 0; i < count; i++) {
    const c = baseColors[i % baseColors.length];
    borders.push(c.border);
    bgs.push(c.bg);
  }
  return { borders, bgs };
}

// Chart.js rendering setup
function renderChart(widget, canvasId, labels, datasetData) {
  if (activeChartInstances[widget.id]) {
    activeChartInstances[widget.id].destroy();
  }

  const canvasEl = document.getElementById(canvasId);
  if (!canvasEl) return;
  const ctx = canvasEl.getContext('2d');
  
  let chartType = widget.type;
  if (chartType === 'donut') chartType = 'doughnut';

  const isDark = !document.body.classList.contains('light-theme');
  const textColor = isDark ? '#94A3B8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)';

  let dataConfig = {};
  let optionsConfig = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (e, elements, chart) => {
      if (elements && elements.length > 0) {
        const index = elements[0].index;
        const clickedLabel = chart.data.labels[index];
        if (typeof handleChartClick === 'function') {
          handleChartClick(widget, clickedLabel);
        }
      }
    },
    plugins: {
      legend: {
        display: (chartType === 'pie' || chartType === 'doughnut'),
        position: 'right',
        labels: {
          color: textColor,
          font: { family: 'Inter', size: 10 }
        }
      },
      tooltip: {
        backgroundColor: isDark ? '#1F2631' : '#FFFFFF',
        titleColor: isDark ? '#F8FAFC' : '#0F172A',
        bodyColor: isDark ? '#94A3B8' : '#475569',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        borderWidth: 1,
        titleFont: { family: 'Inter', weight: 'bold' },
        bodyFont: { family: 'Inter' }
      }
    },
    scales: {}
  };

  if (chartType !== 'pie' && chartType !== 'doughnut') {
    optionsConfig.scales = {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { family: 'Inter', size: 9 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { family: 'Inter', size: 9 },
          callback: function(value) {
            const yColType = detectColumnType(widget.yCol);
            if (yColType === 'currency') return '$' + value.toLocaleString();
            if (yColType === 'percentage') return value + '%';
            return value.toLocaleString();
          }
        }
      }
    };
  }

  if (chartType === 'line') {
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.25)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0)');

    dataConfig = {
      labels: labels,
      datasets: [{
        label: widget.title,
        data: datasetData,
        borderColor: '#6366F1',
        borderWidth: 2,
        backgroundColor: grad,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5
      }]
    };
  } else if (chartType === 'bar') {
    const colors = getChartColors(1);
    dataConfig = {
      labels: labels,
      datasets: [{
        label: widget.title,
        data: datasetData,
        backgroundColor: colors,
        borderColor: '#6366F1',
        borderWidth: 1,
        borderRadius: 4
      }]
    };
  } else {
    const colors = getChartColors(labels.length);
    dataConfig = {
      labels: labels,
      datasets: [{
        data: datasetData,
        backgroundColor: colors.bgs,
        borderColor: isDark ? '#161B22' : '#FFFFFF',
        borderWidth: 2
      }]
    };
    if (chartType === 'doughnut') {
      optionsConfig.cutout = '65%';
    }
  }

  activeChartInstances[widget.id] = new Chart(ctx, {
    type: chartType,
    data: dataConfig,
    options: optionsConfig
  });
}
// Render widgets on dashboard canvas
function renderDashboardCanvas() {
  const canvas = document.getElementById('dashboard-canvas');
  if (!canvas) return;

  const canvasWidth = canvas.clientWidth;

  canvas.innerHTML = "";

  if (dashboardWidgets.length === 0) {
    canvas.innerHTML = `
      <div style="grid-column: span 12; text-align: center; padding: 80px 40px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Your dashboard is empty</div>
        <div style="font-size: 13px; margin-bottom: 24px;">Create widgets or use Auto-Draft to generate a smart layout from your data.</div>
        <button class="ccm-btn ccm-btn-primary" id="btn-empty-canvas-add" style="margin: 0 auto;">➕ Add Widget</button>
      </div>
    `;
    const addEmptyBtn = document.getElementById('btn-empty-canvas-add');
    if (addEmptyBtn) {
      addEmptyBtn.onclick = () => addNewWidget();
    }
    return;
  }

  dashboardWidgets.forEach(widget => {
    const card = document.createElement('div');
    // Apply type-specific card class for correct sizing
    const typeClass = widget.type === 'kpi' ? 'kpi-card'
                    : widget.type === 'table' ? 'table-card'
                    : 'chart-card';
    
    // Enforce minimum chart size of 500px width for charts (non-kpi, non-table)
    let effectiveW = widget.w;
    if (widget.type !== 'kpi' && widget.type !== 'table') {
      if (canvasWidth > 0) {
        const colWidth = canvasWidth / 12;
        if (colWidth * effectiveW < 500) {
          // Auto-upgrade to span-6 or span-12 depending on column width
          if (colWidth * 6 >= 500) {
            effectiveW = Math.max(effectiveW, 6);
          } else {
            effectiveW = 12;
          }
        }
      }
    }

    card.className = `viz-widget-card span-${effectiveW} ${typeClass}`;
    card.dataset.id = widget.id;
    if (selectedWidgetId === widget.id) {
      card.classList.add('selected');
    }

    card.innerHTML = `
      <div class="viz-widget-header">
        <span class="viz-widget-title" title="${widget.title}">${widget.title}</span>
        <div class="viz-widget-actions">
          <button class="viz-widget-btn btn-widget-edit" title="Edit Widget">⚙️</button>
          <button class="viz-widget-btn delete btn-widget-delete" title="Delete Widget">🗑️</button>
        </div>
      </div>
      <div class="viz-widget-body" id="body-${widget.id}">
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.viz-widget-btn')) return;
      selectWidget(widget.id);
    });

    card.querySelector('.btn-widget-edit').onclick = (e) => {
      e.stopPropagation();
      selectWidget(widget.id);
    };

    card.querySelector('.btn-widget-delete').onclick = (e) => {
      e.stopPropagation();
      deleteWidget(widget.id);
    };

    canvas.appendChild(card);

    const bodyContainer = document.getElementById(`body-${widget.id}`);

    if (widget.type === 'kpi') {
      const rawVal = getKpiValue(widget);
      const valStr = formatKpiValue(rawVal, widget.yCol, widget.agg);
      const colLabel = widget.yCol ? (headerNames[widget.yCol] || widget.yCol) : "Records";
      const aggLabel = widget.agg === 'count_dist' ? 'DISTINCT' : widget.agg.toUpperCase();
      
      let trendHtml = "";
      const colIdx = headers.indexOf(widget.yCol);
      if (colIdx !== -1 && gridData.length >= 2) {
        const mid = Math.floor(gridData.length / 2);
        const firstHalf = gridData.slice(0, mid).map(r => getCleanNumericValue(r[colIdx]));
        const secondHalf = gridData.slice(mid).map(r => getCleanNumericValue(r[colIdx]));
        const sumFirst = firstHalf.reduce((s, n) => s + n, 0);
        const sumSecond = secondHalf.reduce((s, n) => s + n, 0);
        if (sumFirst > 0) {
          const change = ((sumSecond - sumFirst) / sumFirst) * 100;
          if (change >= 0) {
            trendHtml = `<span class="viz-kpi-trend up">↑ ${change.toFixed(1)}%</span>`;
          } else {
            trendHtml = `<span class="viz-kpi-trend down">↓ ${Math.abs(change).toFixed(1)}%</span>`;
          }
        }
      }

      // Pick a contextual icon for this KPI
      const kpiIconMap = [
        [/revenue|sales|income|amount|spend/i, '💰'],
        [/profit|margin/i, '📈'],
        [/unit|quantity|volume/i, '📦'],
        [/order|transaction/i, '🧾'],
        [/customer|client|user/i, '👤'],
        [/category|product|brand|segment/i, '🏷️'],
        [/region|country|city|state/i, '🌍'],
        [/count|total|records/i, '🔢'],
        [/avg|average|mean/i, '⚖️'],
      ];
      let kpiIcon = '📊';
      const titleLower = widget.title.toLowerCase();
      for (const [pattern, icon] of kpiIconMap) {
        if (pattern.test(titleLower) || (widget.yCol && pattern.test((headerNames[widget.yCol] || widget.yCol).toLowerCase()))) {
          kpiIcon = icon;
          break;
        }
      }

      bodyContainer.innerHTML = `
        <div class="viz-kpi-content">
          <div class="viz-kpi-icon">${kpiIcon}</div>
          <span class="viz-kpi-label">${aggLabel} · ${colLabel}</span>
          <div class="viz-kpi-value">${valStr}</div>
          ${trendHtml}
        </div>
      `;
    } else if (widget.type === 'table') {
      const filteredRows = gridData.filter(row => {
        for (const filterColKey in globalVizFilters) {
          const fVal = globalVizFilters[filterColKey];
          if (fVal !== "") {
            const rowFilterVal = getRowValueByHeader(row, filterColKey);
            if (String(rowFilterVal).trim() !== fVal) {
              return false;
            }
          }
        }
        return true;
      });

      const displayHeaders = [...headers, ...Object.keys(calculatedFields)];
      let ths = displayHeaders.map(h => `<th>${headerNames[h] || (calculatedFields[h] && calculatedFields[h].title) || h}</th>`).join('');
      let trs = filteredRows.slice(0, 20).map(row => {
        let tds = displayHeaders.map(h => {
          const v = getRowValueByHeader(row, h);
          return `<td title="${v}">${v !== null && v !== undefined ? v : ""}</td>`;
        }).join('');
        return `<tr>${tds}</tr>`;
      }).join('');

      bodyContainer.innerHTML = `
        <div class="viz-table-wrapper" style="max-height: 300px;">
          <table class="viz-table">
            <thead><tr>${ths}</tr></thead>
            <tbody>${trs}</tbody>
          </table>
        </div>
        <div style="font-size: 10px; color: var(--text-muted); margin-top: 6px; text-align: right;">
          Showing top 20 of ${filteredRows.length} filtered records. <a href="#" id="link-go-sheet-${widget.id}" style="color: var(--primary); text-decoration: underline;">Edit in sheet</a>
        </div>
      `;
      
      const link = document.getElementById(`link-go-sheet-${widget.id}`);
      if (link) {
        link.onclick = (e) => {
          e.preventDefault();
          switchToSheetView();
        };
      }
    } else {
      // Chart widgets: set explicit height on the body so Chart.js can measure
      bodyContainer.style.height = '300px';
      bodyContainer.innerHTML = `<canvas id="canvas-${widget.id}"></canvas>`;
      const aggData = getAggregatedData(widget);
      // Give DOM time to paint before Chart.js measures dimensions
      requestAnimationFrame(() => {
        renderChart(widget, `canvas-${widget.id}`, aggData.labels, aggData.data);
      });
    }
  });
}

// Widget selection and panel synchronization
function selectWidget(widgetId) {
  selectedWidgetId = widgetId;
  const widget = dashboardWidgets.find(w => w.id === widgetId);
  
  document.querySelectorAll('.viz-widget-card').forEach(card => {
    if (card.dataset.id === widgetId) card.classList.add('selected');
    else card.classList.remove('selected');
  });

  document.querySelectorAll('.viz-widget-list-item').forEach(item => {
    if (item.dataset.id === widgetId) item.classList.add('active');
    else item.classList.remove('active');
  });

  switchVizTab('settings');

  if (widget) {
    document.getElementById('viz-no-widget-selected').style.display = 'none';
    document.getElementById('viz-settings-fields').style.display = 'flex';

    document.getElementById('viz-widget-title-input').value = widget.title;
    document.getElementById('viz-widget-type-select').value = widget.type;
    document.getElementById('viz-widget-width-select').value = widget.w;

    const xSelect = document.getElementById('viz-widget-x-select');
    const ySelect = document.getElementById('viz-widget-y-select');
    const aggSelect = document.getElementById('viz-widget-agg-select');

    const displayCols = [...headers, ...Object.keys(calculatedFields)];
    const getColDisplayName = (h) => headerNames[h] || (calculatedFields[h] && calculatedFields[h].title) || h;

    xSelect.innerHTML = displayCols.map(h => `<option value="${h}">${getColDisplayName(h)}</option>`).join('');
    ySelect.innerHTML = `<option value="">None (Count Rows)</option>` + displayCols.map(h => `<option value="${h}">${getColDisplayName(h)}</option>`).join('');

    xSelect.value = widget.xCol;
    ySelect.value = widget.yCol;
    aggSelect.value = widget.agg || "sum";

    toggleSettingsFieldsByType(widget.type);
  }
}

function toggleSettingsFieldsByType(type) {
  const fX = document.getElementById('viz-field-x-col');
  const fY = document.getElementById('viz-field-y-col');
  const fAgg = document.getElementById('viz-field-agg');

  if (type === 'table') {
    fX.style.display = 'none';
    fY.style.display = 'none';
    fAgg.style.display = 'none';
  } else if (type === 'kpi') {
    fX.style.display = 'none';
    fY.style.display = 'block';
    fAgg.style.display = 'block';
  } else {
    fX.style.display = 'block';
    fY.style.display = 'block';
    fAgg.style.display = 'block';
  }
}

// Widget Settings apply handler
const btnSaveWidgetSettings = document.getElementById('btn-save-widget-settings');
if (btnSaveWidgetSettings) {
  btnSaveWidgetSettings.onclick = () => {
    if (!selectedWidgetId) return;
    const widget = dashboardWidgets.find(w => w.id === selectedWidgetId);
    if (widget) {
      widget.title = document.getElementById('viz-widget-title-input').value.trim();
      widget.type = document.getElementById('viz-widget-type-select').value;
      widget.xCol = document.getElementById('viz-widget-x-select').value;
      widget.yCol = document.getElementById('viz-widget-y-select').value;
      widget.agg = document.getElementById('viz-widget-agg-select').value;
      widget.w = parseInt(document.getElementById('viz-widget-width-select').value);

      renderDashboardCanvas();
      renderStructureTab();
      selectWidget(selectedWidgetId);
    }
  };
}

const vizWidgetTypeSelect = document.getElementById('viz-widget-type-select');
if (vizWidgetTypeSelect) {
  vizWidgetTypeSelect.addEventListener('change', (e) => {
    toggleSettingsFieldsByType(e.target.value);
  });
}

// Render Structure tab widgets list
function renderStructureTab() {
  const container = document.getElementById('viz-widget-list-container');
  if (!container) return;

  container.innerHTML = "";

  if (dashboardWidgets.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11px; padding: 12px;">No widgets in layout.</div>`;
    return;
  }

  dashboardWidgets.forEach((widget, idx) => {
    const item = document.createElement('div');
    item.className = 'viz-widget-list-item';
    item.dataset.id = widget.id;
    if (selectedWidgetId === widget.id) {
      item.classList.add('active');
    }

    const typeIcons = {
      kpi: '🔢',
      line: '📈',
      bar: '📊',
      pie: '🍕',
      donut: '🍩',
      table: '📋'
    };

    item.innerHTML = `
      <div class="viz-widget-info">
        <span class="viz-widget-list-title">${widget.title}</span>
        <div class="viz-widget-list-meta">
          <span>${typeIcons[widget.type] || '📊'} ${widget.type.toUpperCase()}</span>
          <span class="viz-widget-list-badge">w:${widget.w}/12</span>
        </div>
      </div>
      <div class="viz-widget-list-actions">
        <button class="history-step-btn btn-swap-up" title="Move Up" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>▲</button>
        <button class="history-step-btn btn-swap-down" title="Move Down" ${idx === dashboardWidgets.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>▼</button>
        <button class="history-step-btn btn-list-del" title="Delete" style="color: var(--error); border-color: rgba(239, 68, 68, 0.2);">🗑️</button>
      </div>
    `;

    item.onclick = (e) => {
      if (e.target.closest('.history-step-btn')) return;
      selectWidget(widget.id);
    };

    item.querySelector('.btn-swap-up').onclick = (e) => {
      e.stopPropagation();
      swapWidgets(idx, idx - 1);
    };

    item.querySelector('.btn-swap-down').onclick = (e) => {
      e.stopPropagation();
      swapWidgets(idx, idx + 1);
    };

    item.querySelector('.btn-list-del').onclick = (e) => {
      e.stopPropagation();
      deleteWidget(widget.id);
    };

    container.appendChild(item);
  });
}

function swapWidgets(idx1, idx2) {
  if (idx1 < 0 || idx1 >= dashboardWidgets.length || idx2 < 0 || idx2 >= dashboardWidgets.length) return;
  const temp = dashboardWidgets[idx1];
  dashboardWidgets[idx1] = dashboardWidgets[idx2];
  dashboardWidgets[idx2] = temp;
  
  renderDashboardCanvas();
  renderStructureTab();
}

function deleteWidget(widgetId) {
  const idx = dashboardWidgets.findIndex(w => w.id === widgetId);
  if (idx !== -1) {
    dashboardWidgets.splice(idx, 1);
    if (selectedWidgetId === widgetId) {
      selectedWidgetId = null;
      document.getElementById('viz-no-widget-selected').style.display = 'block';
      document.getElementById('viz-settings-fields').style.display = 'none';
    }
    if (activeChartInstances[widgetId]) {
      activeChartInstances[widgetId].destroy();
      delete activeChartInstances[widgetId];
    }
    renderDashboardCanvas();
    renderStructureTab();
  }
}

function addNewWidget() {
  const newId = 'widget-' + Date.now();
  const profile = profileColumns();
  
  const xCol = profile.catCols[0] || profile.dateCols[0] || headers[0];
  const yCol = profile.numCols[0] || profile.currencyCols[0] || headers[0];

  const newWidget = {
    id: newId,
    title: `New Widget ${dashboardWidgets.length + 1}`,
    type: 'bar',
    xCol: xCol,
    yCol: yCol,
    agg: 'sum',
    w: 6
  };

  dashboardWidgets.push(newWidget);
  renderDashboardCanvas();
  renderStructureTab();
  selectWidget(newId);
}

const btnAddWidgetTrigger = document.getElementById('btn-add-widget-trigger');
if (btnAddWidgetTrigger) {
  btnAddWidgetTrigger.onclick = () => {
    addNewWidget();
  };
}

// Render Global visual filters in sidebar
function renderFiltersTab() {
  const container = document.getElementById('viz-global-filters-container');
  if (!container) return;

  container.innerHTML = "";

  const catCols = [];
  headers.forEach(h => {
    const colIdx = headers.indexOf(h);
    const uniqueVals = new Set();
    for (let r = 0; r < gridData.length; r++) {
      const val = String(gridData[r][colIdx] || "").trim();
      if (val !== "") {
        uniqueVals.add(val);
      }
    }
    // Limit to columns with cardinality between 2 and 15
    if (uniqueVals.size >= 1 && uniqueVals.size <= 15) {
      catCols.push({ colKey: h, name: headerNames[h] || h, values: Array.from(uniqueVals).sort() });
    }
  });

  if (catCols.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11.5px; padding: 12px;">No categorical filterable columns detected (cardinality 2-15).</div>`;
    return;
  }

  catCols.forEach(col => {
    const group = document.createElement('div');
    group.className = 'viz-filter-group';

    const label = document.createElement('label');
    label.className = 'viz-filter-label';
    label.innerText = col.name;

    const select = document.createElement('select');
    select.className = 'quality-select viz-filter-select';
    
    select.innerHTML = `<option value="">All values</option>` + col.values.map(v => `<option value="${v}">${v}</option>`).join('');
    select.value = globalVizFilters[col.colKey] || "";

    select.addEventListener('change', () => {
      globalVizFilters[col.colKey] = select.value;
      renderDashboardCanvas();
    });

    group.appendChild(label);
    group.appendChild(select);
    container.appendChild(group);
  });
}

const btnClearGlobalVizFilters = document.getElementById('btn-clear-global-viz-filters');
if (btnClearGlobalVizFilters) {
  btnClearGlobalVizFilters.onclick = () => {
    globalVizFilters = {};
    renderFiltersTab();
    renderDashboardCanvas();
  };
}

// Render Auto-Recommendations in Recs Tab
function renderRecommendationsTab() {
  const container = document.getElementById('viz-recs-container');
  if (!container) return;

  container.innerHTML = "";

  const profile = profileColumns();
  const recs = [];

  if (profile.dateCols.length > 0 && profile.numCols.length > 0) {
    const dateCol = profile.dateCols[0];
    const numCol = profile.numCols[0];
    const hasTrend = dashboardWidgets.some(w => w.type === 'line' && w.xCol === dateCol && w.yCol === numCol);
    if (!hasTrend) {
      recs.push({
        title: `${headerNames[numCol]} Trend over Time`,
        desc: `Line chart visualizing aggregation of ${headerNames[numCol]} over ${headerNames[dateCol]}.`,
        type: 'line',
        xCol: dateCol,
        yCol: numCol,
        agg: 'sum',
        w: 8,
        icon: '📈'
      });
    }
  }

  if (profile.catCols.length > 0) {
    const catCol = profile.catCols[0];
    const valCol = profile.numCols[0] || "";
    const hasDist = dashboardWidgets.some(w => (w.type === 'pie' || w.type === 'donut') && w.xCol === catCol);
    if (!hasDist) {
      recs.push({
        title: `${headerNames[catCol]} breakdown`,
        desc: `Donut chart showing unit share/ratio by ${headerNames[catCol]}.`,
        type: 'donut',
        xCol: catCol,
        yCol: valCol,
        agg: valCol ? 'sum' : 'count',
        w: 4,
        icon: '🍩'
      });
    }
  }

  if (profile.catCols.length > 1) {
    const catCol = profile.catCols[1];
    const valCol = profile.numCols[0] || "";
    const hasBar = dashboardWidgets.some(w => w.type === 'bar' && w.xCol === catCol);
    if (!hasBar) {
      recs.push({
        title: `Performance by ${headerNames[catCol]}`,
        desc: `Bar chart analyzing metrics across ${headerNames[catCol]}.`,
        type: 'bar',
        xCol: catCol,
        yCol: valCol,
        agg: valCol ? 'sum' : 'count',
        w: 6,
        icon: '📊'
      });
    }
  }

  const hasTable = dashboardWidgets.some(w => w.type === 'table');
  if (!hasTable) {
    recs.push({
      title: `Dataset Data Grid Visual`,
      desc: `Interactive report table summarizing all records.`,
      type: 'table',
      xCol: null,
      yCol: null,
      agg: null,
      w: 12,
      icon: '📋'
    });
  }

  if (recs.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 11.5px; padding: 12px;">No new recommendations available.</div>`;
    return;
  }

  recs.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'viz-rec-card';
    card.innerHTML = `
      <div class="viz-rec-title">${rec.title}</div>
      <div class="viz-rec-meta">${rec.desc}</div>
      <div class="viz-rec-preview">${rec.icon}</div>
      <button class="ccm-btn ccm-btn-secondary" style="margin-top: 4px; padding: 4px 0; font-size: 11px; width: 100%;">Add to Dashboard</button>
    `;

    card.querySelector('button').onclick = () => {
      const newWidget = {
        id: 'widget-' + Date.now(),
        title: rec.title,
        type: rec.type,
        xCol: rec.xCol,
        yCol: rec.yCol,
        agg: rec.agg,
        w: rec.w
      };
      dashboardWidgets.push(newWidget);
      renderDashboardCanvas();
      renderStructureTab();
      renderRecommendationsTab();
      selectWidget(newWidget.id);
    };

    container.appendChild(card);
  });
}

// Switcher between visualization tabs
function switchVizTab(tabName) {
  activeVizTab = tabName;
  
  document.querySelectorAll('.viz-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabName) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  document.querySelectorAll('.viz-tab-content').forEach(content => {
    if (content.id === `viztab-${tabName}`) content.style.display = 'block';
    else content.style.display = 'none';
  });

  if (tabName === 'structure') renderStructureTab();
  else if (tabName === 'filters') renderFiltersTab();
  else if (tabName === 'recs') renderRecommendationsTab();
}

document.querySelectorAll('.viz-tab-btn').forEach(btn => {
  btn.onclick = () => switchVizTab(btn.dataset.tab);
});

// View Switcher logic (Sheet View vs Dashboard)
const btnSwitchSheet = document.getElementById('btn-switch-sheet');
const btnSwitchDash = document.getElementById('btn-switch-dash');
const wsBtnVisualize = document.getElementById('ws-btn-visualize');
const dashboardCanvasViewport = document.getElementById('dashboard-canvas-viewport');
const wsSidebarVisualization = document.getElementById('ws-sidebar-visualization');

function switchToDashboardView() {
  currentView = 'dashboard';
  
  if (btnSwitchSheet) {
    btnSwitchSheet.classList.remove('active');
    btnSwitchSheet.style.background = 'transparent';
    btnSwitchSheet.style.color = 'var(--text-secondary)';
  }

  if (btnSwitchDash) {
    btnSwitchDash.classList.add('active');
    btnSwitchDash.style.background = 'rgba(99, 102, 241, 0.15)';
    btnSwitchDash.style.color = '#818cf8';
  }

  // Hide spreadsheet viewport, status bar, and toolbar controls
  const spreadsheetViewport = document.getElementById('spreadsheet-viewport');
  if (spreadsheetViewport) spreadsheetViewport.style.display = 'none';
  
  const gridControls = document.getElementById('spreadsheet-grid-controls');
  if (gridControls) gridControls.style.display = 'none';
  
  const statusbar = document.querySelector('.spreadsheet-statusbar');
  if (statusbar) statusbar.style.display = 'none';

  // Show dashboard canvas
  if (dashboardCanvasViewport) dashboardCanvasViewport.style.display = 'flex';

  // Inject dashboard header if not already present
  if (dashboardCanvasViewport && !document.getElementById('dashboard-header-row')) {
    const datasetNameEl = document.getElementById('ws-dataset-name');
    const datasetName = datasetNameEl ? datasetNameEl.innerText : 'Dataset';
    const rowCount = gridData.length.toLocaleString();
    const colCount = headers.length;
    const now = new Date().toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const header = document.createElement('div');
    header.className = 'dashboard-header-row';
    header.id = 'dashboard-header-row';
    header.innerHTML = `
      <div>
        <div class="dashboard-header-title">
          <span class="dash-icon">📊</span>
          <div>
            <div>${datasetName} Dashboard</div>
            <div class="dashboard-header-meta">${rowCount} rows · ${colCount} columns · Last generated ${now}</div>
          </div>
        </div>
      </div>
      <div class="dashboard-header-actions">
        <button class="btn-secondary btn-sm" id="btn-dash-regenerate" style="font-size:11px; padding: 4px 10px; display:flex; align-items:center; gap:5px;">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Regenerate
        </button>
      </div>
    `;
    dashboardCanvasViewport.insertBefore(header, dashboardCanvasViewport.firstChild);

    // Bind regenerate button
    const regenBtn = document.getElementById('btn-dash-regenerate');
    if (regenBtn) {
      regenBtn.onclick = () => {
        dashboardWidgets = [];
        generateDefaultDashboardDraft();
        renderDashboardCanvas();
        renderStructureTab();
      };
    }
  }

  // Panel visibility is now managed by PanelManager (see bottom of file)
  // datasetInfoPanel, columnStatsPanel, qualityPanel, wsSidebarVisualization display
  // and sidebarEl collapsed state are handled there.

  // If dashboardWidgets is empty, auto generate draft
  if (dashboardWidgets.length === 0) {
    generateDefaultDashboardDraft();
  }

  // Draw dashboard
  renderDashboardCanvas();
  
  // Render active visualization builder sidebar tabs
  switchVizTab(activeVizTab);
}

function switchToSheetView() {
  currentView = 'sheet';

  if (btnSwitchDash) {
    btnSwitchDash.classList.remove('active');
    btnSwitchDash.style.background = 'transparent';
    btnSwitchDash.style.color = 'var(--text-secondary)';
  }

  if (btnSwitchSheet) {
    btnSwitchSheet.classList.add('active');
    btnSwitchSheet.style.background = 'rgba(99, 102, 241, 0.15)';
    btnSwitchSheet.style.color = '#818cf8';
  }

  // Show spreadsheet viewport, status bar, and toolbar controls
  const spreadsheetViewport = document.getElementById('spreadsheet-viewport');
  if (spreadsheetViewport) spreadsheetViewport.style.display = 'block';
  
  const gridControls = document.getElementById('spreadsheet-grid-controls');
  if (gridControls) gridControls.style.display = 'flex';
  
  const statusbar = document.querySelector('.spreadsheet-statusbar');
  if (statusbar) statusbar.style.display = 'flex';

  // Hide dashboard canvas
  if (dashboardCanvasViewport) dashboardCanvasViewport.style.display = 'none';

  // Panel visibility managed by PanelManager — just restore dataset info visibility
  if (datasetInfoPanel) datasetInfoPanel.style.display = 'flex';

  // Re-render spreadsheet
  renderGridTable();
}

// Bind switcher click listeners
if (btnSwitchSheet) btnSwitchSheet.onclick = switchToSheetView;
if (btnSwitchDash) btnSwitchDash.onclick = switchToDashboardView;
if (wsBtnVisualize) wsBtnVisualize.onclick = switchToDashboardView;

// Reset button inside builder visualization sidebar
const resetVizBtn = document.getElementById('btn-reset-visualization');
if (resetVizBtn) {
  resetVizBtn.onclick = () => {
    if (wsSidebarVisualization) wsSidebarVisualization.style.display = 'none';
    if (datasetInfoPanel) datasetInfoPanel.style.display = 'flex';
    switchToSheetView();
  };
}

// Redraw charts on theme toggle click for color updates
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    if (currentView === 'dashboard') {
      setTimeout(renderDashboardCanvas, 100);
    }
  });
}

// Redraw charts and adjust layout constraints on window resize
window.addEventListener('resize', () => {
  if (typeof currentView !== 'undefined' && currentView === 'dashboard' && typeof renderDashboardCanvas === 'function') {
    if (window.resizeTimeout) {
      clearTimeout(window.resizeTimeout);
    }
    window.resizeTimeout = setTimeout(() => {
      renderDashboardCanvas();
    }, 150);
  }
});




// --------------------------- PHASE 2: ANALYTICS LAYER ---------------------------
// Calculated Fields, Drill Down, Smart Insights, Statistical Analysis, Save/Load

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PHASE 2: CALCULATED FIELDS UI â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function renderCalcFieldsList() {
  var container = document.getElementById('viz-calc-fields-list');
  if (!container) return;
  var fieldIds = Object.keys(calculatedFields);
  if (fieldIds.length === 0) {
    container.innerHTML = '<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:8px;">No calculated fields yet.</div>';
    return;
  }
  container.innerHTML = fieldIds.map(function(id) {
    var f = calculatedFields[id];
    return '<div style="display:flex; align-items:center; gap:6px; padding:8px; background:var(--bg-secondary); border-radius:var(--radius-sm); border:1px solid var(--border-color);">' +
      '<div style="flex:1; overflow:hidden;">' +
        '<div style="font-size:11.5px; font-weight:700; color:var(--primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + f.title + '</div>' +
        '<div style="font-size:10px; color:var(--text-muted); font-family:monospace; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + f.formula + '</div>' +
      '</div>' +
      '<button class="history-step-btn" style="color:var(--error); border-color:rgba(239,68,68,0.2);" onclick="deleteCalculatedField(\'' + id + '\')">ðŸ—‘ï¸</button>' +
    '</div>';
  }).join('');
}

window.deleteCalculatedField = function(id) {
  delete calculatedFields[id];
  renderCalcFieldsList();
  if (selectedWidgetId) selectWidget(selectedWidgetId);
  renderDashboardCanvas();
};

function initCalcFieldHelpers() {
  var colSelect = document.getElementById('viz-calc-helper-cols');
  if (!colSelect) return;
  colSelect.innerHTML = '<option value="">+ Insert Column</option>' +
    headers.map(function(h) { return '<option value="[' + (headerNames[h] || h) + ']">' + (headerNames[h] || h) + '</option>'; }).join('');

  colSelect.onchange = function() {
    if (!colSelect.value) return;
    var ta = document.getElementById('viz-calc-formula-input');
    if (ta) {
      var pos = ta.selectionStart;
      var cur = ta.value;
      ta.value = cur.slice(0, pos) + colSelect.value + cur.slice(pos);
      ta.focus();
      ta.setSelectionRange(pos + colSelect.value.length, pos + colSelect.value.length);
    }
    colSelect.value = '';
    previewCalcField();
  };

  var funcSelect = document.getElementById('viz-calc-helper-funcs');
  if (funcSelect) {
    funcSelect.onchange = function() {
      if (!funcSelect.value) return;
      var ta = document.getElementById('viz-calc-formula-input');
      if (ta) {
        var pos = ta.selectionStart;
        var cur = ta.value;
        ta.value = cur.slice(0, pos) + funcSelect.value + cur.slice(pos);
        ta.focus();
        ta.setSelectionRange(pos + funcSelect.value.length, pos + funcSelect.value.length);
      }
      funcSelect.value = '';
      previewCalcField();
    };
  }

  var formulaTA = document.getElementById('viz-calc-formula-input');
  if (formulaTA) {
    formulaTA.oninput = previewCalcField;
  }
}

function previewCalcField() {
  var formulaInput = document.getElementById('viz-calc-formula-input');
  var formula = formulaInput ? formulaInput.value : '';
  var previewBox = document.getElementById('viz-calc-preview-box');
  var previewText = document.getElementById('viz-calc-preview-text');
  var sampleOutput = document.getElementById('viz-calc-sample-output');
  var validMsg = document.getElementById('viz-calc-validation-msg');
  var saveBtn = document.getElementById('btn-calc-save');

  if (!previewBox || !formula.trim()) {
    if (previewBox) previewBox.style.display = 'none';
    if (validMsg) { validMsg.innerText = ''; }
    if (saveBtn) saveBtn.disabled = true;
    return;
  }

  previewBox.style.display = 'block';
  if (previewText) previewText.innerText = formula;

  var testRows = gridData.slice(0, 3);
  var testField = { id: '__preview__', title: 'Preview', formula: formula };
  var outputs = [];
  var hasError = false;
  for (var i = 0; i < testRows.length; i++) {
    var result = evaluateCalculatedField(testField, testRows[i]);
    if (result === null || result === undefined) { hasError = true; }
    outputs.push(result !== null && result !== undefined ? String(result) : 'ERROR');
  }

  if (sampleOutput) sampleOutput.innerText = outputs.join('\n');

  if (hasError) {
    if (validMsg) { validMsg.innerText = 'âš ï¸ Formula has errors or unknown columns.'; validMsg.style.color = 'var(--warning)'; }
    if (saveBtn) saveBtn.disabled = true;
  } else {
    if (validMsg) { validMsg.innerText = 'âœ… Formula is valid.'; validMsg.style.color = 'var(--success)'; }
    if (saveBtn) saveBtn.disabled = false;
  }
}

var btnCalcValidate = document.getElementById('btn-calc-validate');
if (btnCalcValidate) {
  btnCalcValidate.addEventListener('click', previewCalcField);
}

var btnCalcSave = document.getElementById('btn-calc-save');
if (btnCalcSave) {
  btnCalcSave.addEventListener('click', function() {
    var nameInput = document.getElementById('viz-calc-name-input');
    var formulaInput = document.getElementById('viz-calc-formula-input');
    if (!nameInput || !formulaInput) return;
    var title = nameInput.value.trim();
    var formula = formulaInput.value.trim();
    if (!title || !formula) return;

    var id = 'cf_' + Date.now();
    calculatedFields[id] = { id: id, title: title, formula: formula };
    nameInput.value = '';
    formulaInput.value = '';

    var previewBox = document.getElementById('viz-calc-preview-box');
    if (previewBox) previewBox.style.display = 'none';
    var validMsg = document.getElementById('viz-calc-validation-msg');
    if (validMsg) validMsg.innerText = '';
    btnCalcSave.disabled = true;

    renderCalcFieldsList();
    initCalcFieldHelpers();
    renderDashboardCanvas();
  });
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PHASE 2: DRILL DOWN LOGIC â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function renderDrillHierarchiesList() {
  var container = document.getElementById('viz-drill-list');
  if (!container) return;
  if (drillHierarchies.length === 0) {
    container.innerHTML = '<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:8px;">No hierarchies defined.</div>';
    return;
  }
  container.innerHTML = drillHierarchies.map(function(h) {
    var colNames = h.columns.map(function(c) { return headerNames[c] || c; }).join(' â†’ ');
    return '<div style="display:flex; align-items:center; gap:6px; padding:8px; background:var(--bg-secondary); border-radius:var(--radius-sm); border:1px solid var(--border-color);">' +
      '<div style="flex:1; overflow:hidden;">' +
        '<div style="font-size:11.5px; font-weight:700; color:var(--primary);">' + h.name + '</div>' +
        '<div style="font-size:10px; color:var(--text-muted);">' + colNames + '</div>' +
      '</div>' +
      '<button class="history-step-btn" style="color:var(--error); border-color:rgba(239,68,68,0.2);" onclick="deleteDrillHierarchy(\'' + h.id + '\')">ðŸ—‘ï¸</button>' +
    '</div>';
  }).join('');
}

window.deleteDrillHierarchy = function(id) {
  var idx = drillHierarchies.findIndex(function(h) { return h.id === id; });
  if (idx !== -1) drillHierarchies.splice(idx, 1);
  renderDrillHierarchiesList();
};

function initDrillColChecklist() {
  var container = document.getElementById('viz-drill-cols-checklist');
  if (!container) return;
  container.innerHTML = headers.map(function(h) {
    return '<label style="display:flex; align-items:center; gap:8px; font-size:11px; cursor:pointer; color:var(--text-primary);">' +
      '<input type="checkbox" value="' + h + '" style="accent-color:var(--primary);" />' +
      '<span>' + (headerNames[h] || h) + '</span>' +
    '</label>';
  }).join('');
}

var btnDrillSave = document.getElementById('btn-drill-save-hierarchy');
if (btnDrillSave) {
  btnDrillSave.addEventListener('click', function() {
    var nameInput = document.getElementById('viz-drill-name-input');
    if (!nameInput) return;
    var name = nameInput.value.trim();
    if (!name) { alert('Please enter a hierarchy name.'); return; }

    var checklist = document.getElementById('viz-drill-cols-checklist');
    if (!checklist) return;
    var checked = Array.from(checklist.querySelectorAll('input[type=checkbox]:checked')).map(function(cb) { return cb.value; });
    if (checked.length < 2) { alert('Please select at least 2 columns for a hierarchy.'); return; }

    drillHierarchies.push({ id: 'hier_' + Date.now(), name: name, columns: checked });
    nameInput.value = '';
    checklist.querySelectorAll('input[type=checkbox]').forEach(function(cb) { cb.checked = false; });
    renderDrillHierarchiesList();
  });
}

function handleChartClick(widget, clickedLabel) {
  var matchingHier = drillHierarchies.find(function(h) { return h.columns.includes(widget.xCol); });
  if (!matchingHier) return;

  var state = activeDrillState[widget.id];
  var currentLevelIdx = 0;
  var filterPath = {};

  if (state) {
    currentLevelIdx = state.currentLevelIdx;
    filterPath = Object.assign({}, state.filterPath);
  }

  var levelColKey = matchingHier.columns[currentLevelIdx];
  filterPath[levelColKey] = String(clickedLabel);

  var nextLevelIdx = currentLevelIdx + 1;
  if (nextLevelIdx >= matchingHier.columns.length) return;

  activeDrillState[widget.id] = {
    hierarchy: matchingHier.id,
    currentLevelIdx: nextLevelIdx,
    originalXCol: state ? state.originalXCol : widget.xCol,
    filterPath: filterPath
  };

  widget.xCol = matchingHier.columns[nextLevelIdx];
  widget._drillFilters = filterPath;

  renderDashboardCanvas();
  updateDrillStatus();
  switchVizTab('drilldown');
}

function updateDrillStatus() {
  var statusEl = document.getElementById('viz-drill-active-status');
  var pathEl = document.getElementById('viz-drill-path-display');
  if (!statusEl || !pathEl) return;

  var activeEntries = Object.entries(activeDrillState);
  if (activeEntries.length === 0) {
    statusEl.style.display = 'none';
    return;
  }

  statusEl.style.display = 'block';
  var firstEntry = activeEntries[0];
  var wId = firstEntry[0];
  var state = firstEntry[1];
  var hier = drillHierarchies.find(function(h) { return h.id === state.hierarchy; });
  if (!hier) return;

  var pathParts = Object.entries(state.filterPath).map(function(entry) {
    var colKey = entry[0];
    var val = entry[1];
    return '<span style="opacity:0.7;">' + (headerNames[colKey] || colKey) + ':</span> <strong>' + val + '</strong>';
  });
  pathEl.innerHTML = pathParts.join(' <span style="opacity:0.4;">â†’</span> ');
}

var btnDrillUp = document.getElementById('btn-drill-up');
if (btnDrillUp) {
  btnDrillUp.addEventListener('click', function() {
    var activeEntries = Object.entries(activeDrillState);
    if (activeEntries.length === 0) return;
    var wId = activeEntries[0][0];
    var state = activeEntries[0][1];
    var widget = dashboardWidgets.find(function(w) { return w.id === wId; });
    if (!widget || !state) return;

    var hier = drillHierarchies.find(function(h) { return h.id === state.hierarchy; });
    if (!hier) return;

    if (state.currentLevelIdx <= 1) {
      widget.xCol = state.originalXCol;
      widget._drillFilters = {};
      delete activeDrillState[wId];
    } else {
      state.currentLevelIdx--;
      delete state.filterPath[hier.columns[state.currentLevelIdx]];
      widget.xCol = hier.columns[state.currentLevelIdx];
      widget._drillFilters = Object.assign({}, state.filterPath);
    }

    renderDashboardCanvas();
    updateDrillStatus();
  });
}

var btnDrillReset = document.getElementById('btn-drill-reset');
if (btnDrillReset) {
  btnDrillReset.addEventListener('click', function() {
    Object.entries(activeDrillState).forEach(function(entry) {
      var wId = entry[0];
      var state = entry[1];
      var widget = dashboardWidgets.find(function(w) { return w.id === wId; });
      if (widget) {
        widget.xCol = state.originalXCol;
        widget._drillFilters = {};
      }
    });
    activeDrillState = {};
    renderDashboardCanvas();
    updateDrillStatus();
  });
}

// Patch getAggregatedData to honor per-widget drill filters
var _origGetAggregatedData = getAggregatedData;
window.getAggregatedData = function(widget) {
  if (widget._drillFilters && Object.keys(widget._drillFilters).length > 0) {
    var savedGlobal = globalVizFilters;
    globalVizFilters = Object.assign({}, globalVizFilters, widget._drillFilters);
    var result = _origGetAggregatedData(widget);
    globalVizFilters = savedGlobal;
    return result;
  }
  return _origGetAggregatedData(widget);
};


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PHASE 2: SMART INSIGHTS ENGINE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function generateInsights() {
  if (!gridData || gridData.length === 0) return [];
  var profile = profileColumns();
  var insights = [];

  // 1. Dataset overview
  insights.push({ type: 'info', icon: 'ðŸ“Š', title: 'Dataset Overview',
    text: 'Dataset contains ' + gridData.length.toLocaleString() + ' records across ' + headers.length + ' columns.'
  });

  // 2. Primary numeric metric
  var numCols = profile.numCols.concat(profile.currencyCols);
  if (numCols.length > 0) {
    var col = numCols[0];
    var colIdx = headers.indexOf(col);
    var vals = gridData.map(function(r) { return getCleanNumericValue(r[colIdx]); });
    var total = vals.reduce(function(s, v) { return s + v; }, 0);
    var avg = total / (vals.length || 1);
    var mx = Math.max.apply(null, vals);
    var mn = Math.min.apply(null, vals);
    var colName = headerNames[col] || col;
    var colType = detectColumnType(col);
    var fmt = function(v) {
      if (colType === 'currency') return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
      return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
    };
    insights.push({ type: 'metric', icon: 'ðŸ“ˆ', title: colName + ' Summary',
      text: 'Total: ' + fmt(total) + ' Â· Avg: ' + fmt(avg) + ' Â· Max: ' + fmt(mx) + ' Â· Min: ' + fmt(mn)
    });

    // Half-period trend
    var half = Math.floor(vals.length / 2);
    var sumFirst = vals.slice(0, half).reduce(function(s, v) { return s + v; }, 0);
    var sumSecond = vals.slice(half).reduce(function(s, v) { return s + v; }, 0);
    if (sumFirst > 0) {
      var changePct = ((sumSecond - sumFirst) / sumFirst) * 100;
      insights.push({
        type: changePct >= 0 ? 'success' : 'error',
        icon: changePct >= 0 ? 'ðŸ“ˆ' : 'ðŸ“‰',
        title: colName + ' Half-Period Trend',
        text: colName + ' is ' + (changePct >= 0 ? 'â†‘ up' : 'â†“ down') + ' ' + Math.abs(changePct).toFixed(1) + '% comparing the first half to the second half of records.'
      });
    }
  }

  // 3. Top categorical value
  if (profile.catCols.length > 0) {
    var cat = profile.catCols[0];
    var catIdx = headers.indexOf(cat);
    var freq = {};
    gridData.forEach(function(r) {
      var v = String(r[catIdx] || '').trim();
      if (v) freq[v] = (freq[v] || 0) + 1;
    });
    var sorted = Object.entries(freq).sort(function(a, b) { return b[1] - a[1]; });
    if (sorted.length > 0) {
      var topVal = sorted[0][0];
      var topCount = sorted[0][1];
      var pct = ((topCount / gridData.length) * 100).toFixed(1);
      var catName = headerNames[cat] || cat;
      insights.push({ type: 'info', icon: 'ðŸ†', title: 'Top ' + catName,
        text: '"' + topVal + '" is the most frequent ' + catName + ' (' + topCount.toLocaleString() + ' records, ' + pct + '% of dataset).'
      });
      if (sorted.length > 1) {
        insights.push({ type: 'info', icon: 'ðŸ¥ˆ', title: 'Runner-up ' + catName,
          text: '"' + sorted[1][0] + '" is second most frequent with ' + sorted[1][1].toLocaleString() + ' records.'
        });
      }
    }
  }

  // 4. Missing values check
  var totalMissing = 0;
  headers.forEach(function(h) {
    var ci = headers.indexOf(h);
    gridData.forEach(function(r) {
      if (r[ci] === undefined || r[ci] === null || String(r[ci]).trim() === '') totalMissing++;
    });
  });
  if (totalMissing > 0) {
    var missingPct = ((totalMissing / (gridData.length * headers.length)) * 100).toFixed(1);
    insights.push({ type: 'warning', icon: 'âš ï¸', title: 'Missing Values Detected',
      text: totalMissing.toLocaleString() + ' missing cells detected (' + missingPct + '% of all data).'
    });
  } else {
    insights.push({ type: 'success', icon: 'âœ…', title: 'No Missing Values',
      text: 'All columns are fully populated â€” clean dataset.'
    });
  }

  // 5. Active filters notice
  var filterCount = Object.values(globalVizFilters).filter(function(v) { return v !== ''; }).length;
  if (filterCount > 0) {
    insights.push({ type: 'info', icon: 'ðŸ”', title: 'Active Dashboard Filters',
      text: filterCount + ' active filter' + (filterCount > 1 ? 's' : '') + ' applied. Widgets show a filtered subset.'
    });
  }

  return insights;
}

function renderInsightsTab() {
  var summaryEl = document.getElementById('viz-executive-summary');
  var container = document.getElementById('viz-insights-container');
  if (!container) return;

  if (!gridData || gridData.length === 0) {
    if (summaryEl) summaryEl.innerText = 'Load a dataset to see insights.';
    container.innerHTML = '';
    return;
  }

  var insights = generateInsights();

  // Build executive summary from first 3 key insights
  if (summaryEl) {
    var summaryParts = insights.slice(0, 3).map(function(i) { return i.text; });
    summaryEl.innerText = summaryParts.join(' ');
  }

  var colorMap = { info: 'rgba(99,102,241,0.10)', metric: 'rgba(34,197,94,0.08)', success: 'rgba(34,197,94,0.08)', warning: 'rgba(245,158,11,0.10)', error: 'rgba(244,63,94,0.10)' };
  var borderMap = { info: 'rgba(99,102,241,0.35)', metric: 'rgba(34,197,94,0.35)', success: 'rgba(34,197,94,0.35)', warning: 'rgba(245,158,11,0.35)', error: 'rgba(244,63,94,0.35)' };

  container.innerHTML = insights.map(function(ins) {
    var bg = colorMap[ins.type] || colorMap.info;
    var border = borderMap[ins.type] || borderMap.info;
    return '<div style="padding:10px; border-radius:var(--radius-sm); background:' + bg + '; border:1px solid ' + border + '; margin-bottom:4px;">' +
      '<div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">' +
        '<span style="font-size:14px;">' + ins.icon + '</span>' +
        '<span style="font-size:11.5px; font-weight:700; color:var(--text-primary);">' + ins.title + '</span>' +
      '</div>' +
      '<div style="font-size:11px; color:var(--text-secondary); line-height:1.5;">' + ins.text + '</div>' +
    '</div>';
  }).join('');
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PHASE 2: STATISTICAL ANALYSIS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function pearsonCorr(xs, ys) {
  var n = xs.length;
  if (n < 2) return 0;
  var meanX = xs.reduce(function(s, v) { return s + v; }, 0) / n;
  var meanY = ys.reduce(function(s, v) { return s + v; }, 0) / n;
  var num = 0, sdX = 0, sdY = 0;
  for (var i = 0; i < n; i++) {
    var dx = xs[i] - meanX;
    var dy = ys[i] - meanY;
    num += dx * dy;
    sdX += dx * dx;
    sdY += dy * dy;
  }
  var denom = Math.sqrt(sdX * sdY);
  return denom === 0 ? 0 : num / denom;
}

function renderCorrelationAnalysis() {
  var container = document.getElementById('viz-analysis-correlation-container');
  if (!container || !gridData || gridData.length === 0) return;
  var profile = profileColumns();
  var numCols = profile.numCols.concat(profile.currencyCols);

  if (numCols.length < 2) {
    container.innerHTML = '<div style="font-size:11px; color:var(--text-muted);">Need at least 2 numeric columns for correlation.</div>';
    return;
  }

  var pairs = [];
  for (var i = 0; i < numCols.length; i++) {
    for (var j = i + 1; j < numCols.length; j++) {
      var colA = numCols[i], colB = numCols[j];
      var idxA = headers.indexOf(colA), idxB = headers.indexOf(colB);
      var xs = gridData.map(function(r) { return getCleanNumericValue(r[idxA]); });
      var ys = gridData.map(function(r) { return getCleanNumericValue(r[idxB]); });
      var r = pearsonCorr(xs, ys);
      pairs.push({ colA: colA, colB: colB, r: r });
    }
  }
  pairs.sort(function(a, b) { return Math.abs(b.r) - Math.abs(a.r); });

  container.innerHTML = pairs.slice(0, 8).map(function(p) {
    var pct = Math.round(Math.abs(p.r) * 100);
    var isPos = p.r >= 0;
    var strength = Math.abs(p.r) > 0.7 ? 'Strong' : Math.abs(p.r) > 0.4 ? 'Moderate' : 'Weak';
    var barColor = isPos ? 'var(--success)' : 'var(--error)';
    var nameA = headerNames[p.colA] || p.colA;
    var nameB = headerNames[p.colB] || p.colB;
    return '<div style="padding:8px; background:var(--bg-secondary); border-radius:var(--radius-sm); border:1px solid var(--border-color); margin-bottom:4px;">' +
      '<div style="font-size:10.5px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">' + nameA + ' vs ' + nameB + '</div>' +
      '<div style="display:flex; align-items:center; gap:8px;">' +
        '<div style="flex:1; height:6px; background:rgba(0,0,0,0.15); border-radius:3px; overflow:hidden;">' +
          '<div style="width:' + pct + '%; height:100%; background:' + barColor + '; border-radius:3px;"></div>' +
        '</div>' +
        '<span style="font-size:10px; font-weight:700; color:' + barColor + '; white-space:nowrap;">' + (isPos ? '+' : '') + p.r.toFixed(2) + '</span>' +
        '<span style="font-size:9.5px; color:var(--text-muted); white-space:nowrap;">' + strength + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function renderTrendAnalysis() {
  var container = document.getElementById('viz-analysis-trend-container');
  if (!container || !gridData || gridData.length === 0) return;
  var profile = profileColumns();
  var numCols = profile.numCols.concat(profile.currencyCols);

  if (numCols.length === 0) {
    container.innerHTML = '<div style="font-size:11px; color:var(--text-muted);">No numeric columns found.</div>';
    return;
  }

  container.innerHTML = numCols.slice(0, 4).map(function(col) {
    var colIdx = headers.indexOf(col);
    var vals = gridData.map(function(r) { return getCleanNumericValue(r[colIdx]); });
    var n = vals.length;
    var chunkSize = Math.max(1, Math.ceil(n / 5));
    var segments = [];
    for (var i = 0; i < 5; i++) {
      var chunk = vals.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length > 0) {
        segments.push(chunk.reduce(function(s, v) { return s + v; }, 0) / chunk.length);
      }
    }

    var first = segments[0] || 0;
    var last = segments[segments.length - 1] || 0;
    var changePct = first !== 0 ? ((last - first) / Math.abs(first)) * 100 : 0;
    var isUp = changePct >= 0;
    var color = isUp ? 'var(--success)' : 'var(--error)';
    var miniBarMax = Math.max.apply(null, segments.concat([1]));
    var miniBars = segments.map(function(s) {
      var h = Math.max(2, Math.round((s / miniBarMax) * 30));
      return '<div style="width:9px; height:' + h + 'px; background:' + color + '; border-radius:1px; align-self:flex-end;"></div>';
    }).join('');

    return '<div style="padding:10px; background:var(--bg-secondary); border-radius:var(--radius-sm); border:1px solid var(--border-color); margin-bottom:6px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">' +
        '<span style="font-size:11px; font-weight:700; color:var(--text-primary);">' + (headerNames[col] || col) + '</span>' +
        '<span style="font-size:10.5px; font-weight:700; color:' + color + ';">' + (isUp ? 'â†‘' : 'â†“') + ' ' + Math.abs(changePct).toFixed(1) + '%</span>' +
      '</div>' +
      '<div style="display:flex; align-items:flex-end; gap:3px; height:32px;">' + miniBars + '</div>' +
      '<div style="font-size:9.5px; color:var(--text-muted); margin-top:4px;">Quintile segment averages across dataset</div>' +
    '</div>';
  }).join('');
}

function renderAnomalyAnalysis() {
  var container = document.getElementById('viz-analysis-anomalies-container');
  if (!container || !gridData || gridData.length === 0) return;
  var profile = profileColumns();
  var numCols = profile.numCols.concat(profile.currencyCols);

  if (numCols.length === 0) {
    container.innerHTML = '<div style="font-size:11px; color:var(--text-muted);">No numeric columns found.</div>';
    return;
  }

  var allAnomalies = [];
  numCols.slice(0, 6).forEach(function(col) {
    var colIdx = headers.indexOf(col);
    var vals = gridData.map(function(r) { return getCleanNumericValue(r[colIdx]); }).sort(function(a, b) { return a - b; });
    var n = vals.length;
    if (n < 4) return;
    var q1 = vals[Math.floor(n * 0.25)];
    var q3 = vals[Math.floor(n * 0.75)];
    var iqr = q3 - q1;
    var lo = q1 - 1.5 * iqr;
    var hi = q3 + 1.5 * iqr;
    var outlierCount = vals.filter(function(v) { return v < lo || v > hi; }).length;
    if (outlierCount > 0) {
      allAnomalies.push({ col: col, colName: headerNames[col] || col, count: outlierCount,
        lo: lo.toFixed(1), hi: hi.toFixed(1), max: vals[n - 1], min: vals[0] });
    }
  });

  if (allAnomalies.length === 0) {
    container.innerHTML = '<div style="font-size:11px; color:var(--success); padding:8px;">âœ… No statistical anomalies detected using IQR method.</div>';
    return;
  }

  container.innerHTML = allAnomalies.map(function(a) {
    return '<div style="padding:8px; background:rgba(244,63,94,0.06); border-radius:var(--radius-sm); border:1px solid rgba(244,63,94,0.2); margin-bottom:4px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
        '<span style="font-size:11px; font-weight:700; color:var(--error);">âš  ' + a.colName + '</span>' +
        '<span style="font-size:10px; color:var(--text-muted);">' + a.count + ' outliers</span>' +
      '</div>' +
      '<div style="font-size:10.5px; color:var(--text-secondary);">Normal range: [' + a.lo + ' â€“ ' + a.hi + ']</div>' +
      '<div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Dataset Min: ' + a.min + ' Â· Max: ' + a.max + '</div>' +
    '</div>';
  }).join('');
}

function initRanksDims() {
  var dimSel = document.getElementById('viz-rank-dim');
  var metSel = document.getElementById('viz-rank-metric');
  if (!dimSel || !metSel) return;
  var profile = profileColumns();
  var catCols = profile.catCols;
  var numCols = profile.numCols.concat(profile.currencyCols);

  dimSel.innerHTML = catCols.map(function(h) { return '<option value="' + h + '">' + (headerNames[h] || h) + '</option>'; }).join('') || '<option value="">No categories</option>';
  metSel.innerHTML = numCols.map(function(h) { return '<option value="' + h + '">' + (headerNames[h] || h) + '</option>'; }).join('') || '<option value="">No metrics</option>';

  [dimSel, metSel, document.getElementById('viz-rank-type')].forEach(function(el) {
    if (el) el.addEventListener('change', renderRanksAnalysis);
  });
  renderRanksAnalysis();
}

function renderRanksAnalysis() {
  var container = document.getElementById('viz-analysis-ranks-container');
  var dimSel = document.getElementById('viz-rank-dim');
  var metSel = document.getElementById('viz-rank-metric');
  var typeSel = document.getElementById('viz-rank-type');
  if (!container || !dimSel || !metSel || !typeSel || !gridData || gridData.length === 0) return;

  var dimCol = dimSel.value;
  var metCol = metSel.value;
  var rankType = typeSel.value;
  if (!dimCol || !metCol) return;

  var aggData = getAggregatedData({ xCol: dimCol, yCol: metCol, agg: 'sum' });
  var pairs = aggData.labels.map(function(lbl, i) { return { label: lbl, val: aggData.data[i] }; });
  pairs.sort(function(a, b) { return b.val - a.val; });

  var n = rankType.includes('10') ? 10 : 5;
  var isBottom = rankType.startsWith('bottom');
  var slice = isBottom ? pairs.slice(-n).reverse() : pairs.slice(0, n);

  if (slice.length === 0) { container.innerHTML = '<div style="font-size:11px; color:var(--text-muted);">No data.</div>'; return; }

  var maxVal = Math.max.apply(null, slice.map(function(p) { return p.val; }).concat([1]));
  var colType = detectColumnType(metCol);
  var fmt = function(v) {
    if (colType === 'currency') return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };
  var barColor = isBottom ? 'var(--error)' : 'var(--primary)';

  container.innerHTML = slice.map(function(p, i) {
    var barW = Math.max(4, Math.round((p.val / maxVal) * 100));
    return '<div style="padding:5px 0; border-bottom:1px solid var(--border-color);">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:3px;">' +
        '<span style="font-size:10.5px; font-weight:600; color:var(--text-primary); max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + (i + 1) + '. ' + p.label + '</span>' +
        '<span style="font-size:10.5px; font-weight:700; color:' + barColor + ';">' + fmt(p.val) + '</span>' +
      '</div>' +
      '<div style="height:4px; background:rgba(0,0,0,0.12); border-radius:2px; overflow:hidden;">' +
        '<div style="width:' + barW + '%; height:100%; background:' + barColor + '; border-radius:2px;"></div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function initBenchmarkDims() {
  var dimSel = document.getElementById('viz-bench-dim');
  var metSel = document.getElementById('viz-bench-metric');
  if (!dimSel || !metSel) return;
  var profile = profileColumns();
  dimSel.innerHTML = profile.catCols.map(function(h) { return '<option value="' + h + '">' + (headerNames[h] || h) + '</option>'; }).join('') || '<option value="">No categories</option>';
  metSel.innerHTML = profile.numCols.concat(profile.currencyCols).map(function(h) { return '<option value="' + h + '">' + (headerNames[h] || h) + '</option>'; }).join('') || '<option value="">No metrics</option>';
  [dimSel, metSel].forEach(function(el) { if (el) el.addEventListener('change', renderBenchmarkAnalysis); });
  renderBenchmarkAnalysis();
}

function renderBenchmarkAnalysis() {
  var container = document.getElementById('viz-analysis-benchmark-container');
  var dimSel = document.getElementById('viz-bench-dim');
  var metSel = document.getElementById('viz-bench-metric');
  if (!container || !dimSel || !metSel || !gridData || gridData.length === 0) return;
  var dimCol = dimSel.value;
  var metCol = metSel.value;
  if (!dimCol || !metCol) return;

  var aggData = getAggregatedData({ xCol: dimCol, yCol: metCol, agg: 'avg' });
  if (aggData.labels.length === 0) return;
  var overall = aggData.data.reduce(function(s, v) { return s + v; }, 0) / (aggData.data.length || 1);
  var colType = detectColumnType(metCol);
  var fmt = function(v) {
    if (colType === 'currency') return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  container.innerHTML = '<div style="padding:6px 10px; background:rgba(99,102,241,0.08); border-radius:var(--radius-sm); border:1px solid rgba(99,102,241,0.2); font-size:10.5px; font-weight:700; color:var(--primary); margin-bottom:8px;">Overall Avg: ' + fmt(overall) + '</div>' +
    aggData.labels.map(function(lbl, i) {
      var val = aggData.data[i];
      var diffPct = overall !== 0 ? ((val - overall) / Math.abs(overall)) * 100 : 0;
      var isAbove = val >= overall;
      var color = isAbove ? 'var(--success)' : 'var(--error)';
      return '<div style="display:flex; align-items:center; gap:8px; padding:5px 0; border-bottom:1px solid var(--border-color);">' +
        '<div style="flex:1; font-size:10.5px; color:var(--text-primary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + lbl + '</div>' +
        '<div style="font-size:10.5px; font-weight:600; color:var(--text-primary); white-space:nowrap;">' + fmt(val) + '</div>' +
        '<div style="font-size:9.5px; font-weight:700; color:' + color + '; white-space:nowrap; min-width:44px; text-align:right;">' + (isAbove ? '+' : '') + diffPct.toFixed(1) + '%</div>' +
      '</div>';
    }).join('');
}

// Analysis sub-tab switcher
function switchAnalysisSubtab(subtabName) {
  document.querySelectorAll('.analysis-subtab-btn').forEach(function(btn) {
    if (btn.dataset.subtab === subtabName) {
      btn.style.borderBottomColor = 'var(--primary)';
      btn.style.color = 'var(--primary)';
    } else {
      btn.style.borderBottomColor = 'transparent';
      btn.style.color = 'var(--text-secondary)';
    }
  });
  document.querySelectorAll('.analysis-sub-content').forEach(function(el) {
    el.style.display = el.id === 'analsub-' + subtabName ? 'block' : 'none';
  });
  if (subtabName === 'correlation') renderCorrelationAnalysis();
  else if (subtabName === 'trend') renderTrendAnalysis();
  else if (subtabName === 'anomalies') renderAnomalyAnalysis();
  else if (subtabName === 'topbottom') { initRanksDims(); renderRanksAnalysis(); }
  else if (subtabName === 'benchmark') { initBenchmarkDims(); renderBenchmarkAnalysis(); }
}

document.querySelectorAll('.analysis-subtab-btn').forEach(function(btn) {
  btn.addEventListener('click', function() { switchAnalysisSubtab(btn.dataset.subtab); });
});
switchAnalysisSubtab('correlation');


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PHASE 2: SAVE / LOAD STATE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function getDashboardState() {
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    datasetName: (document.getElementById('ws-dataset-name') || {}).innerText || 'Unknown',
    dashboardWidgets: JSON.parse(JSON.stringify(dashboardWidgets)),
    globalVizFilters: Object.assign({}, globalVizFilters),
    calculatedFields: JSON.parse(JSON.stringify(calculatedFields)),
    drillHierarchies: JSON.parse(JSON.stringify(drillHierarchies))
  };
}

function applyDashboardState(state) {
  dashboardWidgets = state.dashboardWidgets || [];
  globalVizFilters = state.globalVizFilters || {};
  calculatedFields = state.calculatedFields || {};
  drillHierarchies = state.drillHierarchies || [];
  renderDashboardCanvas();
  renderStructureTab();
  renderFiltersTab();
  renderCalcFieldsList();
  renderDrillHierarchiesList();
}

function saveDashboardToStorage(name) {
  var key = 'oneclick_dash_' + name.replace(/\s+/g, '_') + '_' + Date.now();
  try { localStorage.setItem(key, JSON.stringify(getDashboardState())); return key; }
  catch(e) { alert('Storage quota exceeded.'); return null; }
}

function exportDashboardJSON() {
  var state = getDashboardState();
  var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = 'oneclick_dashboard_' + Date.now() + '.json';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function injectSaveLoadButtons() {
  var vizPanel = document.getElementById('ws-sidebar-visualization');
  if (!vizPanel || document.getElementById('dash-save-load-bar')) return;

  var bar = document.createElement('div');
  bar.id = 'dash-save-load-bar';
  bar.style.cssText = 'display:flex; gap:5px; flex-wrap:wrap; padding:6px 0 10px 0; border-bottom:1px solid var(--border-color); margin-bottom:4px;';
  bar.innerHTML =
    '<button class="btn-outline btn-sm" id="btn-dash-save" style="flex:1; justify-content:center; font-size:10px; height:26px; padding:0 6px;" title="Save dashboard">ðŸ’¾ Save</button>' +
    '<button class="btn-outline btn-sm" id="btn-dash-load" style="flex:1; justify-content:center; font-size:10px; height:26px; padding:0 6px;" title="Load saved">ðŸ“‚ Load</button>' +
    '<button class="btn-outline btn-sm" id="btn-dash-export" style="flex:1; justify-content:center; font-size:10px; height:26px; padding:0 6px;" title="Export JSON">â¬‡ JSON</button>' +
    '<input type="file" id="btn-dash-import-file" accept=".json" style="display:none;" />' +
    '<button class="btn-outline btn-sm" id="btn-dash-import" style="flex:1; justify-content:center; font-size:10px; height:26px; padding:0 6px;" title="Import JSON">â¬† Import</button>';

  var title = vizPanel.querySelector('h3.ws-sidebar-title');
  if (title && title.nextSibling) { vizPanel.insertBefore(bar, title.nextSibling); }
  else { vizPanel.appendChild(bar); }

  document.getElementById('btn-dash-save').addEventListener('click', function() {
    var name = prompt('Name this dashboard save:', 'Dashboard ' + new Date().toLocaleDateString());
    if (name !== null && name.trim()) {
      var key = saveDashboardToStorage(name.trim());
      if (key) alert('Saved successfully.');
    }
  });

  document.getElementById('btn-dash-load').addEventListener('click', function() {
    var keys = Object.keys(localStorage).filter(function(k) { return k.startsWith('oneclick_dash_'); });
    if (keys.length === 0) { alert('No saved dashboards found.'); return; }
    var list = keys.map(function(k, i) { return (i + 1) + '. ' + k.replace('oneclick_dash_', '').replace(/_\d+$/, '').replace(/_/g, ' '); }).join('\n');
    var choice = prompt('Saved dashboards:\n' + list + '\n\nEnter number to load:', '1');
    var idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < keys.length) {
      try { applyDashboardState(JSON.parse(localStorage.getItem(keys[idx]))); }
      catch(e) { alert('Load failed: ' + e.message); }
    }
  });

  document.getElementById('btn-dash-export').addEventListener('click', exportDashboardJSON);

  document.getElementById('btn-dash-import').addEventListener('click', function() {
    document.getElementById('btn-dash-import-file').click();
  });

  document.getElementById('btn-dash-import-file').addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try { applyDashboardState(JSON.parse(ev.target.result)); alert('Dashboard imported!'); }
      catch(err) { alert('Import failed: ' + err.message); }
    };
    reader.readAsText(file);
    e.target.value = '';
  });
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PHASE 2: PATCH switchVizTab â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

var _origSwitchVizTab = switchVizTab;
window.switchVizTab = function(tabName) {
  _origSwitchVizTab(tabName);
  if (tabName === 'insights') renderInsightsTab();
  else if (tabName === 'calcfields') { renderCalcFieldsList(); initCalcFieldHelpers(); }
  else if (tabName === 'drilldown') { renderDrillHierarchiesList(); initDrillColChecklist(); updateDrillStatus(); }
  else if (tabName === 'analysis') { switchAnalysisSubtab('correlation'); initRanksDims(); initBenchmarkDims(); }
};

// Re-bind all viz tab buttons to use patched version
document.querySelectorAll('.viz-tab-btn').forEach(function(btn) {
  btn.onclick = function() { window.switchVizTab(btn.dataset.tab); };
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PHASE 2: LIFECYCLE HOOKS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

var _origSwitchToDashboardView = switchToDashboardView;
window.switchToDashboardView = function() {
  _origSwitchToDashboardView();
  injectSaveLoadButtons();
  initCalcFieldHelpers();
  initDrillColChecklist();
};

// Re-bind switch-to-dashboard triggers
if (typeof wsBtnVisualize !== 'undefined' && wsBtnVisualize) wsBtnVisualize.onclick = window.switchToDashboardView;
if (typeof btnSwitchDash !== 'undefined' && btnSwitchDash) btnSwitchDash.onclick = window.switchToDashboardView;

// ═══════════════════════════ COLLAPSIBLE PANELS ═══════════════════════════

function initCollapsiblePanel(headerId, bodyId, toggleIconId, storageKey) {
  var header = document.getElementById(headerId);
  var body = document.getElementById(bodyId);
  var icon = document.getElementById(toggleIconId);
  if (!header || !body || !icon) return;

  // Restore state from sessionStorage
  var isCollapsed = sessionStorage.getItem(storageKey) === 'true';
  if (isCollapsed) {
    body.classList.add('collapsed');
    icon.classList.add('rotated');
  }

  header.addEventListener('click', function() {
    var nowCollapsed = body.classList.toggle('collapsed');
    icon.classList.toggle('rotated', nowCollapsed);
    sessionStorage.setItem(storageKey, nowCollapsed ? 'true' : 'false');
  });
}

// Initialise both panels (they may not be visible yet — safe to init early)
initCollapsiblePanel('preprocessing-panel-header', 'preprocessing-panel-body', 'preprocessing-toggle-icon', 'panel-preprocessing-collapsed');
initCollapsiblePanel('dashbuilder-panel-header',   'dashbuilder-panel-body',   'dashbuilder-toggle-icon',   'panel-dashbuilder-collapsed');

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• PANEL MANAGER â€” 3-STATE SYSTEM â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// States: 'open' | 'rail' | 'closed'
// Manages: Data Preprocessing + Dashboard Builder panels
// Single container rule: only one panel content visible at a time.

(function() {
  var STORAGE_KEY = 'oneclick_panel_state';

  // Which content panel is currently active: 'preprocessing' | 'visualization' | null
  var activePanelContent = null;

  // Panel sidebar element
  var sidebar = document.getElementById('ws-sidebar');

  // â”€â”€ State helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function getPanelState() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; } catch(e) { return {}; }
  }

  function savePanelState(state) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  // â”€â”€ Apply sidebar width state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function applySidebarState(widthState) {
    // widthState: 'open' | 'rail' | 'closed'
    sidebar.classList.remove('collapsed', 'panel-rail', 'panel-closed');
    if (widthState === 'rail') {
      sidebar.classList.add('panel-rail');
    } else if (widthState === 'closed') {
      sidebar.classList.add('panel-closed');
    }
    // 'open' = no extra class needed
    // Update reopen label
    var reopenLabel = document.getElementById('ws-panel-reopen-label');
    if (reopenLabel && activePanelContent) {
      reopenLabel.innerText = activePanelContent === 'preprocessing' ? 'Preprocessing' : 'Dashboard';
    }
    // Sync rail icon active states
    var railPre = document.getElementById('rail-btn-preprocessing');
    var railViz = document.getElementById('rail-btn-visualization');
    if (railPre) railPre.dataset.active = activePanelContent === 'preprocessing' ? 'true' : 'false';
    if (railViz) railViz.dataset.active = activePanelContent === 'visualization' ? 'true' : 'false';

    // Save state
    var state = getPanelState();
    state.widthState = widthState;
    savePanelState(state);

    // Trigger dashboard canvas redraw if in dashboard view
    if (typeof currentView !== 'undefined' && currentView === 'dashboard' && typeof renderDashboardCanvas === 'function') {
      setTimeout(renderDashboardCanvas, 260);
    }
    if (typeof renderGridTable === 'function') {
      setTimeout(renderGridTable, 260);
    }
  }

  // â”€â”€ Show a panel's inner content (without changing width state) â”€â”€â”€â”€
  function showPanelContent(panelId) {
    var allInnerPanels = ['ws-sidebar-dataset-info', 'ws-sidebar-column-stats', 'ws-sidebar-data-quality', 'ws-sidebar-visualization'];
    allInnerPanels.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    var target = document.getElementById(panelId);
    if (target) {
      target.style.display = 'flex';
    }
  }

  // â”€â”€ Main public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Open a panel. Respects "user manually closed" rule.
  window.PanelManager = {

    // Open a panel (by type: 'preprocessing' | 'visualization')
    // If forceOpen is true, ignores the "user closed" flag.
    open: function(type, forceOpen) {
      var state = getPanelState();
      if (!forceOpen && state.userClosed === type) {
        // User explicitly closed this panel â€” don't reopen automatically
        return;
      }
      activePanelContent = type;
      var panelId = type === 'preprocessing' ? 'ws-sidebar-data-quality' : 'ws-sidebar-visualization';
      showPanelContent(panelId);

      // Always expand to open when explicitly opening
      applySidebarState('open');

      // Clear the userClosed flag since we're opening
      if (state.userClosed === type) {
        delete state.userClosed;
        savePanelState(state);
      }

      state.activePanelContent = type;
      savePanelState(state);
    },

    // Collapse to rail
    collapse: function() {
      var state = getPanelState();
      state.widthState = 'rail';
      savePanelState(state);
      applySidebarState('rail');
    },

    // Close panel completely
    close: function() {
      var state = getPanelState();
      state.userClosed = activePanelContent; // remember which panel the user closed
      state.widthState = 'closed';
      savePanelState(state);
      applySidebarState('closed');
    },

    // Restore from rail / closed back to open
    restore: function() {
      if (activePanelContent) {
        var panelId = activePanelContent === 'preprocessing' ? 'ws-sidebar-data-quality' : 'ws-sidebar-visualization';
        showPanelContent(panelId);
        var state = getPanelState();
        delete state.userClosed; // clear closed flag on manual restore
        savePanelState(state);
        applySidebarState('open');
      }
    },

    // Returns current width state
    getWidthState: function() {
      return getPanelState().widthState || 'open';
    }
  };

  // â”€â”€ Wire Collapse / Close buttons â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function wireButton(id, fn) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', function(e) { e.stopPropagation(); fn(); });
  }

  wireButton('btn-preprocessing-collapse', function() { window.PanelManager.collapse(); });
  wireButton('btn-preprocessing-close',    function() { window.PanelManager.close(); });
  wireButton('btn-dashbuilder-collapse',   function() { window.PanelManager.collapse(); });
  wireButton('btn-dashbuilder-close',      function() { window.PanelManager.close(); });

  // â”€â”€ Wire Rail icon buttons (click to restore) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var railPre = document.getElementById('rail-btn-preprocessing');
  if (railPre) {
    railPre.addEventListener('click', function() {
      activePanelContent = 'preprocessing';
      showPanelContent('ws-sidebar-data-quality');
      window.PanelManager.restore();
    });
  }

  var railViz = document.getElementById('rail-btn-visualization');
  if (railViz) {
    railViz.addEventListener('click', function() {
      activePanelContent = 'visualization';
      showPanelContent('ws-sidebar-visualization');
      window.PanelManager.restore();
    });
  }

  // â”€â”€ Wire Reopen tab (click to restore) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var reopenTab = document.getElementById('ws-panel-reopen-tab');
  if (reopenTab) {
    reopenTab.addEventListener('click', function() {
      window.PanelManager.restore();
    });
  }

  // â”€â”€ Patch existing sidebar toggle button (was old collapse) â”€â”€â”€â”€â”€â”€â”€
  // Keep it working: it now toggles between open and rail
  var sidebarToggleBtn = document.getElementById('ws-sidebar-toggle');
  if (sidebarToggleBtn) {
    // Remove any old listener by cloning
    var newToggle = sidebarToggleBtn.cloneNode(true);
    sidebarToggleBtn.parentNode.replaceChild(newToggle, sidebarToggleBtn);
    newToggle.addEventListener('click', function() {
      var ws = window.PanelManager.getWidthState();
      if (ws === 'open') {
        window.PanelManager.collapse();
      } else {
        window.PanelManager.restore();
      }
    });
  }

  // â”€â”€ Patch the Analyze Dataset button â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var analyzeBtn = document.getElementById('ws-btn-analyze');
  if (analyzeBtn) {
    var origAnalyzeHandler = analyzeBtn.onclick;
    analyzeBtn.onclick = null;
    // Remove old listeners by re-assigning
    var newAnalyzeBtn = analyzeBtn.cloneNode(true);
    analyzeBtn.parentNode.replaceChild(newAnalyzeBtn, analyzeBtn);
    newAnalyzeBtn.addEventListener('click', function() {
      // Switch content
      if (typeof qualityPanel !== 'undefined' && qualityPanel) {
        // Toggle: if already open â†’ collapse
        if (activePanelContent === 'preprocessing' && window.PanelManager.getWidthState() === 'open') {
          window.PanelManager.collapse();
          return;
        }
      }
      activePanelContent = 'preprocessing';
      showPanelContent('ws-sidebar-data-quality');
      window.PanelManager.open('preprocessing', true); // force open when user explicitly clicks
    });
  }

  // â”€â”€ Patch switchToDashboardView for Dashboard Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // The existing code calls wsSidebarVisualization.style.display = 'block'
  // We intercept by hooking into PanelManager instead.
  var _pmOrigSwitch = window.switchToDashboardView;
  window.switchToDashboardView = function() {
    // Call original first (sets up widgets etc)
    if (_pmOrigSwitch) _pmOrigSwitch();
    // Then use PanelManager to handle panel state
    activePanelContent = 'visualization';
    // Don't force open if user explicitly closed it
    var state = getPanelState();
    if (state.userClosed === 'visualization') {
      // User closed it â€” hide the viz panel that original may have shown
      var vizPanel = document.getElementById('ws-sidebar-visualization');
      if (vizPanel) vizPanel.style.display = 'none';
      applySidebarState('closed');
    } else {
      showPanelContent('ws-sidebar-visualization');
      applySidebarState(state.widthState || 'open');
    }
  };

  // â”€â”€ Patch switchToSheetView to restore correct panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var _pmOrigSheetSwitch = window.switchToSheetView;
  window.switchToSheetView = function() {
    if (_pmOrigSheetSwitch) _pmOrigSheetSwitch();
    activePanelContent = 'preprocessing';
    var state = getPanelState();
    // If user hasn't closed it, show dataset info
    if (state.userClosed !== 'preprocessing') {
      // Just restore the sidebar to correct state â€” inner panels managed by existing code
      applySidebarState(state.widthState || 'open');
    } else {
      applySidebarState('closed');
    }
  };

  // â”€â”€ Restore session state on page load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  var initState = getPanelState();
  if (initState.widthState) {
    applySidebarState(initState.widthState);
  }
  if (initState.activePanelContent) {
    activePanelContent = initState.activePanelContent;
  }

  // â”€â”€ Remove the old broken initCollapsiblePanel calls â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // (They ran on DOMContentLoaded â€” no-op since elements exist but do nothing now)

})();
