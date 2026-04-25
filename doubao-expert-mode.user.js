// ==UserScript==
// @name         豆包自动切换专家模式
// @namespace    https://www.doubao.com/
// @version      1.1
// @description  自动将豆包网页版的对话模式从"快速"切换为"专家"
// @author       Jian Zhou
// @match        https://www.doubao.com/chat/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const TARGET_MODE = '专家';
  const MAX_RETRIES = 30;       // 最多尝试 30 次
  const RETRY_INTERVAL = 1000;  // 每秒检查一次
  const MENU_WAIT = 500;        // 等待下拉菜单出现的时间（毫秒）

  let switching = false;        // 防止并发切换

  /**
   * 模拟真实的鼠标点击（Radix UI 需要完整的 pointer 事件链）
   */
  function simulateClick(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const eventOpts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };

    el.dispatchEvent(new PointerEvent('pointerdown', { ...eventOpts, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent('mousedown', eventOpts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...eventOpts, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
    el.dispatchEvent(new MouseEvent('click', eventOpts));
  }

  /**
   * 找到模式切换的外层触发器按钮
   * 匹配条件：data-slot="dropdown-menu-trigger" 且文本内容恰好是模式名称
   */
  function findModeTrigger() {
    const triggers = document.querySelectorAll(
      'button[data-slot="dropdown-menu-trigger"][aria-haspopup="menu"]'
    );
    for (const trigger of triggers) {
      const text = trigger.textContent.trim();
      if (text === '快速' || text === '思考' || text === '专家') {
        return trigger;
      }
    }
    return null;
  }

  /**
   * 找到外层触发器内部的可见按钮（Radix UI 的实际点击目标）
   */
  function findInnerButton(trigger) {
    return trigger.querySelector('button') || trigger;
  }

  /**
   * 在下拉菜单中找到"专家"选项
   */
  function findExpertMenuItem() {
    const items = document.querySelectorAll('[role="menuitem"]');
    for (const item of items) {
      if (item.textContent.includes(TARGET_MODE)) {
        return item;
      }
    }
    return null;
  }

  /**
   * 判断当前是否已经是专家模式
   */
  function isAlreadyExpert(trigger) {
    return trigger.textContent.trim() === TARGET_MODE;
  }

  /**
   * 执行切换
   */
  function switchToExpert() {
    if (switching) return;

    const trigger = findModeTrigger();
    if (!trigger) return false;
    if (isAlreadyExpert(trigger)) {
      console.log('[豆包专家模式] 当前已是专家模式，无需切换');
      return true;
    }

    switching = true;
    console.log('[豆包专家模式] 检测到非专家模式，正在切换...');

    // 第一步：点击内部按钮打开下拉菜单
    const innerBtn = findInnerButton(trigger);
    simulateClick(innerBtn);

    // 第二步：等待菜单出现后点击"专家"
    setTimeout(() => {
      const menuItem = findExpertMenuItem();
      if (menuItem) {
        simulateClick(menuItem);
        console.log('[豆包专家模式] 已成功切换到专家模式');
      } else {
        console.warn('[豆包专家模式] 未找到专家选项，尝试关闭菜单');
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
      }
      switching = false;
    }, MENU_WAIT);

    return true;
  }

  /**
   * 带重试的切换逻辑（等待页面加载完成）
   */
  function trySwitch(retries = 0) {
    if (retries >= MAX_RETRIES) {
      console.warn('[豆包专家模式] 达到最大重试次数，放弃切换');
      return;
    }

    const trigger = findModeTrigger();
    if (!trigger) {
      setTimeout(() => trySwitch(retries + 1), RETRY_INTERVAL);
      return;
    }

    if (isAlreadyExpert(trigger)) {
      console.log('[豆包专家模式] 当前已是专家模式');
      return;
    }

    switchToExpert();
  }

  /**
   * 监听 SPA 路由变化（豆包是单页应用，切换对话/新建对话不会刷新页面）
   */
  function observeRouteChanges() {
    let lastUrl = location.href;

    const observer = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        console.log('[豆包专家模式] 检测到页面导航，重新检查模式...');
        setTimeout(() => trySwitch(0), 1500);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 拦截 pushState / replaceState
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;

    history.pushState = function (...args) {
      origPushState.apply(this, args);
      setTimeout(() => trySwitch(0), 1500);
    };
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      setTimeout(() => trySwitch(0), 1500);
    };

    window.addEventListener('popstate', () => {
      setTimeout(() => trySwitch(0), 1500);
    });
  }

  // 启动
  console.log('[豆包专家模式] 脚本已加载');
  trySwitch(0);
  observeRouteChanges();
})();
