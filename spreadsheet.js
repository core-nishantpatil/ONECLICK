// OneClick v3 — Spreadsheet virtual grid, sorting, filtering, columns & data cleaning

// Collapsible Right Sidebar logic
const sidebarEl = document.getElementById('ws-sidebar');
const sidebarToggleBtn = document.getElementById('ws-sidebar-toggle');
sidebarToggleBtn.addEventListener('click', () => {
  sidebarEl.classList.toggle('collapsed');
  if (typeof currentView !== 'undefined' && currentView === 'dashboard' && typeof renderDashboardCanvas === 'function') {
    setTimeout(renderDashboardCanvas, 220); // 220ms ensures the CSS sidebar transition has completed
  }
});

function pushToUndo() {
  if (window.PerformanceCache) {
    window.PerformanceCache.invalidate();
  }
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
  const undoBtn = document.getElementById('ws-btn-undo');
  const redoBtn = document.getElementById('ws-btn-redo');
  if (undoBtn) undoBtn.style.opacity = undoStack.length > 0 ? '1' : '0.4';
  if (redoBtn) redoBtn.style.opacity = redoStack.length > 0 ? '1' : '0.4';
}

// Undo action
const undoBtn = document.getElementById('ws-btn-undo');
if (undoBtn) {
  undoBtn.addEventListener('click', () => {
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
      
      if (window.PerformanceCache) {
        window.PerformanceCache.invalidate();
      }
      applySearchSortAndFilters();
      updateUndoRedoStates();
    }
  });
}

// Redo action
const redoBtn = document.getElementById('ws-btn-redo');
if (redoBtn) {
  redoBtn.addEventListener('click', () => {
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
      
      if (window.PerformanceCache) {
        window.PerformanceCache.invalidate();
      }
      applySearchSortAndFilters();
      updateUndoRedoStates();
    }
  });
}



viewport = document.getElementById('spreadsheet-viewport');

// Initialize Spreadsheet UI
function initSpreadsheet() {
  activeSelection = null;
  isDragging = false;
  updateUndoRedoStates();
  renderGridTable();
  setupViewportScroll();
  
  if (!window.isGridDelegationWired && viewport) {
    viewport.addEventListener('mousedown', (e) => {
      const td = e.target.closest('.grid-cell');
      if (!td) return;
      const r = parseInt(td.dataset.row);
      const c = parseInt(td.dataset.col);
      handleCellMouseDown(e, r, c);
    });

    viewport.addEventListener('mouseover', (e) => {
      const td = e.target.closest('.grid-cell');
      if (!td) return;
      const r = parseInt(td.dataset.row);
      const c = parseInt(td.dataset.col);
      handleCellMouseEnter(r, c);
    });

    viewport.addEventListener('dblclick', (e) => {
      const td = e.target.closest('.grid-cell');
      if (!td) return;
      const r = parseInt(td.dataset.row);
      const c = parseInt(td.dataset.col);
      makeCellEditable(td, r, c);
    });
    window.isGridDelegationWired = true;
  }

  if (typeof runQualityScan !== 'undefined') {
    runQualityScan();
  }
}

// Setup Scroll synchronization
ticking = false;
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

