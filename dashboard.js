// OneClick v3 — Dashboard Canvas layout engine and Builder Accordion
const esc = window.escapeHTML || (x => String(x === null || x === undefined ? '' : x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'));




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
    const role = getColumnSemanticRole(h);
    if (role === "identifier") {
      textCols.push(h);
      return;
    }
    const type = detectColumnType(h);
    if (type === 'date' || role === 'temporal_dimension') {
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

  // ROW 1: KPI Cards (4 × span-3)
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

  dashboardWidgets.push({
    id: 'widget-kpi-3',
    title: 'Total Orders',
    type: 'kpi',
    xCol: null,
    yCol: idCol,
    agg: 'count',
    w: 3
  });

  dashboardWidgets.push({
    id: 'widget-kpi-4',
    title: 'Unique Categories',
    type: 'kpi',
    xCol: null,
    yCol: catCol,
    agg: 'count_dist',
    w: 3
  });

  // ROW 2: Hero Trend Chart (span-12)
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

  // ROW 3: Category breakdown (span-6 + span-6)
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

  // ROW 4: Full-width Report Table (span-12)
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

function toggleSettingsFieldsByType(type) {
  const fX = document.getElementById('viz-field-x-col');
  const fY = document.getElementById('viz-field-y-col');
  const fAgg = document.getElementById('viz-field-agg');

  if (type === 'table') {
    if (fX) fX.style.display = 'none';
    if (fY) fY.style.display = 'none';
    if (fAgg) fAgg.style.display = 'none';
  } else if (type === 'kpi') {
    if (fX) fX.style.display = 'none';
    if (fY) fY.style.display = 'block';
    if (fAgg) fAgg.style.display = 'block';
  } else {
    if (fX) fX.style.display = 'block';
    if (fY) fY.style.display = 'block';
    if (fAgg) fAgg.style.display = 'block';
  }
}

// Widget Settings apply handler
btnSaveWidgetSettings = document.getElementById('btn-save-widget-settings');
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
      renderDashboardTab();
      selectWidget(selectedWidgetId);
    }
  };
}

