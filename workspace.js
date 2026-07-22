
// ─── Global Promise Error Safety Net ─────────────────────────────────────────
window.addEventListener('unhandledrejection', function(event) {
  console.error('[OneClick] Unhandled promise rejection:', event.reason);
  const msg = event.reason && event.reason.message ? event.reason.message : String(event.reason || 'Unknown error');
  if (typeof showToast === 'function') {
    // Only show toasts for non-network-abort errors
    if (!msg.includes('aborted') && !msg.includes('network')) {
      showToast('A background operation failed: ' + msg.slice(0, 80), 'error');
    }
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// OneClick v3 — Workspace Lifecycle & Persistence Module


const getStartedBtn = document.getElementById('btn-get-started');
const viewDemoBtn = document.getElementById('btn-view-demo');
const uploadModal = document.getElementById('upload-modal');
const modalClose = document.getElementById('modal-close');
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('dataset-file-input');
const browseBtn = document.getElementById('btn-browse-trigger');



// Open Upload Modal
if (getStartedBtn) {
  getStartedBtn.addEventListener('click', () => {
    uploadModal.classList.add('open');
  });
}
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
      if (typeof showToast === "function") showToast("Unsupported file format. Please upload CSV, XLS or XLSX.", "error"); else console.error("Unsupported file format");
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
            try { loadParsedData(results.data, file.name, "CSV", file.size, file); } catch(e) { console.error('[OneClick] loadParsedData (CSV) failed:', e); } finally {
              hideLoading();
            }
          }, 100);
        },
        error: function(err) {
          hideLoading();
          if (typeof showToast === "function") showToast("Error parsing CSV: " + err.message, "error"); else console.error("CSV parse error:", err);
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
            try { loadParsedData(parsed, file.name, extension.toUpperCase(), file.size, file); } catch(e) { console.error('[OneClick] loadParsedData (Excel) failed:', e); } finally {
              hideLoading();
            }
          }, 100);
        } catch (err) {
          hideLoading();
          if (typeof showToast === "function") showToast("Error parsing Excel: " + err.message, "error"); else console.error("Excel parse error:", err);
        }
      };
      reader.onerror = function() {
        hideLoading();
        if (typeof showToast === "function") showToast("Error reading file.", "error"); else console.error("File read error");
      };
      reader.readAsArrayBuffer(file);
    }
  }, 100);
}

// Load dynamic dataset
function loadParsedData(parsedRows, filename, type, sizeBytes, originalFile = null) {
  if (!parsedRows || parsedRows.length === 0) {
    if (typeof showToast === "function") showToast("Empty file detected. Please upload a file with data.", "warning"); else console.warn("Empty file");
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
  if (document.querySelector('.ws-file-type-badge')) {
    document.querySelector('.ws-file-type-badge').innerText = type;
  }
  if (document.getElementById('ws-info-size')) {
    document.getElementById('ws-info-size').innerText = formattedSize;
  }

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
  const workspacesView = document.getElementById('workspaces-view-container');
  if (workspacesView) workspacesView.style.display = 'none';
  const workspaceView = document.getElementById('workspace-view-container');
  workspaceView.style.display = 'flex';
  
  try { initSpreadsheet(); } catch(e) { console.error("[OneClick] initSpreadsheet failed:", e); }

  // Generate a new workspace ID and save to DB
  currentWorkspaceId = 'ws_' + Date.now();
  const newWorkspace = {
    workspaceId: currentWorkspaceId,
    workspaceName: filename,
    fileName: filename,
    uploadTimestamp: Date.now(),
    lastOpenedTimestamp: Date.now(),
    rowCount: gridData.length,
    columnCount: headers.length,
    isFavorite: false,
    status: "Uploaded",
    datasetData: {
      gridData: gridData,
      originalGridData: originalGridData,
      headers: headers,
      headerNames: headerNames,
      columnWidths: columnWidths,
      hiddenColumns: []
    },
    cleaningHistory: {
      preprocessingHistory: [],
      preprocessingRedoHistory: []
    },
    dashboardWidgets: [],
    globalFilters: {
      activeFilters: {},
      activeSort: null,
      globalVizFilters: {},
      activeDrillState: {}
    },
    calculatedFields: {},
    drillHierarchies: []
  };

  // Save to IndexedDB and prune if over 25 limit
  if (typeof saveWorkspaceToDB === 'function') {
    window.setCloudSyncStatus('saving');
    
    saveWorkspaceToDB(newWorkspace).then(() => {
      if (typeof currentFirebaseUser !== 'undefined' && currentFirebaseUser) {
        const uid = currentFirebaseUser.uid || currentFirebaseUser.email;
        
        let fileOrBlob = originalFile;
        if (!fileOrBlob) {
          const headersList = newWorkspace.datasetData.headers.map(h => newWorkspace.datasetData.headerNames[h] || h);
          const fullRows = [headersList, ...newWorkspace.datasetData.gridData];
          const csvString = Papa.unparse(fullRows);
          fileOrBlob = new Blob([csvString], { type: "text/csv" });
        }
        
        uploadDatasetFileToStorage(uid, currentWorkspaceId, fileOrBlob, filename).then(storageResult => {
          newWorkspace.datasetMetadata = {
            fileUrl: storageResult.fileUrl,
            storagePath: storageResult.storagePath,
            fileSize: sizeBytes || fileOrBlob.size,
            fileType: type,
            rowCount: newWorkspace.rowCount,
            columnCount: newWorkspace.columnCount,
            headers: newWorkspace.datasetData.headers,
            columnTypes: newWorkspace.datasetData.columnTypes || []
          };
          
          // Truncate raw arrays from Firestore body
          const cloudWorkspace = JSON.parse(JSON.stringify(newWorkspace));
          cloudWorkspace.datasetData.gridData = [];
          cloudWorkspace.datasetData.originalGridData = [];
          cloudWorkspace.isCloudSyncTruncated = true;
          
          saveWorkspaceToFirestore(uid, cloudWorkspace).then(() => {
            // Cache metadata (including storage links) to local IndexedDB
            openDB().then(db => {
              const tx = db.transaction(STORE_NAME, 'readwrite');
              tx.objectStore(STORE_NAME).put(newWorkspace);
            });
            window.setCloudSyncStatus('synced');
            if (typeof updateCurrentDatasetContext === 'function') updateCurrentDatasetContext();
          });
        }).catch(err => {
          console.error("Firebase storage upload failed:", err);
          window.setCloudSyncStatus('offline');
        });
      } else {
        window.setCloudSyncStatus('saved');
        if (typeof updateCurrentDatasetContext === 'function') updateCurrentDatasetContext();
      }
      return enforceWorkspaceLimit();
    }).catch(err => {
      console.error("Failed to save new workspace to DB:", err);
      window.setCloudSyncStatus('offline');
    });
  }
}
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• DEMO DATASETS GENERATION â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
      try { loadParsedData([headers.map(h => headerNames[h]), ...gridData], title + ".xlsx", "XLSX", sizeBytes); } catch(e) { console.error('[OneClick] loadParsedData (demo) failed:', e); }
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


// Exit Workspace and return to dashboard/workspaces page
// Exit Workspace and return to dashboard/projects page
document.getElementById('ws-btn-exit').addEventListener('click', () => {
  if (typeof performSaveWorkspace === 'function') {
    performSaveWorkspace().then(() => {
      document.getElementById('workspace-view-container').style.display = 'none';
      const navProjects = document.getElementById('nav-projects');
      if (navProjects && navProjects.classList.contains('active')) {
        document.getElementById('projects-view-container').style.display = 'block';
        if (typeof loadAndRenderProjects === 'function') {
          loadAndRenderProjects();
        }
      } else {
        document.getElementById('dashboard-view-container').style.display = 'block';
        if (typeof loadAndRenderDashboard === 'function') {
          loadAndRenderDashboard();
        }
      }
      currentWorkspaceId = null;
    });
  } else {
    document.getElementById('workspace-view-container').style.display = 'none';
    document.getElementById('dashboard-view-container').style.display = 'block';
    if (typeof loadAndRenderDashboard === 'function') {
      loadAndRenderDashboard();
    }
  }
});
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â PHASE 2: SAVE / LOAD STATE Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
  
  if (activeVizTab === 'dashboard') renderDashboardTab();
  else if (activeVizTab === 'explore') renderExploreTab();
  else if (activeVizTab === 'insights') renderInsightsTab();
  else if (activeVizTab === 'manage') renderManageTab();
}

