// OneClick v3 — AI Analyst Copilot dialog interface and classification engine


/* ==================== ONECLICK UNIVERSAL DATA INTELLIGENCE LAYER (DIL) ==================== */



// Base vocabulary of business terms (Layer 4)
const BASE_SYNONYM_VOCABULARY = {
  financial_metric: ["revenue", "sales", "turnover", "profit", "income", "salary", "wages", "pay", "cost", "expense", "spent", "expenditure", "bill", "invoice"],
  quantitative_metric: ["quantity", "qty", "volume", "units", "count", "amount", "score", "clicks", "impressions"],
  geographic_dimension: ["location", "region", "state", "city", "country", "branch", "site", "address"],
  temporal_dimension: ["date", "time", "year", "month", "quarter", "timestamp", "period"],
  customer_entity: ["customer", "client", "buyer", "consumer", "patron", "patient"],
  product_entity: ["product", "item", "sku", "goods", "merchandise"],
  employee_entity: ["employee", "staff", "associate", "worker", "member"]
};


function profileColumnSemantics(colKey) {
  const role = getColumnSemanticRole(colKey);
  const name = headerNames[colKey] || colKey;
  let type = "text";
  
  if (role === "identifier") type = "identifier";
  else if (role === "financial_metric" || role === "quantitative_metric") type = "numeric";
  else if (role === "temporal_dimension") type = "temporal";
  else if (role === "geographic_dimension") type = "geographic";
  else if (role === "boolean_attribute") type = "boolean";

  return { 
    colKey, 
    name, 
    type, 
    semantic_role: role, 
    possible_meanings: [role.replace("_", " ")], 
    confidence: 0.99 
  };
}

function inferDatasetDomain(semantics) {
  let scores = {
    hr: 0,
    healthcare: 0,
    transactions: 0,
    inventory: 0,
    marketing: 0
  };

  semantics.forEach(sem => {
    const role = sem.semantic_role;
    const name = sem.name.toLowerCase();

    if ((role === "identifier" && (name.includes('emp') || name.includes('staff'))) || name.includes('dept') || name.includes('department') || name.includes('salary') || name.includes('hire') || name.includes('job')) {
      scores.hr += 1.5;
    }
    if ((role === "identifier" && (name.includes('pat') || name.includes('medical') || name.includes('patient'))) || name.includes('diagnosis') || name.includes('patient') || name.includes('treatment') || name.includes('sickness') || name.includes('visit') || name.includes('doctor')) {
      scores.healthcare += 1.5;
    }
    if ((role === "identifier" && (name.includes('cust') || name.includes('buyer') || name.includes('prod') || name.includes('sku') || name.includes('order') || name.includes('trans'))) || name.includes('revenue') || name.includes('sales') || name.includes('price') || name.includes('quantity') || name.includes('order') || name.includes('spent')) {
      scores.transactions += 1.2;
    }
    if (name.includes('stock') || name.includes('warehouse') || name.includes('inventory') || name.includes('supplier') || name.includes('bin') || name.includes('qty')) {
      scores.inventory += 1.0;
    }
    if (name.includes('campaign') || name.includes('click') || name.includes('impression') || name.includes('lead') || name.includes('channel') || name.includes('ad')) {
      scores.marketing += 1.0;
    }
  });

  let bestDomain = "Custom Domain";
  let maxScore = 0;
  
  Object.entries(scores).forEach(([dom, score]) => {
    if (score > maxScore) {
      maxScore = score;
      bestDomain = dom;
    }
  });

  if (maxScore < 1.0) {
    return { name: "Custom Business Domain", confidence: 0.8 };
  }

  const domainNames = {
    hr: "Human Resources",
    healthcare: "Healthcare Administration",
    transactions: "Transactions / Commercial Retail",
    inventory: "Logistics & Inventory",
    marketing: "Marketing Campaigns"
  };

  const confidence = Math.min(0.99, 0.70 + (maxScore * 0.05));
  return { name: domainNames[bestDomain], confidence };
}

function buildDatasetOntology(semantics) {
  const ontology = { entities: [], metrics: [], dimensions: [], dates: [] };

  semantics.forEach(sem => {
    const key = sem.colKey;
    const role = sem.semantic_role;

    if (role === "identifier") {
      ontology.entities.push({ colKey: key, role });
    } else if (role === "financial_metric" || role === "quantitative_metric") {
      ontology.metrics.push({ colKey: key, role });
    } else if (role === "temporal_dimension") {
      ontology.dates.push({ colKey: key, role });
    } else if (role === "geographic_dimension" || role === "categorical_dimension" || role === "text_attribute" || role === "boolean_attribute") {
      ontology.dimensions.push({ colKey: key, role });
    }
  });

  return ontology;
}

// Layer 16: Relationship Discovery Engine
function buildDatasetRelationships(ontology) {
  const nodes = [];
  const edges = [];
  const cardinality = {};

  // Add all entities and columns as nodes
  headers.forEach(h => {
    nodes.push({ id: h, label: headerNames[h] || h });
  });

  // Infer edges based on semantics
  const primaryEntity = ontology.entities[0]?.colKey;

  if (primaryEntity) {
    headers.forEach(h => {
      if (h !== primaryEntity) {
        edges.push({ from: primaryEntity, to: h, type: "attribute" });
        cardinality[`${primaryEntity}->${h}`] = "one-to-many";
      }
    });
  }

  // Domain-specific structural overrides
  if (currentDatasetDomain.name === "Human Resources") {
    const deptCol = headers.find(h => h.toLowerCase().includes('dept') || h.toLowerCase().includes('department'));
    const empCol = ontology.entities.find(e => e.role === "entity_identifier_employee")?.colKey;
    if (deptCol && empCol) {
      edges.push({ from: deptCol, to: empCol, type: "parent-child" });
      cardinality[`${deptCol}->${empCol}`] = "one-to-many";
    }
  } else if (currentDatasetDomain.name === "Transactions / Commercial Retail") {
    const custCol = ontology.entities.find(e => e.role === "entity_identifier_customer")?.colKey;
    const prodCol = ontology.entities.find(e => e.role === "entity_identifier_product")?.colKey;
    const revCol = ontology.metrics.find(m => m.role === "financial_metric")?.colKey;

    if (custCol && prodCol) {
      edges.push({ from: custCol, to: prodCol, type: "many-to-many" });
    }
    if (prodCol && revCol) {
      edges.push({ from: prodCol, to: revCol, type: "has-metric" });
    }
  }

  currentDatasetGraph = { nodes, edges, cardinality, confidence: 0.90 };
}

// Layer 4: Dynamic Synonym Engine
function initializeSynonymEngine(ontology) {
  const synonyms = {};

  // Initialize synonyms using local column labels
  headers.forEach(colKey => {
    const name = (headerNames[colKey] || colKey).toLowerCase();
    synonyms[name] = colKey;
    
    // Add tokenized subparts
    name.split(/[\s_-]+/).forEach(token => {
      if (token.length > 2) {
        if (!synonyms[token]) synonyms[token] = colKey;
      }
    });
  });

  // Overlay common business vocabulary synonyms mapping
  Object.entries(BASE_SYNONYM_VOCABULARY).forEach(([roleType, searchKeys]) => {
    // Find matching columns from ontology
    let targetCols = [];
    if (roleType === "financial_metric") {
      targetCols = ontology.metrics.filter(m => m.role === "financial_metric");
    } else if (roleType === "quantitative_metric") {
      targetCols = ontology.metrics.filter(m => m.role === "quantitative_metric");
    } else if (roleType === "geographic_dimension") {
      targetCols = ontology.dimensions.filter(d => d.role === "geographic_dimension");
    } else if (roleType === "temporal_dimension") {
      targetCols = ontology.dates;
    } else if (roleType === "customer_entity") {
      targetCols = ontology.entities.filter(e => e.role === "entity_identifier_customer");
    } else if (roleType === "product_entity") {
      targetCols = ontology.entities.filter(e => e.role === "entity_identifier_product");
    } else if (roleType === "employee_entity") {
      targetCols = ontology.entities.filter(e => e.role === "entity_identifier_employee");
    }

    if (targetCols.length > 0) {
      const primaryTarget = targetCols[0].colKey;
      searchKeys.forEach(key => {
        if (!synonyms[key]) {
          synonyms[key] = primaryTarget;
        }
      });
    }
  });

  currentDatasetSynonyms = synonyms;
}

// DIL Orchestration trigger
function analyzeDatasetIntelligence() {
  if (!gridData || gridData.length === 0) return;

  const semantics = headers.map(h => profileColumnSemantics(h));
  currentDatasetDomain = inferDatasetDomain(semantics);
  currentDatasetOntology = buildDatasetOntology(semantics);
  initializeSynonymEngine(currentDatasetOntology);
  buildDatasetRelationships(currentDatasetOntology);

  updateCopilotHeaderDetails();
}

// Override updateCurrentDatasetContext
const _origUpdateCurrentDatasetContext = updateCurrentDatasetContext;
updateCurrentDatasetContext = function() {
  _origUpdateCurrentDatasetContext();
  analyzeDatasetIntelligence();
};

/* Layer 13: Entity Recognition Engine */
function extractEntitiesFromPrompt(prompt) {
  const normalized = prompt.toLowerCase().trim();
  const entities = [];
  const dimensions = [];
  const filters = [];
  const dates = [];

  // 1. Identify specific numeric identifiers (e.g. Customer 1024 or Patient 55)
  const idCol = currentDatasetOntology.entities[0]?.colKey;
  if (idCol) {
    const numMatch = normalized.match(/\b\d{3,6}\b/);
    if (numMatch) {
      const entityVal = numMatch[0];
      const entityLabel = headerNames[idCol] || idCol;
      entities.push({
        entity_type: entityLabel.toLowerCase(),
        entity_value: entityVal,
        colKey: idCol
      });
      filters.push({ colKey: idCol, op: "eq", value: entityVal });
    }
  }

  // 2. Identify explicit categorical dimension values
  currentDatasetOntology.dimensions.forEach(dim => {
    const colIdx = headers.indexOf(dim.colKey);
    if (colIdx === -1) return;

    // Scan uniques (using mapped column statistics from context)
    const stats = currentDatasetContext.columnStatistics[dim.colKey];
    if (stats && stats.uniqueValues) {
      stats.uniqueValues.forEach(val => {
        const valStr = String(val).toLowerCase();
        // Exact word boundary checks to avoid partial collision
        const valRegex = new RegExp(`\\b${escapeRegExp(valStr)}\\b`, 'i');
        if (valRegex.test(normalized)) {
          dimensions.push({
            dimension: headerNames[dim.colKey] || dim.colKey,
            value: val,
            colKey: dim.colKey
          });
          filters.push({ colKey: dim.colKey, op: "eq", value: val });
        }
      });
    }
  });

  // 3. Date mapping
  if (currentDatasetOntology.dates.length > 0) {
    const dateCol = currentDatasetOntology.dates[0].colKey;
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthFull = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    
    let foundMonths = [];
    months.forEach((m, idx) => {
      if (normalized.includes(m) || normalized.includes(monthFull[idx])) {
        foundMonths.push(idx);
      }
    });

    if (foundMonths.length > 0) {
      const yearMatch = normalized.match(/\b(20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1]) : 2026;
      
      const startMonth = foundMonths[0];
      const endMonth = foundMonths[foundMonths.length - 1];
      const startDay = 1;
      const endDay = new Date(year, endMonth + 1, 0).getDate();

      const minDate = new Date(year, startMonth, startDay);
      const maxDate = new Date(year, endMonth, endDay);
      dates.push({ colKey: dateCol, min: minDate, max: maxDate });
    }
  }

  return { entities, dimensions, filters, dates };
}

/* Layer 15: Visualization Planning & Validation */
function createVisualizationPlan(intent, xCol, yCol, rawType, prompt) {
  const norm = (prompt || "").toLowerCase();

  // Filter out columns containing id/key/code to avoid bad auto defaults
  const validMetrics = currentDatasetOntology.metrics.map(m => m.colKey).filter(col => {
    const name = (headerNames[col] || col).toLowerCase();
    return !name.includes("id") && !name.includes("key") && !name.includes("code");
  });
  
  const validDimensions = currentDatasetOntology.dimensions.map(d => d.colKey).filter(col => {
    const name = (headerNames[col] || col).toLowerCase();
    return !name.includes("id") && !name.includes("key") && !name.includes("code");
  });

  let finalX = xCol;
  let finalY = yCol;

  // Visual Planning defaults
  let chartType = "bar";

  // Correlation check
  if (norm.includes("scatter") || norm.includes("correlation") || norm.includes("relationship")) {
    chartType = "scatter";
    if (!finalY) finalY = validMetrics[0] || currentDatasetOntology.metrics[0]?.colKey || headers[0];
    if (!finalX) finalX = validMetrics[1] || validMetrics[0] || headers[0];
  } else {
    // Standard chart parameters
    if (!finalY) {
      finalY = validMetrics[0] || currentDatasetOntology.metrics[0]?.colKey || headers[0];
    }
    if (!finalX) {
      finalX = validDimensions[0] || currentDatasetOntology.dates[0]?.colKey || headers[0];
    }

    if (norm.includes("donut") || norm.includes("pie") || norm.includes("contribution") || norm.includes("share")) {
      chartType = "donut";
    } else if (norm.includes("histogram") || norm.includes("distribution")) {
      chartType = "bar"; // Rendered as frequency bar chart
    } else if (norm.includes("table") || norm.includes("records") || norm.includes("detailed")) {
      chartType = "table";
    } else if (currentDatasetOntology.dates.some(d => d.colKey === finalX) || norm.includes("trend") || norm.includes("over time") || norm.includes("line") || intent === "TrendAnalysis") {
      chartType = "line";
    }
  }

  // Chart Requirements Verification
  const isXValid = headers.includes(finalX);
  const isYValid = headers.includes(finalY);

  if (!isXValid || !isYValid) {
    return { error: "Visualization Plan requires at least one valid Dimension and one valid Metric." };
  }

  return {
    chartType,
    xAxis: finalX,
    yAxis: finalY,
    aggregation: "SUM",
    title: `${headerNames[finalY] || finalY} Breakdown by ${headerNames[finalX] || finalX}`
  };
}

