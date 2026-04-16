const { getCurrentUser, isAdmin, getAllUsers, ADMIN_USERNAME, getLogs } = require("../../utils/store");
const { PROCESS_STEPS } = require("../../utils/constants");

Page({
  data: {
    currentUser: null,
    isAdmin: false,
    users: [],
    selectedUser: null,
    userLogs: [],
    loading: false,
    error: ""
  },

  onLoad() {
    this.checkAdminAccess();
  },

  onShow() {
    this.checkAdminAccess();
  },

  checkAdminAccess() {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
      wx.reLaunch({ url: "/pages/auth/auth" });
      return;
    }

    if (!isAdmin(currentUser)) {
      wx.showToast({ 
        title: "权限不足", 
        icon: "error",
        duration: 2000
      });
      setTimeout(() => {
        wx.switchTab({ url: "/pages/home/home" });
      }, 1500);
      return;
    }

    this.setData({ 
      currentUser,
      isAdmin: true 
    });
    
    this.loadUsers();
  },

  loadUsers() {
    const users = getAllUsers();
    const logs = getLogs();
    // 过滤掉管理员自己，并计算每个员工的进度
    const employees = users
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
    this.setData({ users: employees });
  },

  selectUser(e) {
    const username = e.currentTarget.dataset.username;
    const user = this.data.users.find(u => u.username === username);
    if (!user) return;
    
    // 如果点击的是已选中的员工，则收起监控界面
    if (this.data.selectedUser && this.data.selectedUser.username === username) {
      this.setData({ selectedUser: null, userLogs: [] });
    } else {
      this.setData({ selectedUser: user });
      this.loadUserLogs(username);
    }
  },

  loadUserLogs(username) {
    const logs = wx.getStorageSync("factory_process_logs") || [];
    // 筛选该用户的操作日志
    const userLogs = logs.filter(log => 
      log.operator === username || 
      (log.operator && log.operator.includes(username))
    ).slice(0, 50);
    
    this.setData({ userLogs });
  },

  goBack() {
    wx.switchTab({ url: "/pages/home/home" });
  },

  logout() {
    wx.removeStorageSync("factory_current_user");
    wx.reLaunch({ url: "/pages/auth/auth" });
  },

  // 导出单个员工工作进度
  exportUserProgress(e) {
    const username = e.currentTarget.dataset.username;
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

    // 复制到剪贴板
    wx.setClipboardData({
      data: csv,
      success: () => {
        wx.showToast({ title: `${username}进度已导出`, icon: "success" });
      },
      fail: () => {
        wx.showModal({
          title: "导出失败",
          content: "无法复制到剪贴板，请稍后重试。",
          showCancel: false
        });
      }
    });
  },

  // 导出所有员工工作进度
  exportWorkProgress() {
    const { getState } = require("../../utils/store");
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

    // 复制到剪贴板
    wx.setClipboardData({
      data: csv,
      success: () => {
        wx.showToast({ title: "工作进度已导出", icon: "success" });
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