function saveDashboardToStorage(name) {
  if (typeof window.setCloudSyncStatus === 'function') {
    window.setCloudSyncStatus('saving');
  }
  var rawName = name.replace(/\s+/g, '_') + '_' + Date.now();
  var key = 'oneclick_dash_' + rawName;
  const state = getDashboardState();
  state.id = rawName;
  state.savedAt = new Date().toISOString();
  
  try { 
    localStorage.setItem(key, JSON.stringify(state)); 
    
    if (typeof currentFirebaseUser !== 'undefined' && currentFirebaseUser) {
      const uid = currentFirebaseUser.uid || currentFirebaseUser.email;
      if (name.startsWith('Template_')) {
        saveTemplateToFirestore(uid, rawName, state).then(() => {
          if (typeof window.setCloudSyncStatus === 'function') {
            window.setCloudSyncStatus('synced');
          }
        });
      } else {
        saveReportToFirestore(uid, rawName, state).then(() => {
          if (typeof window.setCloudSyncStatus === 'function') {
            window.setCloudSyncStatus('synced');
          }
        });
      }
    } else {
      if (typeof window.setCloudSyncStatus === 'function') {
        window.setCloudSyncStatus('saved');
      }
    }
    return key; 
  } catch(e) { 
    if (typeof window.setCloudSyncStatus === 'function') {
      window.setCloudSyncStatus('offline');
    }
    if (typeof showToast === 'function') showToast('Storage quota exceeded. Free up space and try again.', 'error');
    return null; 
  }
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
  // Integrated into Manage tab accordions
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof switchVizTab === 'function') {
    window.switchVizTab = switchVizTab;
  }

  // Re-bind all viz tab buttons to use unified version
  document.querySelectorAll('.viz-tab-btn').forEach(function(btn) {
    btn.onclick = function() {
      if (typeof window.switchVizTab === 'function') {
        window.switchVizTab(btn.dataset.tab);
      }
    };
  });

  if (typeof switchToDashboardView === 'function') {
    var _origSwitchToDashboardView = switchToDashboardView;
    window.switchToDashboardView = function() {
      _origSwitchToDashboardView();
    };
  }

  // Re-bind switch-to-dashboard triggers
  if (typeof wsBtnVisualize !== 'undefined' && wsBtnVisualize) wsBtnVisualize.onclick = window.switchToDashboardView;
  if (typeof btnSwitchDash !== 'undefined' && btnSwitchDash) btnSwitchDash.onclick = window.switchToDashboardView;
});


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• COLLAPSIBLE PANELS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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

// Initialise both panels (they may not be visible yet â€” safe to init early)
initCollapsiblePanel('preprocessing-panel-header', 'preprocessing-panel-body', 'preprocessing-toggle-icon', 'panel-preprocessing-collapsed');
initCollapsiblePanel('dashbuilder-panel-header',   'dashbuilder-panel-body',   'dashbuilder-toggle-icon',   'panel-dashbuilder-collapsed');

// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â PANEL MANAGER Ã¢â‚¬â€ 3-STATE SYSTEM Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â
// States: 'open' | 'rail' | 'closed'
// Manages: Data Preprocessing + Dashboard Builder panels
// Single container rule: only one panel content visible at a time.

(function() {
  var STORAGE_KEY = 'oneclick_panel_state';

  // Which content panel is currently active: 'preprocessing' | 'visualization' | null
  var activePanelContent = null;

  // Panel sidebar element
  var sidebar = document.getElementById('ws-sidebar');

  // Ã¢â€â‚¬Ã¢â€â‚¬ State helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function getPanelState() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || {}; } catch(e) { return {}; }
  }
  window.getPanelState = getPanelState;

  function savePanelState(state) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch(e) {}
  }
  window.savePanelState = savePanelState;

  // Ã¢â€ â‚¬Ã¢â€ â‚¬ Apply sidebar width state Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬Ã¢â€ â‚¬
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
  window.applySidebarState = applySidebarState;

  // Ã¢â€â‚¬Ã¢â€â‚¬ Show a panel's inner content (without changing width state) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
  window.showPanelContent = showPanelContent;

})(); // end Panel Manager IIFE


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• WORKSPACES ENGINE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

currentWorkspaceId = null;
window.isRestoringWorkspace = false;
autoSaveTimer = null;
workspacesListLimit = 10;

DB_NAME = 'oneclick_db';
DB_VERSION = 1;
STORE_NAME = 'workspaces';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'workspaceId' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

function saveWorkspaceToDB(workspace) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(workspace);
      request.onsuccess = () => {
        if (typeof currentFirebaseUser !== 'undefined' && currentFirebaseUser) {
          saveWorkspaceToFirestore(currentFirebaseUser.uid || currentFirebaseUser.email, workspace)
            .then(() => resolve())
            .catch(err => {
              console.error("Firestore sync error during local save:", err);
              resolve(); // Resolve anyway so we do not block local saves
            });
        } else {
          resolve();
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

function getWorkspaceFromDB(workspaceId) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(workspaceId);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

function getAllWorkspacesFromDB() {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = (e) => resolve(e.target.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

function deleteWorkspaceFromDB(workspaceId) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(workspaceId);
      request.onsuccess = () => {
        if (typeof currentFirebaseUser !== 'undefined' && currentFirebaseUser) {
          deleteWorkspaceFromFirestore(currentFirebaseUser.uid || currentFirebaseUser.email, workspaceId)
            .then(() => resolve())
            .catch(err => {
              console.error("Firestore delete error during local delete:", err);
              resolve();
            });
        } else {
          resolve();
        }
      };
      request.onerror = (e) => reject(e.target.error);
    });
  });
}

function enforceWorkspaceLimit() {
  return getAllWorkspacesFromDB().then(workspaces => {
    if (workspaces.length <= 25) return;
    
    // Sort all workspaces by lastOpenedTimestamp ascending
    const nonFavorites = workspaces.filter(w => !w.isFavorite);
    nonFavorites.sort((a, b) => (a.lastOpenedTimestamp || 0) - (b.lastOpenedTimestamp || 0));
    
    const excessCount = workspaces.length - 25;
    const deletePromises = [];
    
    for (let i = 0; i < Math.min(excessCount, nonFavorites.length); i++) {
      deletePromises.push(deleteWorkspaceFromDB(nonFavorites[i].workspaceId));
    }
    
    return Promise.all(deletePromises);
  });
}

function computeWorkspaceStatus() {
  if (dashboardWidgets && dashboardWidgets.length > 0) {
    return "Dashboard Created";
  }
  if (preprocessingHistory && preprocessingHistory.length > 0) {
    return "Cleaned";
  }
  return "Uploaded";
}

