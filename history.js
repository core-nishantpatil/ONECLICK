// OneClick v3 — Activity History Module

window.logActivity = function(type, details, status) {
  const datasetNameEl = document.getElementById('ws-dataset-name');
  const datasetName = datasetNameEl ? datasetNameEl.innerText.trim() : "raw_dataset";
  
  const logItem = {
    time: new Date().toLocaleTimeString(),
    type,
    details,
    datasetName,
    status
  };

  sessionAuditLogs.unshift(logItem);
};

window.initHistoryView = function() {
  const container = document.getElementById('history-table-body');
  if (!container) return;

  if (sessionAuditLogs.length === 0) {
    logActivity("Session Started", "Analytics platform loaded workspace environment.", "Completed");
  }

  let html = sessionAuditLogs.map(log => `
    <tr>
      <td style="font-family:var(--font-mono); font-size:11px;">${log.time}</td>
      <td style="font-weight:600; color:var(--text-primary);">${log.type}</td>
      <td style="color:var(--text-secondary);">${log.details}</td>
      <td style="font-size:12px; color:var(--text-muted);">${log.datasetName}</td>
      <td style="text-align: right; padding-right:24px;">
        <span class="recent-status-badge cleaned" style="background-color:rgba(34,197,94,0.08);">${log.status}</span>
      </td>
    </tr>
  `).join('');

  container.innerHTML = html;
};
