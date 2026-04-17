// 管理员页面
function renderAdminPage() {
  return `
    <div class="page-container">
      <div class="page-header">
        <h1>管理员控制台</h1>
        <button id="back-btn" class="btn btn-secondary" style="padding: 8px 16px;">
          返回首页
        </button>
      </div>

      <!-- 统计概览 -->
      <div class="card">
        <div class="card-title">员工统计</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
          <div>
            <div style="font-size: 32px; font-weight: 600; color: var(--accent);" id="total-users">0</div>
            <div style="color: var(--text-secondary); font-size: 14px;">总员工数</div>
          </div>
          <div>
            <div style="font-size: 32px; font-weight: 600; color: var(--success);" id="completed-users">0</div>
            <div style="color: var(--text-secondary); font-size: 14px;">已完成</div>
          </div>
          <div>
            <div style="font-size: 32px; font-weight: 600; color: var(--warning);" id="in-progress-users">0</div>
            <div style="color: var(--text-secondary); font-size: 14px;">进行中</div>
          </div>
        </div>
      </div>

      <!-- 导出按钮 -->
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button id="export-all-btn" class="btn btn-primary" style="flex: 1;">
          📊 导出所有员工进度
        </button>
      </div>

      <!-- 员工列表 -->
      <div class="card">
        <div class="card-title">员工进度监控</div>
        <div id="users-list"></div>
      </div>

      <!-- 选中员工的日志 -->
      <div class="card" id="user-logs-card" style="display: none;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div class="card-title" style="margin: 0;">
            <span id="selected-user-name"></span> 的操作日志
          </div>
          <button id="export-user-btn" class="btn btn-secondary" style="padding: 6px 12px; font-size: 12px;">
            导出该员工
          </button>
        </div>
        <div id="user-logs-list"></div>
      </div>
    </div>
  `;
}

let selectedUser = null;
let usersData = [];

function initAdminPage() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    Router.navigate('auth');
    return;
  }

  if (!isAdmin(currentUser)) {
    showToast('权限不足', 'error');
    Router.navigate('home');
    return;
  }

  // 绑定事件
  document.getElementById('back-btn').addEventListener('click', () => {
    Router.navigate('home');
  });
  document.getElementById('export-all-btn').addEventListener('click', exportAllProgress);
  document.getElementById('export-user-btn').addEventListener('click', exportUserProgress);

  // 加载数据
  loadUsers();
}

function loadUsers() {
  const users = getAllUsers();
  const logs = getLogs();

  // 过滤掉管理员自己，并计算每个员工的进度
  usersData = users
    .filter(u => u.username !== ADMIN_USERNAME)
    .map(user => {
      // 统计该员工完成的步骤（去重）
      const completedSteps = new Set();
      logs.forEach(log => {
        if (log.operator === user.username && log.type === "步骤完成") {
          completedSteps.add(log.stepId);
        }
      });
      const totalSteps = PROCESS_STEPS.length;
      const completedCount = completedSteps.size;
      const progressPercent = Math.round((completedCount / totalSteps) * 100);

      return {
        ...user,
        completedCount,
        progressPercent,
        isCompleted: completedCount >= totalSteps
      };
    });

  // 更新统计
  document.getElementById('total-users').textContent = usersData.length;
  document.getElementById('completed-users').textContent = usersData.filter(u => u.isCompleted).length;
  document.getElementById('in-progress-users').textContent = usersData.filter(u => !u.isCompleted).length;

  // 渲染员工列表
  renderUsersList();
}