function getActiveWorkspaceState(existingWorkspace) {
  const now = Date.now();
  const titleEl = document.getElementById('ws-dataset-name');
  const wsName = titleEl ? titleEl.innerText.trim() : (existingWorkspace ? existingWorkspace.workspaceName : "Untitled Workspace");
  
  return {
    workspaceId: currentWorkspaceId,
    workspaceName: wsName,
    fileName: existingWorkspace ? existingWorkspace.fileName : wsName,
    uploadTimestamp: existingWorkspace ? existingWorkspace.uploadTimestamp : now,
    lastOpenedTimestamp: now,
    rowCount: gridData ? gridData.length : 0,
    columnCount: headers ? headers.length : 0,
    isFavorite: existingWorkspace ? !!existingWorkspace.isFavorite : false,
    status: computeWorkspaceStatus(),
    datasetData: {
      gridData: gridData,
      originalGridData: originalGridData,
      headers: headers,
      headerNames: headerNames,
      columnWidths: columnWidths,
      hiddenColumns: Array.from(hiddenColumns)
    },
    cleaningHistory: {
      preprocessingHistory: preprocessingHistory,
      preprocessingRedoHistory: preprocessingRedoHistory
    },
    dashboardWidgets: dashboardWidgets,
    globalFilters: {
      activeFilters: typeof activeFilters !== 'undefined' ? activeFilters : null,
      activeSort: typeof activeSort !== 'undefined' ? activeSort : null,
      globalVizFilters: typeof globalVizFilters !== 'undefined' ? globalVizFilters : null,
      activeDrillState: typeof activeDrillState !== 'undefined' ? activeDrillState : null
    },
    calculatedFields: calculatedFields,
    drillHierarchies: drillHierarchies,
    aiHistory: typeof aiActiveChatHistory !== 'undefined' ? aiActiveChatHistory : []
  };
}

function autoSaveActiveWorkspace(isDebounced = false) {
  if (window.isRestoringWorkspace) return;
  if (!currentWorkspaceId) return;
  
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  
  if (isDebounced) {
    autoSaveTimer = setTimeout(() => {
      performSaveWorkspace().then(() => {
        showToast("Auto-saved progress", "info");
      }).catch(err => {
        console.error("Auto-save failed:", err);
      });
    }, 5000);
  } else {
    performSaveWorkspace().catch(err => {
      console.error("Immediate auto-save failed:", err);
    });
  }
}

function performSaveWorkspace() {
  if (!currentWorkspaceId) {
    return Promise.reject(new Error("No active workspace to save."));
  }
  
  if (typeof window.setCloudSyncStatus === 'function') {
    window.setCloudSyncStatus('saving');
  }
  
  return getWorkspaceFromDB(currentWorkspaceId).then(existingWorkspace => {
    const updatedWorkspace = getActiveWorkspaceState(existingWorkspace);
    
    // Crucial check: Preserve cloud dataset storage references in active state
    if (existingWorkspace && existingWorkspace.datasetMetadata) {
      updatedWorkspace.datasetMetadata = existingWorkspace.datasetMetadata;
    }
    
    return saveWorkspaceToDB(updatedWorkspace).then(() => {
      if (typeof window.setCloudSyncStatus === 'function') {
        if (typeof currentFirebaseUser !== 'undefined' && currentFirebaseUser) {
          window.setCloudSyncStatus('synced');
        } else {
          window.setCloudSyncStatus('saved');
        }
      }
      return enforceWorkspaceLimit();
    }).catch(err => {
      if (typeof window.setCloudSyncStatus === 'function') {
        window.setCloudSyncStatus('offline');
      }
      throw err;
    });
  });
}

