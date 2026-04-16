const { PROCESS_STEPS } = require("../../utils/constants");
const { getState, completeCurrentStep, setCheckpointsDone, saveState, appendLog, getCurrentUser } = require("../../utils/store");

Page({
  data: {
    showConfirm: true, // 是否显示确认开始界面
    steps: [],
    state: {},
    viewStepIndex: 0,
    checkpointCheckedValues: [],
    checkpointDoneMap: {},
    checkpointDisabled: true,
    upperViewStepId: "",
    upperCurrentStepId: ""
  },

  touchStartX: 0,
  touchStartY: 0,

  toUpperStepNumber(n) {
    const num = Number(n);
    const map = {
      1: "一",
      2: "二",
      3: "三",
      4: "四",
      5: "五",
      6: "六",
      7: "七",
      8: "八",
      9: "九",
      10: "十"
    };
    return map[num] || String(n);
  },

  buildDoneMap(values) {
    const map = {};
    (values || []).forEach((v) => {
      map[v] = true;
    });
    return map;
  },

  onShow() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      wx.reLaunch({ url: "/pages/auth/auth" });
      return;
    }
    
    // 如果已经确认开始，刷新数据
    if (!this.data.showConfirm) {
      this.refreshProcessData();
    }
  },

  refreshProcessData() {
    const state = getState();
    const viewStepIndex = state.currentStep - 1;
    const viewStepId = viewStepIndex + 1;
    const checkpointCheckedValues = this.getCheckpointCheckedValuesFromState(state, viewStepId);
    this.setData({
      steps: this.decorateSteps(state, viewStepIndex),
      state,
      viewStepIndex,
      checkpointCheckedValues,
      checkpointDoneMap: this.buildDoneMap(checkpointCheckedValues),
      checkpointDisabled: false,
      upperViewStepId: this.toUpperStepNumber(viewStepId),
      upperCurrentStepId: this.toUpperStepNumber(state.currentStep)
    });
  },

  // 确认开始流程
  confirmStart() {
    this.setData({ showConfirm: false });
    this.refreshProcessData();
  },

  prevStep() {
    const idx = this.data.viewStepIndex;
    if (idx <= 0) return;
    const nextIndex = idx - 1;
    const nextStepId = nextIndex + 1;
    const checkpointCheckedValues = this.getCheckpointCheckedValuesFromState(this.data.state, nextStepId);
    this.setData({
      viewStepIndex: nextIndex,
      steps: this.decorateSteps(this.data.state, nextIndex),
      checkpointCheckedValues,
      checkpointDoneMap: this.buildDoneMap(checkpointCheckedValues),
      checkpointDisabled: false,
      upperViewStepId: this.toUpperStepNumber(nextStepId),
      upperCurrentStepId: this.toUpperStepNumber(this.data.state.currentStep)
    });
  },

  nextStep() {
    const idx = this.data.viewStepIndex;
    if (idx >= this.data.steps.length - 1) return;
    const nextIndex = idx + 1;
    const nextStepId = nextIndex + 1;
    const checkpointCheckedValues = this.getCheckpointCheckedValuesFromState(this.data.state, nextStepId);
    this.setData({
      viewStepIndex: nextIndex,
      steps: this.decorateSteps(this.data.state, nextIndex),
      checkpointCheckedValues,
      checkpointDoneMap: this.buildDoneMap(checkpointCheckedValues),
      checkpointDisabled: false,
      upperViewStepId: this.toUpperStepNumber(nextStepId),
      upperCurrentStepId: this.toUpperStepNumber(this.data.state.currentStep)
    });
  },

  onNavStepTap(e) {
    const targetStepId = Number(e.currentTarget.dataset.stepId);
    const state = this.data.state;

    if (!targetStepId || Number.isNaN(targetStepId)) return;

    const viewStepIndex = targetStepId - 1;
    const checkpointCheckedValues = this.getCheckpointCheckedValuesFromState(state, targetStepId);
    this.setData({
      viewStepIndex,
      steps: this.decorateSteps(state, viewStepIndex),
      checkpointCheckedValues,
      checkpointDoneMap: this.buildDoneMap(checkpointCheckedValues),
      checkpointDisabled: false,
      upperViewStepId: this.toUpperStepNumber(targetStepId),
      upperCurrentStepId: this.toUpperStepNumber(state.currentStep)
    });
  },

  onTouchStart(e) {
    const t = (e.touches && e.touches[0]) || null;
    if (!t) return;
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
  },

  onTouchEnd(e) {
    const t = (e.changedTouches && e.changedTouches[0]) || null;
    if (!t) return;
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;

    // 过滤垂直滚动，避免误触
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;

    if (dx < 0) {
      this.nextStep();
    } else {
      this.prevStep();
    }
  },

  toggleCheckpoint(e) {
    const item = e.currentTarget.dataset.item;
    const stepId = this.data.viewStepIndex + 1;
    const state = this.data.state;

    const prev = this.data.checkpointCheckedValues || [];
    const has = prev.indexOf(item) !== -1;
    const next = has ? prev.filter((v) => v !== item) : prev.concat([item]);

    const nextState = setCheckpointsDone(stepId, next, state.operator);

    // 如果该步骤曾经被“完成”（出现在 completedSteps 里），但现在关键检查未全部勾选了，则取消步骤完成态，并把 currentStep 回拨到该步骤，方便返工修改。
    const requiredCount =
      (this.data.steps[this.data.viewStepIndex] &&
        this.data.steps[this.data.viewStepIndex].checkpoints &&
        this.data.steps[this.data.viewStepIndex].checkpoints.length) ||
      0;
    const doneCount = next.length;

    if (requiredCount > 0 && doneCount < requiredCount && Array.isArray(nextState.completedSteps) && nextState.completedSteps.includes(stepId)) {
      nextState.completedSteps = nextState.completedSteps.filter((x) => Number(x) !== Number(stepId));
      if (Number(nextState.currentStep) > Number(stepId)) {
        nextState.currentStep = Number(stepId);
      }
      saveState(nextState);
      appendLog({
        type: "返工：关键检查被取消",
        operator: state.operator,
        stepId,
        stepName: PROCESS_STEPS[stepId - 1].name,
        params: nextState.params,
        status: nextState.processStatus,
        checkpointsDone: PROCESS_STEPS[stepId - 1].checkpoints.filter((cp) => (nextState.checkpointsDone[stepId] || {})[cp])
      });
    }

    this.setData({
      state: nextState,
      steps: this.decorateSteps(nextState, this.data.viewStepIndex),
      checkpointCheckedValues: next,
      checkpointDoneMap: this.buildDoneMap(next),
      checkpointDisabled: false
    });

    // 勾选/取消提示已去掉
  },

  completeStep() {
    const state = this.data.state;
    const viewingStep = this.data.viewStepIndex + 1;
    if (viewingStep !== state.currentStep) {
      wx.showToast({ title: "只能完成当前执行步骤", icon: "none" });
      return;
    }

    const requiredCount = (this.data.steps[this.data.viewStepIndex] && this.data.steps[this.data.viewStepIndex].checkpoints
      ? this.data.steps[this.data.viewStepIndex].checkpoints.length
      : 0);
    const doneCount = (this.data.checkpointCheckedValues || []).length;
    if (requiredCount > 0 && doneCount < requiredCount) {
      wx.showToast({ title: `关键检查项未完成（${doneCount}/${requiredCount}）`, icon: "none" });
      return;
    }

    const nextState = completeCurrentStep();
    const viewStepIndex = nextState.currentStep - 1;
    const viewStepId = nextState.currentStep;
    const checkpointCheckedValues = this.getCheckpointCheckedValuesFromState(nextState, viewStepId);
    this.setData({
      steps: this.decorateSteps(nextState, viewStepIndex),
      state: nextState,
      viewStepIndex,
      checkpointCheckedValues,
      checkpointDoneMap: this.buildDoneMap(checkpointCheckedValues),
      checkpointDisabled: false,
      upperViewStepId: this.toUpperStepNumber(viewStepId),
      upperCurrentStepId: this.toUpperStepNumber(nextState.currentStep)
    });
    wx.showToast({ title: "步骤已完成", icon: "success" });
  },

  getCheckpointCheckedValuesFromState(state, stepId) {
    const map = (state.checkpointsDone && state.checkpointsDone[stepId]) || {};
    return Object.keys(map).filter((k) => map[k]);
  },

  decorateSteps(state, viewStepIndex) {
    return PROCESS_STEPS.map((s) => {
      const allCheckpointsDone = this.isAllCheckpointsDone(state, s.id);

      let stateClass = "";
      const isCompleted = state.completedSteps && state.completedSteps.includes(s.id);

      // 只有“点过完成”且“关键检查全勾”同时满足，才显示绿色完成态；
      // 避免本地缓存 completedSteps 残留导致与勾选状态不一致。
      if (isCompleted && allCheckpointsDone) {
        stateClass = "step-done";
      } else if (viewStepIndex + 1 === s.id) {
        stateClass = allCheckpointsDone ? "step-ready" : "step-current";
      }
      return { ...s, stateClass, upperId: this.toUpperStepNumber(s.id) };
    });
  },

  isAllCheckpointsDone(state, stepId) {
    const stepDef = PROCESS_STEPS[stepId - 1];
    if (!stepDef) return false;
    const doneMap = (state.checkpointsDone && state.checkpointsDone[stepId]) || {};
    return stepDef.checkpoints.every((cp) => doneMap[cp] === true);
  },
});