/* Layer 5: Extended Intent Classifier */
function classifyUserIntent(prompt) {
  const normalized = prompt.toLowerCase().trim();

  // Greetings
  if (["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "yo", "greetings"].some(g => normalized === g || normalized.startsWith(g + " ") || normalized.startsWith(g + "!"))) {
    return "Greeting";
  }

  // Export Request
  if (normalized.includes("export") || normalized.includes("download") || normalized.includes("to pdf") || normalized.includes("to docx") || normalized.includes("to pptx") || normalized.includes("to csv") || normalized.includes("to json")) {
    return "ExportRequest";
  }

  // Report Generation
  if (normalized.includes("generate report") || normalized.includes("executive summary") || normalized.includes("create report") || normalized.includes("summary report") || normalized.includes("business review") || normalized.includes("risk profile") || normalized.includes("operations analysis")) {
    return "ReportGeneration";
  }

  // Dashboard Generation
  if (normalized.includes("build dashboard") || normalized.includes("create dashboard") || normalized.includes("generate dashboard") || normalized.includes("add to dashboard")) {
    return "DashboardGeneration";
  }

  // Data Quality
  if (normalized.includes("data quality") || normalized.includes("quality score") || normalized.includes("missing count") || normalized.includes("duplicates score") || normalized.includes("health check") || normalized.includes("missing stats")) {
    return "DataQuality";
  }

  // Cleaning / Data quality recommendations
  if (normalized.includes("clean") || normalized.includes("impute") || normalized.includes("fixing") || normalized.includes("remove duplicates") || normalized.includes("fill missing") || normalized.includes("delete empty") || normalized.includes("delete blank") || normalized.includes("convert date") || normalized.includes("rename column") || normalized.includes("merge columns") || normalized.includes("split column") || normalized.includes("cleaning recommendation")) {
    return "CleaningRecommendation";
  }

  // Dataset Questions
  if (
    normalized.includes("what dataset") ||
    normalized.includes("what is this dataset") ||
    normalized.includes("dataset info") ||
    normalized.includes("tell me about this dataset") ||
    normalized.includes("dataset summary") ||
    normalized.includes("metadata") ||
    (normalized.includes("using") && normalized.includes("dataset"))
  ) {
    return "DatasetQuestion";
  }

  // Column Questions
  if (
    normalized.includes("show column") ||
    normalized.includes("what column") ||
    normalized.includes("list field") ||
    normalized.includes("show field") ||
    normalized.includes("list column") ||
    normalized.includes("dataset schema") ||
    normalized.includes("what fields") ||
    normalized.includes("columns do i have")
  ) {
    return "ColumnQuestion";
  }

  // Comparison
  if (normalized.includes("compare") || normalized.includes(" vs ") || normalized.includes("difference") || normalized.includes("versus")) {
    return "Comparison";
  }

  // Visualizations
  if (normalized.includes("chart") || normalized.includes("plot") || normalized.includes("graph") || normalized.includes("histogram") || normalized.includes("scatter") || normalized.includes("pie") || normalized.includes("donut") || normalized.includes("bar")) {
    return "Visualization";
  }

  // Diagnostic Explain / Insights / Anomalies
  if (normalized.startsWith("why") || normalized.includes("anomaly") || normalized.includes("outlier") || normalized.includes("explain") || normalized.includes("cause") || normalized.includes("reason") || normalized.includes("insights list") || normalized.includes("what should i analyze")) {
    return "Insight";
  }

  // Trend
  if (normalized.includes("trend") || normalized.includes("growth") || normalized.includes("over time") || normalized.includes("monthly") || normalized.includes("weekly") || normalized.includes("daily") || normalized.includes("yearly")) {
    return "TrendAnalysis";
  }

  // Metric Queries
  if (normalized.includes("total") || normalized.includes("sum") || normalized.includes("average") || normalized.includes("avg") || normalized.includes("mean") || normalized.includes("median") || normalized.includes("min") || normalized.includes("max") || normalized.includes("count") || normalized.includes("how many") || normalized.includes("expenditure") || normalized.includes("revenue") || normalized.includes("sales") || normalized.includes("spend")) {
    return "MetricQuery";
  }

  // General Conversation / Help
  if (
    normalized.includes("how are you") ||
    normalized.includes("what can you do") ||
    normalized.includes("help") ||
    normalized.includes("who are you")
  ) {
    return "GeneralConversation";
  }

  return "Unknown";
}

/* Layer 6 & 11: Query Planning & Disambiguation Engine */
function generateQueryPlan(prompt) {
  const normalized = prompt.toLowerCase().trim();
  const intent = classifyUserIntent(prompt);

  // Exclude greetings & reports from parsing
  if (intent === "Greeting" || intent === "ReportGeneration" || intent === "ExportRequest") {
    return { type: "system", intent };
  }

  // 1. Run Entity Recognition (Layer 13)
  const recognition = extractEntitiesFromPrompt(prompt);

  // 2. Map target metric using DIL Synonyms
  let targetMetric = null;
  let metricConfidence = 0;
  
  // Find words in prompt matching synonym engine
  const words = normalized.split(/\s+/);
  const potentialMatches = [];

  words.forEach(w => {
    const cleaned = w.replace(/[^a-z]/g, "");
    if (currentDatasetSynonyms[cleaned]) {
      const colKey = currentDatasetSynonyms[cleaned];
      const stats = currentDatasetContext.columnStatistics[colKey];
      if (stats) {
        potentialMatches.push({
          colKey,
          confidence: stats.type === "numeric" || stats.type === "currency" ? 0.95 : 0.6
        });
      }
    }
  });

  // Sort by confidence
  potentialMatches.sort((a, b) => b.confidence - a.confidence);
  if (potentialMatches.length > 0) {
    targetMetric = potentialMatches[0].colKey;
    metricConfidence = potentialMatches[0].confidence;
  }

  // 3. Layer 11: Disambiguation Check
  // Check if multiple potential matches overlap
  const uniqueMatches = Array.from(new Set(potentialMatches.map(m => m.colKey)));
  if (uniqueMatches.length > 1 && intent === "MetricQuery") {
    return {
      type: "disambiguate",
      intent,
      options: uniqueMatches,
      reason: "Multiple potential numeric columns found mapping to your prompt details."
    };
  }

  // Check if no columns found at all for numeric questions
  if (!targetMetric && intent === "MetricQuery" && currentDatasetOntology.metrics.length > 0) {
    // Check if user is asking for "profit" but it is missing (Query Safety Layer)
    if (normalized.includes("profit") || normalized.includes("margin")) {
      const revenueCol = currentDatasetOntology.metrics.find(m => {
        const name = (headerNames[m.colKey] || m.colKey).toLowerCase();
        return name.includes("revenue") || name.includes("sales") || name.includes("income") || name.includes("amount");
      })?.colKey;
      const costCol = currentDatasetOntology.metrics.find(m => {
        const name = (headerNames[m.colKey] || m.colKey).toLowerCase();
        return name.includes("cost") || name.includes("expense") || name.includes("spent") || name.includes("wages");
      })?.colKey;

      if (revenueCol && costCol) {
        return {
          type: "query_safety_trigger",
          formula: "profit_subtraction",
          varA: revenueCol,
          varB: costCol
        };
      }
    }

    // Default target metric if unsure but confidence threshold met
    targetMetric = currentDatasetOntology.metrics[0]?.colKey;
    metricConfidence = 0.5; // low confidence
  }

  // Find dimension
  let targetDimension = null;
  currentDatasetOntology.dimensions.forEach(dim => {
    const colName = (headerNames[dim.colKey] || dim.colKey).toLowerCase();
    if (normalized.includes(colName)) {
      targetDimension = dim.colKey;
    }
  });
  if (!targetDimension) {
    targetDimension = currentDatasetOntology.dimensions[0]?.colKey;
  }

  // Operator extraction
  let op = "sum";
  if (normalized.includes("average") || normalized.includes("avg") || normalized.includes("mean")) op = "avg";
  else if (normalized.includes("unique") || normalized.includes("distinct")) op = "count_dist";
  else if (normalized.includes("count") || normalized.includes("how many")) op = "count";
  else if (normalized.includes("min") || normalized.includes("lowest")) op = "min";
  else if (normalized.includes("max") || normalized.includes("highest")) op = "max";
  else if (normalized.includes("median")) op = "median";

  // Build Query Plan
  let planType = "aggregation";
  if (intent === "Comparison") planType = "comparison";
  else if (intent === "TrendAnalysis") planType = "trend";
  else if (intent === "Insight") planType = "explain";
  else if (intent === "Visualization") planType = "chart_command";

  // Extract dates and category filters from entity recognizer
  const dateFilter = recognition.dates[0] || null;
  const categoryFilters = recognition.filters;

  let compItems = [];
  if (categoryFilters && categoryFilters.length >= 2) {
    compItems = categoryFilters.map(f => f.value);
  } else {
    const vsMatch = normalized.match(/(.+)\s+(?:vs|versus|compare)\s+(.+)/);
    if (vsMatch) {
      compItems = [vsMatch[1].trim(), vsMatch[2].trim()];
    }
  }

  return {
    type: planType,
    colKey: targetMetric,
    xCol: targetDimension,
    yCol: targetMetric,
    op,
    dateFilter,
    categoryFilters,
    compItems,
    direction: (normalized.includes("bottom") || normalized.includes("worst")) ? "bottom" : "top",
    count: normalized.match(/\b\d+\b/) ? parseInt(normalized.match(/\b\d+\b/)[0]) : 10,
    rawPromptType: normalized.includes("line") ? "line" : (normalized.includes("pie") ? "pie" : (normalized.includes("donut") ? "donut" : "bar"))
  };
}

// Low Confidence Disambiguation renderer
function renderDisambiguationCard(plan) {
  const optionsHtml = plan.options.map(colKey => {
    const name = headerNames[colKey] || colKey;
    return `<button class="ai-response-action-btn" onclick="resolveDILDisambiguation('${colKey}')" style="margin: 4px; padding: 6px 12px; font-size:11px;">🔢 Use ${name}</button>`;
  }).join('');

  return `
    <div class="ai-analyst-report-card" style="border: 1px solid var(--warning); background: rgba(245,158,11,0.02);">
      <div class="ai-report-header">
        <span class="ai-report-type-badge" style="color:var(--warning); background:rgba(245,158,11,0.12); border-color:rgba(245,158,11,0.25);">❓ Disambiguation</span>
        <div class="ai-report-title">Multiple potential columns matching context</div>
      </div>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 10px 0; line-height: 1.55;">
        Your prompt refers to a metric mapping to multiple columns in the active spreadsheet ontology. Which of the following columns should I use to calculate?
      </p>
      <div style="display:flex; flex-wrap:wrap;">
        ${optionsHtml}
      </div>
    </div>
  `;
}

window.resolveDILDisambiguation = function(confirmedColKey) {
  // Re-inject mapped column into conversation history
  const promptInput = document.getElementById('ai-prompt-input');
  const confirmedLabel = headerNames[confirmedColKey] || confirmedColKey;
  
  // Set value and trigger submit
  window.setAiPrompt(`What is the total of ${confirmedLabel}`);
  handleAiPromptSubmit();
};

// Query Safety Formula renderer
function renderQuerySafetyCard(plan) {
  const nameA = headerNames[plan.varA] || plan.varA;
  const nameB = headerNames[plan.varB] || plan.varB;
  
  return `
    <div class="ai-analyst-report-card" style="border: 1px solid var(--primary); background: rgba(99,102,241,0.02);">
      <div class="ai-report-header">
        <span class="ai-report-type-badge">🛡️ Query Safety</span>
        <div class="ai-report-title">Calculation Recommendation</div>
      </div>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 10px 0; line-height: 1.55;">
        I could not find a direct <strong>Profit</strong> column in the spreadsheet ontology.
        However, I detected <strong>${nameA}</strong> and <strong>${nameB}</strong> fields. Would you like me to calculate this metric?
      </p>
      <div style="display:flex; flex-wrap:wrap; gap: 6px;">
        <button class="ai-response-action-btn" onclick="resolveQuerySafetyFormula('profit','${plan.varA}','${plan.varB}')">➕ Profit = ${nameA} - ${nameB}</button>
        <button class="ai-response-action-btn" onclick="resolveQuerySafetyFormula('margin','${plan.varA}','${plan.varB}')">📈 Margin % = (${nameA} - ${nameB}) / ${nameA}</button>
      </div>
    </div>
  `;
}

window.resolveQuerySafetyFormula = function(formulaName, varA, varB) {
  // Register formula logic, execute calculation, and push result directly
  setCopilotState('thinking');
  
  setTimeout(() => {
    let resultValue = 0;
    let calcString = "";
    let formattedVal = "";
    let titleStr = "";

    const idxA = headers.indexOf(varA);
    const idxB = headers.indexOf(varB);
    const labelA = headerNames[varA] || varA;
    const labelB = headerNames[varB] || varB;

    let computedRows = 0;
    
    // Safety calculations
    if (formulaName === 'profit') {
      gridData.forEach(row => {
        const valA = getCleanNumericValue(row[idxA]);
        const valB = getCleanNumericValue(row[idxB]);
        if (!isNaN(valA) && !isNaN(valB)) {
          resultValue += (valA - valB);
          computedRows++;
        }
      });
      calcString = `SUM(${labelA} - ${labelB})`;
      formattedVal = formatKpiValue(resultValue, varA, 'sum');
      titleStr = `Calculated Net Profit (${labelA} - ${labelB})`;
    } else {
      let sumA = 0;
      let sumB = 0;
      gridData.forEach(row => {
        const valA = getCleanNumericValue(row[idxA]);
        const valB = getCleanNumericValue(row[idxB]);
        if (!isNaN(valA) && !isNaN(valB)) {
          sumA += valA;
          sumB += valB;
          computedRows++;
        }
      });
      resultValue = sumA !== 0 ? ((sumA - sumB) / sumA) * 100 : 0;
      calcString = `(SUM(${labelA}) - SUM(${labelB})) / SUM(${labelA})`;
      formattedVal = resultValue.toFixed(1) + "%";
      titleStr = `Calculated Profit Margin %`;
    }

    const mockResult = {
      type: "aggregation",
      title: titleStr,
      answer: formattedVal,
      method: calcString,
      rowsUsed: computedRows,
      findings: [
        `Constructed dynamic calculation formula based on relationship graph ontology parameters.`,
        `Successfully evaluated formula expression across ${computedRows} rows client-side.`
      ],
      recommendations: [
        `Review cost breakdown vectors to see options for increasing net profit margins.`
      ],
      confidence: "High",
      calcDetails: `${calcString}\nRows Used: ${computedRows.toLocaleString()}`,
      rawAnswer: resultValue
    };

    const responseHtml = generateHtmlResponse(mockResult);
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: titleStr + ": " + formattedVal,
      contentHtml: responseHtml,
      suggestions: ["Show profit trend", "Rank categories by cost", "Generate report"]
    });
    
    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
  }, 400);
};

// ConversationalMemory Expire Check
function verifyContextExpiration(newPrompt) {
  // If user changes prompt topic completely (e.g. going from "salary" to "healthcare visit count")
  if (lastResolvedPlan && lastResolvedPlan.colKey) {
    const lastColType = detectColumnType(lastResolvedPlan.colKey);
    const semantics = profileColumnSemantics(lastResolvedPlan.colKey);
    
    // Scan prompt for completely unrelated semantic categories
    const normalized = newPrompt.toLowerCase();
    if (semantics.semantic_role === "financial_metric" && (normalized.includes("patient") || normalized.includes("diagnosis") || normalized.includes("treatment"))) {
      // Unrelated topic: reset context
      conversationContext = {
        currentMetric: null,
        currentDimension: null,
        currentFilters: [],
        currentDateRange: null,
        currentEntity: null,
        currentVisualization: null,
        currentAnalysisType: null
      };
      lastResolvedPlan = null;
    }
  }
}

// Override handleAiPromptSubmit for DIL routing
function handleAiPromptSubmit() {
  const input = document.getElementById('ai-prompt-input');
  if (!input) return;
  const prompt = input.value.trim();
  if (!prompt) return;

  // Add User message
  aiActiveChatHistory.push({
    sender: 'user',
    text: prompt
  });
  input.value = "";
  input.style.height = 'auto'; 
  renderAiChatHistory();

  // Safety grounding check
  if (!gridData || gridData.length === 0) {
    setTimeout(() => {
      aiActiveChatHistory.push({
        sender: 'assistant',
        text: "Please load a dataset workspace before asking analysis questions.",
        contentHtml: `<p style="font-size: 12px; color: var(--text-secondary); margin: 0;">⚠️ Please load a dataset workspace before asking analysis questions.</p>`
      });
      saveChatHistoryToWorkspace();
      renderAiChatHistory();
    }, 400);
    return;
  }

  setCopilotState('thinking');

  // Verify memory resets
  verifyContextExpiration(prompt);

  const feed = document.getElementById('ai-chat-feed');
  let typingBubble = null;
  if (feed) {
    typingBubble = document.createElement('div');
    typingBubble.className = 'ai-message assistant typing-indicator';
    typingBubble.style.cssText = 'display: flex; gap: 12px; max-width: 85%; margin-top: 10px;';
    typingBubble.innerHTML = `
      <div class="ai-msg-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">🤖</div>
      <div class="ai-msg-body" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 0 12px 12px 12px; padding: 12px 16px;">
        <span style="font-size: 12px; color: var(--text-muted);">OneClick DIL Engine is evaluating context...</span>
      </div>
    `;
    feed.appendChild(typingBubble);
    feed.scrollTop = feed.scrollHeight;
  }

  setTimeout(() => {
    // Clear typing bubble
    if (typingBubble && typingBubble.parentNode) {
      typingBubble.parentNode.removeChild(typingBubble);
    }

    routeUserMessage(prompt);
  }, 450);
}

