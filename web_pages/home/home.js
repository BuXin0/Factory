// 首页
function renderHomePage() {
  return `
    <div class="page-container">
      <div class="page-header">
        <h1>生产流程控制台</h1>
        <div style="display: flex; gap: 8px;">
          <button id="admin-btn" class="btn btn-secondary" style="display: none; padding: 8px 16px;">
            ⚙️ 管理
          </button>
          <button id="logout-btn" class="btn btn-secondary" style="padding: 8px 16px;">
            退出
          </button>
        </div>
      </div>

      <!-- 用户信息 -->
      <div class="user-card">
        <div class="user-avatar" id="user-avatar">?</div>
        <div class="user-info">
          <div class="user-name" id="user-name">-</div>
          <div class="user-role" id="user-role">-</div>
        </div>
        <span id="user-status" class="status-badge status-normal">正常</span>
      </div>

      <!-- 总体进度 -->
      <div class="card">
        <div class="card-title">总体进度</div>
        <div class="progress-bar">
          <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
        </div>
        <div style="display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 14px;">
          <span>已完成: <strong id="completed-count">0</strong>/${PROCESS_STEPS.length} 步骤</span>
          <span id="progress-percent">0%</span>
        </div>
      </div>

      <!-- 当前步骤 -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div class="card-title" style="margin: 0;">当前步骤</div>
          <span class="status-badge" id="current-step-status">进行中</span>
        </div>
        <div id="current-step-info">
          <h3 style="font-size: 18px; margin-bottom: 8px;" id="current-step-name">-</h3>
          <p style="color: var(--text-secondary); font-size: 14px;" id="current-step-duration">-</p>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px;">
          <button id="goto-process-btn" class="btn btn-primary" style="flex: 1;">
            进入流程
          </button>
        </div>
      </div>

      <!-- 参数监控 -->
      <div class="card">
        <div class="card-title">实时参数</div>
        <div class="params-grid">
          <div class="param-item">
            <div class="param-label">温度</div>
            <div class="param-value" id="param-temperature">-</div>
          </div>
          <div class="param-item">
            <div class="param-label">压力</div>
            <div class="param-value" id="param-pressure">-</div>
          </div>
          <div class="param-item">
            <div class="param-label">流量</div>
            <div class="param-value" id="param-flow">-</div>
          </div>
        </div>
      </div>

      <!-- 操作员设置 -->
      <div class="card">
        <div class="card-title">操作员设置</div>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="operator-input" class="input" placeholder="输入操作员姓名" style="flex: 1;">
          <button id="save-operator-btn" class="btn btn-secondary">保存</button>
        </div>
      </div>
    </div>
  `;
}

function initHomePage() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    Router.navigate('auth');
    return;
  }

  // 显示用户信息
  document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
  document.getElementById('user-name').textContent = currentUser.username;
  document.getElementById('user-role').textContent = isAdmin(currentUser) ? '管理员' : '操作员';

  // 显示管理员按钮
  if (isAdmin(currentUser)) {
    document.getElementById('admin-btn').style.display = 'block';
    document.getElementById('admin-btn').addEventListener('click', () => {
      Router.navigate('admin');
    });
  }

  // 绑定事件
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  document.getElementById('goto-process-btn').addEventListener('click', () => {
    Router.navigate('process');
  });
  document.getElementById('save-operator-btn').addEventListener('click', saveOperator);

  // 刷新数据
  refreshHomeData();
}

function refreshHomeData() {
  const state = getState();
  const currentStepObj = PROCESS_STEPS[state.currentStep - 1];

  // 计算进度
  const completedCount = Math.max(0, Number(state.currentStep || 1) - 1);
  const rawPercent = (completedCount / PROCESS_STEPS.length) * 100;
  const progressPercent = Math.max(0, Math.min(100, Math.floor(Number.isFinite(rawPercent) ? rawPercent : 0)));

  // 更新进度
  document.getElementById('progress-fill').style.width = `${progressPercent}%`;
  document.getElementById('completed-count').textContent = completedCount;
  document.getElementById('progress-percent').textContent = `${progressPercent}%`;

  // 更新当前步骤
  document.getElementById('current-step-name').textContent = currentStepObj?.name || '-';
  document.getElementById('current-step-duration').textContent = `预计时长: ${currentStepObj?.duration || '-'}`;

  // 更新参数
  document.getElementById('param-temperature').textContent = `${state.params.temperature}°C`;
  document.getElementById('param-pressure').textContent = `${state.params.pressure}MPa`;
  document.getElementById('param-flow').textContent = `${state.params.flow}L/min`;

  // 参数状态样式
  updateParamStyles(state.params);

  // 更新状态
  const statusEl = document.getElementById('user-status');
  const statusMap = {
    'normal': { text: '正常', class: 'status-normal' },
    'warning': { text: '警告', class: 'status-warning' },
    'danger': { text: '异常', class: 'status-danger' }
  };
  const status = statusMap[state.processStatus];
  statusEl.textContent = status.text;
  statusEl.className = `status-badge ${status.class}`;

  // 操作员输入框
  document.getElementById('operator-input').value = state.operator;
}

function updateParamStyles(params) {
  const tempEl = document.getElementById('param-temperature');
  const pressureEl = document.getElementById('param-pressure');
  const flowEl = document.getElementById('param-flow');

  // 温度
  const tempLevel = getParamLevel('temperature', params.temperature);
  tempEl.className = `param-value ${tempLevel === 'normal' ? '' : tempLevel}`;

  // 压力
  const pressureLevel = getParamLevel('pressure', params.pressure);
  pressureEl.className = `param-value ${pressureLevel === 'normal' ? '' : pressureLevel}`;

  // 流量
  const flowLevel = getParamLevel('flow', params.flow);
  flowEl.className = `param-value ${flowLevel === 'normal' ? '' : flowLevel}`;
}

function saveOperator() {
  const name = document.getElementById('operator-input').value.trim();
  if (!name) {
    showToast('请输入操作员姓名', 'error');
    return;
  }
  setOperator(name);
  refreshHomeData();
  showToast('操作员已更新', 'success');
}

function handleLogout() {
  showModal('确认退出', '确定要退出登录吗？', () => {
    logoutUser();
    showToast('已退出登录', 'success');
    setTimeout(() => {
      Router.navigate('auth');
    }, 800);
  });
}
