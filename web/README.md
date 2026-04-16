# 生产流程控制系统 - 网页版

将微信小程序转换为网页版本，使用原生 JavaScript + localStorage 实现数据存储。

## 项目结构

```
web/
├── index.html          # 主入口文件
├── css/
│   └── style.css      # 样式文件
├── js/
│   └── app.js         # 应用初始化
├── utils/
│   ├── constants.js   # 常量定义（流程步骤、参数限制等）
│   ├── store.js       # 数据存储管理（localStorage）
│   └── router.js      # 路由系统
└── pages/
    ├── auth/          # 登录/注册页面
    ├── home/          # 首页
    ├── process/       # 流程管理
    ├── logs/          # 操作日志
    ├── admin/         # 管理员控制台
    └── monitor/       # 监控页面
```

## 功能特性

- ✅ 用户登录/注册
- ✅ 管理员账号（master/985211）
- ✅ 8步生产流程管理
- ✅ 关键检查项勾选
- ✅ 实时参数监控
- ✅ 操作日志记录
- ✅ 管理员员工进度监控
- ✅ CSV数据导出
- ✅ 响应式设计

## 运行方式

### 方式1：直接打开（最简单）
直接用浏览器打开 `index.html` 文件即可使用。

### 方式2：本地服务器
如果需要更完整的体验，可以使用以下方式启动本地服务器：

**使用 Python:**
```bash
cd web
python -m http.server 8080
```

**使用 Node.js:**
```bash
cd web
npx serve -l 8080
```

**使用 VS Code:**
安装 Live Server 插件，右键点击 index.html 选择 "Open with Live Server"

然后访问 http://localhost:8080

## 默认账号

- **管理员账号**: master
- **管理员密码**: 985211

## 技术说明

### 数据存储
- 使用浏览器 localStorage 存储所有数据
- 数据保存在浏览器本地，清除浏览器数据会丢失
- 不同浏览器之间的数据不互通

### 与小程序的差异
| 功能 | 小程序 | 网页版 |
|------|--------|--------|
| 存储 | wx.getStorageSync | localStorage |
| 页面跳转 | wx.navigateTo | hash 路由 |
| 提示 | wx.showToast | 自定义 toast |
| 对话框 | wx.showModal | 自定义 modal |
| 剪贴板 | wx.setClipboardData | navigator.clipboard |

## 浏览器兼容性

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+