function showToast(message, type = "success") {
  let toast = document.getElementById('oneclick-toast-notification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'oneclick-toast-notification';
    toast.className = 'oneclick-toast';
    document.body.appendChild(toast);
  }
  
  toast.className = `oneclick-toast show ${type}`;
  toast.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;">
      ${type === 'success' ? '<polyline points="20 6 9 17 4 12"></polyline>' : 
        type === 'error' ? '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' :
        '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'}
    </svg>
    <span class="toast-message">${message}</span>
  `;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "Never";
  const diff = Date.now() - timestamp;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "Just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderWorkspaceCardHTML(w) {
  const fileExt = w.fileName ? w.fileName.split('.').pop().toLowerCase() : 'csv';
  const iconClass = (fileExt === 'xlsx' || fileExt === 'xls') ? 'xlsx' : 'csv';
  
  let previewCols = "No preview available";
  if (w.datasetData && w.datasetData.headers) {
    const list = w.datasetData.headers.map(h => w.datasetData.headerNames[h] || h);
    previewCols = list.slice(0, 4).join(', ');
    if (list.length > 4) previewCols += '...';
  }
  
  const statusClass = (w.status || 'uploaded').toLowerCase().replace(' ', '-');
  const isPinned = !!w.isFavorite;
  const pinTitle = isPinned ? "Unpin Workspace" : "Pin Workspace";
  
  const widgetsCount = w.dashboardWidgets ? w.dashboardWidgets.length : 0;
  const cleaningCount = (w.cleaningHistory && w.cleaningHistory.preprocessingHistory) ? w.cleaningHistory.preprocessingHistory.length : 0;
  
  return `
    <div class="recent-card" data-id="${w.workspaceId}" onclick="openWorkspace('${w.workspaceId}')">
      <div class="recent-card-header" onclick="event.stopPropagation();">
        <div class="recent-card-icon-wrap ${iconClass}">
          ${fileExt.toUpperCase()}
        </div>
        <div class="recent-card-title-area">
          <div class="recent-card-filename" contenteditable="false" data-id="${w.workspaceId}" onblur="saveWorkspaceNameInline(this, '${w.workspaceId}')" onkeydown="handleWorkspaceNameKeydown(event, this)">
            ${w.workspaceName || w.fileName || 'Untitled Workspace'}
          </div>
          <div class="recent-card-meta">
            <span>${w.fileName}</span>
          </div>
        </div>
        <div class="recent-card-header-actions">
          <button class="recent-btn-pin ${isPinned ? 'pinned' : ''}" title="${pinTitle}" onclick="toggleWorkspaceFavorite(event, '${w.workspaceId}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
          </button>
          <button class="recent-btn-actions" title="Actions" onclick="toggleWorkspaceActionsDropdown(event, '${w.workspaceId}')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
          
          <div class="recent-dropdown-menu" id="ws-dropdown-${w.workspaceId}">
            <button class="recent-dropdown-item" onclick="openWorkspace('${w.workspaceId}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open Workspace
            </button>
            <button class="recent-dropdown-item" onclick="triggerRenameWorkspace(event, '${w.workspaceId}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              Rename
            </button>
            <button class="recent-dropdown-item" onclick="duplicateWorkspace(event, '${w.workspaceId}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
              Duplicate
            </button>
            <button class="recent-dropdown-item" onclick="toggleWorkspaceFavorite(event, '${w.workspaceId}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              ${isPinned ? 'Unpin' : 'Pin/Favorite'}
            </button>
            <div class="recent-dropdown-divider"></div>
            <button class="recent-dropdown-item danger" onclick="deleteWorkspace(event, '${w.workspaceId}')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
              Delete Workspace
            </button>
          </div>
        </div>
      </div>
      
      <div class="recent-card-body">
        <div class="recent-detail-item">
          <span class="recent-detail-label">Dimensions</span>
          <span class="recent-detail-value">${w.rowCount.toLocaleString()} x ${w.columnCount}</span>
        </div>
        <div class="recent-detail-item">
          <span class="recent-detail-label">Dashboard</span>
          <span class="recent-detail-value">${widgetsCount} widgets</span>
        </div>
        <div class="recent-detail-item">
          <span class="recent-detail-label">Cleaning</span>
          <span class="recent-detail-value">${cleaningCount} steps</span>
        </div>
        <div class="recent-detail-item">
          <span class="recent-detail-label">Uploaded</span>
          <span class="recent-detail-value">${new Date(w.uploadTimestamp).toLocaleDateString()}</span>
        </div>
      </div>
      
      <div style="font-size:12px; color:var(--text-secondary); margin-bottom: 2px;">
        <span class="recent-detail-label" style="display:block; margin-bottom:2px;">Columns Preview</span>
        <span style="font-family: var(--font-mono); font-size:11px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">${previewCols}</span>
      </div>
      
      <div class="recent-card-footer">
        <span class="recent-status-badge ${statusClass}">${w.status || 'uploaded'}</span>
        <span class="recent-date-label">Active ${formatRelativeTime(w.lastOpenedTimestamp)}</span>
      </div>
    </div>
  `;
}

function wireWorkspaceCardEvents() {
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.recent-btn-actions') && !e.target.closest('.recent-dropdown-menu')) {
      const dropdowns = document.querySelectorAll('.recent-dropdown-menu');
      dropdowns.forEach(d => d.classList.remove('open'));
    }
  });
}

function loadAndRenderProjects() {
  getAllWorkspacesFromDB().then(workspaces => {
    workspaces.sort((a, b) => (b.lastOpenedTimestamp || 0) - (a.lastOpenedTimestamp || 0));
    
    const searchInput = document.getElementById('proj-search-input');
    const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
    
    let filteredWorkspaces = workspaces;
    if (query) {
      filteredWorkspaces = workspaces.filter(w => {
        const name = (w.workspaceName || "").toLowerCase();
        const file = (w.fileName || "").toLowerCase();
        const status = (w.status || "").toLowerCase();
        const dateStr = w.lastOpenedTimestamp ? new Date(w.lastOpenedTimestamp).toLocaleDateString().toLowerCase() : "";
        return name.includes(query) || file.includes(query) || status.includes(query) || dateStr.includes(query);
      });
    }
    
    const favorites = filteredWorkspaces.filter(w => w.isFavorite);
    const favoritesGrid = document.getElementById('proj-favorites-grid');
    const favoritesSection = document.getElementById('proj-favorites-section');
    
    if (favoritesGrid && favoritesSection) {
      if (favorites.length > 0 && !query) {
        favoritesSection.style.display = 'block';
        favoritesGrid.innerHTML = favorites.map(w => renderWorkspaceCardHTML(w)).join('');
      } else {
        favoritesSection.style.display = 'none';
        favoritesGrid.innerHTML = '';
      }
    }
    
    const allGrid = document.getElementById('proj-all-grid');
    const countLabel = document.getElementById('proj-count-label');
    const loadMoreWrap = document.getElementById('proj-load-more-wrap');
    const emptyState = document.getElementById('proj-empty-state');
    const allSection = document.getElementById('proj-all-section');
    
    if (filteredWorkspaces.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (allSection) allSection.style.display = 'none';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (allSection) allSection.style.display = 'block';
      
      const visibleWorkspaces = filteredWorkspaces.slice(0, workspacesListLimit);
      if (allGrid) {
        allGrid.innerHTML = visibleWorkspaces.map(w => renderWorkspaceCardHTML(w)).join('');
      }
      
      if (countLabel) {
        countLabel.innerText = `Showing ${visibleWorkspaces.length} of ${filteredWorkspaces.length} projects`;
      }
      
      if (loadMoreWrap) {
        if (filteredWorkspaces.length > workspacesListLimit) {
          loadMoreWrap.style.display = 'flex';
        } else {
          loadMoreWrap.style.display = 'none';
        }
      }
    }
    
    wireWorkspaceCardEvents();
  }).catch(err => {
    console.error("Failed to load projects:", err);
  });
}

window.loadAndRenderProjects = loadAndRenderProjects;

window.loadAndRenderWorkspaces = function() {
  window.loadAndRenderProjects();
};

function restoreDatasetWorkspace(wsState) {
  window.isRestoringWorkspace = true;
  currentWorkspaceId = wsState.workspaceId;
  
  gridData = wsState.datasetData.gridData || [];
  originalGridData = wsState.datasetData.originalGridData || [];
  headers = wsState.datasetData.headers || [];
  headerNames = wsState.datasetData.headerNames || {};
  columnWidths = wsState.datasetData.columnWidths || {};
  hiddenColumns = new Set(wsState.datasetData.hiddenColumns || []);
  
  if (wsState.isCloudSyncTruncated && (!gridData || gridData.length === 0)) {
    showToast("Cloud Sync Warning: Large dataset raw data must be re-uploaded or opened on the original browser", "error");
  }
  
  preprocessingHistory = (wsState.cleaningHistory && wsState.cleaningHistory.preprocessingHistory) ? wsState.cleaningHistory.preprocessingHistory : [];
  preprocessingRedoHistory = (wsState.cleaningHistory && wsState.cleaningHistory.preprocessingRedoHistory) ? wsState.cleaningHistory.preprocessingRedoHistory : [];
  
  dashboardWidgets = wsState.dashboardWidgets || [];
  
  if (wsState.globalFilters) {
    activeFilters = wsState.globalFilters.activeFilters || {};
    activeSort = wsState.globalFilters.activeSort || null;
    globalVizFilters = wsState.globalFilters.globalVizFilters || {};
    activeDrillState = wsState.globalFilters.activeDrillState || {};
  } else {
    activeFilters = {};
    activeSort = null;
    globalVizFilters = {};
    activeDrillState = {};
  }
  
  calculatedFields = wsState.calculatedFields || {};
  drillHierarchies = wsState.drillHierarchies || [];
  aiActiveChatHistory = wsState.aiHistory || [];
  if (typeof renderAiChatHistory === 'function') {
    renderAiChatHistory();
  }
  
  const titleEl = document.getElementById('ws-dataset-name');
  if (titleEl) {
    titleEl.innerText = wsState.workspaceName || wsState.fileName || "Untitled Workspace";
  }
  
  const fileBadge = document.querySelector('.ws-file-type-badge');
  if (fileBadge) {
    const ext = wsState.fileName ? wsState.fileName.split('.').pop().toUpperCase() : 'CSV';
    fileBadge.className = `ws-file-type-badge ${ext.toLowerCase()}`;
    fileBadge.innerText = ext;
  }
  
  viewIndices = gridData.map((_, i) => i);
  undoStack = [];
  redoStack = [];
  updateUndoRedoStates();
  
  if (typeof applySearchSortAndFilters === 'function') {
    applySearchSortAndFilters();
  }
  
  if (typeof renderGridTable === 'function') {
    try { renderGridTable(); } catch(e) { console.error("[OneClick] renderGridTable failed during restore:", e); }
  }
  updateMetadata();
  
  if (typeof renderHistoryTab === 'function') {
    renderHistoryTab();
  }
  
  if (typeof renderCalcFieldsList === 'function') {
    renderCalcFieldsList();
  }
  if (typeof renderDrillHierarchiesList === 'function') {
    renderDrillHierarchiesList();
  }
  
  document.getElementById('dashboard-view-container').style.display = 'none';
  const containersToHide = [
    'workspaces-view-container',
    'projects-view-container',
    'datasets-view-container',
    'reports-view-container',
    'settings-view-container'
  ];
  containersToHide.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  
  const workspaceView = document.getElementById('workspace-view-container');
  if (workspaceView) {
    workspaceView.style.display = 'flex';
  }
  
  if (typeof switchToSheetView === 'function') {
    switchToSheetView();
  }
  
  wsState.lastOpenedTimestamp = Date.now();
  saveWorkspaceToDB(wsState).catch(err => {
    console.error("Failed to update last opened timestamp:", err);
  });
  
  if (typeof updateCurrentDatasetContext === 'function') updateCurrentDatasetContext();

  setTimeout(() => {
    window.isRestoringWorkspace = false;
  }, 100);
}

window.openWorkspace = function(workspaceId) {
  showLoading("Opening Workspace", "Fetching workspace parameters...", 15);
  
  getWorkspaceFromDB(workspaceId).then(workspace => {
    if (workspace) {
      if (workspace.datasetData && workspace.datasetData.gridData && workspace.datasetData.gridData.length > 0) {
        hideLoading();
        restoreDatasetWorkspace(workspace);
      } else if (workspace.datasetMetadata && workspace.datasetMetadata.fileUrl) {
        downloadAndRestoreWorkspace(workspace);
      } else {
        hideLoading();
        restoreDatasetWorkspace(workspace);
      }
    } else {
      if (typeof currentFirebaseUser !== 'undefined' && currentFirebaseUser) {
        const uid = currentFirebaseUser.uid || currentFirebaseUser.email;
        getWorkspaceFromFirestore(uid, workspaceId).then(cloudWs => {
          if (cloudWs) {
            downloadAndRestoreWorkspace(cloudWs);
          } else {
            hideLoading();
            showToast("Workspace not found in cloud or locally.", "error");
          }
        }).catch(err => {
          hideLoading();
          showToast("Failed to query cloud: " + err.message, "error");
        });
      } else {
        hideLoading();
        showToast("Workspace not found locally.", "error");
      }
    }
  }).catch(err => {
    hideLoading();
    showToast("Failed to load workspace: " + err.message, "error");
  });
};

function downloadAndRestoreWorkspace(workspace) {
  showLoading("Downloading Dataset", `Downloading ${workspace.fileName} from cloud...`, 40);
  
  getDatasetFileFromStorage(workspace.datasetMetadata.fileUrl).then(blob => {
    showLoading("Parsing Cloud Data", "Reconstructing spreadsheet sheets client-side...", 75);
    
    const extension = workspace.fileName.split('.').pop().toLowerCase();
    
    if (extension === 'csv') {
      Papa.parse(blob, {
        skipEmptyLines: 'greedy',
        complete: function(results) {
          rehydrateWorkspaceData(workspace, results.data);
        },
        error: function(err) {
          hideLoading();
          showToast("CSV parser failed: " + err.message, "error");
        }
      });
    } else {
      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const parsed = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
          rehydrateWorkspaceData(workspace, parsed);
        } catch (err) {
          hideLoading();
          showToast("Excel parser failed: " + err.message, "error");
        }
      };
      reader.onerror = function() {
        hideLoading();
        showToast("Error reading storage file.", "error");
      };
      reader.readAsArrayBuffer(blob);
    }
  }).catch(err => {
    hideLoading();
    showToast("Cloud download failed: " + err.message, "error");
  });
}

function rehydrateWorkspaceData(workspace, parsedRows) {
  const firstRow = parsedRows[0];
  const colsCount = firstRow.length;
  
  const gData = [];
  for (let r = 1; r < parsedRows.length; r++) {
    let row = [...parsedRows[r]];
    while (row.length < colsCount) {
      row.push("");
    }
    gData.push(row);
  }
  
  workspace.datasetData.gridData = gData;
  workspace.datasetData.originalGridData = JSON.parse(JSON.stringify(gData));
  
  openDB().then(db => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(workspace);
    tx.oncomplete = () => {
      hideLoading();
      restoreDatasetWorkspace(workspace);
      showToast("Workspace synchronized and loaded!", "success");
    };
  }).catch(err => {
    hideLoading();
    restoreDatasetWorkspace(workspace);
  });
}

window.toggleWorkspaceFavorite = function(event, workspaceId) {
  if (event) event.stopPropagation();
  getWorkspaceFromDB(workspaceId).then(workspace => {
    if (!workspace) return;
    workspace.isFavorite = !workspace.isFavorite;
    return saveWorkspaceToDB(workspace).then(() => {
      const activeNav = document.querySelector('.nav-item.active .nav-label-text');
      const activeText = activeNav ? activeNav.innerText.trim() : 'Projects';
      if (activeText === 'Dashboard') {
        window.loadAndRenderDashboard();
      } else {
        window.loadAndRenderProjects();
      }
      showToast(workspace.isFavorite ? "Workspace pinned to top" : "Workspace unpinned", "success");
    });
  }).catch(err => {
    showToast("Error update: " + err.message, "error");
  });
};

window.toggleWorkspaceActionsDropdown = function(event, workspaceId) {
  if (event) event.stopPropagation();
  const dropdowns = document.querySelectorAll('.recent-dropdown-menu');
  dropdowns.forEach(d => {
    if (d.id !== `ws-dropdown-${workspaceId}`) {
      d.classList.remove('open');
    }
  });
  const dropdown = document.getElementById(`ws-dropdown-${workspaceId}`);
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
};

window.triggerRenameWorkspace = function(event, workspaceId) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById(`ws-dropdown-${workspaceId}`);
  if (dropdown) dropdown.classList.remove('open');
  const titleEl = document.querySelector(`.recent-card-filename[data-id="${workspaceId}"]`);
  if (titleEl) {
    titleEl.contentEditable = "true";
    titleEl.focus();
    const range = document.createRange();
    range.selectNodeContents(titleEl);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
};

window.saveWorkspaceNameInline = function(element, workspaceId) {
  element.contentEditable = "false";
  const newName = element.innerText.trim();
  if (!newName) {
    getWorkspaceFromDB(workspaceId).then(w => {
      element.innerText = w.workspaceName || w.fileName || 'Untitled Workspace';
    });
    return;
  }
  getWorkspaceFromDB(workspaceId).then(w => {
    if (!w) return;
    w.workspaceName = newName;
    return saveWorkspaceToDB(w).then(() => {
      const activeNav = document.querySelector('.nav-item.active .nav-label-text');
      const activeText = activeNav ? activeNav.innerText.trim() : 'Projects';
      if (activeText === 'Dashboard') {
        window.loadAndRenderDashboard();
      } else {
        window.loadAndRenderProjects();
      }
      showToast("Workspace renamed", "success");
    });
  }).catch(err => {
    showToast("Error renaming workspace: " + err.message, "error");
  });
};

window.handleWorkspaceNameKeydown = function(event, element) {
  if (event.key === 'Enter') {
    event.preventDefault();
    element.blur();
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    element.blur();
  }
};

window.duplicateWorkspace = function(event, workspaceId) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById(`ws-dropdown-${workspaceId}`);
  if (dropdown) dropdown.classList.remove('open');
  getWorkspaceFromDB(workspaceId).then(w => {
    if (!w) return;
    const duplicate = JSON.parse(JSON.stringify(w));
    duplicate.workspaceId = 'ws_' + Date.now();
    duplicate.workspaceName = `Copy of ${w.workspaceName || w.fileName}`;
    duplicate.uploadTimestamp = Date.now();
    duplicate.lastOpenedTimestamp = Date.now();
    duplicate.isFavorite = false;
    return saveWorkspaceToDB(duplicate).then(() => {
      return enforceWorkspaceLimit();
    }).then(() => {
      const activeNav = document.querySelector('.nav-item.active .nav-label-text');
      const activeText = activeNav ? activeNav.innerText.trim() : 'Projects';
      if (activeText === 'Dashboard') {
        window.loadAndRenderDashboard();
      } else {
        window.loadAndRenderProjects();
      }
      showToast("Workspace duplicated", "success");
    });
  }).catch(err => {
    showToast("Failed to duplicate: " + err.message, "error");
  });
};

window.deleteWorkspace = function(event, workspaceId) {
  if (event) event.stopPropagation();
  const dropdown = document.getElementById(`ws-dropdown-${workspaceId}`);
  if (dropdown) dropdown.classList.remove('open');
  if (confirm("Are you sure you want to delete this workspace permanently?")) {
    deleteWorkspaceFromDB(workspaceId).then(() => {
      const activeNav = document.querySelector('.nav-item.active .nav-label-text');
      const activeText = activeNav ? activeNav.innerText.trim() : 'Projects';
      if (activeText === 'Dashboard') {
        window.loadAndRenderDashboard();
      } else {
        window.loadAndRenderProjects();
      }
      showToast("Workspace deleted successfully", "info");
    }).catch(err => {
      showToast("Failed to delete workspace: " + err.message, "error");
    });
  }
};

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• NEW VIEW RENDERING CONTROLLERS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

window.loadAndRenderDashboard = function() {
  getAllWorkspacesFromDB().then(workspaces => {
    const emptyState = document.getElementById('db-empty-state');
    const contentSections = document.getElementById('db-content-sections');
    
    if (workspaces.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (contentSections) contentSections.style.display = 'none';
      return;
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (contentSections) contentSections.style.display = 'block';
    }
    
    workspaces.sort((a, b) => (b.lastOpenedTimestamp || 0) - (a.lastOpenedTimestamp || 0));
    const recentWorkspaces = workspaces.slice(0, 3);
    
    const dbRecentGrid = document.getElementById('db-recent-datasets-grid');
    if (dbRecentGrid) {
      dbRecentGrid.innerHTML = recentWorkspaces.map(w => renderWorkspaceCardHTML(w)).join('');
    }
    
    const keys = Object.keys(localStorage).filter(k => k.startsWith('oneclick_dash_'));
    const reports = keys.map(k => {
      try { return { key: k, state: JSON.parse(localStorage.getItem(k)) }; }
      catch(e) { return null; }
    }).filter(r => r !== null);
    
    reports.sort((a, b) => new Date(b.state.savedAt) - new Date(a.state.savedAt));
    const recentReports = reports.slice(0, 3);
    
    const dbReportsGrid = document.getElementById('db-recent-reports-grid');
    if (dbReportsGrid) {
      if (recentReports.length > 0) {
        dbReportsGrid.innerHTML = recentReports.map(r => renderReportCardHTML(r.key, r.state)).join('');
      } else {
        dbReportsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; padding: 24px; text-align: center; color: var(--text-secondary); background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed var(--border-color); font-size: 13px;">
            No reports saved yet. Create a report in your active workspace and click "Save Dashboard" to see it here.
          </div>
        `;
      }
    }
    
    wireWorkspaceCardEvents();
  }).catch(err => {
    console.error("Failed to load dashboard data:", err);
  });
};

