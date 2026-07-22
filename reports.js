// OneClick v3 — Generated Reports templates and exports center

window.bindExportActions = function() {
  const pdfBtn = document.getElementById('btn-export-pdf');
  if (pdfBtn) pdfBtn.onclick = exportToPDF;

  const pptxBtn = document.getElementById('btn-export-pptx');
  if (pptxBtn) pptxBtn.onclick = exportToPPTX;

  const docxBtn = document.getElementById('btn-export-docx');
  if (docxBtn) docxBtn.onclick = exportToWord;

  const pngBtn = document.getElementById('btn-export-png');
  if (pngBtn) pngBtn.onclick = exportToPNG;

  const jsonBtn = document.getElementById('btn-export-json');
  if (jsonBtn) jsonBtn.onclick = exportDashboardJSON;

  const csvBtn = document.getElementById('btn-export-csv');
  if (csvBtn) csvBtn.onclick = exportCSVSnapshot;
};

window.saveReportToWorkspaceStorage = function() {
  const datasetNameEl = document.getElementById('ws-dataset-name');
  const datasetName = datasetNameEl ? datasetNameEl.innerText.trim() : "raw_dataset";
  const reportName = `AI_Summary_${datasetName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  try {
    const key = saveDashboardToStorage(reportName);
    showToast(`Saved report: ${reportName} to storage!`, "success");
    if (typeof loadAndRenderReportsList === 'function') {
      loadAndRenderReportsList();
    }
  } catch (err) {
    showToast("Failed to save report: " + err.message, "error");
  }
};