// Render Table Structure with recycled rows for ultra-high scroll performance (60 FPS)
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

  let table = viewport.querySelector('.spreadsheet-table');
  if (!table) {
    viewport.innerHTML = "";
    table = document.createElement('table');
    table.className = 'spreadsheet-table';
    viewport.appendChild(table);
    isScrollOnly = false; // Force initial full rebuild
  }

  // Set explicit table width based on columnWidths (skip hidden)
  let tableWidth = 48; // row-hdr width
  headers.forEach(h => {
    if (!hiddenColumns.has(h)) {
      tableWidth += (columnWidths[h] || 110);
    }
  });
  table.style.width = tableWidth + 'px';

  const visibleCols = headers.filter(h => !hiddenColumns.has(h));

  // Determine if column configuration matches current elements
  const currentHeaderCells = table.querySelectorAll('tr:not(.v-spacer-row):not(.data-row) th');
  const expectedHdrCellsCount = visibleCols.length + 1; // plus corner cell
  const shouldFullRebuild = !isScrollOnly || 
                             table.children.length === 0 || 
                             currentHeaderCells.length !== expectedHdrCellsCount;

  if (shouldFullRebuild) {
    table.innerHTML = "";
    appendHeaderRow(table);
    appendSpacerRow(table, topSpacerHeight, colsCount, 'top-spacer');
    appendDataRows(table, startRow, endRow);
    appendSpacerRow(table, bottomSpacerHeight, colsCount, 'bottom-spacer');
    return;
  }

  // Recycle / In-place update (Scroll Only Optimization)
  // Update Top Spacer
  let topSpacer = table.querySelector('.v-spacer-row.top-spacer');
  if (!topSpacer) {
    topSpacer = document.createElement('tr');
    topSpacer.className = 'v-spacer-row top-spacer';
    topSpacer.innerHTML = `<td class="v-spacer-cell" colspan="${colsCount + 1}"></td>`;
    const headerTr = table.querySelector('tr:not(.v-spacer-row):not(.data-row)');
    if (headerTr) headerTr.after(topSpacer);
  }
  topSpacer.style.height = topSpacerHeight + 'px';
  const topSpacerCell = topSpacer.querySelector('td');
  if (topSpacerCell) topSpacerCell.colSpan = colsCount + 1;

  // Update Bottom Spacer
  let bottomSpacer = table.querySelector('.v-spacer-row.bottom-spacer');
  if (!bottomSpacer) {
    bottomSpacer = document.createElement('tr');
    bottomSpacer.className = 'v-spacer-row bottom-spacer';
    bottomSpacer.innerHTML = `<td class="v-spacer-cell" colspan="${colsCount + 1}"></td>`;
    table.appendChild(bottomSpacer);
  }
  bottomSpacer.style.height = bottomSpacerHeight + 'px';
  const bottomSpacerCell = bottomSpacer.querySelector('td');
  if (bottomSpacerCell) bottomSpacerCell.colSpan = colsCount + 1;

  // Adjust data rows count
  let dataRows = Array.from(table.querySelectorAll('tr.data-row'));
  const neededRowsCount = endRow - startRow;

  if (dataRows.length < neededRowsCount) {
    const fragment = document.createDocumentFragment();
    for (let i = dataRows.length; i < neededRowsCount; i++) {
      const tr = document.createElement('tr');
      tr.className = 'data-row';
      tr.style.height = ROW_HEIGHT + 'px';
      fragment.appendChild(tr);
    }
    bottomSpacer.before(fragment);
    dataRows = Array.from(table.querySelectorAll('tr.data-row'));
  } else if (dataRows.length > neededRowsCount) {
    for (let i = neededRowsCount; i < dataRows.length; i++) {
      dataRows[i].remove();
    }
    dataRows = Array.from(table.querySelectorAll('tr.data-row'));
  }

  // Populate data in-place
  for (let i = 0; i < neededRowsCount; i++) {
    const tr = dataRows[i];
    const r = startRow + i;
    const origRowIdx = viewIndices[r];
    const row = gridData[origRowIdx];

    tr.style.height = ROW_HEIGHT + 'px';
    if (typeof activeRowHighlights !== 'undefined' && activeRowHighlights.has(origRowIdx)) {
      tr.className = 'data-row row-highlighted';
    } else {
      tr.className = 'data-row';
    }

    // Row header cell
    let rowHdrTd = tr.querySelector('.row-hdr');
    if (!rowHdrTd) {
      rowHdrTd = document.createElement('td');
      rowHdrTd.className = 'row-hdr';
      tr.appendChild(rowHdrTd);
    }
    rowHdrTd.innerText = origRowIdx + 1;

    // Adjust cells count
    let dataCells = Array.from(tr.querySelectorAll('td.grid-cell'));
    if (dataCells.length < visibleCols.length) {
      const fragment = document.createDocumentFragment();
      for (let c = dataCells.length; c < visibleCols.length; c++) {
        const td = document.createElement('td');
        td.className = 'grid-cell';
        fragment.appendChild(td);
      }
      tr.appendChild(fragment);
      dataCells = Array.from(tr.querySelectorAll('td.grid-cell'));
    } else if (dataCells.length > visibleCols.length) {
      for (let c = visibleCols.length; c < dataCells.length; c++) {
        dataCells[c].remove();
      }
      dataCells = Array.from(tr.querySelectorAll('td.grid-cell'));
    }

    // Fill cell data and styles
    let colIndex = 0;
    headers.forEach((hdr, c) => {
      if (hiddenColumns.has(hdr)) return;

      const cellVal = row[c] !== undefined ? row[c] : "";
      const td = dataCells[colIndex];
      
      td.dataset.row = r;
      td.dataset.col = c;
      
      if (td.innerText !== cellVal) {
        td.innerText = cellVal;
      }

      // Reset cell class list
      let cellClass = 'grid-cell';

      if (typeof cellsToFlash !== 'undefined' && cellsToFlash.has(`${origRowIdx}_${c}`)) {
        cellClass += ' cell-highlight-flash';
      }
      if (typeof rowsToFlash !== 'undefined' && rowsToFlash.has(origRowIdx)) {
        cellClass += ' row-highlight-flash';
      }
      if (typeof activeHighlights !== 'undefined' && activeHighlights.has(`${origRowIdx}_${c}`)) {
        const hlType = activeHighlights.get(`${origRowIdx}_${c}`);
        cellClass += ` cell-${hlType}-highlight`;
      }
      if (typeof activeNavigatorCell !== 'undefined' && activeNavigatorCell && activeNavigatorCell.r === origRowIdx && activeNavigatorCell.c === c) {
        cellClass += ' cell-active-issue-highlight';
      }
      if (isFrozenCol && c === 0) {
        cellClass += ' frozen-col frozen-col-border';
      }
      if (searchQuery !== "" && String(cellVal).toLowerCase().includes(searchQuery)) {
        cellClass += ' search-match';
      }
      if (selectedColumnKey === hdr) {
        cellClass += ' col-highlighted';
      }

      // Selection handles
      if (activeSelection) {
        const minR = Math.min(activeSelection.startRow, activeSelection.endRow);
        const maxR = Math.max(activeSelection.startRow, activeSelection.endRow);
        const minC = Math.min(activeSelection.startCol, activeSelection.endCol);
        const maxC = Math.max(activeSelection.startCol, activeSelection.endCol);
        
        if (r >= minR && r <= maxR && c >= minC && c <= maxC) {
          if (r === activeSelection.startRow && c === activeSelection.startCol) {
            cellClass += ' selected';
          } else {
            cellClass += ' multi-selected';
          }
        }
      }

      td.className = cellClass;
      colIndex++;
    });
  }

  setupGridGlobalMouseEvents();
  updateMetadata();
}

