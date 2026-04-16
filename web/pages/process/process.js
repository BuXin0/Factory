// 流程管理页面
let processState = {};
let viewStepIndex = 0;
let checkpointCheckedValues = [];

function renderProcessPage() {
  return `
    <div class="page-container">
      <div class="page-header">
        <h1>生产流程管理</h1>
        <button id="back-btn" class="btn btn-secondary" style="padding: 8px 16px;">
          返回
        </button>
      </div>

      <!-- 步骤导航 -->
      <div class="step-nav" id="step-nav"></div>

      <!-- 步骤详情 -->
      <div class="card" id="step-detail">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <span style="color: var(--accent); font-size: 14px;">第<span id="step-upper-id">一</span>步</span>
            <h3 style="font-size: 20px; margin-top: 4px;" id="step-name">-</h3>
          </div>
          <span class="status-badge" id="step-status">进行中</span>
        </div>

        <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 16px;">
          预计时长: <span id="step-duration">-</span>
        </p>

        <div class="card-title" style="margin-bottom: 12px;">关键检查项</div>
        <div id="checkpoints-list"></div>

        <div style="margin-top: 20px; display: flex; gap: 12px;">
          <button id="prev-step-btn" class="btn btn-secondary" style="flex: 1;">
            ← 上一步
          </button>
          <button id="complete-step-btn" class="btn btn-success" style="flex: 2;">
            完成当前步骤
          </button>
          <button id="next-step-btn" class="btn btn-secondary" style="flex: 1;">
            下一步 →
          </button>
        </div>
      </div>
    </div>
  `;
}

function initProcessPage() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    Router.navigate('auth');
    return;
  }

  // 绑定事件
  document.getElementById('back-btn').addEventListener('click', () => {
    Router.navigate('home');
  });
  document.getElementById('prev-step-btn').addEventListener('click', prevStep);
  document.getElementById('next-step-btn').addEventListener('click', nextStep);
  document.getElementById('complete-step-btn').addEventListener('click', completeStep);

  // 加载数据
  refreshProcessData();
}

function refreshProcessData() {
  processState = getState();
  viewStepIndex = processState.currentStep - 1;
  checkpointCheckedValues = getCheckpointCheckedValues(processState.currentStep);

  renderStepNav();
  renderStepDetail();
}

function renderStepNav() {
  const nav = document.getElementById('step-nav');
  nav.innerHTML = PROCESS_STEPS.map((step, index) => {
    const isActive = index === viewStepIndex;
    const isCompleted = processState.completedSteps.includes(step.id);
    const isCurrent = index === processState.currentStep - 1;

    let className = 'step-nav-item';
    if (isActive) className += ' active';
    else if (isCompleted) className += ' completed';

    return `
      <div class="${className}" data-step-id="${step.id}" onclick="navToStep(${step.id})">
        ${toUpperStepNumber(step.id)}. ${step.name}
      </div>
    `;
  }).join('');
}

function navToStep(stepId) {
  viewStepIndex = stepId - 1;
  checkpointCheckedValues = getCheckpointCheckedValues(stepId);
  renderStepNav();
  renderStepDetail();
}

