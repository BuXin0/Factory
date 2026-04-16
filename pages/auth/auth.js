const API_BASE_URL = 'http://172.31.157.170:3000'; // 修改为电脑的实际IP

const { getUserByUsername, registerUser, loginUser, getCurrentUser } = require("../../utils/store");

Page({
  data: {
    mode: "login",
    username: "",
    password: "",
    confirmPassword: "",
    phone: "",
    loading: false,
    error: "",
    focusField: "" // 控制聚焦的字段
  },

  onLoad() {
    const currentUser = getCurrentUser();
    if (currentUser) {
      wx.switchTab({ url: "/pages/home/home" });
    }
  },

  switchMode() {
    this.setData({
      mode: this.data.mode === "login" ? "register" : "login",
      password: "",
      confirmPassword: "",
      phone: "",
      error: ""
    });
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value, error: "" });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value, error: "" });
  },

  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value, error: "" });
  },

  onPhoneInput(e) {
    this.setData({ phone: e.detail.value, error: "" });
  },

  // 回车切换下一项
  onUsernameConfirm() {
    this.focusInput("passwordInput");
  },

  onPasswordConfirm() {
    if (this.data.mode === "register") {
      this.focusInput("confirmPasswordInput");
    } else {
      this.handleLogin();
    }
  },

  onConfirmPasswordConfirm() {
    this.focusInput("phoneInput");
  },

  onPhoneConfirm() {
    this.handleRegister();
  },

  focusInput(field) {
    this.setData({ focusField: "" });
    setTimeout(() => {
      this.setData({ focusField: field });
    }, 50);
  },

  validateInputs() {
    const { username, password, confirmPassword, phone, mode } = this.data;
    
    if (!username.trim()) {
      this.setData({ error: "请输入用户名" });
      return false;
    }
    
    if (!password) {
      this.setData({ error: "请输入密码" });
      return false;
    }
    
    if (mode === "register") {
      if (password.length < 6) {
        this.setData({ error: "密码长度至少6位" });
        return false;
      }
      
      if (password !== confirmPassword) {
        this.setData({ error: "两次输入的密码不一致" });
        return false;
      }
      
      if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
        this.setData({ error: "请输入正确的手机号" });
        return false;
      }
    }
    
    return true;
  },

  handleLogin() {
    if (!this.validateInputs()) return;
    
    this.setData({ loading: true });
    
    const { username, password } = this.data;
    const result = loginUser(username, password);
    
    if (result.success) {
      wx.showToast({ 
        title: "登录成功", 
        icon: "success",
        duration: 600
      });
      // 延迟跳转，先让 toast 显示
      setTimeout(() => {
        // 清除 loading 避免闪烁
        this.setData({ loading: false });
        // 跳转到tabBar首页以显示导航栏
        wx.switchTab({ 
          url: "/pages/home/home"
        });
      }, 400);
    } else {
      this.setData({ error: result.message || "登录失败", loading: false });
      wx.vibrateShort({ type: "light" });
    }
  },

  async handleRegister() {
    if (!this.validateInputs()) return;
    
    this.setData({ loading: true });
    
    const { username, password, phone } = this.data;
    const result = registerUser(username, password, phone);
    
    if (result.success) {
      wx.showToast({ 
        title: "注册成功", 
        icon: "success",
        duration: 1000
      });
      setTimeout(() => {
        this.setData({
          mode: "login",
          password: "",
          confirmPassword: "",
          phone: "",
          loading: false
        });
      }, 1000);
    } else {
      this.setData({ error: result.message || "注册失败", loading: false });
      wx.vibrateShort({ type: "light" });
    }
  }
});