// Append Header row (column headers letters & names)
function appendHeaderRow(table) {
  const headerTr = document.createElement('tr');
  
  const cornerTh = document.createElement('th');
  cornerTh.className = 'corner-hdr';
  cornerTh.innerText = ' ';
  headerTr.appendChild(cornerTh);

  headers.forEach((hdr, colIndex) => {
    if (hiddenColumns.has(hdr)) return;

    const th = document.createElement('th');
    th.className = 'col-hdr';
    th.title = headerNames[hdr] || `Column ${hdr}`;
    
    if (selectedColumnKey === hdr) {
      th.classList.add('highlighted');
    }

    if (isFrozenCol && colIndex === 0) {
      th.classList.add('frozen-col', 'frozen-col-border');
    }
    
    const colWidth = columnWidths[hdr] || 110;
    th.style.width = colWidth + 'px';
    th.style.minWidth = colWidth + 'px';
    th.style.maxWidth = colWidth + 'px';
    
    const hDiv = document.createElement('div');
    hDiv.className = 'col-hdr-content';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'col-name';
    nameSpan.innerText = headerNames[hdr] || `Col ${hdr}`;
    nameSpan.contentEditable = true;
    nameSpan.title = headerNames[hdr] || `Col ${hdr}`;
    
    nameSpan.addEventListener('blur', (e) => {
      const newName = e.target.innerText.trim();
      if (newName !== headerNames[hdr]) {
        pushToUndo();
        headerNames[hdr] = newName;
        updateMetadata();
        if (selectedColumnKey === hdr) {
          updateColumnStats(hdr);
        }
      }
    });
    nameSpan.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameSpan.blur();
      }
    });
    hDiv.appendChild(nameSpan);

    if (activeFilters[hdr]) {
      const activeDot = document.createElement('span');
      activeDot.className = 'sort-indicator';
      activeDot.innerHTML = '⚡';
      activeDot.title = 'Filter active on this column';
      hDiv.appendChild(activeDot);
    }
    
    if (activeSort && activeSort.colKey === hdr) {
      const sortDot = document.createElement('span');
      sortDot.className = 'sort-indicator';
      sortDot.innerHTML = activeSort.direction === 'asc' ? '▲' : '▼';
      hDiv.appendChild(sortDot);
    }

    th.appendChild(hDiv);

    const menuBtn = document.createElement('div');
    menuBtn.className = 'col-hdr-menu-btn';
    menuBtn.innerHTML = '⋮';
    menuBtn.title = 'Column Menu';
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleColumnMenu(e, hdr);
    });
    th.appendChild(menuBtn);

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'col-resize-handle';
    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      initColResize(e, th, hdr);
    });
    resizeHandle.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      e.preventDefault();
      autoFitColumnWidth(hdr);
    });
    th.appendChild(resizeHandle);

    th.addEventListener('click', (e) => {
      if (e.target.classList.contains('col-hdr-menu-btn') || e.target.classList.contains('col-resize-handle') || e.target.classList.contains('col-name')) {
        return;
      }
      selectedColumnKey = hdr;
      updateColumnStats(hdr);
      activeSelection = { startRow: 0, startCol: headers.indexOf(hdr), endRow: viewIndices.length - 1, endCol: headers.indexOf(hdr) };
      renderGridTable();
    });

    headerTr.appendChild(th);
  });
  table.appendChild(headerTr);
}

