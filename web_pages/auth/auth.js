// 登录/注册页面
let authMode = 'login';

function renderAuthPage() {
  return `
    <div class="page-container" style="max-width: 400px; padding-top: 60px;">
      <div class="card" style="text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 8px;">生产流程控制系统</h1>
        <p style="color: var(--text-secondary); margin-bottom: 24px;">${authMode === 'login' ? '请登录您的账号' : '注册新账号'}</p>

        <div id="auth-error" class="error-message" style="margin-bottom: 16px; display: none;"></div>

        <div class="input-group">
          <input type="text" id="username" class="input" placeholder="用户名" maxlength="20">
        </div>

        <div class="input-group">
          <input type="password" id="password" class="input" placeholder="密码" maxlength="20">
        </div>

        ${authMode === 'register' ? `
        <div class="input-group">
          <input type="password" id="confirmPassword" class="input" placeholder="确认密码" maxlength="20">
        </div>
        <div class="input-group">
          <input type="tel" id="phone" class="input" placeholder="手机号" maxlength="11">
        </div>
        ` : ''}

        <button id="auth-btn" class="btn btn-primary btn-block" style="margin-top: 8px;">
          ${authMode === 'login' ? '登录' : '注册'}
        </button>

        <p style="margin-top: 16px; color: var(--text-secondary); font-size: 14px;">
          ${authMode === 'login' ? '还没有账号？' : '已有账号？'}
          <span class="link" id="switch-mode">${authMode === 'login' ? '立即注册' : '立即登录'}</span>
        </p>
      </div>
    </div>
  `;
}

function initAuthPage() {
  // 检查是否已登录
  const currentUser = getCurrentUser();
  if (currentUser) {
    Router.navigate('home');
    return;
  }

  // 绑定事件
  document.getElementById('auth-btn').addEventListener('click', handleAuth);
  document.getElementById('switch-mode').addEventListener('click', switchMode);

  // 回车键提交
  document.querySelectorAll('.input-group input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAuth();
      }
    });
  });

  // 自动聚焦用户名输入框
  document.getElementById('username')?.focus();
}

function switchMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  // 重新渲染页面
  const app = document.getElementById('app');
  app.innerHTML = renderAuthPage();
  initAuthPage();
}

function showError(message) {
  const errorEl = document.getElementById('auth-error');
  errorEl.textContent = message;
  errorEl.style.display = message ? 'block' : 'none';
}

function validateInputs() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  if (!username) {
    showError('请输入用户名');
    return false;
  }

  if (!password) {
    showError('请输入密码');
    return false;
  }

  if (authMode === 'register') {
    const confirmPassword = document.getElementById('confirmPassword').value;
    const phone = document.getElementById('phone').value;

    if (password.length < 6) {
      showError('密码长度至少6位');
      return false;
    }

    if (password !== confirmPassword) {
      showError('两次输入的密码不一致');
      return false;
    }

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      showError('请输入正确的手机号');
      return false;
    }
  }

  showError('');
  return true;
}

function handleAuth() {
  if (!validateInputs()) return;

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('auth-btn');

  btn.disabled = true;
  btn.textContent = authMode === 'login' ? '登录中...' : '注册中...';

  setTimeout(() => {
    if (authMode === 'login') {
      const result = loginUser(username, password);
      if (result.success) {
        showToast('登录成功', 'success');
        setTimeout(() => {
          Router.navigate('home');
        }, 600);
      } else {
        showError(result.message || '登录失败');
        btn.disabled = false;
        btn.textContent = '登录';
      }
    } else {
      const phone = document.getElementById('phone').value;
      const result = registerUser(username, password, phone);
      if (result.success) {
        showToast('注册成功，请登录', 'success');
        setTimeout(() => {
          switchMode();
        }, 1000);
      } else {
        showError(result.message || '注册失败');
        btn.disabled = false;
        btn.textContent = '注册';
      }
    }
  }, 300);
}