vizWidgetTypeSelect = document.getElementById('viz-widget-type-select');
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
      kpi: 'ðŸ”¢',
      line: 'ðŸ“ˆ',
      bar: 'ðŸ“Š',
      pie: 'ðŸ•',
      donut: 'ðŸ©',
      table: 'ðŸ“‹'
    };

    item.innerHTML = `
      <div class="viz-widget-info">
        <span class="viz-widget-list-title">${widget.title}</span>
        <div class="viz-widget-list-meta">
          <span>${typeIcons[widget.type] || 'ðŸ“Š'} ${widget.type.toUpperCase()}</span>
          <span class="viz-widget-list-badge">w:${widget.w}/12</span>
        </div>
      </div>
      <div class="viz-widget-list-actions">
        <button class="history-step-btn btn-swap-up" title="Move Up" ${idx === 0 ? 'disabled style="opacity:0.3;"' : ''}>â–²</button>
        <button class="history-step-btn btn-swap-down" title="Move Down" ${idx === dashboardWidgets.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>â–¼</button>
        <button class="history-step-btn btn-list-del" title="Delete" style="color: var(--error); border-color: rgba(239, 68, 68, 0.2);">ðŸ—‘ï¸</button>
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
  renderDashboardTab();
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
    renderDashboardTab();
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
  renderDashboardTab();
  selectWidget(newId);
}

btnAddWidgetTrigger = document.getElementById('btn-add-widget-trigger');
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

btnClearGlobalVizFilters = document.getElementById('btn-clear-global-viz-filters');
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
        icon: 'ðŸ“ˆ'
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
        icon: 'ðŸ©'
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
        icon: 'ðŸ“Š'
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
      icon: 'ðŸ“‹'
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
      renderDashboardTab();
      selectWidget(newWidget.id);
    };

    container.appendChild(card);
  });
}

// Switcher between visualization tabs
// Switcher between visualization tabs
function switchVizTab(tabName) {
  activeVizTab = tabName;
  
  document.querySelectorAll('.viz-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabName) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  document.querySelectorAll('.viz-tab-content').forEach(content => {
    if (content.id === `viztab-${tabName}`) {
      content.style.display = 'block';
      const activeAcc = content.querySelector('.viz-accordion-item.active');
      if (!activeAcc) {
        const firstAcc = content.querySelector('.viz-accordion-item');
        if (firstAcc) firstAcc.classList.add('active');
      }
    } else {
      content.style.display = 'none';
    }
  });

  initVizAccordions();

  if (tabName === 'dashboard') renderDashboardTab();
  else if (tabName === 'explore') renderExploreTab();
  else if (tabName === 'insights') renderInsightsTab();
  else if (tabName === 'manage') renderManageTab();
}

function initVizAccordions() {
  document.querySelectorAll('.viz-tab-content .viz-accordion-header').forEach(header => {
    if (header.dataset.accordionBound) return;
    header.dataset.accordionBound = "true";
    
    header.addEventListener('click', () => {
      const item = header.closest('.viz-accordion-item');
      const wasActive = item.classList.contains('active');
      
      const parentTab = item.closest('.viz-tab-content');
      parentTab.querySelectorAll('.viz-accordion-item').forEach(el => {
        el.classList.remove('active');
      });
      
      if (!wasActive) {
        item.classList.add('active');
      }
    });
  });
}

function renderDashboardTab() {
  renderStructureTab();
  renderRecommendationsTab();

  if (selectedWidgetId) {
    const widget = dashboardWidgets.find(w => w.id === selectedWidgetId);
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
  } else {
    document.getElementById('viz-no-widget-selected').style.display = 'block';
    document.getElementById('viz-settings-fields').style.display = 'none';
  }

  const btnRegen = document.getElementById('btn-actions-regenerate-draft');
  if (btnRegen) {
    btnRegen.onclick = () => {
      dashboardWidgets = [];
      generateDefaultDashboardDraft();
      renderDashboardCanvas();
      renderDashboardTab();
    };
  }

  const btnClear = document.getElementById('btn-actions-clear-layout');
  if (btnClear) {
    btnClear.onclick = () => {
      if (confirm("Clear all widgets from the dashboard canvas?")) {
        dashboardWidgets = [];
        selectedWidgetId = null;
        Object.keys(activeChartInstances).forEach(k => {
          activeChartInstances[k].destroy();
          delete activeChartInstances[k];
        });
        renderDashboardCanvas();
        renderDashboardTab();
      }
    };
  }

  const btnClearF = document.getElementById('btn-actions-clear-filters');
  if (btnClearF) {
    btnClearF.onclick = () => {
      globalVizFilters = {};
      activeDrillState = {};
      renderDashboardCanvas();
      if (typeof renderFiltersTab === 'function') renderFiltersTab();
      showToast("Cleared active dashboard filters & drills", "info");
    };
  }
}

function renderExploreTab() {
  renderFiltersTab();
  renderDrillHierarchiesList();
  initDrillColChecklist();
  updateDrillStatus();
  renderCalcFieldsList();
  initCalcFieldHelpers();
}

function renderInsightsTab() {
  var summaryEl = document.getElementById('viz-executive-summary');
  if (!gridData || gridData.length === 0) {
    if (summaryEl) summaryEl.innerText = 'Load a dataset to see insights.';
    return;
  }

  var insights = generateInsights();

  if (summaryEl) {
    var summaryParts = insights.slice(0, 3).map(function(i) { return i.text; });
    summaryEl.innerText = summaryParts.join(' ');
  }

  initRanksDims();
  renderRanksAnalysis();
  renderTrendAnalysis();
  renderAnomalyAnalysis();

  const warningContainer = document.getElementById('viz-quality-warnings-container');
  if (warningContainer) {
    let html = "";
    const pMiss = document.getElementById('q-stat-missing') ? parseInt(document.getElementById('q-stat-missing').innerText) || 0 : 0;
    const pDups = document.getElementById('q-stat-dups') ? parseInt(document.getElementById('q-stat-dups').innerText) || 0 : 0;
    const pTypes = document.getElementById('q-stat-types') ? parseInt(document.getElementById('q-stat-types').innerText) || 0 : 0;
    
    if (pMiss > 0) {
      html += `<div style="font-size: 10px; padding: 4px 6px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-sm); color: var(--warning); margin-bottom: 4px;">âš ï¸ ${pMiss} missing data cells need cleaning.</div>`;
    }
    if (pDups > 0) {
      html += `<div style="font-size: 10px; padding: 4px 6px; background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-sm); color: var(--error); margin-bottom: 4px;">âš ï¸ ${pDups} duplicate records detected.</div>`;
    }
    if (pTypes > 0) {
      html += `<div style="font-size: 10px; padding: 4px 6px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--radius-sm); color: var(--warning); margin-bottom: 4px;">âš ï¸ ${pTypes} format mismatch column values.</div>`;
    }
    if (html === "") {
      html = `<div style="font-size: 10.5px; color: var(--success); padding: 4px 0;">âœ… Preprocessing checks show 100% clean dataset.</div>`;
    }
    warningContainer.innerHTML = html;
  }

  renderCorrelationAnalysis();
}

function renderManageTab() {
  if (!gridData || gridData.length === 0) return;

  renderManageSavedDashboards();

  const saveBtn = document.getElementById('btn-manage-save-dash');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const nameInput = document.getElementById('manage-save-name-input');
      const name = nameInput ? nameInput.value.trim() : "";
      if (!name) {
        alert("Please enter a name for the dashboard save.");
        return;
      }
      const key = saveDashboardToStorage(name);
      if (key) {
        showToast("Dashboard saved successfully", "success");
        if (nameInput) nameInput.value = "";
        renderManageSavedDashboards();
      }
    };
  }

  const exportBtn = document.getElementById('btn-manage-export-json');
  if (exportBtn) {
    exportBtn.onclick = exportDashboardJSON;
  }

  const importTriggerBtn = document.getElementById('btn-manage-import-json-trigger');
  const fileInput = document.getElementById('btn-manage-import-file-input');
  if (importTriggerBtn && fileInput) {
    importTriggerBtn.onclick = () => fileInput.click();
    
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          applyDashboardState(JSON.parse(ev.target.result));
          showToast("Dashboard imported!", "success");
          renderManageTab();
        } catch (err) {
          showToast("Import failed: " + err.message, "error");
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    };
  }

  document.querySelectorAll('#viztab-manage [data-template]').forEach(card => {
    card.onclick = () => {
      const templateName = card.dataset.template;
      if (confirm(`Applying template "${templateName.toUpperCase()}" will replace all current widgets. Continue?`)) {
        applyDashboardTemplate(templateName);
      }
    };
  });

  renderDashboardHealth();
  renderManageDatasetInfo();
}

function renderManageSavedDashboards() {
  const container = document.getElementById('manage-saved-list');
  if (!container) return;
  
  const keys = Object.keys(localStorage).filter(k => k.startsWith('oneclick_dash_'));
  if (keys.length === 0) {
    container.innerHTML = `<div style="font-size: 10px; color: var(--text-muted); text-align: center; padding: 8px;">No saved dashboards.</div>`;
    return;
  }

  container.innerHTML = keys.map(key => {
    let cleanName = key.replace('oneclick_dash_', '');
    cleanName = cleanName.replace(/_\d+$/, '').replace(/_/g, ' ');
    return `
      <div class="manage-list-item">
        <span style="font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:120px;" title="${cleanName}">${cleanName}</span>
        <div class="manage-btn-group">
          <button class="btn-outline btn-sm" style="font-size:9px; height:20px; padding: 2px 4px; justify-content:center;" onclick="loadSavedDashboardByKey('${key}')">Load</button>
          <button class="btn-outline btn-sm delete" style="font-size:9px; height:20px; padding: 2px 4px; justify-content:center; border-color: rgba(239, 68, 68, 0.2); color: var(--error);" onclick="deleteSavedDashboardByKey('${key}')">Del</button>
        </div>
      </div>
    `;
  }).join('');
}

window.loadSavedDashboardByKey = function(key) {
  try {
    applyDashboardState(JSON.parse(localStorage.getItem(key)));
    showToast("Dashboard loaded successfully", "success");
    renderDashboardTab();
    renderManageTab();
  } catch (e) {
    showToast("Load failed: " + e.message, "error");
  }
};

window.deleteSavedDashboardByKey = function(key) {
  if (confirm("Are you sure you want to delete this saved dashboard permanently?")) {
    localStorage.removeItem(key);
    showToast("Saved dashboard deleted", "info");
    renderManageSavedDashboards();
  }
};

function applyDashboardTemplate(templateName) {
  dashboardWidgets = [];
  const profile = profileColumns();
  const revCol = findColInList(/revenue|sales|spend|price|amount|cost/i, headers) || profile.currencyCols[0] || profile.numCols[0];
  const secondMetricCol = findColInList(/profit|margin|income|units|quantity/i, headers) || profile.numCols[1] || profile.numCols[0];
  const idCol = findColInList(/id|order|transaction|cust/i, headers) || headers[0];
  const dateCol = profile.dateCols[0];
  const catCol = profile.catCols[0] || findColInList(/category|product|type|region/i, headers) || headers[0];
  const catCol2 = profile.catCols[1] || findColInList(/segment|channel|brand/i, headers);
  
  if (templateName === 'kpi') {
    if (revCol) {
      dashboardWidgets.push({ id: 'tmpl-kpi-1', title: 'Total Sales/Revenue', type: 'kpi', xCol: null, yCol: revCol, agg: 'sum', w: 3 });
    }
    if (secondMetricCol) {
      dashboardWidgets.push({ id: 'tmpl-kpi-2', title: secondMetricCol === revCol ? 'Average Order' : 'Total Units', type: 'kpi', xCol: null, yCol: secondMetricCol, agg: secondMetricCol === revCol ? 'avg' : 'sum', w: 3 });
    }
    dashboardWidgets.push({ id: 'tmpl-kpi-3', title: 'Row Count (Orders)', type: 'kpi', xCol: null, yCol: idCol, agg: 'count', w: 3 });
    dashboardWidgets.push({ id: 'tmpl-kpi-4', title: 'Categories Count', type: 'kpi', xCol: null, yCol: catCol, agg: 'count_dist', w: 3 });
  } 
  else if (templateName === 'trend') {
    if (revCol) {
      dashboardWidgets.push({ id: 'tmpl-trend-kpi-1', title: 'Total Sales', type: 'kpi', xCol: null, yCol: revCol, agg: 'sum', w: 6 });
    }
    dashboardWidgets.push({ id: 'tmpl-trend-kpi-2', title: 'Total Count', type: 'kpi', xCol: null, yCol: idCol, agg: 'count', w: 6 });
    if (dateCol && revCol) {
      dashboardWidgets.push({ id: 'tmpl-trend-hero', title: 'Sales Performance Trend over Time', type: 'line', xCol: dateCol, yCol: revCol, agg: 'sum', w: 12 });
    }
  } 
  else if (templateName === 'full') {
    if (revCol) {
      dashboardWidgets.push({ id: 'tmpl-full-kpi-1', title: 'Total Sales', type: 'kpi', xCol: null, yCol: revCol, agg: 'sum', w: 4 });
    }
    if (secondMetricCol) {
      dashboardWidgets.push({ id: 'tmpl-full-kpi-2', title: 'Secondary Metrics', type: 'kpi', xCol: null, yCol: secondMetricCol, agg: 'sum', w: 4 });
    }
    dashboardWidgets.push({ id: 'tmpl-full-kpi-3', title: 'Total Record Count', type: 'kpi', xCol: null, yCol: idCol, agg: 'count', w: 4 });
    
    if (dateCol && revCol) {
      dashboardWidgets.push({ id: 'tmpl-full-trend', title: 'Metric Trend over Time', type: 'line', xCol: dateCol, yCol: revCol, agg: 'sum', w: 6 });
    }
    if (catCol && revCol) {
      dashboardWidgets.push({ id: 'tmpl-full-share', title: 'Distribution by Category', type: 'donut', xCol: catCol, yCol: revCol, agg: 'sum', w: 6 });
    }
    if (catCol2 && revCol) {
      dashboardWidgets.push({ id: 'tmpl-full-breakdown', title: 'Performance by Segment', type: 'bar', xCol: catCol2, yCol: revCol, agg: 'sum', w: 6 });
    }
    dashboardWidgets.push({ id: 'tmpl-full-table', title: 'Dataset Summary Report Grid', type: 'table', xCol: null, yCol: null, agg: null, w: 12 });
  }

  renderDashboardCanvas();
  renderDashboardTab();
  showToast(`Applied ${templateName} template successfully!`, "success");
}

function renderDashboardHealth() {
  const container = document.getElementById('manage-health-list');
  if (!container) return;

  const checks = [];

  if (dashboardWidgets.length === 0) {
    checks.push({ status: 'warning', title: 'No Widgets Active', desc: 'Add widgets under "Visuals" or apply a template.' });
  } else {
    checks.push({ status: 'success', title: 'Widgets Configured', desc: `${dashboardWidgets.length} widgets active on the layout.` });
  }

  let hasEmpty = false;
  dashboardWidgets.forEach(w => {
    if (w.type !== 'table' && !w.yCol) hasEmpty = true;
  });
  if (hasEmpty) {
    checks.push({ status: 'error', title: 'Unconfigured Metrics', desc: 'Some widgets have missing Y-axis metrics.' });
  } else if (dashboardWidgets.length > 0) {
    checks.push({ status: 'success', title: 'Widgets Mapped', desc: 'All active widgets are properly configured.' });
  }

  let totalW = 0;
  dashboardWidgets.forEach(w => totalW += w.w);
  if (totalW > 0) {
    const rows = Math.ceil(totalW / 12);
    checks.push({ status: 'info', title: 'Layout Coverage', desc: `Covering ${totalW} cols (~${rows} grid rows utilized).` });
  }

  const cCount = Object.keys(calculatedFields).length;
  if (cCount > 0) {
    checks.push({ status: 'info', title: 'Calculated Metrics', desc: `${cCount} virtual computed fields injected.` });
  }

  const dCount = Object.keys(activeDrillState).length;
  if (dCount > 0) {
    checks.push({ status: 'warning', title: 'Drill Path Active', desc: `${dCount} widgets are currently in a drilled-down state.` });
  }

  const icons = { success: 'âœ…', warning: 'âš ï¸', error: 'âŒ', info: 'â„¹ï¸' };

  container.innerHTML = checks.map(c => `
    <div class="health-item">
      <span class="health-icon">${icons[c.status] || 'â„¹ï¸'}</span>
      <div class="health-text">
        <span class="health-title">${c.title}</span>
        <span class="health-desc">${c.desc}</span>
      </div>
    </div>
  `).join('');
}

function renderManageDatasetInfo() {
  const rowsEl = document.getElementById('manage-info-rows');
  const colsEl = document.getElementById('manage-info-cols');
  const missingEl = document.getElementById('manage-info-missing');
  const dupsEl = document.getElementById('manage-info-dups');
  const qualityEl = document.getElementById('manage-info-quality');

  if (rowsEl) rowsEl.innerText = gridData ? gridData.length.toLocaleString() : '0';
  if (colsEl) colsEl.innerText = headers ? headers.length.toString() : '0';

  const missingText = document.getElementById('ws-info-missing') ? document.getElementById('ws-info-missing').innerText : '0';
  const dupsText = document.getElementById('ws-info-dups') ? document.getElementById('ws-info-dups').innerText : '0';
  const scoreText = document.getElementById('quality-score-val') ? document.getElementById('quality-score-val').innerText : '94%';

  if (missingEl) missingEl.innerText = missingText;
  if (dupsEl) dupsEl.innerText = dupsText;
  if (qualityEl) qualityEl.innerText = scoreText;
}

document.querySelectorAll('.viz-tab-btn').forEach(btn => {
  btn.onclick = () => switchVizTab(btn.dataset.tab);
});

// View Switcher logic (Sheet View vs Dashboard)
btnSwitchSheet = document.getElementById('btn-switch-sheet');
btnSwitchDash = document.getElementById('btn-switch-dash');
wsBtnVisualize = document.getElementById('ws-btn-visualize');
dashboardCanvasViewport = document.getElementById('dashboard-canvas-viewport');
wsSidebarVisualization = document.getElementById('ws-sidebar-visualization');

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
          <span class="dash-icon">ðŸ“Š</span>
          <div>
            <div>${datasetName} Dashboard</div>
            <div class="dashboard-header-meta">${rowCount} rows Â· ${colCount} columns Â· Last generated ${now}</div>
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
        renderDashboardTab();
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

  // Panel visibility managed by PanelManager â€” just restore dataset info visibility
  if (datasetInfoPanel) datasetInfoPanel.style.display = 'flex';

  // Re-render spreadsheet
  renderGridTable();
}

// Bind switcher click listeners
if (btnSwitchSheet) btnSwitchSheet.onclick = switchToSheetView;
if (btnSwitchDash) btnSwitchDash.onclick = switchToDashboardView;
if (wsBtnVisualize) wsBtnVisualize.onclick = switchToDashboardView;

// Reset button inside builder visualization sidebar
resetVizBtn = document.getElementById('btn-reset-visualization');
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




// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â PHASE 2: DRILL DOWN LOGIC Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

function renderDrillHierarchiesList() {
  var container = document.getElementById('viz-drill-list');
  if (!container) return;
  if (drillHierarchies.length === 0) {
    container.innerHTML = '<div style="font-size:11px; color:var(--text-muted); text-align:center; padding:8px;">No hierarchies defined.</div>';
    return;
  }
  container.innerHTML = drillHierarchies.map(function(h) {
    var colNames = h.columns.map(function(c) { return headerNames[c] || c; }).join(' Ã¢â€ â€™ ');
    return '<div style="display:flex; align-items:center; gap:6px; padding:8px; background:var(--bg-secondary); border-radius:var(--radius-sm); border:1px solid var(--border-color);">' +
      '<div style="flex:1; overflow:hidden;">' +
        '<div style="font-size:11.5px; font-weight:700; color:var(--primary);">' + h.name + '</div>' +
        '<div style="font-size:10px; color:var(--text-muted);">' + colNames + '</div>' +
      '</div>' +
      '<button class="history-step-btn" style="color:var(--error); border-color:rgba(239,68,68,0.2);" onclick="deleteDrillHierarchy(\'' + h.id + '\')">Ã°Å¸â€”â€˜Ã¯Â¸Â</button>' +
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
  pathEl.innerHTML = pathParts.join(' <span style="opacity:0.4;">Ã¢â€ â€™</span> ');
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


// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â PHASE 2: SMART INSIGHTS ENGINE Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

function generateInsights() {
  if (!gridData || gridData.length === 0) return [];
  var profile = profileColumns();
  var insights = [];

  // 1. Dataset overview
  insights.push({ type: 'info', icon: 'Ã°Å¸â€œÅ ', title: 'Dataset Overview',
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
    insights.push({ type: 'metric', icon: 'Ã°Å¸â€œË†', title: colName + ' Summary',
      text: 'Total: ' + fmt(total) + ' Ã‚Â· Avg: ' + fmt(avg) + ' Ã‚Â· Max: ' + fmt(mx) + ' Ã‚Â· Min: ' + fmt(mn)
    });

    // Half-period trend
    var half = Math.floor(vals.length / 2);
    var sumFirst = vals.slice(0, half).reduce(function(s, v) { return s + v; }, 0);
    var sumSecond = vals.slice(half).reduce(function(s, v) { return s + v; }, 0);
    if (sumFirst > 0) {
      var changePct = ((sumSecond - sumFirst) / sumFirst) * 100;
      insights.push({
        type: changePct >= 0 ? 'success' : 'error',
        icon: changePct >= 0 ? 'Ã°Å¸â€œË†' : 'Ã°Å¸â€œâ€°',
        title: colName + ' Half-Period Trend',
        text: colName + ' is ' + (changePct >= 0 ? 'Ã¢â€ â€˜ up' : 'Ã¢â€ â€œ down') + ' ' + Math.abs(changePct).toFixed(1) + '% comparing the first half to the second half of records.'
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
      insights.push({ type: 'info', icon: 'Ã°Å¸Ââ€ ', title: 'Top ' + catName,
        text: '"' + topVal + '" is the most frequent ' + catName + ' (' + topCount.toLocaleString() + ' records, ' + pct + '% of dataset).'
      });
      if (sorted.length > 1) {
        insights.push({ type: 'info', icon: 'Ã°Å¸Â¥Ë†', title: 'Runner-up ' + catName,
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
    insights.push({ type: 'warning', icon: 'Ã¢Å¡Â Ã¯Â¸Â', title: 'Missing Values Detected',
      text: totalMissing.toLocaleString() + ' missing cells detected (' + missingPct + '% of all data).'
    });
  } else {
    insights.push({ type: 'success', icon: 'Ã¢Å“â€¦', title: 'No Missing Values',
      text: 'All columns are fully populated Ã¢â‚¬â€ clean dataset.'
    });
  }

  // 5. Active filters notice
  var filterCount = Object.values(globalVizFilters).filter(function(v) { return v !== ''; }).length;
  if (filterCount > 0) {
    insights.push({ type: 'info', icon: 'Ã°Å¸â€Â', title: 'Active Dashboard Filters',
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
        '<span style="font-size:11.5px; font-weight:700; color:var(--text-primary);">' + esc(ins.title) + '</span>' +
      '</div>' +
      '<div style="font-size:11px; color:var(--text-secondary); line-height:1.5;">' + esc(ins.text) + '</div>' +
    '</div>';
  }).join('');
}


// Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â PHASE 2: STATISTICAL ANALYSIS Ã¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢ÂÃ¢â€¢Â

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
      '<div style="font-size:10.5px; font-weight:600; color:var(--text-primary); margin-bottom:6px;">' + esc(nameA) + ' vs ' + esc(nameB) + '</div>' +
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
        '<span style="font-size:10.5px; font-weight:700; color:' + color + ';">' + (isUp ? 'Ã¢â€ â€˜' : 'Ã¢â€ â€œ') + ' ' + Math.abs(changePct).toFixed(1) + '%</span>' +
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
    container.innerHTML = '<div style="font-size:11px; color:var(--success); padding:8px;">Ã¢Å“â€¦ No statistical anomalies detected using IQR method.</div>';
    return;
  }

  container.innerHTML = allAnomalies.map(function(a) {
    return '<div style="padding:8px; background:rgba(244,63,94,0.06); border-radius:var(--radius-sm); border:1px solid rgba(244,63,94,0.2); margin-bottom:4px;">' +
      '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
        '<span style="font-size:11px; font-weight:700; color:var(--error);">⚡ ' + esc(a.colName) + '</span>' +
        '<span style="font-size:10px; color:var(--text-muted);">' + a.count + ' outliers</span>' +
      '</div>' +
      '<div style="font-size:10.5px; color:var(--text-secondary);">Normal range: [' + a.lo + ' – ' + a.hi + ']</div>' +
      '<div style="font-size:10px; color:var(--text-muted); margin-top:2px;">Dataset Min: ' + a.min + ' · Max: ' + a.max + '</div>' +
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

  dimSel.innerHTML = catCols.map(function(h) { return '<option value="' + esc(h) + '">' + esc(headerNames[h] || h) + '</option>'; }).join('') || '<option value="">No categories</option>';
  metSel.innerHTML = numCols.map(function(h) { return '<option value="' + esc(h) + '">' + esc(headerNames[h] || h) + '</option>'; }).join('') || '<option value="">No metrics</option>';

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
        '<span style="font-size:10.5px; font-weight:600; color:var(--text-primary); max-width:60%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + (i + 1) + '. ' + esc(p.label) + '</span>' +
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



/* ==================== ONECLICK DASHBOARD BUILDER V3 LOGIC ==================== */

// Global state variables for V3 features
globalFiltersV3 = {
  multiselect: {}, // colKey -> Set
  dateRange: {},   // colKey -> { min, max }
  numericRange: {} // colKey -> { min, max }
};

wizardState = {
  active: false,
  step: 1, // 1 to 6
  chartType: 'kpi',
  xCol: '',
  yCol: '',
  yCol2: '', // for metric comparison
  agg: 'sum'
};

// 1. Dashboard Quality Score
function calculateDashboardQuality() {
  let score = 0;
  const checklist = [];

  // 1. KPI Coverage (20 pts)
  const hasKPI = dashboardWidgets.some(w => w.type === 'kpi');
  if (hasKPI) {
    score += 20;
    checklist.push({ title: 'KPI Coverage', passed: true });
  } else {
    checklist.push({ title: 'KPI Coverage Missing', passed: false });
  }

  // 2. Trend Analysis (20 pts)
  const hasTrend = dashboardWidgets.some(w => w.type === 'line' || w.type === 'area');
  if (hasTrend) {
    score += 20;
    checklist.push({ title: 'Trend Analysis', passed: true });
  } else {
    checklist.push({ title: 'Trend Analysis Missing', passed: false });
  }

  // 3. Category Analysis (20 pts)
  const hasCategory = dashboardWidgets.some(w => w.type === 'bar' || w.type === 'donut' || w.type === 'pie' || w.type === 'heatmap' || w.type === 'scatter');
  if (hasCategory) {
    score += 20;
    checklist.push({ title: 'Category Analysis', passed: true });
  } else {
    checklist.push({ title: 'Category Analysis Missing', passed: false });
  }

  // 4. Financial Analysis (20 pts)
  const hasFinancial = dashboardWidgets.some(w => {
    if (!w.yCol) return false;
    const name = (headerNames[w.yCol] || w.yCol).toLowerCase();
    return /revenue|sales|profit|price|amount|cost|spend|income/i.test(name);
  });
  if (hasFinancial) {
    score += 20;
    checklist.push({ title: 'Financial Analysis', passed: true });
  } else {
    checklist.push({ title: 'Financial Analysis Missing', passed: false });
  }

  // 5. Geographic Analysis (10 pts)
  const hasGeoFields = headers.some(h => /country|region|state|city|geo/i.test((headerNames[h] || h).toLowerCase()));
  if (!hasGeoFields) {
    score += 10;
    checklist.push({ title: 'Geographic Analysis (N/A)', passed: true });
  } else {
    const hasGeoWidget = dashboardWidgets.some(w => {
      return w.xCol && /country|region|state|city|geo/i.test((headerNames[w.xCol] || w.xCol).toLowerCase());
    });
    if (hasGeoWidget) {
      score += 10;
      checklist.push({ title: 'Geographic Analysis', passed: true });
    } else {
      checklist.push({ title: 'Geographic Analysis Missing', passed: false });
    }
  }

  // 6. Customer Analysis (10 pts)
  const hasCustomerFields = headers.some(h => /customer|client|user|consumer|buyer/i.test((headerNames[h] || h).toLowerCase()));
  if (!hasCustomerFields) {
    score += 10;
    checklist.push({ title: 'Customer Analysis (N/A)', passed: true });
  } else {
    const hasCustomerWidget = dashboardWidgets.some(w => {
      return (w.xCol && /customer|client|user|consumer|buyer/i.test((headerNames[w.xCol] || w.xCol).toLowerCase())) ||
             (w.yCol && /customer|client|user|consumer|buyer/i.test((headerNames[w.yCol] || w.yCol).toLowerCase()));
    });
    if (hasCustomerWidget) {
      score += 10;
      checklist.push({ title: 'Customer Analysis', passed: true });
    } else {
      checklist.push({ title: 'Customer Analysis Missing', passed: false });
    }
  }

  return { score, checklist };
}

// 2. Dashboard Overview Live Statistics
function updateOverviewStats() {
  const widgetsCount = dashboardWidgets.length;
  const kpisCount = dashboardWidgets.filter(w => w.type === 'kpi').length;
  const chartsCount = dashboardWidgets.filter(w => w.type !== 'kpi' && w.type !== 'table').length;
  const tablesCount = dashboardWidgets.filter(w => w.type === 'table').length;
  
  let activeFiltersCount = 0;
  if (globalFiltersV3) {
    if (globalFiltersV3.multiselect) {
      Object.values(globalFiltersV3.multiselect).forEach(s => { if (s && s.size > 0) activeFiltersCount++; });
    }
    if (globalFiltersV3.dateRange) {
      Object.values(globalFiltersV3.dateRange).forEach(r => { if (r && (r.min || r.max)) activeFiltersCount++; });
    }
    if (globalFiltersV3.numericRange) {
      Object.values(globalFiltersV3.numericRange).forEach(r => { if (r && (r.min !== undefined || r.max !== undefined)) activeFiltersCount++; });
    }
  }

  const statWidgets = document.getElementById('stat-widgets');
  const statKpis = document.getElementById('stat-kpis');
  const statCharts = document.getElementById('stat-charts');
  const statTables = document.getElementById('stat-tables');
  const statFilters = document.getElementById('stat-filters');
  const statUpdated = document.getElementById('stat-updated');

  if (statWidgets) statWidgets.innerText = widgetsCount;
  if (statKpis) statKpis.innerText = kpisCount;
  if (statCharts) statCharts.innerText = chartsCount;
  if (statTables) statTables.innerText = tablesCount;
  if (statFilters) statFilters.innerText = activeFiltersCount;
  if (statUpdated) {
    const now = new Date();
    statUpdated.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}

// 3. Visual Builder Wizard
function renderWizardStep() {
  const container = document.getElementById('wizard-step-body');
  const titleLabel = document.getElementById('wizard-title-label');
  const stepIndicator = document.getElementById('wizard-step-indicator');
  if (!container) return;

  stepIndicator.innerText = `Step ${wizardState.step} / 6`;

  const displayCols = [...headers, ...Object.keys(calculatedFields)];
  const getColDisplayName = (h) => headerNames[h] || (calculatedFields[h] && calculatedFields[h].title) || h;

  let html = "";
  if (wizardState.step === 1) {
    titleLabel.innerText = "Select Chart Type";
    html = `
      <div class="viz-field-group">
        <select class="quality-select" id="wiz-chart-type-select" style="margin-top:0;">
          <option value="kpi" ${wizardState.chartType === 'kpi' ? 'selected' : ''}>KPI Card</option>
          <option value="bar" ${wizardState.chartType === 'bar' ? 'selected' : ''}>Bar Chart</option>
          <option value="line" ${wizardState.chartType === 'line' ? 'selected' : ''}>Line Chart</option>
          <option value="area" ${wizardState.chartType === 'area' ? 'selected' : ''}>Area Chart</option>
          <option value="donut" ${wizardState.chartType === 'donut' ? 'selected' : ''}>Donut Chart</option>
          <option value="pie" ${wizardState.chartType === 'pie' ? 'selected' : ''}>Pie Chart</option>
          <option value="scatter" ${wizardState.chartType === 'scatter' ? 'selected' : ''}>Scatter Plot</option>
          <option value="heatmap" ${wizardState.chartType === 'heatmap' ? 'selected' : ''}>Heatmap</option>
          <option value="table" ${wizardState.chartType === 'table' ? 'selected' : ''}>Report Table</option>
          <option value="metric_comparison" ${wizardState.chartType === 'metric_comparison' ? 'selected' : ''}>Metric Comparison</option>
        </select>
      </div>
    `;
  } else if (wizardState.step === 2) {
    titleLabel.innerText = "Select X-Axis";
    if (wizardState.chartType === 'kpi' || wizardState.chartType === 'table' || wizardState.chartType === 'metric_comparison') {
      html = `<div style="font-size:11px; color:var(--text-muted); padding:8px;">X-Axis is not required for this visual type. Click Next to continue.</div>`;
    } else {
      html = `
        <div class="viz-field-group">
          <label class="ws-info-label" style="font-weight:600; margin-bottom:4px; display:inline-block;">X-Axis Column</label>
          <select class="quality-select" id="wiz-x-axis-select" style="margin-top:0;">
            ${displayCols.map(h => `<option value="${h}" ${wizardState.xCol === h ? 'selected' : ''}>${getColDisplayName(h)}</option>`).join('')}
          </select>
        </div>
      `;
    }
  } else if (wizardState.step === 3) {
    titleLabel.innerText = "Select Y-Axis";
    if (wizardState.chartType === 'table') {
      html = `<div style="font-size:11px; color:var(--text-muted); padding:8px;">Y-Axis columns are automatically loaded from the dataset in Report Table. Click Next to continue.</div>`;
    } else if (wizardState.chartType === 'metric_comparison') {
      html = `
        <div class="viz-field-group">
          <label class="ws-info-label" style="font-weight:600; margin-bottom:4px; display:inline-block;">First Metric (Y-Axis)</label>
          <select class="quality-select" id="wiz-y-axis-select" style="margin-top:0; margin-bottom:8px;">
            ${displayCols.map(h => `<option value="${h}" ${wizardState.yCol === h ? 'selected' : ''}>${getColDisplayName(h)}</option>`).join('')}
          </select>
          <label class="ws-info-label" style="font-weight:600; margin-bottom:4px; display:inline-block;">Second Metric (Comparison)</label>
          <select class="quality-select" id="wiz-y2-axis-select" style="margin-top:0;">
            <option value="">Select column...</option>
            ${displayCols.map(h => `<option value="${h}" ${wizardState.yCol2 === h ? 'selected' : ''}>${getColDisplayName(h)}</option>`).join('')}
          </select>
        </div>
      `;
    } else {
      html = `
        <div class="viz-field-group">
          <label class="ws-info-label" style="font-weight:600; margin-bottom:4px; display:inline-block;">Y-Axis Column (Values)</label>
          <select class="quality-select" id="wiz-y-axis-select" style="margin-top:0;">
            <option value="" ${wizardState.yCol === '' ? 'selected' : ''}>None (Count Rows)</option>
            ${displayCols.map(h => `<option value="${h}" ${wizardState.yCol === h ? 'selected' : ''}>${getColDisplayName(h)}</option>`).join('')}
          </select>
        </div>
      `;
    }
  } else if (wizardState.step === 4) {
    titleLabel.innerText = "Select Aggregation";
    if (wizardState.chartType === 'table') {
      html = `<div style="font-size:11px; color:var(--text-muted); padding:8px;">Aggregation is not required for Report Table. Click Next to continue.</div>`;
    } else {
      html = `
        <div class="viz-field-group">
          <label class="ws-info-label" style="font-weight:600; margin-bottom:4px; display:inline-block;">Aggregation Method</label>
          <select class="quality-select" id="wiz-agg-select" style="margin-top:0;">
            <option value="sum" ${wizardState.agg === 'sum' ? 'selected' : ''}>Sum</option>
            <option value="avg" ${wizardState.agg === 'avg' ? 'selected' : ''}>Average</option>
            <option value="count" ${wizardState.agg === 'count' ? 'selected' : ''}>Count of Rows</option>
            <option value="count_dist" ${wizardState.agg === 'count_dist' ? 'selected' : ''}>Distinct Count</option>
            <option value="min" ${wizardState.agg === 'min' ? 'selected' : ''}>Minimum</option>
            <option value="max" ${wizardState.agg === 'max' ? 'selected' : ''}>Maximum</option>
            <option value="median" ${wizardState.agg === 'median' ? 'selected' : ''}>Median</option>
          </select>
        </div>
      `;
    }
  } else if (wizardState.step === 5) {
    titleLabel.innerText = "Live Preview";
    let previewSummaryText = "";
    if (wizardState.chartType === 'table') {
      previewSummaryText = "Will add a full-width data grid showing columns from the dataset.";
    } else if (wizardState.chartType === 'kpi') {
      const colLabel = wizardState.yCol ? getColDisplayName(wizardState.yCol) : "Records";
      previewSummaryText = `Will display a KPI Card showing the ${wizardState.agg.toUpperCase()} of ${colLabel}.`;
    } else if (wizardState.chartType === 'metric_comparison') {
      const col1 = wizardState.yCol ? getColDisplayName(wizardState.yCol) : "Records";
      const col2 = wizardState.yCol2 ? getColDisplayName(wizardState.yCol2) : "None";
      previewSummaryText = `Will display a comparison KPI Card comparing ${wizardState.agg.toUpperCase()} of ${col1} vs ${col2}.`;
    } else {
      const xLabel = wizardState.xCol ? getColDisplayName(wizardState.xCol) : "All Data";
      const yLabel = wizardState.yCol ? getColDisplayName(wizardState.yCol) : "Records";
      previewSummaryText = `Will add a ${wizardState.chartType} chart showing ${wizardState.agg.toUpperCase()} of ${yLabel} grouped by ${xLabel}.`;
    }

    html = `
      <div class="wizard-preview-box">
        <div style="font-size: 24px; margin-bottom: 6px;">
          ${wizardState.chartType === 'kpi' || wizardState.chartType === 'metric_comparison' ? 'ðŸ”¢' : wizardState.chartType === 'table' ? 'ðŸ“‹' : 'ðŸ“Š'}
        </div>
        <div style="font-weight: 700; font-size: 11px; margin-bottom: 4px;">Preview Summary</div>
        <div style="font-size: 10.5px; color: var(--text-secondary); line-height: 1.4;">${previewSummaryText}</div>
        <div style="font-size: 9px; color: var(--primary); font-family: var(--font-mono); margin-top: 4px;">Data Source: Active Sheet</div>
      </div>
    `;
  } else if (wizardState.step === 6) {
    titleLabel.innerText = "Add to Dashboard";
    html = `
      <div style="text-align: center; padding: 12px 0;">
        <div style="font-size: 32px; margin-bottom: 12px;">âœ¨</div>
        <div style="font-size: 11px; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Ready to create!</div>
        <div style="font-size: 10.5px; color: var(--text-secondary); margin-bottom: 12px;">Click "Add Visual" to insert this visual into your canvas.</div>
      </div>
    `;
  }

  container.innerHTML = html;

  const chartTypeSelect = document.getElementById('wiz-chart-type-select');
  if (chartTypeSelect) {
    chartTypeSelect.onchange = () => { wizardState.chartType = chartTypeSelect.value; };
  }
  const xAxisSelect = document.getElementById('wiz-x-axis-select');
  if (xAxisSelect) {
    xAxisSelect.onchange = () => { wizardState.xCol = xAxisSelect.value; };
  }
  const yAxisSelect = document.getElementById('wiz-y-axis-select');
  if (yAxisSelect) {
    yAxisSelect.onchange = () => { wizardState.yCol = yAxisSelect.value; };
  }
  const y2AxisSelect = document.getElementById('wiz-y2-axis-select');
  if (y2AxisSelect) {
    y2AxisSelect.onchange = () => { wizardState.yCol2 = y2AxisSelect.value; };
  }
  const aggSelect = document.getElementById('wiz-agg-select');
  if (aggSelect) {
    aggSelect.onchange = () => { wizardState.agg = aggSelect.value; };
  }

  const nextBtn = document.getElementById('btn-wizard-next');
  if (nextBtn) {
    nextBtn.innerText = wizardState.step === 6 ? "Add Visual" : "Next";
  }
}

function bindWizardEvents() {
  document.querySelectorAll('.visual-creator-card').forEach(card => {
    card.onclick = () => {
      const chartType = card.dataset.chartType;
      wizardState.active = true;
      wizardState.step = 1;
      wizardState.chartType = chartType;
      
      const profile = profileColumns();
      wizardState.xCol = profile.catCols[0] || profile.dateCols[0] || headers[0] || "";
      wizardState.yCol = profile.numCols[0] || profile.currencyCols[0] || headers[0] || "";
      wizardState.yCol2 = profile.numCols[1] || "";
      wizardState.agg = 'sum';
      
      renderDashboardTab();
    };
  });

  const btnWizardBack = document.getElementById('btn-wizard-back');
  if (btnWizardBack) {
    btnWizardBack.onclick = () => {
      if (wizardState.step > 1) {
        wizardState.step--;
        renderWizardStep();
      } else {
        wizardState.active = false;
        renderDashboardTab();
      }
    };
  }

  const btnWizardNext = document.getElementById('btn-wizard-next');
  if (btnWizardNext) {
    btnWizardNext.onclick = () => {
      if (wizardState.step < 6) {
        wizardState.step++;
        renderWizardStep();
      } else {
        const newId = 'widget-' + Date.now();
        let finalW = 6;
        if (wizardState.chartType === 'kpi' || wizardState.chartType === 'metric_comparison') finalW = 3;
        if (wizardState.chartType === 'table') finalW = 12;

        let typeVal = wizardState.chartType;
        let titleVal = "";
        if (wizardState.chartType === 'kpi') {
          titleVal = wizardState.yCol ? `${headerNames[wizardState.yCol]} KPI` : 'Records KPI';
        } else if (wizardState.chartType === 'metric_comparison') {
          titleVal = `Metric Comparison`;
          typeVal = 'kpi';
        } else {
          const yName = wizardState.yCol ? headerNames[wizardState.yCol] : 'Records';
          titleVal = `${yName} by ${headerNames[wizardState.xCol]}`;
        }

        const newWidget = {
          id: newId,
          title: titleVal,
          type: typeVal,
          xCol: wizardState.xCol,
          yCol: wizardState.yCol,
          yCol2: wizardState.yCol2,
          agg: wizardState.agg,
          w: finalW
        };

        dashboardWidgets.push(newWidget);
        wizardState.active = false;
        renderDashboardCanvas();
        renderDashboardTab();
        selectWidget(newId);
        showToast("Visual added to dashboard!", "success");
      }
    };
  }
}

// 4. More Actions Menu in Structure List
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
      kpi: 'ðŸ”¢',
      line: 'ðŸ“ˆ',
      bar: 'ðŸ“Š',
      pie: 'ðŸ•',
      donut: 'ðŸ©',
      table: 'ðŸ“‹'
    };

    item.innerHTML = `
      <div class="viz-widget-info">
        <span class="viz-widget-list-title">${widget.title}</span>
        <div class="viz-widget-list-meta">
          <span>${typeIcons[widget.type] || 'ðŸ“Š'} ${widget.type.toUpperCase()}</span>
          <span class="viz-widget-list-badge">w:${widget.w}/12</span>
        </div>
      </div>
      <div class="more-actions-menu-container">
        <button class="history-step-btn btn-more-actions" style="font-size:12px; font-weight:bold; height:24px; padding:0 8px;" title="More Actions">â‹®</button>
        <div class="more-actions-menu" id="menu-${widget.id}">
          <button class="more-actions-item btn-menu-edit">âš™ï¸ Edit</button>
          <button class="more-actions-item btn-menu-dup">ðŸ‘¥ Duplicate</button>
          <button class="more-actions-item btn-menu-up" ${idx === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>â–² Move Up</button>
          <button class="more-actions-item btn-menu-down" ${idx === dashboardWidgets.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>â–¼ Move Down</button>
          <button class="more-actions-item delete btn-menu-del">ðŸ—‘ï¸ Delete</button>
        </div>
      </div>
    `;

    const toggleBtn = item.querySelector('.btn-more-actions');
    const dropdown = item.querySelector('.more-actions-menu');
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('.more-actions-menu').forEach(menu => {
        if (menu !== dropdown) menu.classList.remove('show');
      });
      dropdown.classList.toggle('show');
    };

    item.querySelector('.btn-menu-edit').onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.remove('show');
      selectWidget(widget.id);
    };

    item.querySelector('.btn-menu-dup').onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.remove('show');
      duplicateWidget(widget.id);
    };

    item.querySelector('.btn-menu-up').onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.remove('show');
      if (idx > 0) swapWidgets(idx, idx - 1);
    };

    item.querySelector('.btn-menu-down').onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.remove('show');
      if (idx < dashboardWidgets.length - 1) swapWidgets(idx, idx + 1);
    };

    item.querySelector('.btn-menu-del').onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.remove('show');
      deleteWidget(widget.id);
    };

    item.onclick = (e) => {
      if (e.target.closest('.more-actions-menu-container')) return;
      selectWidget(widget.id);
    };

    container.appendChild(item);
  });
}

function duplicateWidget(widgetId) {
  const orig = dashboardWidgets.find(w => w.id === widgetId);
  if (!orig) return;
  const copy = {
    ...orig,
    id: 'widget-' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    title: `${orig.title} (Copy)`
  };
  dashboardWidgets.push(copy);
  renderDashboardCanvas();
  renderDashboardTab();
  selectWidget(copy.id);
  showToast("Widget duplicated!", "success");
}

document.addEventListener('click', () => {
  document.querySelectorAll('.more-actions-menu').forEach(menu => menu.classList.remove('show'));
});

// 5. Quick Actions
function autoArrangeLayout() {
  dashboardWidgets.sort((a, b) => {
    const typeScore = (w) => w.type === 'kpi' ? 1 : w.type === 'table' ? 3 : 2;
    return typeScore(a) - typeScore(b);
  });
  renderDashboardCanvas();
  renderDashboardTab();
  showToast("Dashboard widgets auto-arranged", "success");
}

function bindQuickActions() {
  const btnRegen = document.getElementById('btn-quick-regenerate');
  if (btnRegen) {
    btnRegen.onclick = () => {
      dashboardWidgets = [];
      generateDefaultDashboardDraft();
      renderDashboardCanvas();
      renderDashboardTab();
      showToast("Dashboard regenerated", "success");
    };
  }

  const btnRefresh = document.getElementById('btn-quick-refresh');
  if (btnRefresh) {
    btnRefresh.onclick = () => {
      renderDashboardCanvas();
      renderDashboardTab();
      showToast("Metrics and dashboard refreshed", "success");
    };
  }

  const btnArrange = document.getElementById('btn-quick-arrange');
  if (btnArrange) {
    btnArrange.onclick = () => {
      autoArrangeLayout();
    };
  }

  const btnReset = document.getElementById('btn-quick-reset');
  if (btnReset) {
    btnReset.onclick = () => {
      if (confirm("Reset dashboard to initial template state?")) {
        dashboardWidgets = [];
        generateDefaultDashboardDraft();
        renderDashboardCanvas();
        renderDashboardTab();
        showToast("Dashboard reset successfully", "success");
      }
    };
  }
}

// 6. Global Filters V3
function getUniqueValuesForCol(colKey) {
  const colIdx = headers.indexOf(colKey);
  if (colIdx === -1) return [];
  const vals = new Set();
  for (let r = 0; r < gridData.length; r++) {
    const v = String(gridData[r][colIdx] || "").trim();
    if (v !== "") {
      vals.add(v);
      if (vals.size > 50) return null; // Too high cardinality
    }
  }
  return Array.from(vals).sort();
}

function renderGlobalFiltersV3() {
  const container = document.getElementById('explore-global-filters-container');
  if (!container) return;

  container.innerHTML = "";

  headers.forEach(colKey => {
    const colName = headerNames[colKey] || colKey;
    const colType = detectColumnType(colKey);

    const group = document.createElement('div');
    group.className = 'explore-filter-item';

    if (colType === 'date') {
      group.innerHTML = `
        <div class="explore-filter-header">
          <span class="explore-filter-title">${colName} (Date Range)</span>
        </div>
        <div class="range-filter-inputs">
          <input type="date" class="range-input date-min" placeholder="Start Date" />
          <input type="date" class="range-input date-max" placeholder="End Date" />
        </div>
      `;
      const minInput = group.querySelector('.date-min');
      const maxInput = group.querySelector('.date-max');
      const savedRange = globalFiltersV3.dateRange[colKey] || {};
      minInput.value = savedRange.min || "";
      maxInput.value = savedRange.max || "";

      const updateDateRange = () => {
        globalFiltersV3.dateRange[colKey] = { min: minInput.value, max: maxInput.value };
        renderDashboardCanvas();
      };
      minInput.onchange = updateDateRange;
      maxInput.onchange = updateDateRange;

    } else if (colType === 'currency' || colType === 'percentage' || colType === 'number' || colType === 'numeric') {
      group.innerHTML = `
        <div class="explore-filter-header">
          <span class="explore-filter-title">${colName} (Numeric Range)</span>
        </div>
        <div class="range-filter-inputs">
          <input type="number" class="range-input num-min" placeholder="Min" />
          <input type="number" class="range-input num-max" placeholder="Max" />
        </div>
      `;
      const minInput = group.querySelector('.num-min');
      const maxInput = group.querySelector('.num-max');
      const savedRange = globalFiltersV3.numericRange[colKey] || {};
      minInput.value = savedRange.min !== undefined ? savedRange.min : "";
      maxInput.value = savedRange.max !== undefined ? savedRange.max : "";

      const updateNumRange = () => {
        globalFiltersV3.numericRange[colKey] = { min: minInput.value, max: maxInput.value };
        renderDashboardCanvas();
      };
      minInput.oninput = updateNumRange;
      maxInput.oninput = updateNumRange;

    } else {
      const uniqueVals = getUniqueValuesForCol(colKey);
      if (!uniqueVals) return;

      const savedSet = globalFiltersV3.multiselect[colKey] || new Set();

      group.innerHTML = `
        <div class="explore-filter-header">
          <span class="explore-filter-title">${colName} (Multi-select)</span>
        </div>
        <div class="searchable-multiselect">
          <input type="text" class="search-input-sm" placeholder="Search values..." />
          <div class="multiselect-options-list">
            ${uniqueVals.map(val => {
              const isChecked = savedSet.has(val) ? 'checked' : '';
              return `
                <label class="multiselect-option">
                  <input type="checkbox" value="${val}" ${isChecked} />
                  <span>${val}</span>
                </label>
              `;
            }).join('')}
          </div>
        </div>
      `;

      const searchInput = group.querySelector('.search-input-sm');
      const optionsList = group.querySelector('.multiselect-options-list');
      searchInput.oninput = () => {
        const q = searchInput.value.toLowerCase();
        optionsList.querySelectorAll('.multiselect-option').forEach(label => {
          const text = label.innerText.toLowerCase();
          label.style.display = text.includes(q) ? 'flex' : 'none';
        });
      };

      optionsList.querySelectorAll('input[type=checkbox]').forEach(checkbox => {
        checkbox.onchange = () => {
          if (!globalFiltersV3.multiselect[colKey]) {
            globalFiltersV3.multiselect[colKey] = new Set();
          }
          if (checkbox.checked) {
            globalFiltersV3.multiselect[colKey].add(checkbox.value);
          } else {
            globalFiltersV3.multiselect[colKey].delete(checkbox.value);
          }
          renderDashboardCanvas();
        };
      });
    }

    container.appendChild(group);
  });
}

function isRowMatchingFilters(row) {
  if (globalFiltersV3) {
    if (globalFiltersV3.multiselect) {
      for (const colKey in globalFiltersV3.multiselect) {
        const selectedSet = globalFiltersV3.multiselect[colKey];
        if (selectedSet && selectedSet.size > 0) {
          const rowVal = String(getRowValueByHeader(row, colKey)).trim();
          if (!selectedSet.has(rowVal)) {
            return false;
          }
        }
      }
    }

    if (globalFiltersV3.dateRange) {
      for (const colKey in globalFiltersV3.dateRange) {
        const range = globalFiltersV3.dateRange[colKey];
        if (range && (range.min || range.max)) {
          const rowVal = getRowValueByHeader(row, colKey);
          const rowDate = Date.parse(rowVal);
          if (!isNaN(rowDate)) {
            if (range.min) {
              const minDate = Date.parse(range.min);
              if (!isNaN(minDate) && rowDate < minDate) return false;
            }
            if (range.max) {
              const maxDate = Date.parse(range.max);
              if (!isNaN(maxDate) && rowDate > maxDate) return false;
            }
          }
        }
      }
    }

    if (globalFiltersV3.numericRange) {
      for (const colKey in globalFiltersV3.numericRange) {
        const range = globalFiltersV3.numericRange[colKey];
        if (range && (range.min !== undefined || range.max !== undefined)) {
          const rawRowVal = getRowValueByHeader(row, colKey);
          const rowVal = getCleanNumericValue(rawRowVal);
          if (range.min !== undefined && range.min !== "" && rowVal < parseFloat(range.min)) return false;
          if (range.max !== undefined && range.max !== "" && rowVal > parseFloat(range.max)) return false;
        }
      }
    }
  }
  return true;
}

const _origRenderDashboardCanvas = renderDashboardCanvas;
renderDashboardCanvas = function() {
  const savedGridData = gridData;
  gridData = savedGridData.filter(row => isRowMatchingFilters(row));
  
  _origRenderDashboardCanvas();
  
  gridData = savedGridData;

  const canvas = document.getElementById('dashboard-canvas');
  if (canvas && canvas.children.length > 0) {
    let layer = document.getElementById('executive-summary-layer');
    if (layer) layer.remove();
    layer = renderExecutiveSummaryLayer();
    canvas.insertBefore(layer, canvas.firstChild);
  }
};

if (typeof btnSwitchDash !== 'undefined' && btnSwitchDash) btnSwitchDash.onclick = window.switchToDashboardView;
if (typeof wsBtnVisualize !== 'undefined' && wsBtnVisualize) wsBtnVisualize.onclick = window.switchToDashboardView;

// 7. Calculated Metrics Operators
function bindFormulaOperators() {
  document.querySelectorAll('.formula-operators-keypad .operator-btn').forEach(btn => {
    btn.onclick = () => {
      const op = btn.dataset.operator;
      const formulaInput = document.getElementById('viz-calc-formula-input');
      if (!formulaInput) return;
      if (op === 'clear') {
        formulaInput.value = "";
      } else {
        const start = formulaInput.selectionStart;
        const end = formulaInput.selectionEnd;
        const text = formulaInput.value;
        formulaInput.value = text.substring(0, start) + op + text.substring(end);
        formulaInput.focus();
        formulaInput.selectionStart = formulaInput.selectionEnd = start + op.length;
      }
      formulaInput.dispatchEvent(new Event('input'));
    };
  });
}

// 8. Interactive Drilldowns handler tweak
const _origHandleChartClick = handleChartClick;
handleChartClick = function(widget, clickedLabel) {
  _origHandleChartClick(widget, clickedLabel);
  switchVizTab('explore');
};

// 9. Computed Insights generator using actual statistics
function runStatisticalInsights() {
  const approvedNumericMetrics = headers.filter(h => {
    const role = getColumnSemanticRole(h);
    return role === "financial_metric" || role === "quantitative_metric";
  });

  if (approvedNumericMetrics.length === 0) {
    return {
      findings: ["Insufficient evidence to generate this insight."],
      risks: [],
      opportunities: [],
      recommendations: []
    };
  }

  const numCol = approvedNumericMetrics[0];
  const dateCol = headers.find(h => getColumnSemanticRole(h) === "temporal_dimension");
  
  // Find a categorical dimension, text attribute, or geographic dimension to group by
  const catCol = headers.find(h => {
    const r = getColumnSemanticRole(h);
    return r === "categorical_dimension" || r === "geographic_dimension" || r === "text_attribute";
  }) || headers.find(h => getColumnSemanticRole(h) !== "identifier" && h !== numCol && h !== dateCol) || headers[0];

  const findings = [];
  const risks = [];
  const opportunities = [];
  const recommendations = [];

  const totalRows = gridData.length;
  const colIdx = headers.indexOf(numCol);
  const catIdx = headers.indexOf(catCol);

  if (colIdx !== -1 && catIdx !== -1) {
    const catSums = {};
    let totalVal = 0;
    gridData.forEach(row => {
      const c = String(row[catIdx] || "Unknown").trim();
      const v = getCleanNumericValue(row[colIdx]);
      catSums[c] = (catSums[c] || 0) + v;
      totalVal += v;
    });

    const sortedCats = Object.entries(catSums).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length > 0 && totalVal > 0) {
      const topCat = sortedCats[0];
      const topPct = (topCat[1] / totalVal) * 100;
      findings.push(`${topCat[0]} contributes ${topPct.toFixed(1)}% of total ${headerNames[numCol] || numCol}.`);

      if (topPct > 40) {
        risks.push(`Category Concentration: ${topPct.toFixed(1)}% of total sales originates from ${topCat[0]}.`);
        recommendations.push(`Monitor category concentration and diversify from ${topCat[0]}.`);
      }

      if (sortedCats.length >= 3) {
        const top3Sum = sortedCats.slice(0, 3).reduce((sum, item) => sum + item[1], 0);
        const top3Pct = (top3Sum / totalVal) * 100;
        findings.push(`Top 3 categories generate ${top3Pct.toFixed(1)}% of sales.`);
      }

      opportunities.push(`Category ${sortedCats[0][0]} is the leading volume contributor with $${sortedCats[0][1].toLocaleString(undefined, {maximumFractionDigits:0})}.`);
    }
  }

  const dateIdx = headers.indexOf(dateCol);
  if (dateIdx !== -1 && colIdx !== -1) {
    const monthlySums = {};
    gridData.forEach(row => {
      const dStr = String(row[dateIdx]).trim();
      const date = new Date(dStr);
      if (!isNaN(date.getTime())) {
        const mKey = date.toISOString().substring(0, 7);
        monthlySums[mKey] = (monthlySums[mKey] || 0) + getCleanNumericValue(row[colIdx]);
      }
    });

    const sortedMonths = Object.entries(monthlySums).sort((a, b) => a[0].localeCompare(b[0]));
    if (sortedMonths.length >= 2) {
      const len = sortedMonths.length;
      const prev = sortedMonths[len - 2];
      const curr = sortedMonths[len - 1];
      if (prev[1] > 0) {
        const growth = ((curr[1] - prev[1]) / prev[1]) * 100;
        findings.push(`${headerNames[numCol] || numCol} changed ${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% month-over-month (from ${prev[0]} to ${curr[0]}).`);
        if (growth > 5) {
          opportunities.push(`Sales momentum is positive, growing at ${growth.toFixed(1)}% in the latest period.`);
        } else if (growth < 0) {
          risks.push(`Declining Trend: Sales declined ${Math.abs(growth).toFixed(1)}% in the latest period.`);
          recommendations.push(`Investigate declining sales trend in the latest period.`);
        }
      }

      if (len >= 3) {
        const s1 = sortedMonths[len - 3][1];
        const s2 = sortedMonths[len - 2][1];
        const s3 = sortedMonths[len - 1][1];
        if (s3 < s2 && s2 < s1) {
          risks.push(`Sales declined across the last three reporting periods consecutively.`);
          recommendations.push(`Perform urgent operational audit on the declining three-period trend.`);
        }
      }
    }
  }

  if (colIdx !== -1) {
    const numericVals = gridData.map(r => getCleanNumericValue(r[colIdx])).sort((a, b) => a - b);
    if (numericVals.length >= 4) {
      const q1 = numericVals[Math.floor(numericVals.length * 0.25)];
      const q3 = numericVals[Math.floor(numericVals.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      const outliers = numericVals.filter(v => v < lowerBound || v > upperBound);
      if (outliers.length > 0) {
        risks.push(`Outliers: Detected ${outliers.length} anomalous transactions beyond normal range.`);
        recommendations.push(`Review high-value outlier transactions to verify coding correctness.`);
      }
    }
  }

  const missingValCount = document.getElementById('q-stat-missing') ? parseInt(document.getElementById('q-stat-missing').innerText) || 0 : 0;
  if (missingValCount > 0) {
    risks.push(`Data Quality warning: Dataset contains ${missingValCount} missing cell values.`);
    recommendations.push(`Run Preprocessing recipe steps to impute empty values.`);
  }

  if (findings.length === 0) findings.push("Dataset profile loaded successfully.");
  if (risks.length === 0) risks.push("No immediate concentration, trend, or outliers risks found.");
  if (opportunities.length === 0) opportunities.push("Volume distribution is aligned with average levels.");
  if (recommendations.length === 0) {
    const geoFields = headers.filter(h => /country|region|state|city/i.test((headerNames[h] || h).toLowerCase()));
    if (geoFields.length > 0) {
      recommendations.push(`Add regional analysis chart using ${headerNames[geoFields[0]]} column.`);
    } else {
      recommendations.push("Investigate category metrics to identify secondary growth drivers.");
    }
  }

  return { findings, risks, opportunities, recommendations };
}

// 10. Prebuilt Templates & Manage Workspace
function applyPrebuiltTemplate(templateName) {
  const profile = profileColumns();
  const dateCol = profile.dateCols[0];
  const catCol = profile.catCols[0] || headers[0];
  const numCol = profile.numCols[0] || profile.currencyCols[0] || headers[0];

  let widgets = [];
  const now = Date.now();

  if (templateName === 'executive_summary') {
    widgets = [
      { id: 't-kpi1-' + now, title: `Total ${headerNames[numCol] || numCol}`, type: 'kpi', xCol: '', yCol: numCol, agg: 'sum', w: 6 },
      { id: 't-kpi2-' + now, title: `Average ${headerNames[numCol] || numCol}`, type: 'kpi', xCol: '', yCol: numCol, agg: 'avg', w: 6 },
      { id: 't-trend-' + now, title: `Performance Trend`, type: 'line', xCol: dateCol || catCol, yCol: numCol, agg: 'sum', w: 12 },
      { id: 't-table-' + now, title: `Detail Transaction Table`, type: 'table', xCol: '', yCol: '', agg: '', w: 12 }
    ];
  } else if (templateName === 'sales') {
    widgets = [
      { id: 't-sale-kpi1-' + now, title: `Total Revenue`, type: 'kpi', xCol: '', yCol: numCol, agg: 'sum', w: 4 },
      { id: 't-sale-kpi2-' + now, title: `Average Sales`, type: 'kpi', xCol: '', yCol: numCol, agg: 'avg', w: 4 },
      { id: 't-sale-kpi3-' + now, title: `Transaction Count`, type: 'kpi', xCol: '', yCol: '', agg: 'count', w: 4 },
      { id: 't-sale-bar-' + now, title: `Sales by Category`, type: 'bar', xCol: catCol, yCol: numCol, agg: 'sum', w: 6 },
      { id: 't-sale-trend-' + now, title: `Revenue over Time`, type: 'line', xCol: dateCol || catCol, yCol: numCol, agg: 'sum', w: 6 }
    ];
  } else if (templateName === 'marketing') {
    widgets = [
      { id: 't-mkt-kpi1-' + now, title: `Marketing Spends`, type: 'kpi', xCol: '', yCol: numCol, agg: 'sum', w: 6 },
      { id: 't-mkt-kpi2-' + now, title: `Conversion Volume`, type: 'kpi', xCol: '', yCol: '', agg: 'count', w: 6 },
      { id: 't-mkt-donut-' + now, title: `Spend Breakdown`, type: 'donut', xCol: catCol, yCol: numCol, agg: 'sum', w: 12 }
    ];
  } else if (templateName === 'operations') {
    widgets = [
      { id: 't-ops-kpi1-' + now, title: `Units Fulfilled`, type: 'kpi', xCol: '', yCol: numCol, agg: 'sum', w: 6 },
      { id: 't-ops-bar-' + now, title: `Volume by Category`, type: 'bar', xCol: catCol, yCol: numCol, agg: 'count', w: 12 }
    ];
  } else if (templateName === 'finance') {
    widgets = [
      { id: 't-fin-kpi1-' + now, title: `Financial Sum`, type: 'kpi', xCol: '', yCol: numCol, agg: 'sum', w: 3 },
      { id: 't-fin-kpi2-' + now, title: `Average Ticket`, type: 'kpi', xCol: '', yCol: numCol, agg: 'avg', w: 3 },
      { id: 't-fin-kpi3-' + now, title: `Minimum Order`, type: 'kpi', xCol: '', yCol: numCol, agg: 'min', w: 3 },
      { id: 't-fin-kpi4-' + now, title: `Maximum Order`, type: 'kpi', xCol: '', yCol: numCol, agg: 'max', w: 3 }
    ];
  } else if (templateName === 'risk') {
    widgets = [
      { id: 't-risk-kpi1-' + now, title: `Anomalies / Missing Cells`, type: 'kpi', xCol: '', yCol: '', agg: 'count', w: 6 },
      { id: 't-risk-table-' + now, title: `Risk Transactions Log`, type: 'table', xCol: '', yCol: '', agg: '', w: 12 }
    ];
  }

  dashboardWidgets = widgets;
  selectedWidgetId = null;
  renderDashboardCanvas();
  renderDashboardTab();
  showToast(`Applied ${templateName.replace('_', ' ')} template`, "success");
}

function renderManageDatasetInfo() {
  const container = document.getElementById('manage-dataset-info-list');
  if (!container) return;

  const datasetName = document.getElementById('ws-dataset-name').innerText;
  const rowCount = gridData.length.toLocaleString();
  const colCount = headers.length;
  
  const missingValCount = document.getElementById('q-stat-missing') ? parseInt(document.getElementById('q-stat-missing').innerText) || 0 : 0;
  const duplicateValCount = document.getElementById('q-stat-dups') ? parseInt(document.getElementById('q-stat-dups').innerText) || 0 : 0;
  const totalCells = gridData.length * headers.length;
  const missingPct = totalCells > 0 ? (missingValCount / totalCells) : 0;
  const dataQualityScore = Math.max(0, Math.round((1 - missingPct - (duplicateValCount / (gridData.length || 1))) * 100));

  container.innerHTML = `
    <div class="ws-info-card" style="padding: 6px 8px; margin-bottom: 0;">
      <span class="ws-info-label" style="font-size: 9px; margin-bottom: 2px;">Dataset Name</span>
      <span class="ws-info-value" style="font-size: 11.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px;" title="${datasetName}">${datasetName}</span>
    </div>
    <div class="ws-info-card" style="padding: 6px 8px; margin-bottom: 0;">
      <span class="ws-info-label" style="font-size: 9px; margin-bottom: 2px;">Total Rows</span>
      <span class="ws-info-value" style="font-size: 13px;">${rowCount}</span>
    </div>
    <div class="ws-info-card" style="padding: 6px 8px; margin-bottom: 0;">
      <span class="ws-info-label" style="font-size: 9px; margin-bottom: 2px;">Total Columns</span>
      <span class="ws-info-value" style="font-size: 13px;">${colCount}</span>
    </div>
    <div class="ws-info-card" style="padding: 6px 8px; margin-bottom: 0;">
      <span class="ws-info-label" style="font-size: 9px; margin-bottom: 2px;">Missing Values</span>
      <span class="ws-info-value ${missingValCount > 0 ? 'warning' : ''}" style="font-size: 13px;">${missingValCount}</span>
    </div>
    <div class="ws-info-card" style="padding: 6px 8px; margin-bottom: 0;">
      <span class="ws-info-label" style="font-size: 9px; margin-bottom: 2px;">Duplicate Rows</span>
      <span class="ws-info-value" style="font-size: 13px;">${duplicateValCount}</span>
    </div>
    <div class="ws-info-card" style="padding: 6px 8px; margin-bottom: 0;">
      <span class="ws-info-label" style="font-size: 9px; margin-bottom: 2px;">Data Quality Score</span>
      <span class="ws-info-value" style="font-size: 13px; color: ${dataQualityScore >= 80 ? 'var(--success)' : 'var(--warning)'};">${dataQualityScore}%</span>
    </div>
    <div class="ws-info-card" style="padding: 6px 8px; margin-bottom: 0;">
      <span class="ws-info-label" style="font-size: 9px; margin-bottom: 2px;">Last Updated</span>
      <span class="ws-info-value" style="font-size: 13px;">Just Now</span>
    </div>
  `;
}

// 11. Executive Summary Layer (report-style Section)
function renderExecutiveSummaryLayer() {
  const datasetNameEl = document.getElementById('ws-dataset-name');
  const datasetName = datasetNameEl ? datasetNameEl.innerText : 'Dataset';
  const rowCount = gridData.length.toLocaleString();
  const colCount = headers.length;
  
  const missingValCount = document.getElementById('q-stat-missing') ? parseInt(document.getElementById('q-stat-missing').innerText) || 0 : 0;
  const duplicateValCount = document.getElementById('q-stat-dups') ? parseInt(document.getElementById('q-stat-dups').innerText) || 0 : 0;
  const totalCells = gridData.length * headers.length;
  const missingPct = totalCells > 0 ? (missingValCount / totalCells) : 0;
  const dataQualityScore = Math.max(0, Math.round((1 - missingPct - (duplicateValCount / (gridData.length || 1))) * 100));

  const { findings, risks, recommendations } = runStatisticalInsights();

  const savedGrid = gridData;
  gridData = savedGrid.filter(row => isRowMatchingFilters(row));
  const kpiWidgets = dashboardWidgets.filter(w => w.type === 'kpi');
  let kpisHtml = "";
  if (kpiWidgets.length > 0) {
    kpisHtml = kpiWidgets.slice(0, 3).map(w => {
      const rawVal = getKpiValue(w);
      const valStr = formatKpiValue(rawVal, w.yCol, w.agg);
      return `
        <div class="exec-kpi-pill">
          <span class="exec-kpi-pill-val">${valStr}</span>
          <span class="exec-kpi-pill-label">${w.title}</span>
        </div>
      `;
    }).join('');
  } else {
    kpisHtml = `<div style="font-size:11px; color:var(--text-muted); padding: 4px 0;">No KPI widgets available.</div>`;
  }
  gridData = savedGrid;

  const layer = document.createElement('div');
  layer.className = 'executive-summary-layer';
  layer.id = 'executive-summary-layer';
  layer.innerHTML = `
    <div class="exec-summary-header">
      <div class="exec-summary-title">Executive Summary</div>
      <div class="exec-summary-subtitle">Automated analytics synthesis for ${datasetName}</div>
    </div>
    <div class="exec-summary-grid">
      <div class="exec-section-card">
        <span class="exec-section-title">Dataset Summary</span>
        <div class="exec-kpi-pill-grid" style="margin-bottom: 14px;">
          <div class="exec-kpi-pill">
            <span class="exec-kpi-pill-val">${rowCount}</span>
            <span class="exec-kpi-pill-label">Total Rows</span>
          </div>
          <div class="exec-kpi-pill">
            <span class="exec-kpi-pill-val">${colCount}</span>
            <span class="exec-kpi-pill-label">Columns</span>
          </div>
          <div class="exec-kpi-pill">
            <span class="exec-kpi-pill-val">${missingValCount}</span>
            <span class="exec-kpi-pill-label">Missing Cells</span>
          </div>
          <div class="exec-kpi-pill" style="border-left: 2px solid ${dataQualityScore >= 80 ? 'var(--success)' : 'var(--warning)'};">
            <span class="exec-kpi-pill-val">${dataQualityScore}%</span>
            <span class="exec-kpi-pill-label">Quality Score</span>
          </div>
        </div>

        <span class="exec-section-title">KPI Summary Highlights</span>
        <div class="exec-kpi-pill-grid">
          ${kpisHtml}
        </div>
      </div>

      <div class="exec-section-card">
        <span class="exec-section-title">Key Findings</span>
        <ul class="exec-list" style="margin-bottom: 12px;">
          ${findings.slice(0, 3).map(f => `<li class="exec-list-item">${f}</li>`).join('')}
        </ul>

        <span class="exec-section-title">Anomalies & Risks</span>
        <ul class="exec-list" style="margin-bottom: 12px;">
          ${risks.slice(0, 2).map(r => `<li class="exec-list-item warning">${r}</li>`).join('')}
        </ul>

        <span class="exec-section-title">Recommendations</span>
        <ul class="exec-list">
          ${recommendations.slice(0, 2).map(rec => `<li class="exec-list-item action">${rec}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;
  return layer;
}

// 12. Exporters center
function exportToPDF() {
  const printWindow = window.open('', '_blank');
  const doc = printWindow.document;
  
  doc.write('<html><head><title>OneClick Analytics Report</title>');
  doc.write('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap" rel="stylesheet">');
  doc.write('<style>');
  doc.write('body { font-family: "Inter", sans-serif; padding: 40px; color: #1e293b; background: #fff; }');
  doc.write('.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; }');
  doc.write('.title { font-size: 24px; font-weight: 800; color: #1e1b4b; }');
  doc.write('.meta { font-size: 12px; color: #64748b; }');
  doc.write('.section { margin-bottom: 30px; }');
  doc.write('.section-title { font-size: 16px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; color: #4f46e5; }');
  doc.write('.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }');
  doc.write('.kpi-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; background: #f8fafc; }');
  doc.write('.kpi-val { font-size: 20px; font-weight: 800; color: #0f172a; }');
  doc.write('.kpi-label { font-size: 11px; color: #64748b; margin-top: 4px; }');
  doc.write('.list { padding-left: 20px; line-height: 1.6; }');
  doc.write('.list-item { font-size: 13px; margin-bottom: 6px; }');
  doc.write('.chart-img { max-width: 100%; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 20px; }');
  doc.write('.table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }');
  doc.write('.table th, .table td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }');
  doc.write('.table th { background: #f1f5f9; }');
  doc.write('</style></head><body>');
  
  const datasetName = document.getElementById('ws-dataset-name').innerText;
  doc.write('<div class="header">');
  doc.write(`<div><div class="title">OneClick Analyst Report</div><div class="meta">Dataset: ${datasetName} &middot; Generated: ${new Date().toLocaleDateString()}</div></div>`);
  doc.write('</div>');

  const { findings, risks, recommendations } = runStatisticalInsights();
  doc.write('<div class="section">');
  doc.write('<div class="section-title">Executive Summary</div>');
  doc.write('<div class="grid-2">');
  
  doc.write('<div>');
  doc.write('<div style="font-weight:600; font-size:14px; margin-bottom:10px;">Analytical Findings</div>');
  doc.write('<ul class="list">');
  findings.forEach(f => doc.write(`<li class="list-item">${f}</li>`));
  doc.write('</ul>');
  doc.write('</div>');
  
  doc.write('<div>');
  doc.write('<div style="font-weight:600; font-size:14px; margin-bottom:10px;">Risks & Actions</div>');
  doc.write('<ul class="list">');
  risks.forEach(r => doc.write(`<li class="list-item" style="color:#b91c1c;">âš ï¸ ${r}</li>`));
  recommendations.forEach(rec => doc.write(`<li class="list-item" style="color:#15803d;">â†’ ${rec}</li>`));
  doc.write('</ul>');
  doc.write('</div>');

  doc.write('</div>');
  doc.write('</div>');

  doc.write('<div class="section">');
  doc.write('<div class="section-title">Visualizations</div>');
  doc.write('<div class="grid-2">');
  
  const savedGrid = gridData;
  gridData = savedGrid.filter(row => isRowMatchingFilters(row));
  
  dashboardWidgets.forEach(w => {
    if (w.type === 'kpi') {
      const rawVal = getKpiValue(w);
      const valStr = formatKpiValue(rawVal, w.yCol, w.agg);
      doc.write(`
        <div class="kpi-box">
          <div class="kpi-val">${valStr}</div>
          <div class="kpi-label">${w.title}</div>
        </div>
      `);
    } else if (w.type !== 'table') {
      const chartInst = activeChartInstances[w.id];
      if (chartInst) {
        const imgUrl = chartInst.toBase64Image();
        doc.write(`
          <div>
            <div style="font-size:12px; font-weight:600; margin-bottom:6px;">${w.title}</div>
            <img src="${imgUrl}" class="chart-img" />
          </div>
        `);
      }
    }
  });
  gridData = savedGrid;
  
  doc.write('</div>');
  doc.write('</div>');

  const tableWidget = dashboardWidgets.find(w => w.type === 'table');
  if (tableWidget) {
    doc.write('<div class="section">');
    doc.write('<div class="section-title">Dataset Data Details</div>');
    doc.write('<table class="table">');
    const displayHeaders = [...headers].slice(0, 8);
    doc.write('<thead><tr>' + displayHeaders.map(h => `<th>${headerNames[h] || h}</th>`).join('') + '</tr></thead>');
    doc.write('<tbody>');
    gridData.slice(0, 15).forEach(row => {
      doc.write('<tr>' + displayHeaders.map(h => `<td>${getRowValueByHeader(row, h) || ""}</td>`).join('') + '</tr>');
    });
    doc.write('</tbody></table>');
    doc.write('</div>');
  }

  doc.write('</body></html>');
  doc.close();
  
  printWindow.onload = () => {
    printWindow.print();
  };
}

function exportToWord() {
  const datasetName = document.getElementById('ws-dataset-name').innerText;
  const { findings, risks, recommendations } = runStatisticalInsights();
  
  let html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>`;
  html += `<head><title>OneClick Analytics Report</title><style>`;
  html += `body { font-family: Arial, sans-serif; padding: 20px; }`;
  html += `h1 { color: #4f46e5; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }`;
  html += `h2 { color: #1e1b4b; border-bottom: 1px solid #e2e8f0; margin-top: 20px; }`;
  html += `ul { margin: 10px 0; padding-left: 20px; }`;
  html += `li { margin-bottom: 6px; }`;
  html += `</style></head><body>`;
  html += `<h1>OneClick Analyst Report</h1>`;
  html += `<p><strong>Dataset Name:</strong> ${datasetName}<br/><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>`;
  
  html += `<h2>Executive Summary</h2>`;
  html += `<h3>Key Findings</h3><ul>`;
  findings.forEach(f => { html += `<li>${f}</li>`; });
  html += `</ul>`;
  
  html += `<h3>Risks & Anomalies</h3><ul>`;
  risks.forEach(r => { html += `<li>âš ï¸ ${r}</li>`; });
  html += `</ul>`;
  
  html += `<h3>Strategic Recommendations</h3><ul>`;
  recommendations.forEach(rec => { html += `<li>â†’ ${rec}</li>`; });
  html += `</ul>`;
  
  html += `<h2>Key Metrics Summary</h2>`;
  const savedGrid = gridData;
  gridData = savedGrid.filter(row => isRowMatchingFilters(row));
  dashboardWidgets.forEach(w => {
    if (w.type === 'kpi') {
      const rawVal = getKpiValue(w);
      const valStr = formatKpiValue(rawVal, w.yCol, w.agg);
      html += `<p><strong>${w.title}:</strong> ${valStr}</p>`;
    }
  });
  gridData = savedGrid;

  html += `</body></html>`;
  
  const blob = new Blob([html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${datasetName.split('.')[0]}_report.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Word Report downloaded!", "success");
}

function exportToPPTX() {
  showToast("Generating PowerPoint deck...", "info");
  const script = document.createElement('script');
  script.src = "https://cdn.jsdelivr.net/gh/gitbrent/PptxGenJS@3.12.0/dist/pptxgen.bundle.js";
  script.onload = () => {
    try {
      const pptx = new PptxGenJS();
      const datasetName = document.getElementById('ws-dataset-name').innerText;
      const { findings, risks, recommendations } = runStatisticalInsights();

      // Slide 1: Title
      const slide1 = pptx.addSlide();
      slide1.background = { color: "1E1B4B" };
      slide1.addText("OneClick Dashboard Analytics Report", { x: 0.5, y: 1.8, w: 9, h: 1, fontSize: 32, bold: true, color: "FFFFFF" });
      slide1.addText(`Dataset: ${datasetName}\nGenerated: ${new Date().toLocaleDateString()}`, { x: 0.5, y: 3.0, w: 9, h: 1, fontSize: 16, color: "94A3B8" });

      // Slide 2: Key Findings
      const slide2 = pptx.addSlide();
      slide2.addText("Key Findings", { x: 0.5, y: 0.5, fontSize: 22, bold: true, color: "4F46E5" });
      slide2.addText(findings.join("\n\n"), { x: 0.5, y: 1.2, w: 9, h: 4.5, fontSize: 14, color: "1E293B" });

      // Slide 3: Risks & Recommendations
      const slide3 = pptx.addSlide();
      slide3.addText("Risks & Recommendations", { x: 0.5, y: 0.5, fontSize: 22, bold: true, color: "B91C1C" });
      const riskText = "Risks:\n" + risks.map(r => `• ${r}`).join("\n") + "\n\nRecommendations:\n" + recommendations.map(rec => `• ${rec}`).join("\n");
      slide3.addText(riskText, { x: 0.5, y: 1.2, w: 9, h: 4.5, fontSize: 14, color: "1E293B" });

      // Slide 4: Charts
      const slide4 = pptx.addSlide();
      slide4.addText("Key Visuals Summary", { x: 0.5, y: 0.5, fontSize: 22, bold: true, color: "4F46E5" });
      
      let yOffset = 1.2;
      const savedGrid = gridData;
      gridData = savedGrid.filter(row => isRowMatchingFilters(row));
      dashboardWidgets.forEach((w, idx) => {
        if (idx < 4) {
          if (w.type === 'kpi') {
            const rawVal = getKpiValue(w);
            const valStr = formatKpiValue(rawVal, w.yCol, w.agg);
            slide4.addText(`${w.title}: ${valStr}`, { x: 0.5, y: yOffset, w: 4.5, h: 0.4, fontSize: 13, bold: true });
            yOffset += 0.5;
          } else if (w.type !== 'table') {
            const chartInst = activeChartInstances[w.id];
            if (chartInst) {
              slide4.addImage({ data: chartInst.toBase64Image(), x: 5.2, y: 1.2, w: 4.2, h: 3.5 });
            }
          }
        }
      });
      gridData = savedGrid;

      pptx.writeFile({ fileName: `${datasetName.split('.')[0]}_presentation.pptx` }).then(() => {
        showToast("PowerPoint exported!", "success");
      });
    } catch (err) {
      showToast("PPTX export failed: " + err.message, "error");
    }
  };
  script.onerror = () => {
    showToast("Failed to load PPTX deck builder", "error");
  };
  document.head.appendChild(script);
}

function exportToPNG() {
  showToast("Generating PNG snapshot...", "info");
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
  script.onload = () => {
    const element = document.getElementById('dashboard-canvas');
    if (!element) {
      showToast("Dashboard canvas element not found", "error");
      return;
    }
    html2canvas(element, { backgroundColor: "#0b0f19", logging: false, scale: 2 }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const datasetName = document.getElementById('ws-dataset-name').innerText;
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `${datasetName.split('.')[0]}_snapshot.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("PNG Snapshot downloaded!", "success");
    }).catch(err => {
      showToast("PNG export failed: " + err.message, "error");
    });
  };
  script.onerror = () => {
    showToast("Failed to load PNG screenshot capture library", "error");
  };
  document.head.appendChild(script);
}

function exportCSVSnapshot() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += headers.map(h => headerNames[h] || h).join(",") + "\n";
  
  gridData.forEach(row => {
    if (isRowMatchingFilters(row)) {
      csvContent += row.map(val => {
        const cleaned = String(val).replace(/"/g, '""');
        return cleaned.includes(",") ? `"${cleaned}"` : cleaned;
      }).join(",") + "\n";
    }
  });

  const datasetName = document.getElementById('ws-dataset-name').innerText;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${datasetName.split('.')[0]}_filtered_snapshot.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("CSV Snapshot downloaded!", "success");
}


// 13. Render Overrides for Tabs
function renderDashboardTab() {
  const { score, checklist } = calculateDashboardQuality();
  const scoreRadial = document.getElementById('quality-score-radial');
  if (scoreRadial) {
    scoreRadial.innerHTML = `${score}<div>Score</div>`;
    if (score >= 80) {
      scoreRadial.style.borderColor = 'var(--success)';
      scoreRadial.style.color = 'var(--success)';
    } else if (score >= 50) {
      scoreRadial.style.borderColor = 'var(--warning)';
      scoreRadial.style.color = 'var(--warning)';
    } else {
      scoreRadial.style.borderColor = 'var(--error)';
      scoreRadial.style.color = 'var(--error)';
    }
  }

  const checklistContainer = document.getElementById('quality-checklist-container');
  if (checklistContainer) {
    checklistContainer.innerHTML = checklist.map(item => {
      const cls = item.passed ? 'passed' : 'warning';
      const indicator = item.passed ? '✓' : '⚠️';
      return `
        <div class="checklist-item ${cls}">
          <span>${indicator}</span>
          <span>${esc(item.title)}</span>
        </div>
      `;
    }).join('');
  }

  updateOverviewStats();
  renderStructureTab();

  const wizardGrid = document.getElementById('visual-creation-cards-grid');
  const wizardContainer = document.getElementById('visual-wizard-container');
  if (wizardGrid && wizardContainer) {
    if (wizardState.active) {
      wizardGrid.style.display = 'none';
      wizardContainer.style.display = 'flex';
      renderWizardStep();
    } else {
      wizardGrid.style.display = 'grid';
      wizardContainer.style.display = 'none';
    }
  }

  bindWizardEvents();
  bindQuickActions();
}

function renderExploreTab() {
  renderGlobalFiltersV3();
  renderDrillHierarchiesList();
  initDrillColChecklist();
  updateDrillStatus();
  renderCalcFieldsList();
  initCalcFieldHelpers();
  bindFormulaOperators();
}

const _origRenderInsightsTab = renderInsightsTab;
renderInsightsTab = function() {
  _origRenderInsightsTab();
  
  const containerFindings = document.getElementById('insights-findings-container');
  const containerRisks = document.getElementById('insights-risks-container');
  const containerOpps = document.getElementById('insights-opps-container');
  const containerRecs = document.getElementById('insights-recs-container');

  if (!containerFindings || !containerRisks || !containerOpps || !containerRecs) return;

  const { findings, risks, opportunities, recommendations } = runStatisticalInsights();

  containerFindings.innerHTML = findings.map(f => `
    <div class="viz-insight-card">
      <div class="viz-insight-title">✓ Key Finding</div>
      <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">${esc(f)}</div>
  `).join('');

  containerRisks.innerHTML = risks.map(r => `
    <div class="viz-insight-card" style="border-left: 3px solid var(--error);">
      <div class="viz-insight-title" style="color:var(--error);">⚠️ Risk Detected</div>
      <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">${esc(r)}</div>
    </div>
  `).join('');

  containerOpps.innerHTML = opportunities.map(o => `
    <div class="viz-insight-card" style="border-left: 3px solid var(--success);">
      <div class="viz-insight-title" style="color:var(--success);">✨ Opportunity</div>
      <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">${esc(o)}</div>
    </div>
  `).join('');

  containerRecs.innerHTML = recommendations.map(rec => `
    <div class="viz-insight-card" style="border-left: 3px solid var(--primary);">
      <div class="viz-insight-title" style="color:var(--primary);">→ Action Item</div>
      <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;">${esc(rec)}</div>
    </div>
  `).join('');
};

function renderManageTab() {
  if (!gridData || gridData.length === 0) return;

  renderManageSavedDashboards();

  const saveBtn = document.getElementById('btn-manage-save-dash');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const nameInput = document.getElementById('manage-save-name-input');
      const name = nameInput ? nameInput.value.trim() : "";
      if (!name) { alert("Please enter a dashboard name."); return; }
      const key = saveDashboardToStorage(name);
      if (key) {
        showToast("Dashboard saved!", "success");
        if (nameInput) nameInput.value = "";
        renderManageSavedDashboards();
      }
    };
  }

  const saveTemplateBtn = document.getElementById('btn-manage-save-template');
  if (saveTemplateBtn) {
    saveTemplateBtn.onclick = () => {
      const nameInput = document.getElementById('manage-save-name-input');
      const name = nameInput ? nameInput.value.trim() : "Template";
      const key = saveDashboardToStorage(`Template_${name}`);
      if (key) {
        showToast("Saved dashboard as template!", "success");
        renderManageSavedDashboards();
      }
    };
  }

  const updateExistingBtn = document.getElementById('btn-manage-update-existing');
  if (updateExistingBtn) {
    updateExistingBtn.onclick = () => {
      if (typeof performSaveWorkspace === 'function') {
        performSaveWorkspace().then(() => {
          showToast("Workspace database updated!", "success");
        });
      }
    };
  }

  bindExportActions();

  document.querySelectorAll('#viztab-manage [data-template]').forEach(card => {
    card.onclick = () => {
      const templateName = card.dataset.template;
      if (confirm(`Apply prebuilt template "${templateName.toUpperCase()}"? This will replace all current widgets.`)) {
        applyPrebuiltTemplate(templateName);
      }
    };
  });

  renderManageDatasetInfo();
}

window.switchVizTab = function(tabName) {
  activeVizTab = tabName;
  
  document.querySelectorAll('.viz-tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabName) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  document.querySelectorAll('.viz-tab-content').forEach(content => {
    content.style.display = content.id === `viztab-${tabName}` ? 'block' : 'none';
  });

  initVizAccordions();

  if (tabName === 'dashboard') renderDashboardTab();
  else if (tabName === 'explore') renderExploreTab();
  else if (tabName === 'insights') renderInsightsTab();
  else if (tabName === 'manage') renderManageTab();
};

document.querySelectorAll('.viz-tab-btn').forEach(function(btn) {
  btn.onclick = function() { window.switchVizTab(btn.dataset.tab); };
});

window.switchToDashboardView = switchToDashboardView;
window.switchToSheetView = switchToSheetView;