// Earning Clarification Card rendering and resolution
function renderEarningClarificationCard(financialMetrics, prompt) {
  const optionsHtml = financialMetrics.map(col => {
    const label = headerNames[col] || col;
    return `
      <button class="ai-response-action-btn" style="margin: 4px;" onclick="resolveEarningClarification('${col}', '${prompt.replace(/'/g, "\\'")}')">
        💰 ${label}
      </button>
    `;
  }).join('');

  return `
    <div class="ai-analyst-report-card" style="border: 1px solid var(--warning); background: rgba(245,158,11,0.02);">
      <div class="ai-report-header">
        <span class="ai-report-type-badge" style="color:var(--warning); background:rgba(245,158,11,0.12); border-color:rgba(245,158,11,0.25);">❓ Clarification</span>
        <div class="ai-report-title">Multiple potential earnings columns</div>
      </div>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 10px 0; line-height: 1.55;">
        Which metric did you mean for earning?
      </p>
      <div style="display:flex; flex-wrap:wrap;">
        ${optionsHtml}
      </div>
    </div>
  `;
}

window.resolveEarningClarification = function(colKey, originalPrompt) {
  const colLabel = headerNames[colKey] || colKey;
  let newPrompt = originalPrompt;
  if (/highest earning/i.test(originalPrompt)) {
    newPrompt = originalPrompt.replace(/highest earning/gi, `highest ${colLabel}`);
  } else {
    newPrompt = originalPrompt.replace(/earning/gi, colLabel);
  }
  
  window.setAiPrompt(newPrompt);
  handleAiPromptSubmit();
};

// Conversation Router (Top-level Entrypoint)
function routeUserMessage(prompt) {
  const normalized = prompt.toLowerCase().trim();
  if (normalized.includes("highest earning") || normalized.includes("earning")) {
    const financialMetrics = currentDatasetOntology.metrics
      .filter(m => m.role === "financial_metric")
      .map(m => m.colKey);

    if (financialMetrics.length > 1) {
      const cardHtml = renderEarningClarificationCard(financialMetrics, prompt);
      aiActiveChatHistory.push({
        sender: 'assistant',
        text: "Which metric did you mean?",
        contentHtml: cardHtml
      });
      saveChatHistoryToWorkspace();
      renderAiChatHistory();
      setCopilotState('idle');
      return;
    }
  }

  const intent = classifyUserIntent(prompt);
  console.log("Router classified intent as:", intent);

  switch (intent) {
    case "Greeting":
      handleGreeting(prompt);
      break;
    case "DatasetQuestion":
      handleDatasetQuestion(prompt);
      break;
    case "ColumnQuestion":
      handleColumnQuestion(prompt);
      break;
    case "DashboardGeneration":
      handleDashboard(prompt);
      break;
    case "ReportGeneration":
      handleReport(prompt);
      break;
    case "ExportRequest":
      handleExport(prompt);
      break;
    case "DataQuality":
      handleDataQuality(prompt);
      break;
    case "CleaningRecommendation":
      handleCleaning(prompt);
      break;
    case "Visualization":
      handleVisualization(prompt);
      break;
    case "Comparison":
      handleComparison(prompt);
      break;
    case "Insight":
      handleInsight(prompt);
      break;
    case "TrendAnalysis":
      handleTrend(prompt);
      break;
    case "MetricQuery":
      handleMetricQuery(prompt);
      break;
    case "GeneralConversation":
      handleGeneralConversation(prompt);
      break;
    case "Unknown":
    default:
      handleGeneralConversation(prompt);
      break;
  }
}

// Context Engine Updates
function updateConversationContext(plan) {
  if (!plan) return;
  if (plan.colKey) conversationContext.currentMetric = plan.colKey;
  if (plan.xCol) conversationContext.currentDimension = plan.xCol;
  
  if (plan.categoryFilters && plan.categoryFilters.length > 0) {
    if (!conversationContext.currentFilters) {
      conversationContext.currentFilters = [];
    }
    plan.categoryFilters.forEach(newFilter => {
      // Replace existing filter for same column or add new
      conversationContext.currentFilters = conversationContext.currentFilters.filter(f => f.colKey !== newFilter.colKey);
      conversationContext.currentFilters.push(newFilter);
    });
  }
  if (plan.dateFilter) conversationContext.currentDateRange = plan.dateFilter;
  if (plan.type) conversationContext.currentAnalysisType = plan.type;
}

