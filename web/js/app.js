// 应用初始化
(function() {
  // 初始化数据存储
  initStateIfNeeded();

  // 初始化路由
  Router.init();

  // 点击底部导航
  document.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const page = item.dataset.page;
      if (page) {
        Router.navigate(page);
      }
    });
  });
})();
