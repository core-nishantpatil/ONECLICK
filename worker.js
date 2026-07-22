// OneClick v3 — Background Web Worker

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

// detect column type by checking first 100 values
function detectColumnType(gridData, headers, colKey) {
  const colIdx = headers.indexOf(colKey);
  if (colIdx === -1) return 'text';
  let numericCount = 0;
  let validCount = 0;
  const scanLimit = Math.min(gridData.length, 100);
  for (let r = 0; r < scanLimit; r++) {
    const val = String(gridData[r][colIdx] || "").trim();
    if (val !== "") {
      validCount++;
      if (!isNaN(parseFloat(val.replace(/[$,%]/g, "")))) {
        numericCount++;
      }
    }
  }
  if (validCount > 0 && (numericCount / validCount) > 0.8) {
    return 'number';
  }
  return 'text';
}

// 1. Data Quality Scanner Engine
function runQualityScan(gridData, headers, duplicateCheckColsList) {
  const totalRows = gridData.length;
  const totalCols = headers.length;
  const totalCells = totalRows * totalCols;

  if (totalCells === 0) return null;

  const results = {
    missingValues: {}, // colKey -> { count, pct, list: [rowIndices] }
    duplicates: [],     // List of duplicate row indices
    typeIssues: {},    // colKey -> { detectedType, confidence, issues: [ { rIdx, val } ] }
    outliers: {},      // colKey -> { count, list: [rowIndices], bounds, Q1, Q3, IQR }
    totalMissing: 0,
    totalTypeIssues: 0,
    totalOutliers: 0
  };

  // 1. Scan Missing Values and Type Issues
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
  const dupCheckCols = duplicateCheckColsList && duplicateCheckColsList.length > 0 ? duplicateCheckColsList : headers;
  const seenRows = new Map();
  const colIndices = dupCheckCols.map(h => headers.indexOf(h)).filter(idx => idx !== -1);
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

  return results;
}

// 2. Column statistics calculation
function calculateColumnStats(gridData, headers, colKey, viewIndices) {
  const colIndex = headers.indexOf(colKey);
  if (colIndex === -1) return null;

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

  const detectedType = detectColumnType(gridData, headers, colKey);

  if (cleanValues.length > 0 && (detectedType === 'number' || cleanValues.some(v => !isNaN(parseFloat(v.replace(/[$,%]/g, "")))))) {
    const nums = cleanValues.map(v => parseFloat(String(v).replace(/[$,%]/g, ""))).filter(n => !isNaN(n));
    if (nums.length > 0) {
      nums.sort((a, b) => a - b);
      const min = nums[0];
      const max = nums[nums.length - 1];
      const sum = nums.reduce((s, n) => s + n, 0);
      const avg = sum / nums.length;

      // Median
      const midIdx = Math.floor(nums.length / 2);
      const median = nums.length % 2 !== 0 ? nums[midIdx] : (nums[midIdx - 1] + nums[midIdx]) / 2;

      // Std Dev
      const sqDiffSum = nums.reduce((s, n) => s + Math.pow(n - avg, 2), 0);
      const stdDev = Math.sqrt(sqDiffSum / nums.length);

      // IQR & Outliers
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

      stats.numericStats = {
        min,
        max,
        avg,
        median,
        stdDev,
        outlierCount
      };
    }
  } else if (detectedType === 'date') {
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

  return stats;
}

// 3. Correlation analysis calculation
function calculateCorrelation(gridData, headers, numericCols) {
  const n = gridData.length;
  if (n < 2 || numericCols.length < 2) return null;

  const colIndices = numericCols.map(c => headers.indexOf(c));
  const numericData = colIndices.map(idx => {
    return gridData.map(row => {
      const val = row[idx];
      const parsed = parseFloat(String(val).replace(/[$,%]/g, "").trim());
      return isNaN(parsed) ? 0 : parsed;
    });
  });

  const matrix = {};
  numericCols.forEach(c => matrix[c] = {});

  // Compute means
  const means = numericData.map(arr => arr.reduce((s, x) => s + x, 0) / n);

  // Compute standard deviations and Pearson correlation coefficient
  for (let i = 0; i < numericCols.length; i++) {
    for (let j = i; j < numericCols.length; j++) {
      const colA = numericCols[i];
      const colB = numericCols[j];

      if (i === j) {
        matrix[colA][colB] = 1.0;
        continue;
      }

      const dataA = numericData[i];
      const dataB = numericData[j];
      const meanA = means[i];
      const meanB = means[j];

      let num = 0;
      let denA = 0;
      let denB = 0;

      for (let r = 0; r < n; r++) {
        const diffA = dataA[r] - meanA;
        const diffB = dataB[r] - meanB;
        num += diffA * diffB;
        denA += diffA * diffA;
        denB += diffB * diffB;
      }

      const den = Math.sqrt(denA * denB);
      const coeff = den === 0 ? 0 : num / den;
      matrix[colA][colB] = parseFloat(coeff.toFixed(4));
      matrix[colB][colA] = matrix[colA][colB];
    }
  }

  return matrix;
}

// Web Worker message listener
self.onmessage = function(e) {
  const { action, id, gridData, headers, duplicateCheckColsList, colKey, viewIndices, numericCols } = e.data;
  
  try {
    let result = null;
    if (action === 'runQualityScan') {
      result = runQualityScan(gridData, headers, duplicateCheckColsList);
    } else if (action === 'calculateColumnStats') {
      result = calculateColumnStats(gridData, headers, colKey, viewIndices);
    } else if (action === 'calculateCorrelation') {
      result = calculateCorrelation(gridData, headers, numericCols);
    }
    
    self.postMessage({ id, success: true, result });
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message });
  }
};