window.loadAndRenderDatasets = function() {
  getAllWorkspacesFromDB().then(workspaces => {
    const emptyState = document.getElementById('ds-empty-state');
    const contentSection = document.getElementById('ds-content-section');
    const tableBody = document.getElementById('ds-table-body');
    
    if (workspaces.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (contentSection) contentSection.style.display = 'none';
      return;
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (contentSection) contentSection.style.display = 'block';
    }
    
    workspaces.sort((a, b) => b.uploadTimestamp - a.uploadTimestamp);
    
    if (tableBody) {
      tableBody.innerHTML = workspaces.map(w => renderDatasetRowHTML(w)).join('');
    }
  }).catch(err => {
    console.error("Failed to load datasets:", err);
  });
};

function renderDatasetRowHTML(w) {
  const dateStr = new Date(w.uploadTimestamp).toLocaleDateString();
  const statusClass = (w.status || 'uploaded').toLowerCase().replace(/\s+/g, '-');
  return `
    <tr>
      <td style="font-weight: 500; color: var(--text-primary); padding: 16px 24px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--primary); flex-shrink: 0;">
            <ellipse cx="12" cy="5" rx="9" ry="3"/>
            <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
          </svg>
          <span>${w.fileName}</span>
        </div>
      </td>
      <td style="padding: 16px 24px; color: var(--text-primary);">${w.rowCount.toLocaleString()}</td>
      <td style="padding: 16px 24px; color: var(--text-primary);">${w.columnCount}</td>
      <td style="padding: 16px 24px; color: var(--text-secondary);">${dateStr}</td>
      <td style="padding: 16px 24px;">
        <span class="recent-status-badge ${statusClass}">${w.status || 'uploaded'}</span>
      </td>
      <td style="text-align: right; padding: 16px 24px; padding-right: 24px;">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn-secondary btn-sm" onclick="openWorkspace('${w.workspaceId}')" style="margin:0; padding:4px 8px; font-size:11px; height: 28px;">
            Open
          </button>
          <button class="btn-secondary btn-sm" onclick="deleteDataset(event, '${w.workspaceId}')" style="margin:0; padding:4px 8px; font-size:11px; height: 28px; color:var(--error); border-color:rgba(239,68,68,0.2);">
            Delete
          </button>
        </div>
      </td>
    </tr>
  `;
}

