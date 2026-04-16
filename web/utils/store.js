// 数据存储管理 - 浏览器版本
// 将微信小程序的 wx.getStorageSync 替换为 localStorage

function nowText() {
  const d = new Date();
  const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getDefaultState() {
  return {
    currentStep: 1,
    completedSteps: [],
    operator: "未登录操作员",
    processStatus: "normal",
    checkpointsDone: {},
    params: {
      temperature: 45,
      pressure: 0.8,
      flow: 35
    },
    updatedAt: nowText()
  };
}

function normalizeState(raw) {
  const def = getDefaultState();
  const state = raw && typeof raw === "object" ? raw : {};

  const merged = {
    ...def,
    ...state,
    params: { ...def.params, ...(state.params && typeof state.params === "object" ? state.params : {}) },
    checkpointsDone: state.checkpointsDone && typeof state.checkpointsDone === "object" ? state.checkpointsDone : {}
  };

  merged.currentStep = Number(merged.currentStep || 1);
  if (!Number.isFinite(merged.currentStep) || merged.currentStep < 1) merged.currentStep = 1;
  if (merged.currentStep > PROCESS_STEPS.length) merged.currentStep = PROCESS_STEPS.length;

  if (Array.isArray(merged.completedSteps)) {
    merged.completedSteps = merged.completedSteps
      .map((x) => Number(x))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= PROCESS_STEPS.length);
  } else {
    merged.completedSteps = [];
  }

  if (typeof merged.operator !== "string" || !merged.operator.trim()) {
    merged.operator = def.operator;
  }

  if (!["normal", "warning", "danger"].includes(merged.processStatus)) {
    merged.processStatus = def.processStatus;
  }

  ["temperature", "pressure", "flow"].forEach((k) => {
    const v = Number(merged.params[k]);
    if (!Number.isFinite(v)) merged.params[k] = def.params[k];
    else merged.params[k] = v;
  });

  return merged;
}

function initStateIfNeeded() {
  const state = localStorage.getItem(STORAGE_KEYS.STATE);
  const logs = localStorage.getItem(STORAGE_KEYS.LOGS);
  const users = localStorage.getItem(STORAGE_KEYS.USERS);

  localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(normalizeState(state ? JSON.parse(state) : null)));
  if (!logs || !Array.isArray(JSON.parse(logs))) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  }
  if (!users || !Array.isArray(JSON.parse(users))) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
  }
}

function resetAllToDefault() {
  localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(getDefaultState()));
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

function getState() {
  const state = localStorage.getItem(STORAGE_KEYS.STATE);
  return normalizeState(state ? JSON.parse(state) : null);
}

function saveState(state) {
  state.updatedAt = nowText();
  localStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
}

function getLogs() {
  const logs = localStorage.getItem(STORAGE_KEYS.LOGS);
  return logs ? JSON.parse(logs) : [];
}

function appendLog(logItem) {
  const logs = getLogs();
  logs.unshift({
    id: Date.now(),
    time: nowText(),
    ...logItem
  });
  const MAX_LOGS = 300;
  if (logs.length > MAX_LOGS) {
    logs.splice(MAX_LOGS);
  }
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
}

function getParamLevel(key, value) {
  const limit = PARAM_LIMITS[key];
  if (!limit) return "normal";
  if (value < limit.dangerMin || value > limit.dangerMax) return "danger";
  if (value < limit.warnMin || value > limit.warnMax) return "warning";
  return "normal";
}

function evaluateProcessStatus(params) {
  const levels = Object.keys(params).map((k) => getParamLevel(k, params[k]));
  if (levels.includes("danger")) return "danger";
  if (levels.includes("warning")) return "warning";
  return "normal";
}

function updateParams(nextParams, operator) {
  const state = getState();
  state.params = { ...state.params, ...nextParams };
  state.processStatus = evaluateProcessStatus(state.params);
  saveState(state);
  appendLog({
    type: "参数更新",
    operator: operator || state.operator,
    stepId: state.currentStep,
    stepName: PROCESS_STEPS[state.currentStep - 1].name,
    params: state.params,
    status: state.processStatus
  });
  return state;
}