// 1. GREETING HANDLER
function handleGreeting(prompt) {
  const datasetNameEl = document.getElementById('ws-dataset-name');
  const datasetName = datasetNameEl ? datasetNameEl.innerText.trim() : (currentDatasetContext.workspaceName || "sales_q2_2026.csv");
  const rowCount = gridData ? gridData.length : 0;
  const colCount = headers ? headers.length : 0;
  const domainName = currentDatasetDomain ? currentDatasetDomain.name : "Custom Business Domain";
  const domainConf = currentDatasetDomain ? (currentDatasetDomain.confidence * 100).toFixed(0) : "80";

  const responseText = `Hi! I'm your AI Analyst.\n\nCurrent Dataset: ${datasetName}\nRows: ${rowCount.toLocaleString()}\nColumns: ${colCount}\nDetected Domain: ${domainName} (${domainConf}% confidence)\n\nTry asking:\n• What dataset am I using?\n• Show top customers\n• Category vs Quantity graph\n• Revenue by location\n• Generate executive summary`;

  const responseHtml = `
    <div style="font-size:12.5px; line-height:1.6; color:var(--text-secondary);">
      <p style="margin-top:0; font-weight:600; color:var(--text-primary);">Hi! I'm your AI Analyst. 👋</p>
      <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:8px; padding:12px; margin:12px 0;">
        <span style="font-size:11px; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:4px;">Current Grounding Context</span>
        <div style="font-weight:600; color:var(--text-primary); font-size:13px;">${datasetName}</div>
        <div style="display:flex; gap:16px; margin-top:8px; font-size:12px;">
          <div><span style="color:var(--text-muted);">Rows:</span> ${rowCount.toLocaleString()}</div>
          <div><span style="color:var(--text-muted);">Columns:</span> ${colCount}</div>
        </div>
        <div style="margin-top:8px; font-size:12px;"><span style="color:var(--text-muted);">Domain:</span> ${domainName} (${domainConf}%)</div>
      </div>
      <p style="margin-bottom:4px; font-weight:600; color:var(--text-primary);">Try asking:</p>
      <ul style="margin:0; padding-left:18px;">
        <li style="margin-bottom:4px;">What dataset am I using?</li>
        <li style="margin-bottom:4px;">Show top customers</li>
        <li style="margin-bottom:4px;">Category vs Quantity graph</li>
        <li style="margin-bottom:4px;">Revenue by location</li>
        <li style="margin-bottom:4px;">Generate executive summary</li>
      </ul>
    </div>
  `;

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: responseText,
    contentHtml: responseHtml,
    suggestions: ["What dataset am I using?", "Show top customers", "Category vs Quantity graph", "Generate executive summary"]
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 2. DATASET QUESTION HANDLER
function handleDatasetQuestion(prompt) {
  const datasetNameEl = document.getElementById('ws-dataset-name');
  const datasetName = datasetNameEl ? datasetNameEl.innerText.trim() : (currentDatasetContext.workspaceName || "sales_q2_2026.csv");
  const rowCount = gridData ? gridData.length : 0;
  const colCount = headers ? headers.length : 0;
  const domainName = currentDatasetDomain ? currentDatasetDomain.name : "Custom Business Domain";
  const domainConf = currentDatasetDomain ? (currentDatasetDomain.confidence * 100).toFixed(0) : "80";
  
  const ontology = currentDatasetOntology || { entities: [], metrics: [], dimensions: [], dates: [] };
  const metricsStr = ontology.metrics.map(m => headerNames[m.colKey] || m.colKey).join(', ') || 'None';
  const dimensionsStr = ontology.dimensions.map(d => headerNames[d.colKey] || d.colKey).join(', ') || 'None';
  const datesStr = ontology.dates.map(d => headerNames[d.colKey] || d.colKey).join(', ') || 'None';
  const columnsList = headers.map(h => headerNames[h] || h).join(', ');
  
  const qualityScore = currentDatasetContext.dataQualityScore || 100;
  const lastModified = currentDatasetContext.lastModified || new Date().toLocaleString();

  const responseText = `Dataset Name: ${datasetName}\nRows: ${rowCount.toLocaleString()}\nColumns: ${colCount}\nDetected Domain: ${domainName} (${domainConf}% confidence)\nData Quality Score: ${qualityScore}%\nColumn List: ${columnsList}\nDetected Metrics: ${metricsStr}\nDetected Dimensions: ${dimensionsStr}\nDate Columns: ${datesStr}\nLast Modified Time: ${lastModified}`;

  const responseHtml = `
    <div style="font-size:12.5px; line-height:1.6; color:var(--text-secondary);">
      <div style="font-weight:600; color:var(--text-primary); font-size:13px; margin-bottom:8px;">📊 Dataset Overview</div>
      <table style="width:100%; border-collapse:collapse; margin-bottom:12px; font-size:12px;">
        <tbody>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:6px 0; color:var(--text-muted); width:40%;">Dataset Name</td><td style="padding:6px 0; font-weight:600; color:var(--text-primary);">${datasetName}</td></tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:6px 0; color:var(--text-muted);">Rows</td><td style="padding:6px 0; font-weight:600; color:var(--text-primary);">${rowCount.toLocaleString()}</td></tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:6px 0; color:var(--text-muted);">Columns</td><td style="padding:6px 0; font-weight:600; color:var(--text-primary);">${colCount}</td></tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:6px 0; color:var(--text-muted);">Detected Domain</td><td style="padding:6px 0; font-weight:600; color:var(--text-primary);">${domainName} (${domainConf}%)</td></tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:6px 0; color:var(--text-muted);">Data Quality Score</td><td style="padding:6px 0; font-weight:600; color:var(--success);">${qualityScore}%</td></tr>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td style="padding:6px 0; color:var(--text-muted);">Last Modified Time</td><td style="padding:6px 0; color:var(--text-primary);">${lastModified}</td></tr>
        </tbody>
      </table>
      <div style="background:rgba(255,255,255,0.01); border:1px solid var(--border-color); border-radius:6px; padding:10px; margin-top:8px;">
        <div style="margin-bottom:4px;"><strong>Columns:</strong> <span style="font-family:var(--font-mono); font-size:11px;">${columnsList}</span></div>
        <div style="margin-bottom:4px;"><strong>Detected Metrics:</strong> <span style="color:var(--primary);">${metricsStr}</span></div>
        <div style="margin-bottom:4px;"><strong>Detected Dimensions:</strong> <span style="color:var(--text-primary);">${dimensionsStr}</span></div>
        <div><strong>Date Fields:</strong> <span style="color:var(--text-muted);">${datesStr}</span></div>
      </div>
    </div>
  `;

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: responseText,
    contentHtml: responseHtml,
    suggestions: ["Show columns", "Show top customers", "Generate executive summary"]
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 3. COLUMN QUESTION HANDLER
function handleColumnQuestion(prompt) {
  const ontology = currentDatasetOntology || { entities: [], metrics: [], dimensions: [], dates: [] };
  
  const metrics = ontology.metrics.map(m => headerNames[m.colKey] || m.colKey);
  const dimensions = ontology.dimensions.map(d => headerNames[d.colKey] || d.colKey);
  const entities = ontology.entities.map(e => headerNames[e.colKey] || e.colKey);
  const dates = ontology.dates.map(d => headerNames[d.colKey] || d.colKey);

  const responseText = `Metrics\n--------\n${metrics.join('\n') || 'None'}\n\nDimensions\n--------\n${dimensions.join('\n') || 'None'}\n\nEntities\n--------\n${entities.join('\n') || 'None'}\n\nDates\n--------\n${dates.join('\n') || 'None'}`;

  const responseHtml = `
    <div style="font-size:12.5px; line-height:1.6; color:var(--text-secondary);">
      <div style="font-weight:600; color:var(--text-primary); font-size:13px; margin-bottom:8px;">📋 Dataset Schema Details</div>
      
      <div style="margin-bottom:8px;">
        <div style="color:var(--primary); font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">📈 Metrics</div>
        <ul style="margin:0; padding-left:16px;">
          ${metrics.map(m => `<li>${m}</li>`).join('') || '<li>None</li>'}
        </ul>
      </div>

      <div style="margin-bottom:8px;">
        <div style="color:var(--text-primary); font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">🏷️ Dimensions</div>
        <ul style="margin:0; padding-left:16px;">
          ${dimensions.map(d => `<li>${d}</li>`).join('') || '<li>None</li>'}
        </ul>
      </div>

      <div style="margin-bottom:8px;">
        <div style="color:var(--warning); font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">👤 Entities</div>
        <ul style="margin:0; padding-left:16px;">
          ${entities.map(e => `<li>${e}</li>`).join('') || '<li>None</li>'}
        </ul>
      </div>

      <div>
        <div style="color:var(--text-muted); font-weight:700; font-size:11px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px;">📅 Dates</div>
        <ul style="margin:0; padding-left:16px;">
          ${dates.map(d => `<li>${d}</li>`).join('') || '<li>None</li>'}
        </ul>
      </div>
    </div>
  `;

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: responseText,
    contentHtml: responseHtml,
    suggestions: ["What dataset am I using?", "Show top customers", "Generate executive summary"]
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 4. GENERAL CONVERSATION HANDLER
function handleGeneralConversation(prompt) {
  const normalized = prompt.toLowerCase().trim();
  let responseText = "";

  const datasetNameEl = document.getElementById('ws-dataset-name');
  const datasetName = datasetNameEl ? datasetNameEl.innerText.trim() : (currentDatasetContext.workspaceName || "");
  const hasDataset = gridData && gridData.length > 0;

  if (normalized.includes("how are you")) {
    responseText = hasDataset 
      ? `I'm doing great, thank you! I'm currently looking at your dataset "${datasetName}" and ready to help you analyze it. What would you like to explore?`
      : "I'm doing great, thank you! Please load a dataset so we can start analyzing your data together.";
  } else if (normalized.includes("who are you") || normalized.includes("what are you") || normalized.includes("help") || normalized.includes("what can you do")) {
    responseText = "I'm your senior AI Data Analyst here in OneClick. I help you understand your data without writing code. Here is what I can do:\n\n• Show columns & describe dataset schemas\n• Calculate metrics (aggregates, averages, sums)\n• Generate charts (bars, lines, donuts, scatters)\n• Analyze trends and key insights\n• Impute or clean spreadsheet columns\n• Export reports in PDF or CSV formats\n\nHow can I help you right now?";
  } else if (normalized.includes("analyze next") || normalized.includes("what should i analyze")) {
    if (hasDataset) {
      const ontology = currentDatasetOntology || { entities: [], metrics: [], dimensions: [], dates: [] };
      const dim = ontology.dimensions[0] ? headerNames[ontology.dimensions[0].colKey] || ontology.dimensions[0].colKey : "";
      const met = ontology.metrics[0] ? headerNames[ontology.metrics[0].colKey] || ontology.metrics[0].colKey : "";
      
      responseText = `Looking at "${datasetName}", here are a few suggestions for what to analyze next:\n• The relationship between **${dim || 'dimensions'}** and **${met || 'metrics'}**. Try asking: "${dim || 'Category'} vs ${met || 'Spend'} graph".\n• General calculations, e.g. "What is total ${met || 'spend'}?".\n• A diagnostic summary: "Generate executive summary".\n• Clean up duplicates or fill missing values.`;
    } else {
      responseText = "Please load a dataset workspace, and I will recommend specific analyses based on your columns and data profile!";
    }
  } else if (normalized.includes("explain this chart") || normalized.includes("explain chart") || normalized.includes("explain graph")) {
    if (hasDataset) {
      responseText = "I can explain the charts we generate here. Try asking a visualization question first (e.g. \"Category vs Quantity graph\"), and I'll display the chart along with key analyst findings and insights detailing what the data tells us.";
    } else {
      responseText = "No active chart or dataset is loaded. Please load a dataset and ask for a graph.";
    }
  } else {
    responseText = hasDataset 
      ? `I understand. We are currently analyzing the "${datasetName}" dataset. Let me know if you want to calculate any metric, generate a chart, or run a data quality check!`
      : "I understand. I am your AI Analyst. Please load a dataset workspace to begin analyzing your columns and metrics.";
  }

  const responseHtml = `<p style="font-size:12.5px; line-height:1.6; color:var(--text-secondary);">${responseText.replace(/\n/g, '<br/>')}</p>`;

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: responseText,
    contentHtml: responseHtml,
    suggestions: hasDataset ? ["What dataset am I using?", "Show columns", "Generate executive summary"] : []
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 5. DASHBOARD HANDLER
function handleDashboard(prompt) {
  const responseText = "Sure! I can help you design or add metrics to your dashboard. We can inject KPI cards, ranking tables, and charts directly. Let me know which columns you'd like to pin to your dashboard!";
  const responseHtml = `
    <div style="font-size:12.5px; color:var(--text-secondary); line-height:1.6;">
      <p style="margin-top:0; font-weight: 600; color: var(--text-primary);">📋 Dashboard Builder Assistant</p>
      <p>I can pin metrics directly to your dashboard workspace layout. You can request:</p>
      <ul style="margin:4px 0; padding-left:18px;">
        <li>Add KPI cards for any metric (e.g. total spend)</li>
        <li>Pin trend lines or bar chart widgets</li>
      </ul>
      <p style="margin-bottom:0; margin-top:8px;">What widget would you like to place next?</p>
    </div>
  `;
  aiActiveChatHistory.push({
    sender: 'assistant',
    text: responseText,
    contentHtml: responseHtml,
    suggestions: ["Show columns", "Generate executive summary"]
  });
  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 6. REPORT HANDLER
function handleReport(prompt) {
  let reportTitle = "Executive Synthesis Summary";
  if (prompt.toLowerCase().includes("risk")) reportTitle = "Risk Profile Assessment";
  else if (prompt.toLowerCase().includes("operations")) reportTitle = "Operations Performance Analysis";
  else if (prompt.toLowerCase().includes("business review")) reportTitle = "Monthly Business Review (MBR)";
  
  executeReportGeneration({ type: "report" }, reportTitle);
  setCopilotState('idle');
}

// 7. EXPORT HANDLER
function handleExport(prompt) {
  let format = "csv";
  if (prompt.toLowerCase().includes("pdf")) format = "pdf";
  else if (prompt.toLowerCase().includes("pptx") || prompt.toLowerCase().includes("powerpoint") || prompt.toLowerCase().includes("slide")) format = "pptx";
  else if (prompt.toLowerCase().includes("docx") || prompt.toLowerCase().includes("word")) format = "docx";
  else if (prompt.toLowerCase().includes("json")) format = "json";
  
  executeExportCommand({ type: "export_command", format });
  setCopilotState('idle');
}

// 8. DATA QUALITY HANDLER
function handleDataQuality(prompt) {
  const qualityScore = currentDatasetContext.dataQualityScore || 100;
  const duplicateStats = currentDatasetContext.duplicateStats || 0;
  let missingValTotal = 0;
  const missingByCol = [];
  
  if (currentDatasetContext.missingValueStats) {
    Object.entries(currentDatasetContext.missingValueStats).forEach(([colKey, v]) => {
      missingValTotal += v;
      if (v > 0) {
        missingByCol.push(`${headerNames[colKey] || colKey}: ${v} missing`);
      }
    });
  }

  const responseText = `Data Quality Health Check\n------------------------\nOverall Score: ${qualityScore}%\nDuplicate Rows: ${duplicateStats}\nMissing Cells: ${missingValTotal}\n\nDetails:\n${missingByCol.join('\n') || 'No missing values found!'}`;

  const responseHtml = `
    <div style="font-size:12.5px; line-height:1.6; color:var(--text-secondary);">
      <div style="font-weight:600; color:var(--text-primary); font-size:13px; margin-bottom:8px;">🩺 Data Quality Health Report</div>
      <div style="display:flex; gap:12px; margin-bottom:12px;">
        <div style="flex:1; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:6px; padding:10px; text-align:center;">
          <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Quality Score</div>
          <div style="font-size:20px; font-weight:700; color:${qualityScore >= 80 ? 'var(--success)' : 'var(--warning)'}; margin-top:2px;">${qualityScore}%</div>
        </div>
        <div style="flex:1; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:6px; padding:10px; text-align:center;">
          <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Duplicates</div>
          <div style="font-size:20px; font-weight:700; color:${duplicateStats > 0 ? 'var(--warning)' : 'var(--text-primary)'}; margin-top:2px;">${duplicateStats}</div>
        </div>
        <div style="flex:1; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:6px; padding:10px; text-align:center;">
          <div style="font-size:10px; color:var(--text-muted); text-transform:uppercase;">Missing Cells</div>
          <div style="font-size:20px; font-weight:700; color:${missingValTotal > 0 ? 'var(--warning)' : 'var(--success)'}; margin-top:2px;">${missingValTotal}</div>
        </div>
      </div>
      ${missingByCol.length > 0 ? `
        <div style="background:rgba(239,68,68,0.02); border:1px solid rgba(239,68,68,0.15); border-radius:6px; padding:10px;">
          <div style="font-weight:600; color:var(--text-primary); font-size:11px; text-transform:uppercase; margin-bottom:4px;">⚠️ Missing values breakdown</div>
          <ul style="margin:0; padding-left:16px; font-size:12px;">
            ${missingByCol.map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      ` : `
        <div style="background:rgba(16,185,129,0.02); border:1px solid rgba(16,185,129,0.15); border-radius:6px; padding:10px; color:var(--success); text-align:center; font-weight:600; font-size:12px;">
          ✨ No missing values detected in the active sheet!
        </div>
      `}
    </div>
  `;

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: responseText,
    contentHtml: responseHtml,
    suggestions: ["Clean missing values", "Show columns", "Generate executive summary"]
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 9. CLEANING HANDLER
function handleCleaning(prompt) {
  let plan = generateQueryPlan(prompt);
  let action = "remove_duplicates";
  const norm = prompt.toLowerCase();
  
  if (norm.includes("fill") || norm.includes("missing") || norm.includes("impute")) {
    action = "fill_missing";
  } else if (norm.includes("delete empty") || norm.includes("delete blank")) {
    action = "delete_empty_rows";
  } else if (norm.includes("convert date")) {
    action = "convert_date";
  } else if (norm.includes("rename")) {
    action = "rename_column";
  } else if (norm.includes("merge")) {
    action = "merge_columns";
  } else if (norm.includes("split")) {
    action = "split_column";
  } else {
    // Recommendation based on health stats
    const duplicateStats = currentDatasetContext.duplicateStats || 0;
    let missingValTotal = 0;
    let colWithMissing = null;
    
    if (currentDatasetContext.missingValueStats) {
      Object.entries(currentDatasetContext.missingValueStats).forEach(([colKey, v]) => {
        missingValTotal += v;
        if (v > 0 && !colWithMissing) {
          colWithMissing = colKey;
        }
      });
    }

    if (duplicateStats > 0) {
      action = "remove_duplicates";
    } else if (missingValTotal > 0 && colWithMissing) {
      action = "fill_missing";
      plan.colKey = colWithMissing;
    }
  }

  const cleaningPlan = { 
    type: "spreadsheet", 
    action, 
    colKey: plan.colKey || currentDatasetOntology.metrics[0]?.colKey || headers[0], 
    method: norm.includes("mean") ? "mean" : "median" 
  };
  
  showAiSpreadsheetConfirmation(cleaningPlan);
  setCopilotState('idle');
}

/* Synonym Groups and Helper Functions for Visual Mapping */
const VIZ_SYNONYM_GROUPS = [
  ["expenditure", "spent", "spending", "cost", "amount", "revenue ($)", "revenue"],
  ["customer", "client", "buyer", "consumer", "customer id", "customer_id", "order id", "order_id"],
  ["sales", "revenue", "turnover", "revenue ($)"],
  ["quantity", "units", "volume", "units sold"],
  ["location", "city", "region", "country"]
];

function getVizSynonyms(word) {
  const wordLower = word.toLowerCase();
  for (const group of VIZ_SYNONYM_GROUPS) {
    if (group.some(g => {
      const gLower = g.toLowerCase();
      if (wordLower === gLower) return true;
      const tokens = gLower.split(/[^a-z0-9]/).filter(Boolean);
      return tokens.includes(wordLower);
    })) {
      return group;
    }
  }
  return [wordLower];
}

function findMappedColumnsForViz(prompt) {
  const normalized = prompt.toLowerCase();
  const matchedDimensions = [];
  const matchedMetrics = [];

  const ontologyMetrics = (currentDatasetOntology.metrics || []).map(m => m.colKey);
  const ontologyDimensions = (currentDatasetOntology.dimensions || []).map(d => d.colKey);
  const ontologyEntities = (currentDatasetOntology.entities || []).map(e => e.colKey);
  const ontologyDates = (currentDatasetOntology.dates || []).map(d => d.colKey);

  const allMetricKeys = ontologyMetrics;
  const allDimensionKeys = [...ontologyDimensions, ...ontologyEntities, ...ontologyDates];

  const matchesColumn = (colKey) => {
    const colName = (headerNames[colKey] || colKey).toLowerCase();
    if (normalized.includes(colName)) return true;

    const colTokens = colName.split(/[^a-z0-9]/).filter(Boolean);
    const promptTokens = normalized.split(/[^a-z0-9]/).filter(Boolean);

    for (const token of colTokens) {
      if (promptTokens.includes(token)) return true;
    }

    for (const pToken of promptTokens) {
      const syns = getVizSynonyms(pToken);
      for (const syn of syns) {
        if (colName === syn) return true;
        const synTokens = syn.split(/[^a-z0-9]/).filter(Boolean);
        if (synTokens.length > 0 && synTokens.every(st => colTokens.includes(st))) {
          return true;
        }
      }
    }
    return false;
  };

  allMetricKeys.forEach(colKey => {
    if (matchesColumn(colKey)) matchedMetrics.push(colKey);
  });

  allDimensionKeys.forEach(colKey => {
    if (matchesColumn(colKey)) matchedDimensions.push(colKey);
  });

  return {
    dimensions: Array.from(new Set(matchedDimensions)),
    metrics: Array.from(new Set(matchedMetrics))
  };
}

function buildChartConfigData(type, xCol, yCol, label) {
  const xIdx = headers.indexOf(xCol);
  const yIdx = headers.indexOf(yCol);
  if (xIdx === -1 || yIdx === -1) return null;

  const groups = {};
  gridData.forEach(row => {
    const xVal = String(row[xIdx] || "Unknown").trim();
    const yVal = getCleanNumericValue(row[yIdx]);
    if (!isNaN(yVal)) {
      groups[xVal] = (groups[xVal] || 0) + yVal;
    }
  });

  let sortedEntries = Object.entries(groups);
  const isDate = (currentDatasetOntology.dates || []).some(d => d.colKey === xCol);
  if (isDate) {
    sortedEntries.sort((a, b) => new Date(a[0]) - new Date(b[0]));
  } else {
    sortedEntries.sort((a, b) => b[1] - a[1]);
    if (sortedEntries.length > 15) {
      sortedEntries = sortedEntries.slice(0, 15);
    }
  }

  const labels = sortedEntries.map(e => e[0]);
  const data = sortedEntries.map(e => e[1]);

  const chartjsType = type === 'donut' ? 'doughnut' : (type === 'horizontalBar' ? 'bar' : type);
  const indexAxis = type === 'horizontalBar' ? 'y' : 'x';
  const datasetLabel = headerNames[yCol] || yCol;

  return {
    chartjsType,
    indexAxis,
    label: label || `${datasetLabel} by ${headerNames[xCol] || xCol}`,
    xCol,
    yCol,
    chartData: {
      labels,
      datasets: [{
        label: datasetLabel,
        data,
        backgroundColor: chartjsType === 'doughnut' || chartjsType === 'pie'
          ? ['#6366F1', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#84CC16', '#06B6D4', '#14B8A6']
          : '#6366F1',
        borderColor: chartjsType === 'doughnut' || chartjsType === 'pie' ? 'rgba(255,255,255,0.1)' : '#6366F1',
        borderWidth: 1
      }]
    }
  };
}

function renderVisualizationClarificationCard(mapped, prompt) {
  const msgId = 'clarify-viz-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  
  const allMetrics = (currentDatasetOntology.metrics || []);
  const allDimensions = [
    ...(currentDatasetOntology.dimensions || []),
    ...(currentDatasetOntology.entities || []),
    ...(currentDatasetOntology.dates || [])
  ];

  let cardHtml = "";
  
  // Case A: 1 Dimension found, 0 or multiple Metrics found
  if (mapped.dimensions.length === 1 && mapped.metrics.length !== 1) {
    const dimKey = mapped.dimensions[0];
    const dimName = headerNames[dimKey] || dimKey;
    
    const metricButtons = allMetrics.map(m => {
      const name = headerNames[m.colKey] || m.colKey;
      return `<button class="ai-response-action-btn" onclick="resolveVisualizationClarification('${dimKey}', '${m.colKey}', 'bar', '${prompt.replace(/'/g, "\\'")}')" style="margin: 4px; padding: 6px 12px; font-size:11px;">📈 ${name}</button>`;
    }).join('');

    cardHtml = `
      <div class="ai-analyst-report-card" style="border: 1px solid var(--warning); background: rgba(245,158,11,0.02);">
        <div class="ai-report-header">
          <span class="ai-report-type-badge" style="color:var(--warning); background:rgba(245,158,11,0.12); border-color:rgba(245,158,11,0.25);">❓ Visualization Mapping</span>
          <div class="ai-report-title">Metric Selection Required</div>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 10px 0; line-height: 1.55;">
          I found: <strong>${dimName}</strong> (Dimension)<br/>
          Which metric did you mean?
        </p>
        <div style="display:flex; flex-wrap:wrap; gap: 4px;">
          ${metricButtons}
        </div>
      </div>
    `;
  }
  // Case B: 1 Metric found, 0 or multiple Dimensions found
  else if (mapped.metrics.length === 1 && mapped.dimensions.length !== 1) {
    const metKey = mapped.metrics[0];
    const metName = headerNames[metKey] || metKey;

    const dimButtons = allDimensions.map(d => {
      const name = headerNames[d.colKey] || d.colKey;
      return `<button class="ai-response-action-btn" onclick="resolveVisualizationClarification('${d.colKey}', '${metKey}', 'bar', '${prompt.replace(/'/g, "\\'")}')" style="margin: 4px; padding: 6px 12px; font-size:11px;">🏷️ ${name}</button>`;
    }).join('');

    cardHtml = `
      <div class="ai-analyst-report-card" style="border: 1px solid var(--warning); background: rgba(245,158,11,0.02);">
        <div class="ai-report-header">
          <span class="ai-report-type-badge" style="color:var(--warning); background:rgba(245,158,11,0.12); border-color:rgba(245,158,11,0.25);">❓ Visualization Mapping</span>
          <div class="ai-report-title">Dimension Selection Required</div>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 10px 0; line-height: 1.55;">
          I found: <strong>${metName}</strong> (Metric)<br/>
          Which dimension did you mean?
        </p>
        <div style="display:flex; flex-wrap:wrap; gap: 4px;">
          ${dimButtons}
        </div>
      </div>
    `;
  }
  // Case C: Complete Failure or ambiguity
  else {
    const dimOptions = allDimensions.map(d => `<option value="${d.colKey}">${headerNames[d.colKey] || d.colKey}</option>`).join('');
    const metOptions = allMetrics.map(m => `<option value="${m.colKey}">${headerNames[m.colKey] || m.colKey}</option>`).join('');

    cardHtml = `
      <div class="ai-analyst-report-card" style="border: 1px solid var(--warning); background: rgba(245,158,11,0.02);">
        <div class="ai-report-header">
          <span class="ai-report-type-badge" style="color:var(--warning); background:rgba(245,158,11,0.12); border-color:rgba(245,158,11,0.25);">❓ Visualization Failure</span>
          <div class="ai-report-title">I couldn't confidently identify the requested columns</div>
        </div>
        <p style="font-size: 12px; color: var(--text-secondary); margin: 4px 0 10px 0; line-height: 1.55;">
          Please select a dimension and a metric from the lists below to generate the visualization:
        </p>
        <div style="margin: 8px 0; display: flex; gap: 8px;">
          <select id="select-fallback-dim-${msgId}" class="ai-select" style="flex:1; background:rgba(15,23,42,0.6); border:1px solid var(--border-color); color:var(--text-primary); border-radius:4px; padding:6px; font-size:12px;">
            <option value="">-- Select Dimension --</option>
            ${dimOptions}
          </select>
          <select id="select-fallback-met-${msgId}" class="ai-select" style="flex:1; background:rgba(15,23,42,0.6); border:1px solid var(--border-color); color:var(--text-primary); border-radius:4px; padding:6px; font-size:12px;">
            <option value="">-- Select Metric --</option>
            ${metOptions}
          </select>
        </div>
        <button class="ai-response-action-btn" onclick="submitVisualizationFallback('${msgId}')">📊 Generate Chart</button>
      </div>
    `;
  }

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: "I couldn't map the visualization columns confidently. Please clarify.",
    contentHtml: cardHtml
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 10. VISUALIZATION HANDLER
function handleVisualization(prompt) {
  if (!headers || headers.length === 0) {
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: "No active dataset is loaded. Please load a dataset first.",
      contentHtml: `<p style="font-size:12px; color:var(--text-secondary); margin:0;">⚠️ No active dataset is loaded. Please load a dataset first.</p>`
    });
    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
    return;
  }

  const mapped = findMappedColumnsForViz(prompt);
  const normPrompt = prompt.toLowerCase();

  // If dimension is missing but trend keywords are present, map the date column
  if (mapped.dimensions.length === 0 && (normPrompt.includes("trend") || normPrompt.includes("over time") || normPrompt.includes("monthly") || normPrompt.includes("yearly") || normPrompt.includes("weekly") || normPrompt.includes("daily"))) {
    if (currentDatasetOntology.dates && currentDatasetOntology.dates.length > 0) {
      mapped.dimensions.push(currentDatasetOntology.dates[0].colKey);
    }
  }

  // Visual Safety Validation
  if (mapped.dimensions.length === 1 && mapped.metrics.length === 1) {
    const xCol = mapped.dimensions[0];
    const yCol = mapped.metrics[0];

    let chartType = "bar";
    if (normPrompt.includes("scatter") || normPrompt.includes("correlation") || normPrompt.includes("relationship")) {
      chartType = "scatter";
    } else if (normPrompt.includes("donut") || normPrompt.includes("pie") || normPrompt.includes("contribution") || normPrompt.includes("share")) {
      chartType = "donut";
    } else if (normPrompt.includes("histogram") || normPrompt.includes("distribution")) {
      chartType = "bar";
    } else if (normPrompt.includes("table") || normPrompt.includes("records") || normPrompt.includes("detailed")) {
      chartType = "table";
    } else if ((currentDatasetOntology.dates || []).some(d => d.colKey === xCol) || normPrompt.includes("trend") || normPrompt.includes("over time") || normPrompt.includes("line")) {
      chartType = "line";
    }

    if (!headers.includes(xCol) || !headers.includes(yCol)) {
      renderVisualizationClarificationCard(mapped, prompt);
      return;
    }

    const title = `${headerNames[yCol] || yCol} Breakdown by ${headerNames[xCol] || xCol}`;
    
    // Mandatory console logging before return
    const intent = "Visualization";
    const mappedColumns = { dimension: xCol, metric: yCol };
    const queryPlan = { type: "chart_command", xCol, yCol, chartType };
    console.log({
      intent,
      mappedColumns,
      chartType,
      queryPlan
    });

    const msgId = 'chart-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const chartConfig = buildChartConfigData(chartType, xCol, yCol, title);

    const calcPlan = {
      type: "ranking",
      colKey: yCol,
      xCol: xCol,
      yCol: yCol,
      direction: "top",
      count: 5
    };
    const analysisResult = executeAiCalculation(calcPlan);
    const findingsList = analysisResult.findings || [];
    const recsList = analysisResult.recommendations || [];
    const insightsList = [
      `Analyzing ${headerNames[yCol] || yCol} broken down by ${headerNames[xCol] || xCol} highlights key performance deviations.`,
      `Comparing segments supports optimization choices by pointing out outliers.`
    ];

    const responseHtml = `
      <div class="ai-analyst-report-card">
        <div class="ai-report-header">
          <span class="ai-report-type-badge">📊 Chart Generated</span>
          <div class="ai-report-title">${title}</div>
        </div>
        
        <div class="ai-chart-canvas-wrap" style="height: 220px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin: 12px 0; position: relative;">
          <canvas id="${msgId}" class="ai-chat-canvas"></canvas>
        </div>
        <div class="ai-chart-action-bar" style="display:flex; justify-content:center; gap:6px; margin-bottom:12px;">
          <button class="ai-chart-action-btn" onclick="downloadChatChartPng('${msgId}')">📥 PNG</button>
          <button class="ai-chart-action-btn" onclick="downloadChatChartSvg('${msgId}')">📥 SVG</button>
          <button class="ai-chart-action-btn" onclick="addChatChartToDashboard('${msgId}','${xCol||''}','${yCol||''}','${chartConfig ? chartConfig.chartjsType : 'bar'}')">📌 Add to Dashboard</button>
        </div>

        <div class="ai-report-section">
          <div class="ai-report-section-title">💡 Key Findings</div>
          <ul class="ai-report-list">
            ${findingsList.map(f => `<li style="margin-bottom:4px;color:var(--text-secondary);line-height:1.55;">${f}</li>`).join('') || `<li>Analyzed ${headerNames[yCol]} by ${headerNames[xCol]}.</li>`}
          </ul>
        </div>

        <div class="ai-report-section">
          <div class="ai-report-section-title">🧠 Strategic Insights</div>
          <ul class="ai-report-list">
            ${insightsList.map(i => `<li style="margin-bottom:4px;color:#a5b4fc;line-height:1.55;">${i}</li>`).join('')}
          </ul>
        </div>

        <div class="ai-report-section">
          <div class="ai-report-section-title">🎯 Actionable Recommendations</div>
          <ul class="ai-report-list">
            ${recsList.map(r => `<li style="margin-bottom:4px;color:var(--text-primary);line-height:1.55;">${r}</li>`).join('') || `<li>Add this breakdown to the dashboard for monitoring.</li>`}
          </ul>
        </div>

        <div class="ai-report-actions">
          <button class="ai-response-action-btn" onclick="exportCSVSnapshot()">💾 Export CSV</button>
        </div>
      </div>
    `;

    const suggestions = getSuggestionsForIntent("Visualization", queryPlan);

    aiActiveChatHistory.push({
      sender: 'assistant',
      msgId,
      text: `Generated visualization for ${title}.`,
      contentHtml: responseHtml,
      chartConfig,
      suggestions: suggestions
    });

    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
  } else {
    // If validation fails (0 or multiple dimension/metric columns found)
    renderVisualizationClarificationCard(mapped, prompt);
  }
}

function renderCalculationWarningCard(errorMessage) {
  return `
    <div class="ai-analyst-report-card" style="border: 1px solid #ef4444; background: rgba(239,68,68,0.02);">
      <div class="ai-report-header">
        <span class="ai-report-type-badge" style="color:#ef4444; background:rgba(239,68,68,0.12); border-color:rgba(239,68,68,0.25);">⚠️ Validation Blocked</span>
        <div class="ai-report-title">Aggregating Identifiers Blocked</div>
      </div>
      <p style="font-size: 12px; color: var(--text-secondary); margin: 8px 0; line-height: 1.55;">
        ${errorMessage}
      </p>
    </div>
  `;
}

// 11. METRIC QUERY HANDLER
function handleMetricQuery(prompt) {
  let plan = generateQueryPlan(prompt);
  
  if (plan.type === "disambiguate") {
    const cardHtml = renderDisambiguationCard(plan);
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: plan.reason,
      contentHtml: cardHtml
    });
    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
    return;
  }

  if (plan.type === "query_safety_trigger") {
    const cardHtml = renderQuerySafetyCard(plan);
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: "Profit column missing. Offering safely calculated options.",
      contentHtml: cardHtml
    });
    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
    return;
  }

  if (lastResolvedPlan) {
    plan = mergeConversationalMemory(prompt, lastResolvedPlan);
  }

  if (!plan || (!plan.colKey && plan.op !== 'count')) {
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: "I couldn't map that column metric in the dataset ontology. Please name a metric column.",
      contentHtml: `<p style="font-size:12px; color:var(--text-secondary); margin:0;">⚠️ I couldn't map that column metric in the dataset ontology. Please name a metric column.</p>`
    });
    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
    return;
  }

  lastResolvedPlan = plan;
  updateConversationContext(plan);

  const result = executeAiCalculation(plan);
  if (result.error && result.error.includes("Validation Error")) {
    const warningHtml = renderCalculationWarningCard(result.error);
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: result.error,
      contentHtml: warningHtml
    });
    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
    return;
  }

  const suggestions = getSuggestionsForIntent("MetricQuery", plan);
  const responseHtml = generateHtmlResponse(result);

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: (result.title || "Calculation") + ": " + (result.answer || ""),
    contentHtml: responseHtml,
    suggestions: suggestions
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 12. COMPARISON HANDLER
function handleComparison(prompt) {
  let plan = generateQueryPlan(prompt);
  if (lastResolvedPlan) {
    plan = mergeConversationalMemory(prompt, lastResolvedPlan);
  }
  
  plan.type = "comparison";
  lastResolvedPlan = plan;
  updateConversationContext(plan);

  const result = executeAiCalculation(plan);
  if (result.error && result.error.includes("Validation Error")) {
    const warningHtml = renderCalculationWarningCard(result.error);
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: result.error,
      contentHtml: warningHtml
    });
    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
    return;
  }

  const suggestions = getSuggestionsForIntent("Comparison", plan);
  const responseHtml = generateHtmlResponse(result);

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: (result.title || "Comparison") + ": " + (result.answer || ""),
    contentHtml: responseHtml,
    suggestions: suggestions
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 13. INSIGHT HANDLER
function handleInsight(prompt) {
  let plan = generateQueryPlan(prompt);
  if (lastResolvedPlan) {
    plan = mergeConversationalMemory(prompt, lastResolvedPlan);
  }

  plan.type = "explain";
  lastResolvedPlan = plan;
  updateConversationContext(plan);

  const result = executeAiCalculation(plan);
  if (result.error && result.error.includes("Validation Error")) {
    const warningHtml = renderCalculationWarningCard(result.error);
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: result.error,
      contentHtml: warningHtml
    });
    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
    return;
  }

  const suggestions = getSuggestionsForIntent("Insight", plan);
  const responseHtml = generateHtmlResponse(result);

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: (result.title || "Diagnostic") + ": " + (result.primary || result.answer || ""),
    contentHtml: responseHtml,
    suggestions: suggestions
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// 14. TREND HANDLER
function handleTrend(prompt) {
  let plan = generateQueryPlan(prompt);
  if (lastResolvedPlan) {
    plan = mergeConversationalMemory(prompt, lastResolvedPlan);
  }

  plan.type = "trend";
  lastResolvedPlan = plan;
  updateConversationContext(plan);

  const result = executeAiCalculation(plan);
  if (result.error && result.error.includes("Validation Error")) {
    const warningHtml = renderCalculationWarningCard(result.error);
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: result.error,
      contentHtml: warningHtml
    });
    saveChatHistoryToWorkspace();
    renderAiChatHistory();
    setCopilotState('idle');
    return;
  }

  const suggestions = getSuggestionsForIntent("TrendAnalysis", plan);
  const responseHtml = generateHtmlResponse(result);

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: (result.title || "Trend") + ": " + (result.answer || ""),
    contentHtml: responseHtml,
    suggestions: suggestions
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
  setCopilotState('idle');
}