window.deleteDataset = function(event, workspaceId) {
  if (event) event.stopPropagation();
  if (confirm("Are you sure you want to delete this dataset workspace permanently? This will remove all associated pre-processing, formulas, and dashboards.")) {
    deleteWorkspaceFromDB(workspaceId).then(() => {
      loadAndRenderDatasets();
      showToast("Dataset deleted", "info");
    }).catch(err => {
      showToast("Failed to delete dataset: " + err.message, "error");
    });
  }
};

window.loadAndRenderReportsList = function() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('oneclick_dash_'));
  const emptyState = document.getElementById('rep-empty-state');
  const contentSection = document.getElementById('rep-content-section');
  const grid = document.getElementById('rep-grid');
  
  if (keys.length === 0) {
    if (emptyState) emptyState.style.display = 'flex';
    if (contentSection) contentSection.style.display = 'none';
    return;
  } else {
    if (emptyState) emptyState.style.display = 'none';
    if (contentSection) contentSection.style.display = 'block';
  }
  
  const reports = keys.map(k => {
    try { return { key: k, state: JSON.parse(localStorage.getItem(k)) }; }
    catch(e) { return null; }
  }).filter(r => r !== null);
  
  reports.sort((a, b) => new Date(b.state.savedAt) - new Date(a.state.savedAt));
  
  if (grid) {
    grid.innerHTML = reports.map(r => renderReportCardHTML(r.key, r.state)).join('');
  }
};

function renderReportCardHTML(key, state) {
  const displayName = key.replace('oneclick_dash_', '').replace(/_\d+$/, '').replace(/_/g, ' ');
  const dateStr = state.savedAt ? new Date(state.savedAt).toLocaleString() : 'Unknown';
  const widgetCount = state.dashboardWidgets ? state.dashboardWidgets.length : 0;
  
  return `
    <div class="recent-card report-card" style="display: flex; flex-direction: column; justify-content: space-between; min-height: 180px;">
      <div>
        <div class="recent-card-header">
          <div class="recent-card-icon-wrap report-icon" style="background: rgba(139, 92, 246, 0.1); color: #8B5CF6; border-radius: 6px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px; width:36px; height:36px; flex-shrink:0;">
            REP
          </div>
          <div class="recent-card-title-area" style="overflow: hidden;">
            <div class="recent-card-filename" style="font-weight:600; color:var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              ${displayName}
            </div>
            <div class="recent-card-meta" style="text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
              <span>Dataset: ${state.datasetName || 'Unknown'}</span>
            </div>
          </div>
        </div>
        
        <div class="recent-card-body" style="padding-top:8px; margin-bottom:12px;">
          <div class="recent-detail-item" style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
            <span class="recent-detail-label" style="color:var(--text-secondary);">Visualizations</span>
            <span class="recent-detail-value" style="color:var(--text-primary); font-weight:500;">${widgetCount} charts/widgets</span>
          </div>
          <div class="recent-detail-item" style="display:flex; justify-content:space-between; font-size:12px;">
            <span class="recent-detail-label" style="color:var(--text-secondary);">Saved Date</span>
            <span class="recent-detail-value" style="color:var(--text-primary); font-weight:500;">${new Date(state.savedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      <div class="recent-card-footer" style="display:flex; gap:8px; margin-top:auto; justify-content: flex-end; width: 100%; border-top: 1px solid var(--border-color); padding-top: 12px;">
        <button class="btn-secondary btn-sm" onclick="viewReport('${key}')" style="margin:0; padding:4px 8px; font-size:11px; height:26px;">
          View Report
        </button>
        <button class="btn-secondary btn-sm" onclick="exportReport('${key}')" style="margin:0; padding:4px 8px; font-size:11px; height:26px;">
          Export
        </button>
        <button class="btn-secondary btn-sm" onclick="deleteReport('${key}')" style="margin:0; padding:4px 8px; font-size:11px; height:26px; color:var(--error); border-color:rgba(239,68,68,0.2);">
          Delete
        </button>
      </div>
    </div>
  `;
}