function setOperator(operatorName) {
  const state = getState();
  state.operator = operatorName || state.operator;
  saveState(state);
  appendLog({
    type: "操作员更新",
    operator: state.operator,
    stepId: state.currentStep,
    stepName: PROCESS_STEPS[state.currentStep - 1].name,
    params: state.params,
    status: state.processStatus
  });
  return state;
}

function completeCurrentStep() {
  const state = getState();
  const current = state.currentStep;
  if (!state.completedSteps.includes(current)) {
    state.completedSteps.push(current);
    appendLog({
      type: "步骤完成",
      operator: state.operator,
      stepId: current,
      stepName: PROCESS_STEPS[current - 1].name,
      params: state.params,
      status: state.processStatus
    });
  }
  if (current < PROCESS_STEPS.length) {
    state.currentStep = current + 1;
    appendLog({
      type: "步骤切换",
      operator: state.operator,
      stepId: state.currentStep,
      stepName: PROCESS_STEPS[state.currentStep - 1].name,
      params: state.params,
      status: state.processStatus
    });
  }
  saveState(state);
  return state;
}

function jumpToStep(stepId) {
  const state = getState();
  const maxReachable = state.currentStep;
  if (stepId >= 1 && stepId <= maxReachable) {
    state.currentStep = stepId;
    saveState(state);
  }
  return state;
}

function getCheckpointCheckedValues(stepId) {
  const state = getState();
  const map = (state.checkpointsDone && state.checkpointsDone[stepId]) || {};
  return Object.keys(map).filter((k) => map[k]);
}

function setCheckpointsDone(stepId, selectedValues, operator) {
  const state = getState();
  state.checkpointsDone = state.checkpointsDone || {};

  const stepIndex = stepId - 1;
  const stepDef = PROCESS_STEPS[stepIndex];
  if (!stepDef) return state;

  const selectedSet = {};
  (selectedValues || []).forEach((v) => (selectedSet[v] = true));

  const checkpointMap = {};
  stepDef.checkpoints.forEach((cp) => {
    checkpointMap[cp] = !!selectedSet[cp];
  });
  state.checkpointsDone[stepId] = checkpointMap;

  saveState(state);
  appendLog({
    type: "关键检查更新",
    operator: operator || state.operator,
    stepId,
    stepName: stepDef.name,
    params: state.params,
    status: state.processStatus,
    checkpointsDone: stepDef.checkpoints.filter((cp) => checkpointMap[cp])
  });

  return state;
}

// 用户认证相关函数
function getUserByUsername(username) {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
  return users.find(user => user.username === username);
}

function isAdmin(user) {
  return user && user.username === ADMIN_USERNAME;
}

function getAllUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
}

function registerUser(username, password, phone) {
  const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");

  if (getUserByUsername(username)) {
    return { success: false, message: "用户名已存在" };
  }

  const isAdminUser = users.length === 0 || username === ADMIN_USERNAME;

  users.push({
    username,
    password,
    phone,
    isAdmin: isAdminUser,
    createdAt: nowText()
  });
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  return { success: true, isAdmin: isAdminUser };
}

function loginUser(username, password) {
  let user = getUserByUsername(username);

  // 如果 master 账号不存在且使用预设密码，自动创建
  if (!user && username === ADMIN_USERNAME && password === '985211') {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
    user = {
      username: ADMIN_USERNAME,
      password: '985211',
      phone: '',
      isAdmin: true,
      createdAt: nowText()
    };
    users.push(user);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  if (!user) {
    return { success: false, message: "用户名不存在" };
  }

  if (user.password !== password) {
    return { success: false, message: "密码错误" };
  }

  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  return { success: true, user };
}

function getCurrentUser() {
  const user = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return user ? JSON.parse(user) : null;
}

function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}