function renderUsersList() {
  const container = document.getElementById('users-list');

  if (usersData.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px;">
        <p>暂无员工数据</p>
      </div>
    `;
    return;
  }

  container.innerHTML = usersData.map(user => `
    <div class="list-item ${selectedUser?.username === user.username ? 'active' : ''}"
         data-username="${user.username}"
         onclick="selectUser('${user.username}')">
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">${user.username}</div>
        <div style="font-size: 12px; color: var(--text-secondary);">
          ${user.isCompleted ? '已完成所有步骤 ✓' : `进行中 (${user.completedCount}/${PROCESS_STEPS.length})`}
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 24px; font-weight: 600; color: ${user.isCompleted ? 'var(--success)' : 'var(--accent)'};">
          ${user.progressPercent}%
        </div>
        <div class="progress-bar" style="width: 80px; height: 4px; margin-top: 4px;">
          <div class="progress-fill" style="width: ${user.progressPercent}%"></div>
        </div>
      </div>
    </div>
  `).join('');
}

function selectUser(username) {
  const user = usersData.find(u => u.username === username);
  if (!user) return;

  // 如果点击的是已选中的员工，则收起监控界面
  if (selectedUser && selectedUser.username === username) {
    selectedUser = null;
    document.getElementById('user-logs-card').style.display = 'none';
    renderUsersList();
    return;
  }

  selectedUser = user;
  document.getElementById('selected-user-name').textContent = user.username;
  document.getElementById('user-logs-card').style.display = 'block';

  renderUsersList();
  loadUserLogs(username);
}

function loadUserLogs(username) {
  const logs = getLogs();
  const userLogs = logs.filter(log =>
    log.operator === username ||
    (log.operator && log.operator.includes(username))
  ).slice(0, 50);

  const container = document.getElementById('user-logs-list');

  if (userLogs.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 16px;">
        <p style="font-size: 14px;">该员工暂无操作记录</p>
      </div>
    `;
    return;
  }

  container.innerHTML = userLogs.map(log => {
    const statusClass = log.status === 'danger' ? 'status-danger' :
                       log.status === 'warning' ? 'status-warning' : 'status-normal';
    return `
      <div class="log-item" style="margin-bottom: 8px;">
        <div class="log-header">
          <span class="log-type">${log.type}</span>
          <span style="font-size: 12px;">${log.time}</span>
        </div>
        <div style="font-size: 12px; color: var(--text-secondary);">
          步骤: ${log.stepName || '-'} | 状态: <span class="status-badge ${statusClass}">${log.status}</span>
        </div>
      </div>
    `;
  }).join('');
}

async function exportUserProgress() {
  if (!selectedUser) return;

  const username = selectedUser.username;
  const logs = getLogs();

  // 筛选该员工的完成记录
  const completedSteps = new Set();
  logs.forEach(log => {
    if (log.operator === username && log.type === "步骤完成") {
      completedSteps.add(log.stepId);
    }
  });

  // 构建 CSV 数据
  const rows = [];
  rows.push(["员工", "步骤ID", "步骤名称", "状态", "完成时间"]);

  PROCESS_STEPS.forEach(step => {
    const isCompleted = completedSteps.has(step.id);
    const status = isCompleted ? "已完成" : "未完成";

    // 查找完成时间
    const completeLog = logs.find(log =>
      log.operator === username &&
      log.type === "步骤完成" &&
      log.stepId === step.id
    );
    const completeTime = completeLog ? completeLog.time : "-";

    rows.push([
      username,
      step.id,
      step.name,
      status,
      completeTime
    ]);
  });

  // 添加汇总行
  rows.push([]);
  rows.push(["汇总", "", "", `${completedSteps.size}/${PROCESS_STEPS.length} 完成`, `${Math.round((completedSteps.size / PROCESS_STEPS.length) * 100)}%`]);

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

  const success = await copyToClipboard(csv);
  if (success) {
    showToast(`${username}进度已导出`, 'success');
  } else {
    showToast('导出失败', 'error');
  }
}

async function exportAllProgress() {
  const state = getState();
  const logs = getLogs();

  // 构建 CSV 数据
  const rows = [];
  rows.push(["步骤ID", "步骤名称", "状态", "检查项完成数", "总检查项数", "检查项详情"]);

  PROCESS_STEPS.forEach(step => {
    const isCompleted = state.completedSteps.includes(step.id);
    const isCurrent = state.currentStep === step.id;
    const status = isCompleted ? "已完成" : (isCurrent ? "进行中" : "未开始");

    // 检查项完成情况
    const checkpointMap = state.checkpointsDone[step.id] || {};
    const totalCheckpoints = step.checkpoints.length;
    const completedCheckpoints = step.checkpoints.filter(cp => checkpointMap[cp]).length;

    // 检查项详情
    const checkpointDetails = step.checkpoints.map(cp => {
      const done = checkpointMap[cp] ? "✓" : "✗";
      return `${done}${cp}`;
    }).join("; ");

    rows.push([
      step.id,
      step.name,
      status,
      completedCheckpoints,
      totalCheckpoints,
      checkpointDetails
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

  const success = await copyToClipboard(csv);
  if (success) {
    showToast('工作进度已导出', 'success');
  } else {
    showToast('导出失败', 'error');
  }
}
