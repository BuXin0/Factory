// 日志页面
function renderLogsPage() {
  return `
    <div class="page-container">
      <div class="page-header">
        <h1>操作日志</h1>
        <div style="display: flex; gap: 8px;">
          <button id="export-btn" class="btn btn-secondary" style="padding: 8px 16px;">
            📤 导出
          </button>
          <button id="clear-btn" class="btn btn-danger" style="padding: 8px 16px;">
            🗑️ 清空
          </button>
        </div>
      </div>

      <div id="logs-container"></div>
    </div>
  `;
}

function initLogsPage() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    Router.navigate('auth');
    return;
  }

  // 绑定事件
  document.getElementById('export-btn').addEventListener('click', exportLogs);
  document.getElementById('clear-btn').addEventListener('click', clearLogs);

  // 加载日志
  renderLogs();
}

function renderLogs() {
  const logs = getLogs();
  const container = document.getElementById('logs-container');

  if (logs.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <p>暂无操作日志</p>
      </div>
    `;
    return;
  }

  container.innerHTML = logs.map(log => {
    const statusClass = log.status === 'danger' ? 'status-danger' :
                       log.status === 'warning' ? 'status-warning' : 'status-normal';
    const statusText = log.status === 'danger' ? '异常' :
                       log.status === 'warning' ? '警告' : '正常';

    return `
      <div class="log-item">
        <div class="log-header">
          <span class="log-type">${log.type}</span>
          <span style="font-size: 12px;">${log.time}</span>
        </div>
        <div style="margin-bottom: 8px;">
          <strong>操作员:</strong> ${log.operator} |
          <strong>步骤:</strong> ${log.stepName || '-'} (第${log.stepId}步)
        </div>
        ${log.params ? `
        <div style="font-size: 12px; color: var(--text-secondary); background: var(--bg-secondary); padding: 8px; border-radius: 4px; margin-top: 8px;">
          <span style="margin-right: 16px;">🌡️ ${log.params.temperature}°C</span>
          <span style="margin-right: 16px;">⚡ ${log.params.pressure}MPa</span>
          <span>💧 ${log.params.flow}L/min</span>
          <span style="float: right;" class="status-badge ${statusClass}">${statusText}</span>
        </div>
        ` : ''}
        ${log.checkpointsDone && log.checkpointsDone.length > 0 ? `
        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">
          <strong>检查项:</strong> ${log.checkpointsDone.join(', ')}
        </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function clearLogs() {
  showModal('确认清空', '是否清空全部操作日志？', () => {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
    renderLogs();
    showToast('日志已清空', 'success');
  });
}

async function exportLogs() {
  const logs = getLogs();
  if (logs.length === 0) {
    showToast('暂无日志可导出', 'error');
    return;
  }

  // 构建 CSV 数据
  const rows = [];
  rows.push(["时间", "类型", "操作员", "步骤", "步骤名称", "状态", "温度(°C)", "压力(MPa)", "流量(L/min)"]);

  logs.forEach(log => {
    rows.push([
      log.time,
      log.type,
      log.operator,
      log.stepId,
      log.stepName,
      log.status,
      log.params?.temperature ?? "-",
      log.params?.pressure ?? "-",
      log.params?.flow ?? "-"
    ]);
  });

  // 转换为 CSV 格式
  const csv = rows.map(row =>
    row.map(cell => {
      const s = String(cell ?? "");
      if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    }).join(",")
  ).join("\n");

  // 复制到剪贴板
  const success = await copyToClipboard(csv);
  if (success) {
    showToast('日志已导出到剪贴板', 'success');
  } else {
    showToast('导出失败，请重试', 'error');
  }
}