// Append Virtualizing Spacer Row
function appendSpacerRow(table, height, colSpan, extraClass = '') {
  const tr = document.createElement('tr');
  tr.className = 'v-spacer-row ' + extraClass;
  tr.style.height = (height > 0 ? height : 0) + 'px';
  
  const td = document.createElement('td');
  td.className = 'v-spacer-cell';
  td.colSpan = colSpan + 1;
  tr.appendChild(td);
  
  table.appendChild(tr);
}

// Append data rows slice initially
function appendDataRows(table, startRow, endRow) {
  const colsCount = headers.length;
  
  const fragment = document.createDocumentFragment();

  for (let r = startRow; r < endRow; r++) {
    const origRowIdx = viewIndices[r];
    const row = gridData[origRowIdx];
    
    const tr = document.createElement('tr');
    tr.className = 'data-row';
    tr.style.height = ROW_HEIGHT + 'px';
    if (typeof activeRowHighlights !== 'undefined' && activeRowHighlights.has(origRowIdx)) {
      tr.classList.add('row-highlighted');
    }
    
    const rowHdrTd = document.createElement('td');
    rowHdrTd.className = 'row-hdr';
    rowHdrTd.innerText = origRowIdx + 1;
    tr.appendChild(rowHdrTd);

    for (let c = 0; c < colsCount; c++) {
      const hdr = headers[c];
      if (hiddenColumns.has(hdr)) continue;

      const cellVal = row[c] !== undefined ? row[c] : "";
      
      const td = document.createElement('td');
      td.className = 'grid-cell';
      td.dataset.row = r;
      td.dataset.col = c;
      td.innerText = cellVal;

      if (typeof cellsToFlash !== 'undefined' && cellsToFlash.has(`${origRowIdx}_${c}`)) {
        td.classList.add('cell-highlight-flash');
      }
      if (typeof rowsToFlash !== 'undefined' && rowsToFlash.has(origRowIdx)) {
        td.classList.add('row-highlight-flash');
      }
      if (typeof activeHighlights !== 'undefined' && activeHighlights.has(`${origRowIdx}_${c}`)) {
        const hlType = activeHighlights.get(`${origRowIdx}_${c}`);
        td.classList.add(`cell-${hlType}-highlight`);
      }

      if (typeof activeNavigatorCell !== 'undefined' && activeNavigatorCell && activeNavigatorCell.r === origRowIdx && activeNavigatorCell.c === c) {
        td.classList.add('cell-active-issue-highlight');
      }

      if (isFrozenCol && c === 0) {
        td.classList.add('frozen-col', 'frozen-col-border');
      }

      if (searchQuery !== "" && String(cellVal).toLowerCase().includes(searchQuery)) {
        td.classList.add('search-match');
      }

      if (selectedColumnKey === hdr) {
        td.classList.add('col-highlighted');
      }

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

      tr.appendChild(td);
    }
    fragment.appendChild(tr);
  }
  table.appendChild(fragment);
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
      window.isCellEditing = true;
      gridData[origRowIndex][c] = newVal;
      updateMetadata();
      window.isCellEditing = false;
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
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• DATA LAYOUT PROCESSORS (SEARCH/SORT/FILTER) â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
  if (typeof autoSaveActiveWorkspace === 'function') {
    autoSaveActiveWorkspace(false);
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
}

// Missing values detection
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
    currency: "Currency 💵",
    date: "Date 📅",
    percentage: "Percentage 📊"
  };
  document.getElementById('ws-stats-type').innerText = typeLabels[type] || "Text 🔤";

  // Reset stats list
  const listEl = columnStatsPanel.querySelector('.ws-info-list');
  while (listEl.children.length > 4) {
    listEl.removeChild(listEl.lastChild);
  }

  // Counts calculations
  const totalCount = viewIndices.length;
  document.getElementById('ws-stats-count').innerText = totalCount.toLocaleString();

  // Try checking PerformanceCache
  const cacheKey = `stats_${colKey}_${viewIndices.length}_${gridData.length}`;
  const cached = window.PerformanceCache.get(cacheKey);

  if (cached) {
    renderStatsUI(colKey, type, totalCount, cached);
    return;
  }

  // Set loading states
  document.getElementById('ws-stats-unique').innerText = "Calculating...";
  document.getElementById('ws-stats-missing').innerText = "Calculating...";

  // Run in background worker
  window.runBackgroundCalculation('calculateColumnStats', { gridData, headers, colKey, viewIndices })
    .then(stats => {
      window.PerformanceCache.set(cacheKey, stats);
      renderStatsUI(colKey, type, totalCount, stats);
    })
    .catch(err => {
      console.error("Column stats calculation failed:", err);
      // Fallback calculation on main thread
      const fallbackStats = calculateStatsMainThread(colKey, type);
      renderStatsUI(colKey, type, totalCount, fallbackStats);
    });
}

