// OneClick v3 — Shared Global State Variables

var isDarkMode = true;

// Spreadsheet Engine State
var gridData = [];           // Full unmodified current 2D dataset values
var originalGridData = [];   // Initial pristine backup of gridData
var headers = [];            // Column keys A..Z..AA..
var headerNames = {};        // Mapping of key -> label
var originalHeaders = [];
var originalHeaderNames = {};
var columnWidths = {};       // Mapping of key -> pixel width
var isFrozenCol = false;
var activeSelection = null;  // {startRow, startCol, endRow, endCol} (zero-indexed of visual matching rows)
var isDragging = false;
var undoStack = [];
var redoStack = [];
var selectedColumnKey = null;
var hiddenColumns = new Set();
var activeFilters = {};
var activeSort = null;
var searchQuery = "";
var viewIndices = [];
var activeMenuColKey = null;
var ticking = false;

// Preprocessing / Cleaning state
var cellsToFlash = new Set();
var rowsToFlash = new Set();
var preprocessingHistory = [];
var preprocessingRedoHistory = [];
var activeQualityTab = 'overview';
var qualityScanResults = null;
var issueStates = {};
var activeHighlights = new Map();
var explorerFilters = { missing: 'pending', duplicates: 'pending', types: 'pending', outliers: 'pending' };
var duplicateCheckColumns = new Set();
var activeDuplicateRowsList = [];
var activeNavigatorCategory = null;
var activeNavigatorColKey = null;
var activeNavigatorIndex = -1;
var activeNavigatorCell = { r: -1, c: -1 };
var affectedRowsFilter = null;
var activeRowHighlights = new Set();
var highlightModes = {};

// Dashboard / Visualization state
var dashboardWidgets = [];
var activeVizTab = 'dashboard';
var selectedWidgetId = null;
var globalVizFilters = {};
var currentView = 'sheet'; // 'sheet' | 'dashboard'
var activeChartInstances = {};
var calculatedFields = {};
var drillHierarchies = [];
var activeDrillState = {};

// Workspace lifecycle state
var currentWorkspaceId = null;
var isRestoringWorkspace = false;
var autoSaveTimer = null;
var workspacesListLimit = 10;

// V3 custom state variables
var globalFiltersV3 = {
  multiselect: {},
  dateRange: {},
  numericRange: {}
};
var wizardState = {
  active: false,
  step: 1,
  chartType: 'kpi',
  xCol: '',
  yCol: '',
  yCol2: '',
  agg: 'sum'
};

// AI Copilot state variables
var currentDatasetContext = {};
var aiActiveChatHistory = [];
var lastResolvedPlan = null;
var aiPendingAction = null;
var sessionAuditLogs = [];
var currentDatasetOntology = { entities: [], metrics: [], dimensions: [], dates: [] };
var currentDatasetDomain = { name: "Custom Domain", confidence: 1.0 };
var currentDatasetGraph = { nodes: [], edges: [], cardinality: {} };
var currentDatasetSynonyms = {};
var conversationContext = {
  activeIntent: null,
  activeEntity: null,
  activeMetric: null,
  activeDimension: null,
  activeTimePeriod: null,
  filterPath: [],
  historyIds: []
};

// Constant Settings
var ROW_HEIGHT = 32;
var DB_NAME = 'oneclick_db';
var DB_VERSION = 1;
var STORE_NAME = 'workspaces';

// DOM elements setup (initialized on boot in app.js or dynamic scripts)
var themeBtn, themeIcon;
var sidebar, sidebarCollapseBtn, sidebarToggleIcon;
var searchInput, loadingOverlay, loadingTitleText, loadingSubtitleText, loadingProgressBar, loadingProgressPct;
var viewport;
var datasetInfoPanel, columnStatsPanel, resetStatsBtn;
var columnMenu, filterTypeSelect, filterOpSelect, filterValueInput, filterValue2Input, filterApplyBtn, filterClearBtn;
var sortAscBtn, sortDescBtn;
var freezeBtn, toolbarFilterBtn, contextMenu;
var sidebarResizer;
var defaultSidebarWidth = 280;
var defaultQualityWidth = 380;
var analyzeBtn, qualityPanel, resetQualityBtn, qualityTabButtons;
var bannerCloseBtn;
var btnSwitchSheet, btnSwitchDash, wsBtnVisualize;
var dashboardCanvasViewport, wsSidebarVisualization, resetVizBtn;
var btnSaveWidgetSettings, vizWidgetTypeSelect, btnAddWidgetTrigger, btnClearGlobalVizFilters;
var btnCalcValidate, btnCalcSave, btnDrillSave, btnDrillUp, btnDrillReset;
