// OneClick v3 — Utilities Module

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
    case 'text': return 'ðŸ”¤';
    case 'number': return 'ðŸ”¢';
    case 'currency': return 'ðŸ’°';
    case 'date': return 'ðŸ“…';
    case 'percentage': return 'ðŸ“Š';
    default: return 'ðŸ”¤';
  }
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
  return `${days}d ago`;
}

// Layer 1: Semantic Understanding - profile individual columns
function getColumnSemanticRole(colKey) {
  const name = (headerNames[colKey] || colKey).toLowerCase().trim();
  const colIdx = headers.indexOf(colKey);
  const totalRows = gridData.length;

  const idTerms = [
    "customer id", "order id", "transaction id", "employee id", "contact number", 
    "phone", "mobile", "account number", "reference number", "invoice number", 
    "customer_id", "order_id", "transaction_id", "employee_id", "account_no", 
    "contact_no", "contactno", "phoneno", "phone_no", "mobileno", "mobile_no", 
    "ref_no", "refno", "invoice_no", "invoiceno"
  ];
  
  const isIdTerm = idTerms.some(term => name.includes(term)) || 
                   name === "id" || 
                   name.split(/[^a-z0-9]/).includes("id") ||
                   name.endsWith(" id") || 
                   name.startsWith("id ");

  if (isIdTerm) {
    return "identifier";
  }

  const detectedType = detectColumnType(colKey);
  
  let uniqueVals = new Set();
  let numericCount = 0;
  let emptyCount = 0;
  let booleanCount = 0;
  
  const scanLimit = Math.min(totalRows, 100);
  for (let r = 0; r < scanLimit; r++) {
    const val = String(gridData[r][colIdx] || "").trim();
    if (val === "") {
      emptyCount++;
    } else {
      uniqueVals.add(val);
      if (!isNaN(parseFloat(val))) numericCount++;
      const valLower = val.toLowerCase();
      if (valLower === "true" || valLower === "false" || valLower === "yes" || valLower === "no" || val === "0" || val === "1") {
        booleanCount++;
      }
    }
  }

  const validCount = scanLimit - emptyCount;
  const uniqueRatio = validCount > 0 ? (uniqueVals.size / validCount) : 0;
  const isNumeric = validCount > 0 && (numericCount / validCount) > 0.8;
  const isBoolean = validCount > 0 && (booleanCount / validCount) > 0.9 && uniqueVals.size <= 2;

  if (detectedType === 'date' || name.includes('date') || name.includes('time') || name.includes('timestamp') || name.includes('year') || name.includes('month') || name.includes('day')) {
    return "temporal_dimension";
  }

  if (isBoolean || name.startsWith("is_") || name.startsWith("has_") || (name === "status" && uniqueVals.size <= 2)) {
    return "boolean_attribute";
  }

  if (name.includes('city') || name.includes('state') || name.includes('country') || name.includes('region') || name.includes('branch') || name.includes('location') || name.includes('postal') || name.includes('zip')) {
    return "geographic_dimension";
  }

  if (isNumeric || detectedType === 'currency' || detectedType === 'percentage') {
    const financialTerms = ["revenue", "sales", "profit", "salary", "cost", "expense", "spent", "price", "income", "wages", "amount", "budget", "turnover", "payout", "earnings"];
    const isFinancial = financialTerms.some(term => name.includes(term));
    if (isFinancial) {
      return "financial_metric";
    }
    return "quantitative_metric";
  }

  if (uniqueRatio < 0.35 && uniqueVals.size <= 20) {
    return "categorical_dimension";
  }

  return "text_attribute";
}

function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
window.escapeHTML = escapeHTML;

// ─── Loading Overlay Safety Timeout ─────────────────────────────────────────
// If loading gets stuck (JS error prevents hideLoading call), auto-dismiss after 15s
let _loadingTimeoutId = null;
const _origShowLoading = showLoading;
showLoading = function(title, subtitle, percent) {
  _origShowLoading(title, subtitle, percent);
  clearTimeout(_loadingTimeoutId);
  _loadingTimeoutId = setTimeout(() => {
    if (loadingOverlay && loadingOverlay.classList.contains('open')) {
      console.warn('[OneClick] Loading overlay auto-dismissed after 15s timeout');
      hideLoading();
    }
  }, 15000);
};
const _origHideLoading = hideLoading;
hideLoading = function() {
  _origHideLoading();
  clearTimeout(_loadingTimeoutId);
  _loadingTimeoutId = null;
};
// ─────────────────────────────────────────────────────────────────────────────