function calculateStatsMainThread(colKey, type) {
  const colIndex = headers.indexOf(colKey);
  const totalCount = viewIndices.length;
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

  const stats = {
    totalCount,
    uniqueCount: uniqueSet.size,
    missingCount,
    missingPct: totalCount > 0 ? ((missingCount / totalCount) * 100).toFixed(1) : 0,
    numericStats: null,
    dateStats: null,
    textStats: null
  };

  if (cleanValues.length > 0) {
    if (type === 'number' || type === 'currency' || type === 'percentage') {
      const nums = cleanValues.map(v => parseFloat(String(v).replace(/[$,%]/g, ""))).filter(n => !isNaN(n));
      if (nums.length > 0) {
        nums.sort((a, b) => a - b);
        const min = nums[0];
        const max = nums[nums.length - 1];
        const sum = nums.reduce((s, n) => s + n, 0);
        const avg = sum / nums.length;
        const midIdx = Math.floor(nums.length / 2);
        const median = nums.length % 2 !== 0 ? nums[midIdx] : (nums[midIdx - 1] + nums[midIdx]) / 2;
        const sqDiffSum = nums.reduce((s, n) => s + Math.pow(n - avg, 2), 0);
        const stdDev = Math.sqrt(sqDiffSum / nums.length);
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
        const iqr = q3 - q1;
        const lower = q1 - 1.5 * iqr;
        const upper = q3 + 1.5 * iqr;
        let outlierCount = 0;
        nums.forEach(n => {
          if (n < lower || n > upper) outlierCount++;
        });
        stats.numericStats = { min, max, avg, median, stdDev, outlierCount };
      }
    } else if (type === 'date') {
      const dates = cleanValues.map(v => Date.parse(v)).filter(d => !isNaN(d));
      if (dates.length > 0) {
        dates.sort((a, b) => a - b);
        const earliest = new Date(dates[0]);
        const latest = new Date(dates[dates.length - 1]);
        const diffDays = Math.round((dates[dates.length - 1] - dates[0]) / (1000 * 60 * 60 * 24));
        stats.dateStats = {
          earliest: earliest.toLocaleDateString(),
          latest: latest.toLocaleDateString(),
          diffDays
        };
      }
    } else {
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
      const totalLen = cleanValues.reduce((s, v) => s + v.length, 0);
      const avgLen = totalLen / cleanValues.length;
      stats.textStats = {
        mostCommon: `${mostCommon} (${maxCount}x - ${commonPct}%)`,
        avgLen
      };
    }
  }
  return stats;
}

function renderStatsUI(colKey, type, totalCount, stats) {
  document.getElementById('ws-stats-unique').innerText = stats.uniqueCount.toLocaleString();
  document.getElementById('ws-stats-missing').innerText = `${stats.missingCount.toLocaleString()} (${stats.missingPct}%)`;

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

  if (stats.numericStats) {
    const n = stats.numericStats;
    const fmt = (val) => {
      if (type === 'currency') return "$" + val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (type === 'percentage') return val.toFixed(2) + "%";
      return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
    };

    addStatCard("Minimum", fmt(n.min));
    addStatCard("Maximum", fmt(n.max));
    addStatCard("Mean / Average", fmt(n.avg));
    addStatCard("Median", fmt(n.median));
    addStatCard("Std Deviation", fmt(n.stdDev));
    addStatCard("Outlier Count", n.outlierCount.toString());
  } else if (type === 'date') {
    if (stats.dateStats) {
      addStatCard("Earliest Date", stats.dateStats.earliest);
      addStatCard("Latest Date", stats.dateStats.latest);
      addStatCard("Date Range", `${stats.dateStats.diffDays.toLocaleString()} Days`);
    }
  } else {
    if (stats.textStats) {
      addStatCard("Most Common Value", stats.textStats.mostCommon);
      addStatCard("Avg Text Length", `${stats.textStats.avgLen.toFixed(1)} chars`);
    }
  }
}
// Reset stats panel back to dataset info view
function resetStatsPanel() {
  selectedColumnKey = null;
  datasetInfoPanel.style.display = 'flex';
  columnStatsPanel.style.display = 'none';
}
window.resetStatsPanel = resetStatsPanel;

resetStatsBtn = document.getElementById('btn-reset-stats');
if (resetStatsBtn) {
  resetStatsBtn.addEventListener('click', () => {
    resetStatsPanel();
    renderGridTable();
  });
}

// ═══════════════════════════ COLUMN DROPDOWN MENU INTERACTION ═══════════════════════════

columnMenu = document.getElementById('column-menu');
filterTypeSelect = document.getElementById('ccm-filter-type');
filterOpSelect = document.getElementById('ccm-filter-operator');
filterValueInput = document.getElementById('ccm-filter-value');
filterValue2Input = document.getElementById('ccm-filter-value2');
filterApplyBtn = document.getElementById('ccm-filter-apply');
filterClearBtn = document.getElementById('ccm-filter-clear');