window.viewReport = function(key) {
  const stateStr = localStorage.getItem(key);
  if (!stateStr) return;
  try {
    const state = JSON.parse(stateStr);
    const dsName = state.datasetName;
    
    getAllWorkspacesFromDB().then(workspaces => {
      const matched = workspaces.find(w => (w.workspaceName || w.fileName) === dsName);
      if (matched) {
        getWorkspaceFromDB(matched.workspaceId).then(workspace => {
          if (!workspace) {
            showToast("Workspace not found!", "error");
            return;
          }
          const tempWorkspace = Object.assign({}, workspace, {
            dashboardWidgets: state.dashboardWidgets || [],
            globalFilters: Object.assign({}, workspace.globalFilters, {
              globalVizFilters: state.globalVizFilters || {}
            }),
            calculatedFields: state.calculatedFields || {},
            drillHierarchies: state.drillHierarchies || []
          });
          
          restoreDatasetWorkspace(tempWorkspace);
          
          setTimeout(() => {
            if (typeof switchToDashboardView === 'function') {
              switchToDashboardView();
            }
          }, 150);
          
          showToast("Loaded report dashboard in workspace", "success");
        });
      } else {
        showToast(`No active workspace matches dataset '${dsName}'. Please import the dataset first.`, "error");
      }
    });
  } catch(e) {
    showToast("Failed to load report: " + e.message, "error");
  }
};