// Dynamic Header detailing (Domain & Cardinality info)
function updateCopilotHeaderDetails() {
  const nameLabel = document.getElementById('ai-dataset-name-label');
  const rowsLabel = document.getElementById('ai-dataset-rows-label');
  const colsLabel = document.getElementById('ai-dataset-cols-label');
  const statusLabel = document.getElementById('ai-copilot-status');
  
  const datasetNameEl = document.getElementById('ws-dataset-name');
  const datasetName = datasetNameEl ? datasetNameEl.innerText.trim() : "";
  
  if (nameLabel) {
    nameLabel.innerText = datasetName || (gridData && gridData.length > 0 ? "Active Dataset" : "No active dataset");
  }
  if (rowsLabel) {
    rowsLabel.innerText = gridData && gridData.length > 0 ? `${gridData.length.toLocaleString()} rows` : "0 rows";
  }
  if (colsLabel) {
    colsLabel.innerText = headers && headers.length > 0 ? `${headers.length} cols` : "0 cols";
  }
  if (statusLabel) {
    statusLabel.innerText = gridData && gridData.length > 0 ? currentDatasetDomain.name : "Offline";
  }
}

// Base fallback generator
function generateHtmlResponse(result) {
  const confColor = result.confidence === 'High' ? '#10b981' : result.confidence === 'Medium' ? '#f59e0b' : '#ef4444';

  const renderList = (items, clr) => {
    if (!items || items.length === 0) return '';
    return items.map(f => `<li style="margin-bottom:4px;color:${clr || 'var(--text-secondary)'};line-height:1.55;">${f}</li>`).join('');
  };

  const findingsSection = (result.findings && result.findings.length > 0) ? `
    <div class="ai-report-section">
      <div class="ai-report-section-title">&#x1F4A1; Key Findings</div>
      <ul class="ai-report-list">${renderList(result.findings)}</ul>
    </div>` : '';

  const recsSection = (result.recommendations && result.recommendations.length > 0) ? `
    <div class="ai-report-section">
      <div class="ai-report-section-title">&#x1F3AF; Recommendations</div>
      <ul class="ai-report-list">${renderList(result.recommendations, 'var(--text-primary)')}</ul>
    </div>` : '';

  const metaFooter = `
    <div class="ai-report-meta-row">
      ${result.method ? `<div class="ai-report-meta-pill"><span class="ai-report-meta-lbl">METHOD</span><code class="ai-report-method">${result.method}</code></div>` : ''}
      ${result.rowsUsed != null ? `<div class="ai-report-meta-pill"><span class="ai-report-meta-lbl">ROWS</span><span class="ai-report-meta-val">${result.rowsUsed.toLocaleString()}</span></div>` : ''}
      ${result.confidence ? `<div class="ai-report-conf-badge" style="background:${confColor}22;border:1px solid ${confColor}55;"><span style="width:6px;height:6px;border-radius:50%;background:${confColor};display:inline-block;flex-shrink:0;"></span><span style="color:${confColor};font-weight:700;font-size:10px;">${result.confidence} Confidence</span></div>` : ''}
    </div>`;

  // Ranking table
  if (result.type === "table") {
    const rowsHtml = result.items.map(item => `<tr class="ai-rank-row"><td class="ai-rank-num">${item.rank}</td><td class="ai-rank-label">${item.label}</td><td class="ai-rank-value">${item.value}</td></tr>`).join('');
    return `<div class="ai-analyst-report-card">
      <div class="ai-report-header"><span class="ai-report-type-badge">&#x1F4CA; Ranking</span><div class="ai-report-title">${result.title}</div></div>
      <div class="ai-report-answer-block"><div class="ai-report-answer-label">TOP RESULT</div><div class="ai-report-answer-value">${result.answer || '&mdash;'}</div></div>
      <table class="ai-report-rank-table"><thead><tr><th>#</th><th>Item</th><th>Value</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      ${findingsSection}${recsSection}${metaFooter}
      <div class="ai-report-actions">
        <button class="ai-response-action-btn" onclick="renderChatChart({type:'horizontalBar',xCol:'${result.xCol}',yCol:'${result.yCol}'})">&#x1F4CA; View Chart in Chat</button>
        <button class="ai-response-action-btn" onclick="injectTableChart('${result.xCol}','${result.yCol}')">&#x1F4CC; Add to Dashboard</button>
        <button class="ai-response-action-btn" onclick="exportCSVSnapshot()">&#x1F4C5; Export CSV</button>
      </div></div>`;
  }

  // Trend
  if (result.type === "trend") {
    const isUp = (result.answer || '').startsWith('Upward');
    const trendIcon = isUp ? '&#x1F4C8;' : '&#x1F4C9;';
    const trendColor = isUp ? '#10b981' : '#ef4444';
    const chartCfgJson = result.chartConfig ? JSON.stringify(result.chartConfig) : null;
    return `<div class="ai-analyst-report-card">
      <div class="ai-report-header"><span class="ai-report-type-badge">${trendIcon} Trend</span><div class="ai-report-title">${result.title}</div></div>
      <div class="ai-report-answer-block"><div class="ai-report-answer-label">TREND DIRECTION</div><div class="ai-report-answer-value" style="color:${trendColor};">${result.answer || '&mdash;'}</div></div>
      ${result.comparisonHTML ? `<div class="ai-report-comparison-body">${result.comparisonHTML}</div>` : ''}
      ${findingsSection}${recsSection}${metaFooter}
      <div class="ai-report-actions">
        ${chartCfgJson ? `<button class="ai-response-action-btn" id="btn-chat-chart-${Date.now()}" onclick='renderChatChart(${chartCfgJson.replace(/\\/g,"\\\\").replace(/'/g,"&apos;")})'>${trendIcon} View Trend Chart</button>` : ''}
        <button class="ai-response-action-btn" onclick="injectTrendChart('${result.xCol}','${result.yCol}')">&#x1F4CC; Add to Dashboard</button>
      </div></div>`;
  }

  // Comparison / Distribution
  if (result.type === "comparison") {
    return `<div class="ai-analyst-report-card">
      <div class="ai-report-header"><span class="ai-report-type-badge">&#x1F52C; Comparison</span><div class="ai-report-title">${result.title}</div></div>
      <div class="ai-report-answer-block"><div class="ai-report-answer-label">RESULT</div><div class="ai-report-answer-value">${result.answer || '&mdash;'}</div></div>
      ${result.comparisonHTML ? `<div class="ai-report-comparison-body">${result.comparisonHTML}</div>` : ''}
      ${findingsSection}${recsSection}${metaFooter}
      ${result.xCol ? `<div class="ai-report-actions"><button class="ai-response-action-btn" onclick="renderChatChart({type:'bar',xCol:'${result.xCol}',yCol:'${result.yCol}'})">&#x1F4CA; View Chart in Chat</button></div>` : ''}
    </div>`;
  }

  // Root-cause Explain
  if (result.type === "explain") {
    return `<div class="ai-analyst-report-card">
      <div class="ai-report-header"><span class="ai-report-type-badge">&#x1F50E; Diagnostic</span><div class="ai-report-title">${result.title}</div></div>
      <div class="ai-report-answer-block"><div class="ai-report-answer-label">PRIMARY FINDING</div><div class="ai-report-answer-value" style="font-size:13px;">${result.primary || result.answer || '&mdash;'}</div></div>
      <div class="ai-report-explain-block">
        ${result.secondary ? `<div class="ai-report-explain-row"><span class="ai-report-explain-tag secondary">Secondary Cause</span><span>${result.secondary}</span></div>` : ''}
        ${result.riskItem ? `<div class="ai-report-explain-row"><span class="ai-report-explain-tag risk">Risk</span><span style="color:#f59e0b;">${result.riskItem}</span></div>` : ''}
      </div>
      ${findingsSection}${recsSection}${metaFooter}
    </div>`;
  }

  // Standard Aggregation (default)
  return `<div class="ai-analyst-report-card">
    <div class="ai-report-header"><span class="ai-report-type-badge">&#x1F522; Calculation</span><div class="ai-report-title">${result.title}</div></div>
    <div class="ai-report-answer-block"><div class="ai-report-answer-label">RESULT</div><div class="ai-report-answer-value">${result.answer || '&mdash;'}</div></div>
    ${findingsSection}${recsSection}${metaFooter}
    ${result.colKey && result.colKey !== 'null' ? `<div class="ai-report-actions"><button class="ai-response-action-btn" onclick="injectKpiCard('${result.colKey}','${result.op||'sum'}')">&#x1F522; Add KPI Card</button></div>` : ''}
  </div>`;
}

// Analyst Reasoning Engine & recommendations builders
const _origGenerateHtmlResponse = generateHtmlResponse;
generateHtmlResponse = function(result) {
  const confColor = result.confidence === 'High' ? '#10b981' : result.confidence === 'Medium' ? '#f59e0b' : '#ef4444';

  const renderList = (items, clr) => {
    if (!items || items.length === 0) return '';
    return items.map(f => `<li style="margin-bottom:4px;color:${clr || 'var(--text-secondary)'};line-height:1.55;">${f}</li>`).join('');
  };

  // Layers 8 & 12: Add Analyst summary
  const findingsSection = (result.findings && result.findings.length > 0) ? `
    <div class="ai-report-section">
      <div class="ai-report-section-title">💡 Key Findings</div>
      <ul class="ai-report-list">${renderList(result.findings)}</ul>
    </div>` : '';

  const insightsSection = (result.insights && result.insights.length > 0) ? `
    <div class="ai-report-section">
      <div class="ai-report-section-title">🧠 Strategic Insights</div>
      <ul class="ai-report-list">${renderList(result.insights, '#a5b4fc')}</ul>
    </div>` : '';

  const recsSection = (result.recommendations && result.recommendations.length > 0) ? `
    <div class="ai-report-section">
      <div class="ai-report-section-title">🎯 Actionable Recommendations</div>
      <ul class="ai-report-list">${renderList(result.recommendations, 'var(--text-primary)')}</ul>
    </div>` : '';

  const metaFooter = `
    <div class="ai-report-meta-row">
      ${result.method ? `<div class="ai-report-meta-pill"><span class="ai-report-meta-lbl">METHOD</span><code class="ai-report-method">${result.method}</code></div>` : ''}
      ${result.rowsUsed != null ? `<div class="ai-report-meta-pill"><span class="ai-report-meta-lbl">ROWS</span><span class="ai-report-meta-val">${result.rowsUsed.toLocaleString()}</span></div>` : ''}
      ${result.confidence ? `<div class="ai-report-conf-badge" style="background:${confColor}22;border:1px solid ${confColor}55;"><span style="width:6px;height:6px;border-radius:50%;background:${confColor};display:inline-block;flex-shrink:0;"></span><span style="color:${confColor};font-weight:700;font-size:10px;margin-left:4px;">${result.confidence} Confidence</span></div>` : ''}
    </div>`;

  if (result.type === "table") {
    const rowsHtml = result.items.map(item => `<tr class="ai-rank-row"><td class="ai-rank-num">${item.rank}</td><td class="ai-rank-label">${item.label}</td><td class="ai-rank-value">${item.value}</td></tr>`).join('');
    return `<div class="ai-analyst-report-card">
      <div class="ai-report-header"><span class="ai-report-type-badge">📊 Ranking</span><div class="ai-report-title">${result.title}</div></div>
      <div class="ai-report-answer-block"><div class="ai-report-answer-label">TOP RESULT</div><div class="ai-report-answer-value">${result.answer || '&mdash;'}</div></div>
      <table class="ai-report-rank-table"><thead><tr><th>#</th><th>Item</th><th>Value</th></tr></thead><tbody>${rowsHtml}</tbody></table>
      ${findingsSection}${insightsSection}${recsSection}${metaFooter}
      <div class="ai-report-actions">
        <button class="ai-response-action-btn" onclick="renderChatChart({type:'horizontalBar',xCol:'${result.xCol}',yCol:'${result.yCol}'})">📊 View Chart in Chat</button>
        <button class="ai-response-action-btn" onclick="injectTableChart('${result.xCol}','${result.yCol}')">📌 Add to Dashboard</button>
        <button class="ai-response-action-btn" onclick="exportCSVSnapshot()">💾 Export CSV</button>
      </div></div>`;
  }

  if (result.type === "trend") {
    const isUp = (result.answer || '').startsWith('Upward');
    const trendIcon = isUp ? '📈' : '📉';
    const trendColor = isUp ? '#10b981' : '#ef4444';
    const chartCfgJson = result.chartConfig ? JSON.stringify(result.chartConfig) : null;
    return `<div class="ai-analyst-report-card">
      <div class="ai-report-header"><span class="ai-report-type-badge">${trendIcon} Trend</span><div class="ai-report-title">${result.title}</div></div>
      <div class="ai-report-answer-block"><div class="ai-report-answer-label">TREND DIRECTION</div><div class="ai-report-answer-value" style="color:${trendColor};">${result.answer || '&mdash;'}</div></div>
      ${result.comparisonHTML ? `<div class="ai-report-comparison-body">${result.comparisonHTML}</div>` : ''}
      ${findingsSection}${insightsSection}${recsSection}${metaFooter}
      <div class="ai-report-actions">
        ${chartCfgJson ? `<button class="ai-response-action-btn" onclick='renderChatChart(${chartCfgJson.replace(/\\/g,"\\\\").replace(/'/g,"&apos;")})'>${trendIcon} View Trend Chart</button>` : ''}
        <button class="ai-response-action-btn" onclick="injectTrendChart('${result.xCol}','${result.yCol}')">📌 Add to Dashboard</button>
      </div></div>`;
  }

  if (result.type === "comparison") {
    return `<div class="ai-analyst-report-card">
      <div class="ai-report-header"><span class="ai-report-type-badge">🔬 Comparison</span><div class="ai-report-title">${result.title}</div></div>
      <div class="ai-report-answer-block"><div class="ai-report-answer-label">RESULT</div><div class="ai-report-answer-value">${result.answer || '&mdash;'}</div></div>
      ${result.comparisonHTML ? `<div class="ai-report-comparison-body">${result.comparisonHTML}</div>` : ''}
      ${findingsSection}${insightsSection}${recsSection}${metaFooter}
      ${result.xCol ? `<div class="ai-report-actions"><button class="ai-response-action-btn" onclick="renderChatChart({type:'bar',xCol:'${result.xCol}',yCol:'${result.yCol}'})">📊 View Chart in Chat</button></div>` : ''}
    </div>`;
  }

  if (result.type === "explain") {
    return `<div class="ai-analyst-report-card">
      <div class="ai-report-header"><span class="ai-report-type-badge">🔎 Diagnostic</span><div class="ai-report-title">${result.title}</div></div>
      <div class="ai-report-answer-block"><div class="ai-report-answer-label">PRIMARY FINDING</div><div class="ai-report-answer-value" style="font-size:13px;">${result.primary || result.answer || '&mdash;'}</div></div>
      <div class="ai-report-explain-block">
        ${result.secondary ? `<div class="ai-report-explain-row"><span class="ai-report-explain-tag secondary">Secondary Cause</span><span>${result.secondary}</span></div>` : ''}
        ${result.riskItem ? `<div class="ai-report-explain-row"><span class="ai-report-explain-tag risk">Risk</span><span style="color:#f59e0b;">${result.riskItem}</span></div>` : ''}
      </div>
      ${findingsSection}${insightsSection}${recsSection}${metaFooter}
    </div>`;
  }

  // Base fallback calculation rendering with insights section
  const baseCalculationsCard = `<div class="ai-analyst-report-card">
    <div class="ai-report-header"><span class="ai-report-type-badge">&#x1F522; Calculation</span><div class="ai-report-title">${result.title}</div></div>
    <div class="ai-report-answer-block"><div class="ai-report-answer-label">RESULT</div><div class="ai-report-answer-value">${result.answer || '&mdash;'}</div></div>
    ${findingsSection}${insightsSection}${recsSection}${metaFooter}
    ${result.colKey && result.colKey !== 'null' ? `<div class="ai-report-actions"><button class="ai-response-action-btn" onclick="injectKpiCard('${result.colKey}','${result.op||'sum'}')">&#x1F522; Add KPI Card</button></div>` : ''}
  </div>`;

  return baseCalculationsCard;
};

function renderPastConversationsList() {
  const container = document.getElementById('ai-conversations-list');
  if (!container) return;

  openDB().then(db => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = (e) => {
      const workspaces = e.target.result || [];
      const withHistory = workspaces.filter(w => w.aiHistory && w.aiHistory.length > 0);
      
      if (withHistory.length === 0) {
        container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 8px 0; font-size: 11px;">No past conversations saved.</div>`;
        return;
      }

      container.innerHTML = withHistory.map(w => {
        const lastMsg = w.aiHistory[w.aiHistory.length - 1];
        const snippet = lastMsg.text.length > 30 ? lastMsg.text.substring(0, 30) + '...' : lastMsg.text;
        return `
          <div class="ai-history-item" onclick="loadWorkspaceAndChat('${w.workspaceId}')">
            <div style="display:flex; flex-direction:column; overflow:hidden;">
              <span style="font-weight:600; color:var(--text-primary); text-overflow:ellipsis; white-space:nowrap; overflow:hidden;">${w.workspaceName}</span>
              <span style="font-size:9.5px; color:var(--text-muted); text-overflow:ellipsis; white-space:nowrap; overflow:hidden;">${snippet}</span>
            </div>
            <span style="font-size:9px; color:var(--primary);">❯</span>
          </div>
        `;
      }).join('');
    };
  });
}