function renderStepDetail() {
  const step = PROCESS_STEPS[viewStepIndex];
  if (!step) return;

  const isCurrentStep = viewStepIndex === processState.currentStep - 1;
  const isCompleted = processState.completedSteps.includes(step.id);
  const allCheckpointsDone = isAllCheckpointsDone(processState, step.id);

  // 更新步骤信息
  document.getElementById('step-upper-id').textContent = toUpperStepNumber(step.id);
  document.getElementById('step-name').textContent = step.name;
  document.getElementById('step-duration').textContent = step.duration;

  // 更新状态标签
  const statusEl = document.getElementById('step-status');
  if (isCompleted && allCheckpointsDone) {
    statusEl.textContent = '已完成';
    statusEl.className = 'status-badge status-success';
  } else if (isCurrentStep) {
    statusEl.textContent = allCheckpointsDone ? '待完成' : '进行中';
    statusEl.className = allCheckpointsDone ? 'status-badge status-success' : 'status-badge status-warning';
  } else {
    statusEl.textContent = viewStepIndex < processState.currentStep - 1 ? '已跳过' : '未开始';
    statusEl.className = 'status-badge';
    statusEl.style.background = 'var(--bg-secondary)';
    statusEl.style.color = 'var(--text-secondary)';
  }

  // 渲染检查项
  const checkpointsList = document.getElementById('checkpoints-list');
  checkpointsList.innerHTML = step.checkpoints.map((cp, index) => {
    const isChecked = checkpointCheckedValues.includes(cp);
    return `
      <label class="checkbox-item ${isChecked ? 'checked' : ''}" data-index="${index}">
        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleCheckpoint('${cp}')">
        <span>${cp}</span>
      </label>
    `;
  }).join('');

  // 更新按钮状态
  const completeBtn = document.getElementById('complete-step-btn');
  if (isCompleted) {
    completeBtn.textContent = '步骤已完成 ✓';
    completeBtn.disabled = true;
    completeBtn.classList.remove('btn-success');
    completeBtn.classList.add('btn-secondary');
  } else {
    completeBtn.textContent = isCurrentStep ? '完成当前步骤' : '仅当前步骤可完成';
    completeBtn.disabled = !isCurrentStep;
    completeBtn.classList.toggle('btn-success', isCurrentStep);
    completeBtn.classList.toggle('btn-secondary', !isCurrentStep);
  }
}

function toggleCheckpoint(item) {
  const stepId = viewStepIndex + 1;
  const prev = checkpointCheckedValues || [];
  const has = prev.indexOf(item) !== -1;
  const next = has ? prev.filter((v) => v !== item) : prev.concat([item]);

  const nextState = setCheckpointsDone(stepId, next, processState.operator);

  // 处理返工情况
  const stepDef = PROCESS_STEPS[viewStepIndex];
  const requiredCount = stepDef.checkpoints.length;
  const doneCount = next.length;

  if (requiredCount > 0 && doneCount < requiredCount && Array.isArray(nextState.completedSteps) && nextState.completedSteps.includes(stepId)) {
    nextState.completedSteps = nextState.completedSteps.filter((x) => Number(x) !== Number(stepId));
    if (Number(nextState.currentStep) > Number(stepId)) {
      nextState.currentStep = Number(stepId);
    }
    saveState(nextState);
    appendLog({
      type: "返工：关键检查被取消",
      operator: processState.operator,
      stepId,
      stepName: PROCESS_STEPS[stepId - 1].name,
      params: nextState.params,
      status: nextState.processStatus,
      checkpointsDone: PROCESS_STEPS[stepId - 1].checkpoints.filter((cp) => (nextState.checkpointsDone[stepId] || {})[cp])
    });
  }

  processState = nextState;
  checkpointCheckedValues = next;

  renderStepNav();
  renderStepDetail();
}

function prevStep() {
  if (viewStepIndex <= 0) return;
  viewStepIndex--;
  checkpointCheckedValues = getCheckpointCheckedValues(viewStepIndex + 1);
  renderStepNav();
  renderStepDetail();
}

function nextStep() {
  if (viewStepIndex >= PROCESS_STEPS.length - 1) return;
  viewStepIndex++;
  checkpointCheckedValues = getCheckpointCheckedValues(viewStepIndex + 1);
  renderStepNav();
  renderStepDetail();
}

function completeStep() {
  const viewingStep = viewStepIndex + 1;
  if (viewingStep !== processState.currentStep) {
    showToast('只能完成当前执行步骤', 'error');
    return;
  }

  const stepDef = PROCESS_STEPS[viewStepIndex];
  const requiredCount = stepDef.checkpoints.length;
  const doneCount = checkpointCheckedValues.length;

  if (requiredCount > 0 && doneCount < requiredCount) {
    showToast(`关键检查项未完成（${doneCount}/${requiredCount}）`, 'error');
    return;
  }

  const nextState = completeCurrentStep();
  processState = nextState;
  viewStepIndex = nextState.currentStep - 1;
  checkpointCheckedValues = getCheckpointCheckedValues(nextState.currentStep);

  renderStepNav();
  renderStepDetail();
  showToast('步骤已完成', 'success');
}

function isAllCheckpointsDone(state, stepId) {
  const stepDef = PROCESS_STEPS[stepId - 1];
  if (!stepDef) return false;
  const doneMap = (state.checkpointsDone && state.checkpointsDone[stepId]) || {};
  return stepDef.checkpoints.every((cp) => doneMap[cp] === true);
}
