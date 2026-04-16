const { PROCESS_STEPS } = require("../../utils/constants");
const { getState, appendLog, getCurrentUser } = require("../../utils/store");

Page({
  onShow() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      wx.reLaunch({ url: "/pages/auth/auth" });
    }
  },

  toUpperStepNumber(n) {
    const num = Number(n);
    const map = { 1: "一", 2: "二", 3: "三", 4: "四", 5: "五", 6: "六", 7: "七", 8: "八", 9: "九", 10: "十" };
    return map[num] || String(n);
  },

  escapeCSV(value) {
    const s = String(value ?? "");
    if (/[",\n]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  },

  buildExportCSV(state) {
    const rows = [];
    rows.push(["步骤ID(大写/小写)", "步骤名称", "检查项", "完成状态"]);

    (PROCESS_STEPS || []).forEach((step) => {
      (step.checkpoints || []).forEach((cp) => {
        const done =
          state.checkpointsDone &&
          state.checkpointsDone[step.id] &&
          state.checkpointsDone[step.id][cp] === true;
        const stepIdLabel = `${this.toUpperStepNumber(step.id)}(${step.id})`;
        rows.push([stepIdLabel, step.name, cp, done ? "已完成" : "未完成"]);
      });
    });

    return rows
      .map((r) => r.map((cell) => this.escapeCSV(cell)).join(","))
      .join("\n");
  },

  exportCheckpointsTable() {
    const state = getState();
    const csv = this.buildExportCSV(state);
    const operator = state.operator || "未登录操作员";

    wx.setClipboardData({
      data: csv,
      success: () => {
        wx.showToast({ title: "已复制到剪贴板（CSV）", icon: "success" });
        appendLog({
          type: "导出检查表",
          operator,
          stepId: state.currentStep,
          stepName: (PROCESS_STEPS[state.currentStep - 1] && PROCESS_STEPS[state.currentStep - 1].name) || "",
          params: state.params,
          status: state.processStatus
        });
      },
      fail: () => {
        wx.showModal({
          title: "导出失败",
          content: "无法复制到剪贴板，请稍后重试。",
          showCancel: false
        });
      }
    });
  }
});