sortAscBtn = document.getElementById('ccm-sort-asc');
sortDescBtn = document.getElementById('ccm-sort-desc');

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


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• GRID TOOLBAR ACTIONS â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
freezeBtn = document.getElementById('tb-col-freeze');
if (freezeBtn) {
  freezeBtn.addEventListener('click', () => {
    isFrozenCol = !isFrozenCol;
    document.getElementById('freeze-btn-text').innerText = isFrozenCol ? "Unfreeze Col A" : "Freeze Col A";
    renderGridTable();
  });
}

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


// â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â•  CONTEXT MENU LOGIC â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• â• 

contextMenu = document.getElementById('grid-context-menu');

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

// Save current workspace immediately and show toast
document.getElementById('ws-btn-save').addEventListener('click', () => {
  const saveBtn = document.getElementById('ws-btn-save');
  saveBtn.innerText = "Saving...";
  saveBtn.disabled = true;
  if (typeof performSaveWorkspace === 'function') {
    performSaveWorkspace().then(() => {
      saveBtn.innerText = "Save Workspace";
      saveBtn.disabled = false;
      showToast("Workspace saved successfully!", "success");
    }).catch(err => {
      saveBtn.innerText = "Save Workspace";
      saveBtn.disabled = false;
      showToast("Error saving workspace: " + err.message, "error");
    });
  } else {
    alert("Spreadsheet updates saved successfully!");
    saveBtn.innerText = "Save Workspace";
    saveBtn.disabled = false;
  }
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• DATA QUALITY & PREPROCESSING SYSTEM â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Global preprocessing state
cellsToFlash = new Set();
rowsToFlash = new Set();
preprocessingHistory = [];
preprocessingRedoHistory = []; // Redo tracker specifically for recipe steps
activeQualityTab = 'overview';
qualityScanResults = null;
issueStates = {}; // key (e.g. outlier_A) -> 'pending' | 'resolved' | 'ignored'
activeHighlights = new Map(); // coordKey (e.g. 5_2) -> 'outlier' | 'type'
explorerFilters = { missing: 'pending', duplicates: 'pending', types: 'pending', outliers: 'pending' }; // active sub-tab per tab
duplicateCheckColumns = new Set();
activeDuplicateRowsList = [];
activeNavigatorCategory = null;
activeNavigatorColKey = null;
activeNavigatorIndex = -1;
activeNavigatorCell = { r: -1, c: -1 };
affectedRowsFilter = null; // Set of row indices
activeRowHighlights = new Set(); // Set of row indices
highlightModes = {}; // e.g. "missing_ColumnA" -> 'cell' | 'row'

// Initialize Workspace Sidebar Drag-to-Resize Handler
sidebarResizer = document.getElementById('ws-sidebar-resizer');
defaultSidebarWidth = 280;
defaultQualityWidth = 380;

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
analyzeBtn = document.getElementById('ws-btn-analyze');
qualityPanel = document.getElementById('ws-sidebar-data-quality');

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
resetQualityBtn = document.getElementById('btn-reset-quality');
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
qualityTabButtons = document.querySelectorAll('.quality-tab-btn');
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

  const scoreValEl = document.getElementById('quality-score-val');
  if (scoreValEl) {
    scoreValEl.innerText = "Scanning...";
  }

  const params = {
    gridData,
    headers,
    duplicateCheckColsList: Array.from(duplicateCheckColumns)
  };

  window.runBackgroundCalculation('runQualityScan', params)
    .then(results => {
      qualityScanResults = results;
      activeDuplicateRowsList = results.duplicates || [];
      updateQualityScoreBadge();
      renderActiveTabContent();
    })
    .catch(err => {
      console.error("Background quality scan failed:", err);
      // Fallback
      runQualityScanMainThread();
    });
}

function runQualityScanMainThread() {
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
        let isCompatible = (itemType === primaryType);
        if (primaryType === "Decimal" && itemType === "Integer") isCompatible = true;
        if (primaryType === "Text") isCompatible = true;

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

  // 2. Scan Duplicate Rows
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
        ignoreBtn.innerHTML = 'ðŸš« Ignore Issue';
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
        restoreBtn.innerHTML = 'ðŸ”„ Restore to Pending';
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
      ignoreBtn.innerHTML = 'ðŸš« Ignore Issue';
      ignoreBtn.onclick = () => {
        issueStates[key] = 'ignored';
        updateQualityScoreBadge();
        renderActiveTabContent();
      };
      lifecycleRow.appendChild(ignoreBtn);
    } else if (filterStatus === 'ignored') {
      const restoreBtn = document.createElement('span');
      restoreBtn.className = 'card-action-link';
      restoreBtn.innerHTML = 'ðŸ”„ Restore to Pending';
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
        meta.innerHTML += `<br/><span style="color: var(--warning); font-size: 11px;">âš ï¸ ${typeStat.issues.length} invalid values format issues</span>`;
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
          <option value="Text">Text ðŸ”¤</option>
          <option value="Integer">Integer ðŸ”¢</option>
          <option value="Decimal">Decimal ðŸ”¢</option>
          <option value="Currency">Currency ðŸ’°</option>
          <option value="Percentage">Percentage ðŸ“Š</option>
          <option value="Date">Date ðŸ“…</option>
          <option value="Boolean">Boolean ðŸ”€</option>
          <option value="Email">Email ðŸ“§</option>
          <option value="Phone">Phone ðŸ“ž</option>
          <option value="URL">URL ðŸ”—</option>
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
        ignoreBtn.innerHTML = 'ðŸš« Ignore Issue';
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
        restoreBtn.innerHTML = 'ðŸ”„ Restore to Pending';
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
        ignoreBtn.innerHTML = 'ðŸš« Ignore Issue';
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
        restoreBtn.innerHTML = 'ðŸ”„ Restore to Pending';
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
  div.innerHTML = `âœ¨ ${text}`;
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
        ðŸ“œ No preprocessing steps applied yet.
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
  if (typeof autoSaveActiveWorkspace === 'function') {
    autoSaveActiveWorkspace(false);
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• NAVIGATION & HIGH-VOLUME HIGHLIGHTS ENGINE â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
      <button class="nav-control-btn btn-first" title="Jump to First">â®</button>
      <button class="nav-control-btn btn-prev" title="Previous">â—€</button>
      <button class="nav-control-btn btn-next" title="Next">â–¶</button>
      <button class="nav-control-btn btn-last" title="Jump to Last">â­</button>
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
bannerCloseBtn = document.getElementById('ws-filter-banner-close');
if (bannerCloseBtn) {
  bannerCloseBtn.addEventListener('click', () => {
    clearAffectedRowsFilter();
  });
}
// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â PHASE 2: CALCULATED FIELDS UI Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
      '<button class="history-step-btn" style="color:var(--error); border-color:rgba(239,68,68,0.2);" onclick="deleteCalculatedField(\'' + id + '\')">Ã°Å¸â€”â€˜Ã¯Â¸Â</button>' +
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
    if (validMsg) { validMsg.innerText = 'Ã¢Å¡Â Ã¯Â¸  Formula has errors or unknown columns.'; validMsg.style.color = 'var(--warning)'; }
    if (saveBtn) saveBtn.disabled = true;
  } else {
    if (validMsg) { validMsg.innerText = 'Ã¢Å“â€¦ Formula is valid.'; validMsg.style.color = 'var(--success)'; }
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


  // Ã¢â€â‚¬Ã¢â€â‚¬ Main public API Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

document.addEventListener('DOMContentLoaded', function() {

  // Open a panel. Respects "user manually closed" rule.
  window.PanelManager = {

    // Open a panel (by type: 'preprocessing' | 'visualization')
    // If forceOpen is true, ignores the "user closed" flag.
    open: function(type, forceOpen) {
      var state = window.getPanelState();
      if (!forceOpen && state.userClosed === type) {
        // User explicitly closed this panel Ã¢â‚¬â€ don't reopen automatically
        return;
      }
      activePanelContent = type;
      var panelId = type === 'preprocessing' ? 'ws-sidebar-data-quality' : 'ws-sidebar-visualization';
      window.showPanelContent(panelId);

      // Always expand to open when explicitly opening
      window.applySidebarState('open');

      // Clear the userClosed flag since we're opening
      if (state.userClosed === type) {
        delete state.userClosed;
        window.savePanelState(state);
      }

      state.activePanelContent = type;
      window.savePanelState(state);
    },

    // Collapse to rail
    collapse: function() {
      var state = window.getPanelState();
      state.widthState = 'rail';
      window.savePanelState(state);
      window.applySidebarState('rail');
    },

    // Close panel completely
    close: function() {
      var state = window.getPanelState();
      state.userClosed = activePanelContent; // remember which panel the user closed
      state.widthState = 'closed';
      window.savePanelState(state);
      window.applySidebarState('closed');
    },

    // Restore from rail / closed back to open
    restore: function() {
      if (activePanelContent) {
        var panelId = activePanelContent === 'preprocessing' ? 'ws-sidebar-data-quality' : 'ws-sidebar-visualization';
        window.showPanelContent(panelId);
        var state = window.getPanelState();
        delete state.userClosed; // clear closed flag on manual restore
        window.savePanelState(state);
        window.applySidebarState('open');
      }
    },

    // Returns current width state
    getWidthState: function() {
      return window.getPanelState().widthState || 'open';
    }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Wire Collapse / Close buttons Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  function wireButton(id, fn) {
    var btn = document.getElementById(id);
    if (btn) btn.addEventListener('click', function(e) { e.stopPropagation(); fn(); });
  }

  wireButton('btn-preprocessing-collapse', function() { window.PanelManager.collapse(); });
  wireButton('btn-preprocessing-close',    function() { window.PanelManager.close(); });
  wireButton('btn-dashbuilder-collapse',   function() { window.PanelManager.collapse(); });
  wireButton('btn-dashbuilder-close',      function() { window.PanelManager.close(); });

  // Ã¢â€â‚¬Ã¢â€â‚¬ Wire Rail icon buttons (click to restore) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  var railPre = document.getElementById('rail-btn-preprocessing');
  if (railPre) {
    railPre.addEventListener('click', function() {
      activePanelContent = 'preprocessing';
      window.showPanelContent('ws-sidebar-data-quality');
      window.PanelManager.restore();
    });
  }

  var railViz = document.getElementById('rail-btn-visualization');
  if (railViz) {
    railViz.addEventListener('click', function() {
      activePanelContent = 'visualization';
      window.showPanelContent('ws-sidebar-visualization');
      window.PanelManager.restore();
    });
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Wire Reopen tab (click to restore) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  var reopenTab = document.getElementById('ws-panel-reopen-tab');
  if (reopenTab) {
    reopenTab.addEventListener('click', function() {
      window.PanelManager.restore();
    });
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Patch existing sidebar toggle button (was old collapse) Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // Keep it working: it now toggles between open and rail
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

  // Ã¢â€â‚¬Ã¢â€â‚¬ Patch the Analyze Dataset button Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  if (analyzeBtn) {
    var origAnalyzeHandler = analyzeBtn.onclick;
    analyzeBtn.onclick = null;
    // Remove old listeners by re-assigning
    var newAnalyzeBtn = analyzeBtn.cloneNode(true);
    analyzeBtn.parentNode.replaceChild(newAnalyzeBtn, analyzeBtn);
    newAnalyzeBtn.addEventListener('click', function() {
      // Switch content
      if (typeof qualityPanel !== 'undefined' && qualityPanel) {
        // Toggle: if already open Ã¢â€ â€™ collapse
        if (activePanelContent === 'preprocessing' && window.PanelManager.getWidthState() === 'open') {
          window.PanelManager.collapse();
          return;
        }
      }
      activePanelContent = 'preprocessing';
      window.showPanelContent('ws-sidebar-data-quality');
      window.PanelManager.open('preprocessing', true); // force open when user explicitly clicks
    });
  }

  // Ã¢â€â‚¬Ã¢â€â‚¬ Patch switchToDashboardView for Dashboard Builder Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  // The existing code calls wsSidebarVisualization.style.display = 'block'
  // We intercept by hooking into PanelManager instead.
  var _pmOrigSwitch = window.switchToDashboardView;
  window.switchToDashboardView = function() {
    // Call original first (sets up widgets etc)
    if (_pmOrigSwitch) _pmOrigSwitch();
    // Then use PanelManager to handle panel state
    activePanelContent = 'visualization';
    // Don't force open if user explicitly closed it
    var state = window.getPanelState();
    if (state.userClosed === 'visualization') {
      // User closed it Ã¢â‚¬â€ hide the viz panel that original may have shown
      var vizPanel = document.getElementById('ws-sidebar-visualization');
      if (vizPanel) vizPanel.style.display = 'none';
      window.applySidebarState('closed');
    } else {
      window.showPanelContent('ws-sidebar-visualization');
      window.applySidebarState(state.widthState || 'open');
    }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Patch switchToSheetView to restore correct panel Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  var _pmOrigSheetSwitch = window.switchToSheetView;
  window.switchToSheetView = function() {
    if (_pmOrigSheetSwitch) _pmOrigSheetSwitch();
    activePanelContent = 'preprocessing';
    var state = window.getPanelState();
    // If user hasn't closed it, show dataset info
    if (state.userClosed !== 'preprocessing') {
      // Just restore the sidebar to correct state Ã¢â‚¬â€ inner panels managed by existing code
      window.applySidebarState(state.widthState || 'open');
    } else {
      window.applySidebarState('closed');
    }
  };

  // Ã¢â€â‚¬Ã¢â€â‚¬ Restore session state on page load Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
  var initState = window.getPanelState();
  if (initState.widthState) {
    window.applySidebarState(initState.widthState);
  }
  if (initState.activePanelContent) {
    activePanelContent = initState.activePanelContent;
  }

  // ----------------------------------------------------------------------------------------------------------------------------------------------------------------
  // Remove the old broken initCollapsiblePanel calls ----------------------------------------------------------------------------------------------------------------
  // (They ran on DOMContentLoaded — no-op since elements exist but do nothing now)
});
