const { PROCESS_STEPS } = require("../../utils/constants");
const { getState, setOperator, getCurrentUser, isAdmin, logoutUser } = require("../../utils/store");

function statusText(status) {
  if (status === "danger") return "异常";
  if (status === "warning") return "警告";
  return "正常";
}

Page({
  data: {
    state: {},
    currentStepObj: {},
    progressPercent: 0,
    completedByStepCount: 0,
    operatorInput: "",
    statusText: "正常",
    isAdmin: false
  },

  onShow() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      wx.reLaunch({ url: "/pages/auth/auth" });
      return;
    }
    this.setData({ isAdmin: isAdmin(currentUser) });
    this.refreshData();
  },

  refreshData() {
    const state = getState();
    const currentStepObj = PROCESS_STEPS[state.currentStep - 1];
    const completedByStepCount = Math.max(0, Number(state.currentStep || 1) - 1);
    const rawPercent = (completedByStepCount / PROCESS_STEPS.length) * 100;
    const progressPercent = Math.max(0, Math.min(100, Math.floor(Number.isFinite(rawPercent) ? rawPercent : 0)));
    this.setData({
      state,
      currentStepObj,
      progressPercent,
      completedByStepCount,
      operatorInput: state.operator,
      statusText: statusText(state.processStatus)
    });
  },

  onOperatorInput(e) {
    this.setData({ operatorInput: e.detail.value });
  },

  saveOperator() {
    const name = (this.data.operatorInput || "").trim();
    if (!name) {
      wx.showToast({ title: "请输入操作员姓名", icon: "none" });
      return;
    }
    setOperator(name);
    this.refreshData();
    wx.showToast({ title: "操作员已更新", icon: "success" });
  },

  goToAdmin() {
    wx.navigateTo({
      url: "/pages/admin/admin"
    });
  },

  logout() {
    wx.showModal({
      title: "确认退出",
      content: "确定要退出登录吗？",
      confirmColor: "#ef4444",
      success: (res) => {
        if (res.confirm) {
          logoutUser();
          wx.showToast({ title: "已退出登录", icon: "success" });
          setTimeout(() => {
            wx.reLaunch({ url: "/pages/auth/auth" });
          }, 800);
        }
      }
    });
  }
});