window.loadWorkspaceAndChat = function(wsId) {
  if (typeof openWorkspace === 'function') {
    openWorkspace(wsId);
    setTimeout(() => {
      if (typeof toggleAiCopilot === 'function') toggleAiCopilot(true);
    }, 300);
  }
};

function saveChatHistoryToWorkspace() {
  if (!currentWorkspaceId) return;
  openDB().then(db => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(currentWorkspaceId);
    getReq.onsuccess = (e) => {
      const ws = e.target.result;
      if (ws) {
        ws.aiHistory = aiActiveChatHistory;
        store.put(ws);
        renderPastConversationsList();
      }
    };
  });
}


// Workspace state loading welcome snapshot card
function generateDatasetSnapshotHtml() {
  const datasetNameEl = document.getElementById('ws-dataset-name');
  const datasetName = datasetNameEl ? datasetNameEl.innerText.trim() : "raw_dataset";
  
  if (!gridData || gridData.length === 0) {
    return `
      <div class="ai-message assistant" style="display: flex; gap: 12px; max-width: 85%;">
        <div class="ai-msg-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">🤖</div>
        <div class="ai-msg-body" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 0 12px 12px 12px; padding: 12px 16px;">
          <h3 style="font-size: 13.5px; font-weight: 700; margin: 0 0 6px 0; color: var(--text-primary);">Welcome to OneClick Copilot v3</h3>
          <p style="font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.5;">
            Please load a dataset workspace to start analyzing. I can perform metrics calculations, visualization edits, data cleansing, and report exports.
          </p>
        </div>
      </div>
    `;
  }
  
  const profile = profileColumns();
  
  let missing = 0;
  gridData.forEach(row => {
    row.forEach(cell => {
      if (cell === undefined || cell === null || String(cell).trim() === "") missing++;
    });
  });
  const totalCells = gridData.length * headers.length;
  const missingPct = totalCells > 0 ? ((missing / totalCells) * 100).toFixed(1) : 0;
  
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
  
  const missingPenalty = totalCells > 0 ? (missing / totalCells) * 100 : 0;
  const duplicatePenalty = gridData.length > 0 ? (duplicates / gridData.length) * 100 : 0;
  const qualityScore = Math.max(0, Math.round(100 - missingPenalty - duplicatePenalty));
  const qualityColor = qualityScore >= 80 ? 'var(--success, #10b981)' : qualityScore >= 50 ? 'var(--warning, #f59e0b)' : 'var(--error, #ef4444)';

  const numColNames = profile.numCols.map(c => headerNames[c] || c).join(', ');
  const dimColNames = [...profile.catCols, ...profile.dateCols, ...profile.textCols].map(c => headerNames[c] || c).join(', ');
  
  let topCategoryInfo = "N/A";
  const catCol = profile.catCols[0];
  const numCol = profile.numCols[0];
  if (catCol && numCol) {
    const catIdx = headers.indexOf(catCol);
    const numIdx = headers.indexOf(numCol);
    if (catIdx !== -1 && numIdx !== -1) {
      const catSums = {};
      gridData.forEach(row => {
        const c = String(row[catIdx] || "Unknown").trim();
        const v = getCleanNumericValue(row[numIdx]);
        if (!isNaN(v)) {
          catSums[c] = (catSums[c] || 0) + v;
        }
      });
      const sorted = Object.entries(catSums).sort((a,b) => b[1] - a[1]);
      if (sorted.length > 0) {
        topCategoryInfo = `${sorted[0][0]} (${formatKpiValue(sorted[0][1], numCol, 'sum')})`;
      }
    }
  }

  return `
    <div class="ai-message assistant" style="display: flex; gap: 12px; max-width: 90%;">
      <div class="ai-msg-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">🤖</div>
      <div class="ai-msg-body" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; width: 100%;">
        <div style="font-weight: 700; font-size: 13.5px; color: var(--primary); margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          📊 Dataset Grounding Snapshot: <span style="color: #ffffff;">${datasetName}</span>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 14px; background: rgba(0, 0, 0, 0.2); padding: 10px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.04);">
          <div style="font-size: 11px;"><span style="color: var(--text-muted);">Rows:</span> <strong style="color: #ffffff;">${gridData.length.toLocaleString()}</strong></div>
          <div style="font-size: 11px;"><span style="color: var(--text-muted);">Columns:</span> <strong style="color: #ffffff;">${headers.length}</strong></div>
          <div style="font-size: 11px;"><span style="color: var(--text-muted);">Missing:</span> <strong style="color: #ffffff;">${missing.toLocaleString()} (${missingPct}%)</strong></div>
          <div style="font-size: 11px;"><span style="color: var(--text-muted);">Duplicates:</span> <strong style="color: #ffffff;">${duplicates.toLocaleString()}</strong></div>
          <div style="font-size: 11px; grid-column: span 2;"><span style="color: var(--text-muted);">Quality Score:</span> <strong style="color: ${qualityColor};">${qualityScore}%</strong></div>
        </div>

        <div style="font-size: 11.5px; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; border-top: 1px solid rgba(255, 255, 255, 0.04); padding-top: 8px; text-align: left;">
          <div><strong>Metric Columns:</strong> <span style="font-size: 10.5px; color: var(--text-muted);">${numColNames || 'None'}</span></div>
          <div><strong>Dimension Fields:</strong> <span style="font-size: 10.5px; color: var(--text-muted);">${dimColNames || 'None'}</span></div>
          <div><strong>Top Category Segment:</strong> <span style="font-size: 11px; color: #ffffff;">${topCategoryInfo}</span></div>
        </div>

        <div style="display: flex; flex-wrap: wrap; gap: 6px; border-top: 1px solid rgba(255, 255, 255, 0.04); padding-top: 10px;">
          <button class="ai-response-action-btn" onclick="setAiPrompt('What is total revenue?')" style="font-size: 10px; padding: 5px 8px;">🔢 Calculate Revenue</button>
          <button class="ai-response-action-btn" onclick="setAiPrompt('Show top customers')" style="font-size: 10px; padding: 5px 8px;">📊 Rank Customers</button>
          <button class="ai-response-action-btn" onclick="setAiPrompt('Show revenue trend over time')" style="font-size: 10px; padding: 5px 8px;">📈 Trend Chart</button>
          <button class="ai-response-action-btn" onclick="setAiPrompt('Generate executive summary')" style="font-size: 10px; padding: 5px 8px;">📄 Executive Summary</button>
        </div>
      </div>
    </div>
  `;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Chat rendering loop
window.renderAiChatHistory = function() {
  const feed = document.getElementById('ai-chat-feed');
  if (!feed) return;

  let html = generateDatasetSnapshotHtml();

  if (aiActiveChatHistory.length === 0) {
    html += `
      <div class="ai-drawer-suggestions-wrapper" style="margin-top: 12px;">
        <div class="ai-drawer-suggestions-title">Conversational Starters</div>
        <div class="ai-drawer-suggestions-grid">
          <button class="ai-drawer-suggest-btn" onclick="setAiPrompt('What is total revenue?')">What is total revenue?</button>
          <button class="ai-drawer-suggest-btn" onclick="setAiPrompt('Show top customers')">Show top customers</button>
          <button class="ai-drawer-suggest-btn" onclick="setAiPrompt('Show revenue trend over time')">Show revenue trend over time</button>
          <button class="ai-drawer-suggest-btn" onclick="setAiPrompt('Generate executive summary')">Generate executive summary</button>
          <button class="ai-drawer-suggest-btn" onclick="setAiPrompt('Why did sales decline?')">Why did sales decline?</button>
        </div>
      </div>
    `;
  } else {
    aiActiveChatHistory.forEach((msg, msgIdx) => {
      const isUser = msg.sender === 'user';
      const avatar = isUser ? '👨‍💻' : '🤖';
      const msgClass = isUser ? 'user' : 'assistant';

      if (!isUser && msg.chartConfig) {
        const chartId = msg.msgId || ('chart-' + msgIdx);
        const { chartjsType, indexAxis, label, xCol, yCol } = msg.chartConfig;
        
        if (msg.contentHtml) {
          html += `
            <div class="ai-message assistant" style="display: flex; gap: 12px; max-width: 95%; margin-top: 10px;">
              <div class="ai-msg-avatar" style="width: 28px; height: 28px; border-radius: 50%; background: var(--primary); display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">🤖</div>
              <div class="ai-msg-body" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: 0 12px 12px 12px; flex:1; min-width:0;">
                ${msg.contentHtml}
              </div>
            </div>`;
        } else {
          html += `
            <div class="ai-message assistant" style="display:flex;gap:12px;max-width:95%;margin-top:10px;">
              <div class="ai-msg-avatar" style="width:28px;height:28px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">🤖</div>
              <div class="ai-chart-wrapper-card">
                <div class="ai-chart-card-title">${label || 'Chart'}</div>
                <div class="ai-chart-canvas-wrap">
                  <canvas id="${chartId}" class="ai-chat-canvas"></canvas>
                </div>
                <div class="ai-chart-action-bar">
                  <button class="ai-chart-action-btn" onclick="downloadChatChartPng('${chartId}')">📥 PNG</button>
                  <button class="ai-chart-action-btn" onclick="downloadChatChartSvg('${chartId}')">📥 SVG</button>
                  <button class="ai-chart-action-btn" onclick="downloadChatChartPdf('${chartId}')">📥 PDF</button>
                  <button class="ai-chart-action-btn" onclick="addChatChartToDashboard('${chartId}','${xCol||''}','${yCol||''}','${chartjsType}')">📌 Add to Dashboard</button>
                  <button class="ai-chart-action-btn" onclick="copyChatChartInsight('${chartId}')">📋 Copy Info</button>
                </div>
              </div>
            </div>`;
        }
      } else {
        html += `
          <div class="ai-message ${msgClass}" style="display: flex; gap: 12px; max-width: 92%; margin-top: 10px;">
            <div class="ai-msg-avatar" style="width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0;">${avatar}</div>
            <div class="ai-msg-body" style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); padding: 12px 16px; border-radius: ${isUser ? '12px 0 12px 12px' : '0 12px 12px 12px'}; flex:1; min-width:0;">
              ${msg.contentHtml || `<p style="font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.5;">${escapeHTML(msg.text)}</p>`}
            </div>
          </div>`;
      }
    });

    // Follow-up suggestions rendering
    const lastMsg = aiActiveChatHistory[aiActiveChatHistory.length - 1];
    if (lastMsg && lastMsg.sender === 'assistant' && lastMsg.suggestions && lastMsg.suggestions.length > 0) {
      html += `
        <div class="ai-drawer-suggestions-wrapper" style="margin-top: 12px; padding: 0 12px 12px 12px; animation: slideUp 0.3s ease-out;">
          <div class="ai-drawer-suggestions-title" style="font-size: 10px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 6px;">Suggested Follow-ups</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${lastMsg.suggestions.map(s => {
              const safeText = escapeHTML(s);
              const jsArg = s.replace(/'/g, "\\'");
              return `<button class="ai-response-action-btn" onclick="setAiPrompt('${jsArg}')" style="font-size: 10.5px; padding: 5px 8px; border-radius: 16px;">${safeText}</button>`;
            }).join('')}
          </div>
        </div>`;
    }
  }

  feed.innerHTML = html;
  feed.scrollTop = feed.scrollHeight;

  // Build ChartJS canvas layers
  if (typeof Chart !== 'undefined') {
    aiActiveChatHistory.forEach((msg, msgIdx) => {
      if (msg.sender !== 'assistant' || !msg.chartConfig) return;
      const chartId = msg.msgId || ('chart-' + msgIdx);
      const canvas = document.getElementById(chartId);
      if (!canvas) return;

      if (window.chatChartInstances && window.chatChartInstances[chartId]) {
        try { window.chatChartInstances[chartId].destroy(); } catch(e) {}
      }

      const { chartjsType, indexAxis, label, chartData } = msg.chartConfig;
      try {
        const instance = new Chart(canvas, {
          type: chartjsType || 'bar',
          data: chartData,
          options: {
            indexAxis: indexAxis || 'x',
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: 'easeOutQuart' },
            plugins: {
              legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { size: 11 }, boxWidth: 12 } },
              tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(15,23,42,0.92)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
            },
            scales: chartjsType === 'pie' || chartjsType === 'doughnut' ? {} : {
              x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 }, maxRotation: 45 } },
              y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', font: { size: 10 } } }
            }
          }
        });
        window.chatChartInstances[chartId] = instance;
      } catch(e) { console.warn('ChartJS paint error:', e); }
    });
  }
};