window.exportReport = function(key) {
  const stateStr = localStorage.getItem(key);
  if (!stateStr) return;
  try {
    const blob = new Blob([stateStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filenameClean = key.replace('oneclick_dash_', '').replace(/_\d+$/, '');
    a.href = url;
    a.download = `oneclick_report_${filenameClean}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Report exported successfully", "success");
  } catch(e) {
    showToast("Failed to export report: " + e.message, "error");
  }
};

window.deleteReport = function(key) {
  if (confirm("Are you sure you want to delete this report permanently?")) {
    localStorage.removeItem(key);
    showToast("Report deleted", "info");
    
    const currentActive = document.querySelector('.nav-item.active .nav-label-text');
    const activeText = currentActive ? currentActive.innerText.trim() : 'Dashboard';
    if (activeText === 'Dashboard') {
      loadAndRenderDashboard();
    } else if (activeText === 'Reports') {
      loadAndRenderReportsList();
    }
  }
};

window.loadAndRenderSettings = function() {
  const usernameInput = document.getElementById('settings-username');
  if (usernameInput) {
    const savedUsername = localStorage.getItem('oneclick_username');
    if (savedUsername) usernameInput.value = savedUsername;
  }
  
  const autosaveDelaySelect = document.getElementById('settings-autosave-delay');
  if (autosaveDelaySelect) {
    const savedDelay = localStorage.getItem('oneclick_autosave_delay');
    if (savedDelay) autosaveDelaySelect.value = savedDelay;
  }
  
  const exportFormatSelect = document.getElementById('settings-export-format');
  if (exportFormatSelect) {
    const savedFormat = localStorage.getItem('oneclick_export_format');
    if (savedFormat) exportFormatSelect.value = savedFormat;
  }

  // Re-initialize Firebase Engine
  if (typeof initFirebaseEngine === 'function') {
    initFirebaseEngine();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Initialize user profile settings from localStorage
  const savedUsername = localStorage.getItem('oneclick_username');
  if (savedUsername) {
    updateUsernameDOM(savedUsername);
  }
  
  // Call loadAndRenderDashboard initially since it is the active tab
  if (typeof loadAndRenderDashboard === 'function') {
    loadAndRenderDashboard();
  }
  
  // Wire global upload triggers
  wireGlobalUploadButtons();
  
  // Wire dashboard view redirects
  const linkAllDatasets = document.getElementById('db-link-all-datasets');
  if (linkAllDatasets) {
    linkAllDatasets.addEventListener('click', (e) => {
      e.preventDefault();
      const navDatasets = document.getElementById('nav-datasets');
      if (navDatasets) {
        const link = navDatasets.querySelector('a');
        if (link) window.setActive(link);
      }
    });
  }

  const linkAllReports = document.getElementById('db-link-all-reports');
  if (linkAllReports) {
    linkAllReports.addEventListener('click', (e) => {
      e.preventDefault();
      const navReports = document.getElementById('nav-reports');
      if (navReports) {
        const link = navReports.querySelector('a');
        if (link) window.setActive(link);
      }
    });
  }
  
  // Wire Load Demo buttons
  const dbBtnDemo = document.getElementById('db-btn-demo');
  if (dbBtnDemo) {
    dbBtnDemo.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof generateDemoDatasetChunked === 'function') {
        generateDemoDatasetChunked(50000, 25, "sales_tracker_demo.csv");
      }
    });
  }

  const settingsBtnLoadDemo = document.getElementById('settings-btn-load-demo');
  if (settingsBtnLoadDemo) {
    settingsBtnLoadDemo.addEventListener('click', (e) => {
      e.preventDefault();
      if (typeof generateDemoDatasetChunked === 'function') {
        generateDemoDatasetChunked(50000, 25, "sales_tracker_demo.csv");
      }
    });
  }
  
  // Wire reset DB button
  const settingsBtnReset = document.getElementById('settings-btn-reset');
  if (settingsBtnReset) {
    settingsBtnReset.addEventListener('click', (e) => {
      e.preventDefault();
      if (confirm("WARNING: This will permanently wipe all your datasets, projects, cleaning history, and reports. Are you sure you want to do a full database reset?")) {
        openDB().then(db => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          const request = store.clear();
          request.onsuccess = () => {
            // Clear localStorage dashboards and Firebase credentials
            const keys = Object.keys(localStorage).filter(k => 
              k.startsWith('oneclick_dash_') || 
              k === 'oneclick_username' || 
              k === 'oneclick_autosave_delay' || 
              k === 'oneclick_firebase_config' || 
              k === 'oneclick_mock_user_session' || 
              k === 'oneclick_mock_cloud_workspaces'
            );
            keys.forEach(k => localStorage.removeItem(k));
            
            showToast("Database successfully wiped!", "info");
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          };
          request.onerror = (e) => {
            showToast("Failed to wipe database: " + e.target.error, "error");
          };
        }).catch(err => {
          const keys = Object.keys(localStorage).filter(k => 
            k.startsWith('oneclick_dash_') || 
            k === 'oneclick_username' || 
            k === 'oneclick_autosave_delay' || 
            k === 'oneclick_firebase_config' || 
            k === 'oneclick_mock_user_session' || 
            k === 'oneclick_mock_cloud_workspaces'
          );
          keys.forEach(k => localStorage.removeItem(k));
          window.location.reload();
        });
      }
    });
  }
  
  // Wire settings fields input events
  // Helper to trigger Settings Firestore sync
  function triggerSettingsCloudSync() {
    if (typeof currentFirebaseUser !== 'undefined' && currentFirebaseUser) {
      const uid = currentFirebaseUser.uid || currentFirebaseUser.email;
      const settingsObj = {
        theme: document.body.classList.contains('light-theme') ? 'light-theme' : 'dark-theme',
        username: localStorage.getItem('oneclick_username') || 'Nishant S.',
        autosaveDelay: localStorage.getItem('oneclick_autosave_delay') || '5000',
        exportFormat: localStorage.getItem('oneclick_export_format') || 'CSV',
        updatedAt: Date.now()
      };
      if (typeof saveSettingsToFirestore === 'function') {
        saveSettingsToFirestore(uid, settingsObj);
      }
    }
  }

  // Wire settings fields input events
  const usernameInput = document.getElementById('settings-username');
  if (usernameInput) {
    usernameInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (val) {
        localStorage.setItem('oneclick_username', val);
        updateUsernameDOM(val);
        triggerSettingsCloudSync();
      }
    });
  }

  const autosaveDelaySelect = document.getElementById('settings-autosave-delay');
  if (autosaveDelaySelect) {
    autosaveDelaySelect.addEventListener('change', (e) => {
      localStorage.setItem('oneclick_autosave_delay', e.target.value);
      showToast("Autosave settings updated", "success");
      triggerSettingsCloudSync();
    });
  }

  const exportFormatSelect = document.getElementById('settings-export-format');
  if (exportFormatSelect) {
    exportFormatSelect.addEventListener('change', (e) => {
      localStorage.setItem('oneclick_export_format', e.target.value);
      showToast("Default export format updated", "success");
      triggerSettingsCloudSync();
    });
  }
  
  // Wire Projects search and load more
  const projSearchInput = document.getElementById('proj-search-input');
  if (projSearchInput) {
    projSearchInput.addEventListener('input', () => {
      workspacesListLimit = 10;
      if (typeof loadAndRenderProjects === 'function') {
        loadAndRenderProjects();
      }
    });
  }

  const btnProjLoadMore = document.getElementById('btn-proj-load-more');
  if (btnProjLoadMore) {
    btnProjLoadMore.addEventListener('click', () => {
      workspacesListLimit += 10;
      if (typeof loadAndRenderProjects === 'function') {
        loadAndRenderProjects();
      }
    });
  }
  if (typeof initFloatingCopilot === 'function') initFloatingCopilot();
});
currentDatasetContext = {
  columns: [],
  columnTypes: {},
  dateColumns: [],
  numericColumns: [],
  categoricalColumns: [],
  rowCount: 0,
  calculatedFields: {},
  dashboardMetrics: [],
  dashboardFilters: {},
  dashboardWidgets: [],
  columnStatistics: {},
  missingValueStats: {},
  duplicateStats: 0,
  dataQualityScore: 100
};

function updateCurrentDatasetContext() {
  if (!gridData || gridData.length === 0) {
    currentDatasetContext = {
      columns: [],
      columnTypes: {},
      dateColumns: [],
      numericColumns: [],
      categoricalColumns: [],
      rowCount: 0,
      calculatedFields: {},
      dashboardMetrics: [],
      dashboardFilters: {},
      dashboardWidgets: [],
      columnStatistics: {},
      missingValueStats: {},
      duplicateStats: 0,
      dataQualityScore: 100
    };
    renderDatasetContextSnapshot();
    return;
  }

  const cols = headers;
  const colTypes = {};
  const dateCols = [];
  const numCols = [];
  const catCols = [];
  const missingStats = {};
  const stats = {};
  const totalRows = gridData.length;

  // Scan columns for stats
  cols.forEach(colKey => {
    const t = detectColumnType(colKey);
    colTypes[colKey] = t;
    if (t === 'date') dateCols.push(colKey);
    else if (t === 'currency' || t === 'percentage' || t === 'number' || t === 'numeric') numCols.push(colKey);
    else catCols.push(colKey);

    const colIdx = headers.indexOf(colKey);
    let missing = 0;
    let sum = 0;
    let min = Infinity;
    let max = -Infinity;
    let nonMissingVals = [];
    const uniques = new Set();

    for (let r = 0; r < totalRows; r++) {
      const rawVal = gridData[r][colIdx];
      const valStr = String(rawVal !== undefined && rawVal !== null ? rawVal : "").trim();
      if (valStr === "") {
        missing++;
      } else {
        uniques.add(valStr);
        if (t === 'currency' || t === 'percentage' || t === 'number' || t === 'numeric') {
          const valNum = getCleanNumericValue(rawVal);
          sum += valNum;
          if (valNum < min) min = valNum;
          if (valNum > max) max = valNum;
          nonMissingVals.push(valNum);
        } else {
          nonMissingVals.push(valStr);
        }
      }
    }

    missingStats[colKey] = missing;

    let median = null;
    let mean = null;
    if (nonMissingVals.length > 0) {
      if (t === 'currency' || t === 'percentage' || t === 'number' || t === 'numeric') {
        nonMissingVals.sort((a, b) => a - b);
        const mid = Math.floor(nonMissingVals.length / 2);
        median = nonMissingVals.length % 2 !== 0 ? nonMissingVals[mid] : (nonMissingVals[mid - 1] + nonMissingVals[mid]) / 2;
        mean = sum / nonMissingVals.length;
      } else {
        nonMissingVals.sort();
        const mid = Math.floor(nonMissingVals.length / 2);
        median = nonMissingVals[mid];
      }
    }

    stats[colKey] = {
      type: t,
      missingCount: missing,
      uniqueCount: uniques.size,
      uniqueValues: Array.from(uniques),
      mean: mean,
      min: min === Infinity ? null : min,
      max: max === -Infinity ? null : max,
      median: median
    };
  });

  // Count duplicate rows
  duplicates = 0;
  const seenRows = new Set();
  for (let r = 0; r < totalRows; r++) {
    const rowStr = JSON.stringify(gridData[r]);
    if (seenRows.has(rowStr)) {
      duplicates++;
    } else {
      seenRows.add(rowStr);
    }
  }

  // Calculate Data Quality Score
  const totalCells = totalRows * cols.length;
  let totalMissing = 0;
  Object.values(missingStats).forEach(v => totalMissing += v);
  const missingPenalty = totalCells > 0 ? (totalMissing / totalCells) * 100 : 0;
  const duplicatePenalty = totalRows > 0 ? (duplicates / totalRows) * 100 : 0;
  const qualityScore = Math.max(0, Math.round(100 - missingPenalty - duplicatePenalty));

  currentDatasetContext = {
    columns: cols,
    columnTypes: colTypes,
    dateColumns: dateCols,
    numericColumns: numCols,
    categoricalColumns: catCols,
    rowCount: totalRows,
    calculatedFields: Object.assign({}, calculatedFields || {}),
    dashboardMetrics: dashboardWidgets.filter(w => w.type === 'kpi'),
    dashboardFilters: Object.assign({}, globalFiltersV3 || {}),
    dashboardWidgets: [...dashboardWidgets],
    columnStatistics: stats,
    missingValueStats: missingStats,
    duplicateStats: duplicates,
    dataQualityScore: qualityScore
  };

  renderDatasetContextSnapshot();
}

function renderDatasetContextSnapshot() {
  const container = document.getElementById('ai-context-snapshot');
  if (!container) return;

  if (!gridData || gridData.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 8px 0;">No active dataset loaded.</div>`;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
      <span>Total Rows</span>
      <span style="font-weight: 700; color: var(--text-primary);">${currentDatasetContext.rowCount.toLocaleString()}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
      <span>Total Columns</span>
      <span style="font-weight: 700; color: var(--text-primary);">${currentDatasetContext.columns.length}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
      <span>Date Fields</span>
      <span style="font-weight: 700; color: var(--text-primary);">${currentDatasetContext.dateColumns.length}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
      <span>Numeric Fields</span>
      <span style="font-weight: 700; color: var(--text-primary);">${currentDatasetContext.numericColumns.length}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.03);">
      <span>Duplicates</span>
      <span style="font-weight: 700; color: ${currentDatasetContext.duplicateStats > 0 ? 'var(--warning)' : 'var(--text-primary)'};">${currentDatasetContext.duplicateStats.toLocaleString()}</span>
    </div>
    <div style="display: flex; justify-content: space-between; padding: 4px 0;">
      <span>Quality score</span>
      <span style="font-weight: 700; color: ${currentDatasetContext.dataQualityScore >= 80 ? 'var(--success)' : 'var(--warning)'};">${currentDatasetContext.dataQualityScore}%</span>
    </div>
  `;
}
