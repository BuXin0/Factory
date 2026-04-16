const { getLogs, getCurrentUser } = require("../../utils/store");
const { STORAGE_KEYS, PROCESS_STEPS } = require("../../utils/constants");

Page({
  data: {
    logs: []
  },

  onShow() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      wx.redirectTo({
        url: "/pages/auth/auth"
      });
      return;
    }
    
    this.setData({
      logs: getLogs()
    });
  },

  clearLogs() {
    wx.showModal({
      title: "确认清空",
      content: "是否清空全部操作日志？",
      success: (res) => {
        if (!res.confirm) return;
        wx.setStorageSync(STORAGE_KEYS.LOGS, []);
        this.setData({ logs: [] });
      }
    });
  },

  // 导出日志为CSV
  exportLogs() {
    const logs = this.data.logs;
    if (logs.length === 0) {
      wx.showToast({ title: "暂无日志可导出", icon: "none" });
      return;
    }

    // 构建 CSV 数据
    const rows = [];
    rows.push(["时间", "类型", "操作员", "步骤", "步骤名称", "状态", "温度(°C)", "压力(MPa)", "流量(L/min)"]);
    
    logs.forEach(log => {
      rows.push([
        log.time,
        log.type,
        log.operator,
        log.stepId,
        log.stepName,
        log.status,
        log.params?.temperature ?? "-",
        log.params?.pressure ?? "-",
        log.params?.flow ?? "-"
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
        wx.showToast({ title: "日志已导出", icon: "success" });
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