function getCopilotPositionClass() {
  const pos = localStorage.getItem('oneclick_copilot_position') || 'Right';
  return pos.toLowerCase() === 'left' ? 'fab-bottom-left' : 'fab-bottom-right';
}

window.toggleAiCopilot = function(forceOpen) {
  const drawer = document.getElementById('oneclick-copilot-panel');
  const fab = document.getElementById('oneclick-copilot-fab');
  if (!drawer || !fab) return;

  const isOpen = drawer.classList.contains('open');
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;
  const posClass = getCopilotPositionClass();

  if (shouldOpen) {
    drawer.className = `ai-copilot-panel ${posClass} open`;
    setCopilotState('idle');
    
    // Auto focus textarea
    const input = document.getElementById('ai-prompt-input');
    if (input) {
      setTimeout(() => {
        input.focus();
      }, 200);
    }
    
    updateCopilotHeaderDetails();
    
    const badge = document.getElementById('ai-copilot-badge');
    if (badge) badge.style.display = 'none';
  } else {
    drawer.className = `ai-copilot-panel ${posClass}`;
    setCopilotState('idle');
  }
};

window.toggleCopilotSide = function() {
  const currentPos = localStorage.getItem('oneclick_copilot_position') || 'Right';
  const newPos = currentPos.toLowerCase() === 'right' ? 'Left' : 'Right';
  localStorage.setItem('oneclick_copilot_position', newPos);
  
  const posClass = newPos.toLowerCase() === 'left' ? 'fab-bottom-left' : 'fab-bottom-right';
  const oldPosClass = newPos.toLowerCase() === 'left' ? 'fab-bottom-right' : 'fab-bottom-left';
  
  const fab = document.getElementById('oneclick-copilot-fab');
  const drawer = document.getElementById('oneclick-copilot-panel');
  
  if (fab) {
    fab.classList.remove(oldPosClass);
    fab.classList.add(posClass);
  }
  if (drawer) {
    drawer.classList.remove(oldPosClass);
    drawer.classList.add(posClass);
  }
  
  showToast(`Copilot panel moved to the ${newPos.toLowerCase()} side!`, "success");
};

window.chatChartInstances = window.chatChartInstances || {};

window.resolveVisualizationClarification = function(xCol, yCol, chartType, prompt) {
  setCopilotState('thinking');
  setTimeout(() => {
    if (!xCol || !yCol) {
      aiActiveChatHistory.push({
        sender: 'assistant',
        text: "Error: A chart cannot be generated without a dimension and a metric.",
        contentHtml: `<p style="font-size:12px; color:var(--text-secondary); margin:0;">⚠️ Error: A chart cannot be generated without a dimension and a metric.</p>`
      });
      renderAiChatHistory();
      setCopilotState('idle');
      return;
    }

    const title = `${headerNames[yCol] || yCol} Breakdown by ${headerNames[xCol] || xCol}`;
    
    // Mandatory console logging before return
    const intent = "Visualization";
    const mappedColumns = { dimension: xCol, metric: yCol };
    const queryPlan = { type: "chart_command", xCol, yCol, chartType };
    console.log({
      intent,
      mappedColumns,
      chartType,
      queryPlan
    });

    const cfg = { type: chartType || 'bar', xCol, yCol, label: title };
    window.renderChatChart(cfg);
    setCopilotState('idle');
  }, 300);
};

window.submitVisualizationFallback = function(msgId) {
  const dimSelect = document.getElementById(`select-fallback-dim-${msgId}`);
  const metSelect = document.getElementById(`select-fallback-met-${msgId}`);
  if (!dimSelect || !metSelect) return;

  const xCol = dimSelect.value;
  const yCol = metSelect.value;
  
  if (!xCol || !yCol) {
    showToast("Please select both a dimension and a metric.", "warning");
    return;
  }

  window.resolveVisualizationClarification(xCol, yCol, 'bar', '');
};

