const { resetAllToDefault } = require("./utils/store");

App({
  onLaunch() {
    // 按当前需求：每次启动都恢复默认（不保留关键项高亮/流程进度）
    resetAllToDefault();
  }
});
