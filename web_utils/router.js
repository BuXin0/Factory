// 简单的路由系统
const Router = {
  currentPage: null,

  // 初始化路由
  init() {
    // 监听 hash 变化
    window.addEventListener('hashchange', () => this.handleRoute());
    // 页面加载时处理当前路由
    window.addEventListener('load', () => this.handleRoute());
  },

  // 处理路由
  handleRoute() {
    const hash = window.location.hash.slice(1) || 'auth';
    const currentUser = getCurrentUser();

    // 未登录且不在登录页面，重定向到登录页
    if (!currentUser && hash !== 'auth') {
      this.navigate('auth');
      return;
    }

    // 已登录但在登录页面，跳转到首页
    if (currentUser && hash === 'auth') {
      this.navigate('home');
      return;
    }

    this.loadPage(hash);
  },

  // 加载页面
  loadPage(pageName) {
    this.currentPage = pageName;

    // 更新底部导航状态
    this.updateTabBar(pageName);

    // 调用对应页面的渲染函数
    const pageFunctions = {
      'auth': renderAuthPage,
      'home': renderHomePage,
      'process': renderProcessPage,
      'logs': renderLogsPage,
      'admin': renderAdminPage,
      'monitor': renderMonitorPage
    };

    const renderFunction = pageFunctions[pageName];
    if (renderFunction) {
      const app = document.getElementById('app');
      app.innerHTML = renderFunction();

      // 执行页面初始化函数
      const initFunction = window[`init${pageName.charAt(0).toUpperCase() + pageName.slice(1)}Page`];
      if (initFunction) {
        setTimeout(() => initFunction(), 0);
      }
    }
  },

  // 导航到指定页面
  navigate(pageName) {
    window.location.hash = pageName;
  },

  // 更新底部导航栏状态
  updateTabBar(pageName) {
    const tabBar = document.getElementById('tab-bar');
    const currentUser = getCurrentUser();

    if (!currentUser) {
      tabBar.classList.add('hidden');
      return;
    }

    tabBar.classList.remove('hidden');

    // 更新激活状态
    document.querySelectorAll('.tab-item').forEach(item => {
      item.classList.remove('active');
      if (item.dataset.page === pageName) {
        item.classList.add('active');
      }
    });
  }
};

// 全局提示函数
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  const icon = document.getElementById('toast-icon');
  const msg = document.getElementById('toast-message');

  icon.textContent = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
  msg.textContent = message;

  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// 确认对话框
function showModal(title, content, onConfirm, onCancel) {
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalContent = document.getElementById('modal-content');
  const confirmBtn = document.getElementById('modal-confirm');
  const cancelBtn = document.getElementById('modal-cancel');

  modalTitle.textContent = title;
  modalContent.textContent = content;
  modal.classList.add('show');

  const handleConfirm = () => {
    modal.classList.remove('show');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    modal.classList.remove('show');
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
    if (onCancel) onCancel();
  };

  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);
}

// 复制到剪贴板
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch (err) {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

// 数字转中文
function toUpperStepNumber(n) {
  const num = Number(n);
  const map = {
    1: "一", 2: "二", 3: "三", 4: "四", 5: "五",
    6: "六", 7: "七", 8: "八", 9: "九", 10: "十"
  };
  return map[num] || String(n);
}
