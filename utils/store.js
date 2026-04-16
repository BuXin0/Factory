const { PROCESS_STEPS, PARAM_LIMITS, STORAGE_KEYS } = require("./constants");

const API_BASE_URL = 'http://172.31.157.170:3000'; // 修改为电脑的实际IP

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
    // 每个步骤的“关键检查项”勾选记录：{ [stepId]: { [checkpointText]: boolean } }
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
  const state = wx.getStorageSync(STORAGE_KEYS.STATE);
  const logs = wx.getStorageSync(STORAGE_KEYS.LOGS);
  const users = wx.getStorageSync(STORAGE_KEYS.USERS);
  // 不做“覆盖重置”，只做“合并修复/规范化”，避免误判导致丢历史数据
  wx.setStorageSync(STORAGE_KEYS.STATE, normalizeState(state));
  if (!Array.isArray(logs)) {
    wx.setStorageSync(STORAGE_KEYS.LOGS, []);
  }
  if (!Array.isArray(users)) {
    wx.setStorageSync(STORAGE_KEYS.USERS, []);
  }
}

function resetAllToDefault() {
  wx.setStorageSync(STORAGE_KEYS.STATE, getDefaultState());
  wx.setStorageSync(STORAGE_KEYS.LOGS, []);
  wx.removeStorageSync(STORAGE_KEYS.CURRENT_USER);
}

function getState() {
  const state = wx.getStorageSync(STORAGE_KEYS.STATE);
  return normalizeState(state);
}

function saveState(state) {
  state.updatedAt = nowText();
  wx.setStorageSync(STORAGE_KEYS.STATE, state);
}

function getLogs() {
  return wx.getStorageSync(STORAGE_KEYS.LOGS) || [];
}

function appendLog(logItem) {
  const logs = getLogs();
  logs.unshift({
    id: Date.now(),
    time: nowText(),
    ...logItem
  });
  // 限制日志长度，避免参数模拟导致存储膨胀/性能下降
  const MAX_LOGS = 300;
  if (logs.length > MAX_LOGS) {
    logs.splice(MAX_LOGS);
  }
  wx.setStorageSync(STORAGE_KEYS.LOGS, logs);
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

const ADMIN_USERNAME = 'master'; // 管理员账号用户名

// 用户认证相关函数
function getUserByUsername(username) {
  const users = wx.getStorageSync(STORAGE_KEYS.USERS) || [];
  return users.find(user => user.username === username);
}

function isAdmin(user) {
  return user && user.username === ADMIN_USERNAME;
}

function getAllUsers() {
  return wx.getStorageSync(STORAGE_KEYS.USERS) || [];
}

function registerUser(username, password, phone) {
  const users = wx.getStorageSync(STORAGE_KEYS.USERS) || [];
  
  if (getUserByUsername(username)) {
    return { success: false, message: "用户名已存在" };
  }
  
  // 第一个注册的用户自动设为管理员，或者用户名为 admin 时为管理员
  const isAdminUser = users.length === 0 || username === ADMIN_USERNAME;
  
  users.push({
    username,
    password,
    phone,
    isAdmin: isAdminUser,
    createdAt: nowText()
  });
  wx.setStorageSync(STORAGE_KEYS.USERS, users);
  return { success: true, isAdmin: isAdminUser };
}

function loginUser(username, password) {
  let user = getUserByUsername(username);
  
  // 如果 master 账号不存在且使用预设密码，自动创建
  if (!user && username === ADMIN_USERNAME && password === '985211') {
    const users = wx.getStorageSync(STORAGE_KEYS.USERS) || [];
    user = {
      username: ADMIN_USERNAME,
      password: '985211',
      phone: '',
      isAdmin: true,
      createdAt: nowText()
    };
    users.push(user);
    wx.setStorageSync(STORAGE_KEYS.USERS, users);
  }
  
  if (!user) {
    return { success: false, message: "用户名不存在" };
  }
  
  if (user.password !== password) {
    return { success: false, message: "密码错误" };
  }
  
  wx.setStorageSync(STORAGE_KEYS.CURRENT_USER, user);
  return { success: true, user };
}

function getCurrentUser() {
  return wx.getStorageSync(STORAGE_KEYS.CURRENT_USER);
}

function logoutUser() {
  wx.removeStorageSync(STORAGE_KEYS.CURRENT_USER);
}

module.exports = {
  nowText,
  getState,
  saveState,
  getLogs,
  appendLog,
  getParamLevel,
  evaluateProcessStatus,
  updateParams,
  setOperator,
  completeCurrentStep,
  jumpToStep,
  getCheckpointCheckedValues,
  setCheckpointsDone,
  normalizeState,
  resetAllToDefault,
  initStateIfNeeded,
  getUserByUsername,
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  isAdmin,
  getAllUsers,
  ADMIN_USERNAME
};
