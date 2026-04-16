// 监控页面
function renderMonitorPage() {
  return `
    <div class="page-container">
      <div class="page-header">
        <h1>流程监控</h1>
        <button id="back-btn" class="btn btn-secondary" style="padding: 8px 16px;">
          返回
        </button>
      </div>

      <!-- 检查表导出 -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div class="card-title" style="margin-bottom: 4px;">检查表导出</div>
            <p style="color: var(--text-secondary); font-size: 14px;">导出当前所有步骤的检查项完成情况</p>
          </div>
          <button id="export-checkpoints-btn" class="btn btn-primary">
            📋 导出检查表
          </button>
        </div>
      </div>

      <!-- 实时参数 -->
      <div class="card">
        <div class="card-title">实时参数监控</div>
        <div class="params-grid">
          <div class="param-item">
            <div class="param-label">温度</div>
            <div class="param-value" id="monitor-temperature">-</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
              范围: ${PARAM_LIMITS.temperature.warnMin}-${PARAM_LIMITS.temperature.warnMax}${PARAM_LIMITS.temperature.unit}
            </div>
          </div>
          <div class="param-item">
            <div class="param-label">压力</div>
            <div class="param-value" id="monitor-pressure">-</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
              范围: ${PARAM_LIMITS.pressure.warnMin}-${PARAM_LIMITS.pressure.warnMax}${PARAM_LIMITS.pressure.unit}
            </div>
          </div>
          <div class="param-item">
            <div class="param-label">流量</div>
            <div class="param-value" id="monitor-flow">-</div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
              范围: ${PARAM_LIMITS.flow.warnMin}-${PARAM_LIMITS.flow.warnMax}${PARAM_LIMITS.flow.unit}
            </div>
          </div>
        </div>
      </div>

      <!-- 流程状态 -->
      <div class="card">
        <div class="card-title">流程状态概览</div>
        <div id="process-overview"></div>
      </div>
    </div>
  `;
}

function initMonitorPage() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    Router.navigate('auth');
    return;
  }

  // 绑定事件
  document.getElementById('back-btn').addEventListener('click', () => {
    Router.navigate('home');
  });
  document.getElementById('export-checkpoints-btn').addEventListener('click', exportCheckpointsTable);

  // 刷新数据
  refreshMonitorData();
}

function refreshMonitorData() {
  const state = getState();

  // 更新参数显示
  document.getElementById('monitor-temperature').textContent = state.params.temperature + '°C';
  document.getElementById('monitor-pressure').textContent = state.params.pressure + 'MPa';
  document.getElementById('monitor-flow').textContent = state.params.flow + 'L/min';

  // 参数状态样式
  const tempLevel = getParamLevel('temperature', state.params.temperature);
  const pressureLevel = getParamLevel('pressure', state.params.pressure);
  const flowLevel = getParamLevel('flow', state.params.flow);

  document.getElementById('monitor-temperature').className = `param-value ${tempLevel === 'normal' ? '' : tempLevel}`;
  document.getElementById('monitor-pressure').className = `param-value ${pressureLevel === 'normal' ? '' : pressureLevel}`;
  document.getElementById('monitor-flow').className = `param-value ${flowLevel === 'normal' ? '' : flowLevel}`;

  // 流程概览
  renderProcessOverview(state);
}

function renderProcessOverview(state) {
  const container = document.getElementById('process-overview');

  container.innerHTML = PROCESS_STEPS.map(step => {
    const isCompleted = state.completedSteps.includes(step.id);
    const isCurrent = state.currentStep === step.id;

    let statusClass = '';
    let statusText = '未开始';
    let statusColor = 'var(--text-secondary)';

    if (isCompleted) {
      statusClass = 'step-done';
      statusText = '已完成';
      statusColor = 'var(--success)';
    } else if (isCurrent) {
      statusClass = 'step-current';
      statusText = '进行中';
      statusColor = 'var(--warning)';
    }

    // 检查项完成情况
    const checkpointMap = state.checkpointsDone[step.id] || {};
    const completedCount = step.checkpoints.filter(cp => checkpointMap[cp]).length;

    return `
      <div class="list-item ${statusClass}" style="margin-bottom: 8px;">
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">
            第${toUpperStepNumber(step.id)}步: ${step.name}
          </div>
          <div style="font-size: 12px; color: var(--text-secondary);">
            检查项: ${completedCount}/${step.checkpoints.length} 完成
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 14px; font-weight: 500; color: ${statusColor}; margin-bottom: 4px;">
            ${statusText}
          </div>
          <div style="font-size: 12px; color: var(--text-secondary);">
            ${step.duration}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function exportCheckpointsTable() {
  const state = getState();

  const rows = [];
  rows.push(["步骤ID(大写/小写)", "步骤名称", "检查项", "完成状态"]);

  PROCESS_STEPS.forEach((step) => {
    step.checkpoints.forEach((cp) => {
      const done =
        state.checkpointsDone &&
        state.checkpointsDone[step.id] &&
        state.checkpointsDone[step.id][cp] === true;
      const stepIdLabel = `${toUpperStepNumber(step.id)}(${step.id})`;
      rows.push([stepIdLabel, step.name, cp, done ? "已完成" : "未完成"]);
    });
  });

  const csv = rows
    .map((r) =>
      r.map((cell) => {
        const s = String(cell ?? "");
        if (/[",\n]/.test(s)) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      }).join(",")
    )
    .join("\n");

  const operator = state.operator || "未登录操作员";

  const success = await copyToClipboard(csv);
  if (success) {
    showToast('已复制到剪贴板（CSV）', 'success');
    appendLog({
      type: "导出检查表",
      operator,
      stepId: state.currentStep,
      stepName: PROCESS_STEPS[state.currentStep - 1]?.name || "",
      params: state.params,
      status: state.processStatus
    });
  } else {
    showToast('导出失败', 'error');
  }
}
