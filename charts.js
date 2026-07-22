// OneClick v3 — Charts rendering and aggregates module

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
  const esc = window.escapeHTML || (x => String(x === null || x === undefined ? '' : x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;'));
  const canvas = document.getElementById('dashboard-canvas');
  if (!canvas) return;

  const canvasWidth = canvas.clientWidth;

  canvas.innerHTML = "";

  if (dashboardWidgets.length === 0) {
    canvas.innerHTML = `
      <div style="grid-column: span 12; text-align: center; padding: 80px 40px; color: var(--text-muted);">
        <div style="font-size: 48px; margin-bottom: 16px;">ðŸ“Š</div>
        <div style="font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Your dashboard is empty</div>
        <div style="font-size: 13px; margin-bottom: 24px;">Create widgets or use Auto-Draft to generate a smart layout from your data.</div>
        <button class="ccm-btn ccm-btn-primary" id="btn-empty-canvas-add" style="margin: 0 auto;">âž• Add Widget</button>
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
        <span class="viz-widget-title" title="${esc(widget.title)}">${esc(widget.title)}</span>
        <div class="viz-widget-actions">
          <button class="viz-widget-btn btn-widget-edit" title="Edit Widget">âš™ï¸</button>
          <button class="viz-widget-btn delete btn-widget-delete" title="Delete Widget">ðŸ—‘ï¸</button>
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
            trendHtml = `<span class="viz-kpi-trend up">â†‘ ${change.toFixed(1)}%</span>`;
          } else {
            trendHtml = `<span class="viz-kpi-trend down">â†“ ${Math.abs(change).toFixed(1)}%</span>`;
          }
        }
      }

      // Pick a contextual icon for this KPI
      const kpiIconMap = [
        [/revenue|sales|income|amount|spend/i, 'ðŸ’°'],
        [/profit|margin/i, 'ðŸ“ˆ'],
        [/unit|quantity|volume/i, 'ðŸ“¦'],
        [/order|transaction/i, 'ðŸ§¾'],
        [/customer|client|user/i, 'ðŸ‘¤'],
        [/category|product|brand|segment/i, 'ðŸ·ï¸'],
        [/region|country|city|state/i, 'ðŸŒ'],
        [/count|total|records/i, 'ðŸ”¢'],
        [/avg|average|mean/i, 'âš–ï¸'],
      ];
      let kpiIcon = 'ðŸ“Š';
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
          <span class="viz-kpi-label">${aggLabel} Â· ${colLabel}</span>
          <div class="viz-kpi-value">${esc(valStr)}</div>
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
      let ths = displayHeaders.map(h => `<th>${esc(headerNames[h] || (calculatedFields[h] && calculatedFields[h].title) || h)}</th>`).join('');
      let trs = filteredRows.slice(0, 20).map(row => {
        let tds = displayHeaders.map(h => {
          const v = getRowValueByHeader(row, h);
          return `<td title="${esc(v)}">${esc(v !== null && v !== undefined ? v : "")}</td>`;
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
  if (typeof autoSaveActiveWorkspace === 'function') {
    autoSaveActiveWorkspace(false);
  }
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

  switchVizTab('dashboard');
  document.querySelectorAll('#viztab-dashboard .viz-accordion-item').forEach(el => {
    if (el.id === 'acc-widget-settings') el.classList.add('active');
    else el.classList.remove('active');
  });

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

window.downloadChatChartPng = function(chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  try {
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `oneclick_chart_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast("PNG downloaded successfully!", "success");
  } catch(e) {
    showToast("Download failed: " + e.message, "error");
  }
};

window.downloadChatChartSvg = function(chartId) {
  showToast("SVG export is not supported for canvas elements. Downloading PNG instead.", "info");
  window.downloadChatChartPng(chartId);
};

window.downloadChatChartPdf = function(chartId) {
  showToast("PDF report triggered from export.", "info");
  if (typeof generateExecutivePDFReport === 'function') {
    generateExecutivePDFReport();
  } else {
    window.print();
  }
};

window.copyChatChartInsight = function(chartId) {
  const canvas = document.getElementById(chartId);
  if (!canvas) return;
  const title = canvas.closest('.ai-chart-wrapper-card')?.querySelector('.ai-chart-card-title')?.innerText || "Chart Insight";
  navigator.clipboard.writeText(`OneClick Chart: ${title}`);
  showToast("Chart info copied to clipboard!", "success");
};

function executeChartCommand(plan) {
  const title = `${headerNames[plan.yCol] || plan.yCol} by ${headerNames[plan.xCol] || plan.xCol}`;
  const cfg = { type: plan.chartType, xCol: plan.xCol, yCol: plan.yCol, label: title };
  window.renderChatChart(cfg);
  logActivity('Create Chart', `Rendered chart in chat for ${title}.`, 'Success');
}

window.setAiPrompt = function(promptText) {
  const input = document.getElementById('ai-prompt-input');
  if (input) {
    input.value = promptText;
    input.focus();
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
    handleAiPromptSubmit();
  }
};