window.renderChatChart = function(cfg) {
  const chartConfig = buildChartConfigData(cfg.type, cfg.xCol, cfg.yCol, cfg.label);
  if (!chartConfig) return;

  const msgId = 'chart-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  
  const calcPlan = {
    type: "ranking",
    colKey: cfg.yCol,
    xCol: cfg.xCol,
    yCol: cfg.yCol,
    direction: "top",
    count: 5
  };
  const analysisResult = executeAiCalculation(calcPlan);
  
  const findingsList = analysisResult.findings || [];
  const recsList = analysisResult.recommendations || [];
  const insightsList = [
    `Analyzing ${headerNames[cfg.yCol] || cfg.yCol} by ${headerNames[cfg.xCol] || cfg.xCol} highlights key performance deviations.`,
    `Comparing segment sizes assists in strategic allocation of resources.`
  ];

  const responseHtml = `
    <div class="ai-analyst-report-card">
      <div class="ai-report-header">
        <span class="ai-report-type-badge">📊 Chart Generated</span>
        <div class="ai-report-title">${cfg.label || (headerNames[cfg.yCol] || cfg.yCol) + ' by ' + (headerNames[cfg.xCol] || cfg.xCol)}</div>
      </div>
      <div class="ai-chart-canvas-wrap" style="height: 220px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin: 12px 0; position: relative;">
        <canvas id="${msgId}" class="ai-chat-canvas"></canvas>
      </div>
      <div class="ai-chart-action-bar" style="display:flex; justify-content:center; gap:6px; margin-bottom:12px;">
        <button class="ai-chart-action-btn" onclick="downloadChatChartPng('${msgId}')">📥 PNG</button>
        <button class="ai-chart-action-btn" onclick="downloadChatChartSvg('${msgId}')">📥 SVG</button>
        <button class="ai-chart-action-btn" onclick="addChatChartToDashboard('${msgId}','${cfg.xCol||''}','${cfg.yCol||''}','${chartConfig.chartjsType}')">📌 Add to Dashboard</button>
      </div>
      
      <div class="ai-report-section">
        <div class="ai-report-section-title">💡 Key Findings</div>
        <ul class="ai-report-list">
          ${findingsList.map(f => `<li style="margin-bottom:4px;color:var(--text-secondary);line-height:1.55;">${f}</li>`).join('') || `<li>Analyzed ${headerNames[cfg.yCol]} by ${headerNames[cfg.xCol]}.</li>`}
        </ul>
      </div>

      <div class="ai-report-section">
        <div class="ai-report-section-title">🧠 Strategic Insights</div>
        <ul class="ai-report-list">
          ${insightsList.map(i => `<li style="margin-bottom:4px;color:#a5b4fc;line-height:1.55;">${i}</li>`).join('')}
        </ul>
      </div>

      <div class="ai-report-section">
        <div class="ai-report-section-title">🎯 Actionable Recommendations</div>
        <ul class="ai-report-list">
          ${recsList.map(r => `<li style="margin-bottom:4px;color:var(--text-primary);line-height:1.55;">${r}</li>`).join('') || `<li>Monitor this breakdown in your reports.</li>`}
        </ul>
      </div>
    </div>
  `;

  aiActiveChatHistory.push({
    sender: 'assistant',
    msgId,
    text: `Rendered chart for ${cfg.label || (headerNames[cfg.yCol] || cfg.yCol)}`,
    contentHtml: responseHtml,
    chartConfig,
    suggestions: ["Add to Dashboard", "Export CSV", "Generate report"]
  });

  saveChatHistoryToWorkspace();
  renderAiChatHistory();
};


function executeExportCommand(plan) {
  let formatName = "";
  try {
    if (plan.format === "pdf") {
      formatName = "PDF Report";
      if (typeof exportToPDF === 'function') exportToPDF();
      else throw new Error("PDF exporter not available.");
    } else if (plan.format === "pptx") {
      formatName = "PowerPoint Report";
      if (typeof exportToPPTX === 'function') exportToPPTX();
      else throw new Error("PPTX exporter not available.");
    } else if (plan.format === "docx") {
      formatName = "Word Document";
      if (typeof exportToWord === 'function') exportToWord();
      else throw new Error("Word exporter not available.");
    } else if (plan.format === "json") {
      formatName = "Dashboard JSON Layout";
      if (typeof exportDashboardJSON === 'function') exportDashboardJSON();
      else throw new Error("Dashboard JSON exporter not available.");
    } else {
      formatName = "CSV Spreadsheet";
      if (typeof exportCSVSnapshot === 'function') exportCSVSnapshot();
      else throw new Error("CSV exporter not available.");
    }
    
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: `Triggered export for ${formatName}.`,
      contentHtml: `
        <div style="font-size:12px; color:var(--text-primary);">
          📤 <strong>Export Triggered:</strong> Successfully started generating and exporting your <strong>${formatName}</strong>. Check your downloads!
        </div>
      `
    });
  } catch (err) {
    aiActiveChatHistory.push({
      sender: 'assistant',
      text: `Failed to export: ${err.message}`,
      contentHtml: `
        <div style="font-size:12px; color:var(--error);">
          ❌ <strong>Export Failed:</strong> ${err.message}
        </div>
      `
    });
  }
}

function executeReportGeneration(plan, reportTitle = "Executive Synthesis Summary") {
  const stats = runStatisticalInsights();
  const datasetNameEl = document.getElementById('ws-dataset-name');
  const datasetName = datasetNameEl ? datasetNameEl.innerText.trim() : "Dataset";
  
  const totalRows = gridData.length;
  const colCount = headers.length;
  
  let totalNumVal = 0;
  const numCol = currentDatasetContext.numericColumns[0];
  if (numCol) {
    const colIdx = headers.indexOf(numCol);
    gridData.forEach(row => {
      const v = getCleanNumericValue(row[colIdx]);
      if (!isNaN(v)) totalNumVal += v;
    });
  }
  
  const numColLabel = numCol ? (headerNames[numCol] || numCol) : "Records";
  const formattedTotal = numCol ? formatKpiValue(totalNumVal, numCol, "sum") : totalRows.toLocaleString();
  
  const findingsList = stats.findings.map(f => `<li>🔍 ${f}</li>`).join('') || "<li>🔍 No major anomalies detected.</li>";
  const risksList = stats.risks.map(r => `<li>⚠️ ${r}</li>`).join('') || "<li>✅ No significant concentration risks identified.</li>";
  const recommendationsList = stats.recommendations.map(rec => `<li>🎯 ${rec}</li>`).join('') || "<li>🎯 Continue regular metrics monitoring.</li>";

  const contentHtml = `
    <div class="ai-msg-response-card report-card" style="background: rgba(255,255,255,0.015); border:1px solid var(--border-color); border-radius: 10px; padding: 16px; width: 100%;">
      <div style="font-weight: 700; font-size:13.5px; color:var(--primary); margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.06); padding-bottom:6px; display:flex; align-items:center; gap:8px;">
        📝 ${reportTitle}: ${datasetName}
      </div>
      
      <div style="margin-bottom:12px;">
        <h4 style="font-size:11.5px; margin:0 0 6px 0; color:var(--text-primary); font-weight: 700;">📊 Dataset Overview</h4>
        <div style="display:flex; gap:16px; background:rgba(0,0,0,0.15); padding:8px 12px; border-radius:6px; font-size:11px;">
          <div><span style="color:var(--text-muted);">Rows:</span> <strong>${totalRows.toLocaleString()}</strong></div>
          <div><span style="color:var(--text-muted);">Columns:</span> <strong>${colCount}</strong></div>
          <div><span style="color:var(--text-muted);">Total ${numColLabel}:</span> <strong>${formattedTotal}</strong></div>
        </div>
      </div>

      <div style="margin-bottom:12px;">
        <h4 style="font-size:11.5px; margin:0 0 6px 0; color:var(--text-primary); font-weight: 700;">💡 Key Findings</h4>
        <ul style="margin:0; padding-left:16px; font-size:11.5px; color:var(--text-secondary); line-height:1.5;">
          ${findingsList}
        </ul>
      </div>

      <div style="margin-bottom:12px;">
        <h4 style="font-size:11.5px; margin:0 0 6px 0; color:var(--text-primary); font-weight: 700;">⚠️ Identified Risks</h4>
        <ul style="margin:0; padding-left:16px; font-size:11.5px; color:var(--text-secondary); line-height:1.5;">
          ${risksList}
        </ul>
      </div>

      <div style="margin-bottom:14px;">
        <h4 style="font-size:11.5px; margin:0 0 6px 0; color:var(--text-primary); font-weight: 700;">🎯 Strategic Recommendations</h4>
        <ul style="margin:0; padding-left:16px; font-size:11.5px; color:var(--text-secondary); line-height:1.5;">
          ${recommendationsList}
        </ul>
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.06); padding-top:10px; display:flex; flex-wrap:wrap; gap:6px;">
        <button class="ai-response-action-btn" onclick="executeExportCommand({type:'export_command', format:'pdf'})">📥 Export PDF</button>
        <button class="ai-response-action-btn" onclick="executeExportCommand({type:'export_command', format:'pptx'})">📊 PPTX Slides</button>
        <button class="ai-response-action-btn" onclick="executeExportCommand({type:'export_command', format:'docx'})">📄 Word Doc</button>
        <button class="ai-response-action-btn" onclick="window.saveReportToWorkspaceStorage()">💾 Save to Storage</button>
      </div>
    </div>
  `;

  aiActiveChatHistory.push({
    sender: 'assistant',
    text: `${reportTitle} report compiled!`,
    contentHtml: contentHtml
  });
  renderAiChatHistory();
  showToast("Executive summary report compiled!", "success");
  
  logActivity("Generate Report", `Compiled executive summary for ${datasetName}.`, "Success");
}

function bindCopilotEvents() {
  const fab = document.getElementById("oneclick-copilot-fab");
  const closeBtn = document.getElementById("btn-ai-close-drawer");
  const posToggleBtn = document.getElementById("btn-ai-toggle-position");
  const promptInput = document.getElementById("ai-prompt-input");
  const btnSend = document.getElementById("btn-ai-send");
  const btnClear = document.getElementById("btn-ai-clear-chat");
  const btnPdf = document.getElementById("btn-ai-quick-pdf");
  const btnCsv = document.getElementById("btn-ai-quick-csv");

  const btnYes = document.getElementById('btn-ai-confirm-yes');
  if (btnYes) btnYes.onclick = () => resolveAiSpreadsheetCommand(true);

  const btnNo = document.getElementById('btn-ai-confirm-no');
  if (btnNo) btnNo.onclick = () => resolveAiSpreadsheetCommand(false);

  const initialSide = localStorage.getItem('oneclick_copilot_position') || 'Right';
  const posClass = initialSide.toLowerCase() === 'left' ? 'fab-bottom-left' : 'fab-bottom-right';
  
  if (fab) {
    fab.className = `ai-copilot-fab ${posClass} state-idle`;
    fab.onclick = () => window.toggleAiCopilot();
  }
  
  const drawer = document.getElementById('oneclick-copilot-panel');
  if (drawer) {
    drawer.className = `ai-copilot-panel ${posClass}`;
  }

  if (closeBtn) closeBtn.onclick = () => window.toggleAiCopilot(false);
  if (posToggleBtn) posToggleBtn.onclick = () => window.toggleCopilotSide();

  if (promptInput) {
    promptInput.onkeydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleAiPromptSubmit();
      }
    };
    promptInput.addEventListener('input', () => {
      promptInput.style.height = 'auto';
      promptInput.style.height = promptInput.scrollHeight + 'px';
    });
  }

  if (btnSend) btnSend.onclick = handleAiPromptSubmit;

  if (btnClear) {
    btnClear.onclick = () => {
      aiActiveChatHistory = [];
      saveChatHistoryToWorkspace();
      renderAiChatHistory();
    };
  }

  if (btnPdf) btnPdf.onclick = () => executeExportCommand({ type: "export_command", format: "pdf" });
  if (btnCsv) btnCsv.onclick = () => executeExportCommand({ type: "export_command", format: "csv" });

  analyzeDatasetIntelligence();
  renderPastConversationsList();
  renderAiChatHistory();
}

function initializeCopilot() {
  bindCopilotEvents();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeCopilot);
} else {
  initializeCopilot();
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function setCopilotState(state) {
  const fab = document.getElementById('oneclick-copilot-fab');
  if (!fab) return;
  
  fab.classList.remove('state-idle', 'state-thinking', 'state-processing', 'state-generating-chart', 'state-generating-report', 'state-insight-available');
  
  if (state === 'thinking' || state === 'processing') {
    fab.classList.add('state-thinking');
  } else if (state === 'chart' || state === 'generating-chart') {
    fab.classList.add('state-generating-chart');
  } else if (state === 'report' || state === 'generating-report') {
    fab.classList.add('state-generating-report');
  } else if (state === 'insight' || state === 'insight-available') {
    fab.classList.add('state-insight-available');
  } else {
    fab.classList.add('state-idle');
  }
}

function getCopilotPositionClass() {
  const pos = localStorage.getItem('oneclick_copilot_position') || 'Right';
  return pos.toLowerCase() === 'left' ? 'fab-bottom-left' : 'fab-bottom-right';
}

window.toggleAiCopilot = function(forceOpen) {
  const drawer = document.getElementById('oneclick-copilot-panel');
  const fab = document.getElementById('oneclick-copilot-fab');
  if (!drawer || !fab) return;

  const isOpen = drawer.classList.contains('open');
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : !isOpen;
  const posClass = getCopilotPositionClass();

  if (shouldOpen) {
    drawer.className = `ai-copilot-panel ${posClass} open`;
    setCopilotState('idle');
    
    // Auto focus textarea
    const input = document.getElementById('ai-prompt-input');
    if (input) {
      setTimeout(() => {
        input.focus();
      }, 200);
    }
    
    updateCopilotHeaderDetails();
    
    const badge = document.getElementById('ai-copilot-badge');
    if (badge) badge.style.display = 'none';
  } else {
    drawer.className = `ai-copilot-panel ${posClass}`;
    setCopilotState('idle');
  }
};

window.toggleCopilotSide = function() {
  const currentPos = localStorage.getItem('oneclick_copilot_position') || 'Right';
  const newPos = currentPos.toLowerCase() === 'right' ? 'Left' : 'Right';
  localStorage.setItem('oneclick_copilot_position', newPos);
  
  const posClass = newPos.toLowerCase() === 'left' ? 'fab-bottom-left' : 'fab-bottom-right';
  const oldPosClass = newPos.toLowerCase() === 'left' ? 'fab-bottom-right' : 'fab-bottom-left';
  
  const fab = document.getElementById('oneclick-copilot-fab');
  const drawer = document.getElementById('oneclick-copilot-panel');
  
  if (fab) {
    fab.classList.remove(oldPosClass);
    fab.classList.add(posClass);
  }
  if (drawer) {
    drawer.classList.remove(oldPosClass);
    drawer.classList.add(posClass);
  }
  
  showToast(`Copilot panel moved to the ${newPos.toLowerCase()} side!`, "success");
};

window.chatChartInstances = window.chatChartInstances || {};

window.resolveVisualizationClarification = function(xCol, yCol, chartType, prompt) {
  setCopilotState('thinking');
  setTimeout(() => {
    if (!xCol || !yCol) {
      aiActiveChatHistory.push({
        sender: 'assistant',
        text: "Error: A chart cannot be generated without a dimension and a metric.",
        contentHtml: `<p style="font-size:12px; color:var(--text-secondary); margin:0;">⚠️ Error: A chart cannot be generated without a dimension and a metric.</p>`
      });
      renderAiChatHistory();
      setCopilotState('idle');
      return;
    }

    const title = `${headerNames[yCol] || yCol} Breakdown by ${headerNames[xCol] || xCol}`;
    
    // Mandatory console logging before return
    const intent = "Visualization";
    const mappedColumns = { dimension: xCol, metric: yCol };
    const queryPlan = { type: "chart_command", xCol, yCol, chartType };
    console.log({
      intent,
      mappedColumns,
      chartType,
      queryPlan
    });

    const cfg = { type: chartType || 'bar', xCol, yCol, label: title };
    window.renderChatChart(cfg);
    setCopilotState('idle');
  }, 300);
};

window.submitVisualizationFallback = function(msgId) {
  const dimSelect = document.getElementById(`select-fallback-dim-${msgId}`);
  const metSelect = document.getElementById(`select-fallback-met-${msgId}`);
  if (!dimSelect || !metSelect) return;

  const xCol = dimSelect.value;
  const yCol = metSelect.value;

  if (!xCol || !yCol) {
    showToast("Please select both a dimension and a metric.", "warning");
    return;
  }

  window.resolveVisualizationClarification(xCol, yCol, 'bar', '');
};
