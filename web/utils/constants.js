// 生产流程步骤定义
const PROCESS_STEPS = [
  {
    id: 1,
    name: "搅拌",
    duration: "15分钟",
    checkpoints: ["乙二醇加热", "监控温度", "监控压差", "监控流量计参数"]
  },
  {
    id: 2,
    name: "排气",
    duration: "7-8分钟",
    checkpoints: ["关闭加热", "监控蒸汽流量"]
  },
  {
    id: 3,
    name: "接IV",
    duration: "约5分钟",
    checkpoints: ["检查插销", "检查阀门", "检查垫圈", "检查密封", "检查气管"]
  },
  {
    id: 4,
    name: "蒸煮",
    duration: "约20分钟",
    checkpoints: ["双加热", "监控流量", "监控温度", "自动进灭菌"]
  },
  {
    id: 5,
    name: "灭菌",
    duration: "40分钟",
    checkpoints: ["间歇加热", "监控温度", "监控压力", "监控阀门状态"]
  },
  {
    id: 6,
    name: "冷却",
    duration: "约20分钟",
    checkpoints: ["切换风冷", "监控温度", "监控压力", "监控流量", "自动启停真空泵", "达标后进接种"]
  },
  {
    id: 7,
    name: "接种",
    duration: "约8分钟",
    checkpoints: ["开启IV阀", "检查指定阀门状态"]
  },
  {
    id: 8,
    name: "等待包装",
    duration: "待人工处理",
    checkpoints: ["流程暂停", "提示待包装"]
  }
];

// 参数限制
const PARAM_LIMITS = {
  temperature: { warnMin: 20, warnMax: 85, dangerMin: 10, dangerMax: 95, unit: "°C" },
  pressure: { warnMin: 0.15, warnMax: 1.8, dangerMin: 0.05, dangerMax: 2.2, unit: "MPa" },
  flow: { warnMin: 12, warnMax: 95, dangerMin: 5, dangerMax: 110, unit: "L/min" }
};

// 存储键名
const STORAGE_KEYS = {
  STATE: "factory_process_state",
  LOGS: "factory_process_logs",
  USERS: "factory_users",
  CURRENT_USER: "factory_current_user"
};

// 管理员账号
const ADMIN_USERNAME = 'master';
