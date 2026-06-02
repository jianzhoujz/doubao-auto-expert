// ==UserScript==
// @name         AI 网页版自动切换深度思考 / 专家模式
// @namespace    https://github.com/jianzhoujz/doubao-auto-expert
// @version      3.0.23
// @description  在 ChatGPT / Claude / Gemini / GitHub Copilot / 智谱 / Z.ai / Kimi / DeepSeek / 千问 / Qwen / 豆包 / 元宝 之间一键转发问题（自动填入目标输入框）；并在豆包 / DeepSeek / 千问 / Z.ai 上自动切换深度思考 / 专家模式 / 高级搜索
// @author       Jian Zhou
// @homepageURL  https://github.com/jianzhoujz/doubao-auto-expert
// @supportURL   https://github.com/jianzhoujz/doubao-auto-expert/issues
// @updateURL    https://raw.githubusercontent.com/jianzhoujz/doubao-auto-expert/main/doubao-expert-mode.user.js
// @downloadURL  https://raw.githubusercontent.com/jianzhoujz/doubao-auto-expert/main/doubao-expert-mode.user.js
// @match        https://chatgpt.com/*
// @match        https://claude.ai/*
// @match        https://gemini.google.com/*
// @match        https://github.com/copilot*
// @match        https://chatglm.cn/*
// @match        https://chat.z.ai/*
// @match        https://www.kimi.com/*
// @match        https://kimi.com/*
// @match        https://chat.deepseek.com/*
// @match        https://www.qianwen.com/*
// @match        https://qianwen.com/*
// @match        https://chat.qwen.ai/*
// @match        https://www.doubao.com/chat/*
// @match        https://yuanbao.tencent.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // Toast 通知
  // ============================================================
  const TOAST_CSS = `
    .__aem-toast-container{position:fixed;top:16px;right:16px;z-index:2147483647;display:flex;flex-direction:column;gap:8px;pointer-events:none}
    .__aem-toast{pointer-events:auto;min-width:220px;max-width:360px;padding:10px 14px;border-radius:8px;font-size:13px;line-height:1.45;color:#fff;
      box-shadow:0 6px 18px rgba(0,0,0,.18);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
      opacity:0;transform:translateY(-6px);transition:opacity .2s ease,transform .2s ease}
    .__aem-toast.show{opacity:1;transform:translateY(0)}
    .__aem-toast.success{background:#16a34a}
    .__aem-toast.info{background:#2563eb}
    .__aem-toast.error{background:#dc2626}
    .__aem-toast .__aem-title{font-weight:600;margin-bottom:2px}
    .__aem-toast .__aem-desc{opacity:.92;word-break:break-word}
  `;

  let toastContainer = null;

  function ensureToastContainer() {
    if (toastContainer && document.body && document.body.contains(toastContainer)) return toastContainer;
    if (!document.getElementById('__aem-toast-style')) {
      const style = document.createElement('style');
      style.id = '__aem-toast-style';
      style.textContent = TOAST_CSS;
      (document.head || document.documentElement).appendChild(style);
    }
    toastContainer = document.createElement('div');
    toastContainer.className = '__aem-toast-container';
    (document.body || document.documentElement).appendChild(toastContainer);
    return toastContainer;
  }

  function toast(type, title, desc, duration) {
    const container = ensureToastContainer();
    const node = document.createElement('div');
    node.className = `__aem-toast ${type}`;
    const t = document.createElement('div');
    t.className = '__aem-title';
    t.textContent = title;
    node.appendChild(t);
    if (desc) {
      const d = document.createElement('div');
      d.className = '__aem-desc';
      d.textContent = desc;
      node.appendChild(d);
    }
    container.appendChild(node);
    requestAnimationFrame(() => node.classList.add('show'));
    const ms = duration || (type === 'error' ? 6000 : 3200);
    setTimeout(() => {
      node.classList.remove('show');
      setTimeout(() => node.remove(), 250);
    }, ms);
  }

  // ============================================================
  // 通用工具
  // ============================================================
  const log = (...args) => console.log('[AutoExpert]', ...args);
  const warn = (...args) => console.warn('[AutoExpert]', ...args);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function isVisibleElement(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    if (r.bottom < 0 || r.top > window.innerHeight) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
  }

  function simulateClick(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    el.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  function nativeClick(el) {
    try { el.focus && el.focus(); } catch {}
    try { el.click(); return true; } catch (e) {
      warn('native click failed', e);
      return false;
    }
  }

  function simulateHover(el) {
    const rect = el.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
    el.dispatchEvent(new PointerEvent('pointerover', { ...opts, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new PointerEvent('pointerenter', { ...opts, pointerId: 1 }));
    el.dispatchEvent(new MouseEvent('mouseenter', opts));
    el.dispatchEvent(new MouseEvent('mousemove', opts));
  }

  function pressEscape() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  }

  // ============================================================
  // 站点处理器
  // ============================================================

  // ---------- 豆包：下拉菜单选模式 ----------
  const doubaoHandler = {
    id: 'doubao',
    label: '豆包',
    targetLabel: '专家',
    rerunOnRouteChange: true,
    match: () => /^https:\/\/www\.doubao\.com\/chat\//.test(location.href),

    findTrigger() {
      const triggers = document.querySelectorAll(
        'button[data-slot="dropdown-menu-trigger"][aria-haspopup="menu"]'
      );
      for (const t of triggers) {
        const text = (t.textContent || '').trim();
        if (text === '快速' || text === '思考' || text === '专家') return t;
      }
      return null;
    },

    async run() {
      const trigger = this.findTrigger();
      if (!trigger) return { status: 'pending' };

      const current = (trigger.textContent || '').trim();
      if (current === '专家') return { status: 'noop', reason: '当前已是专家模式' };

      const inner = trigger.querySelector('button') || trigger;
      simulateClick(inner);

      // 菜单内容是异步渲染的,固定 sleep 在慢网/慢机器上会错过;
      // 改成轮询查找「专家」menuitem,最多等 5s
      let target = null;
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        for (const item of document.querySelectorAll('[role="menuitem"]')) {
          if ((item.textContent || '').includes('专家')) { target = item; break; }
        }
        if (target) break;
        await sleep(500);
      }
      if (!target) {
        pressEscape();
        return { status: 'error', reason: '已展开下拉菜单,但 5s 内未出现「专家」选项' };
      }
      simulateClick(target);
      return { status: 'success', from: current, to: '专家' };
    },
  };

  // ---------- DeepSeek：「快速模式 / 专家模式」pill 切换 ----------
  // 实测：两个 pill 都是 <div cursor:pointer>，size ~75x26，
  // 父级是 139x34 的 wrapper，激活态靠文字颜色区分（选中=蓝色 rgb(57,100,254)）
  const deepseekHandler = {
    id: 'deepseek',
    label: 'DeepSeek',
    targetLabel: '专家模式',
    rerunOnRouteChange: true,
    match: () => /^https:\/\/chat\.deepseek\.com\//.test(location.href),

    findPill(label) {
      const all = document.querySelectorAll('div');
      for (const el of all) {
        if ((el.textContent || '').trim() !== label) continue;
        const r = el.getBoundingClientRect();
        if (r.height < 24 || r.height > 40) continue;
        if (getComputedStyle(el).cursor !== 'pointer') continue;
        return el;
      }
      return null;
    },

    isActive(el) {
      // 选中态文字偏蓝（b 通道明显大于 r/g）
      const m = (getComputedStyle(el).color || '').match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      if (!m) return false;
      const r = +m[1], g = +m[2], b = +m[3];
      return b > 150 && b > r + 60 && b > g + 30;
    },

    async run() {
      // 已进入具体会话页：pill 控件不再渲染，且模式在该会话内保持，
      // 不必再尝试切换，否则会卡在 pending 直到超时报错。
      if (/\/a\/chat\/s\//.test(location.pathname)) return { status: 'skip' };

      const expert = this.findPill('专家模式');
      const fast = this.findPill('快速模式');
      if (!expert || !fast) return { status: 'pending' };

      if (this.isActive(expert)) return { status: 'noop', reason: '当前已是专家模式' };

      simulateClick(expert);
      await sleep(450);

      const expert2 = this.findPill('专家模式');
      if (expert2 && this.isActive(expert2)) {
        return { status: 'success', from: '快速模式', to: '专家模式' };
      }
      return { status: 'error', reason: '已尝试点击专家模式 pill，但未观察到激活态切换' };
    },
  };

  // ---------- 千问：「思考」 toggle 按钮 ----------
  // 实测：<button aria-pressed="false|true">思考</button>，aria-pressed 即为开关状态
  const qianwenHandler = {
    id: 'qianwen',
    label: '千问',
    targetLabel: '思考',
    rerunOnRouteChange: false, // toggle 跨会话通常保持，避免误关
    match: () => /^https:\/\/(www\.)?qianwen\.com\//.test(location.href),

    findThinkButton() {
      const btns = document.querySelectorAll('button[aria-pressed]');
      for (const b of btns) {
        if ((b.textContent || '').trim() === '思考') return b;
      }
      return null;
    },

    async run() {
      const btn = this.findThinkButton();
      if (!btn) return { status: 'pending' };

      if (btn.getAttribute('aria-pressed') === 'true') {
        return { status: 'noop', reason: '思考已开启' };
      }

      simulateClick(btn);
      await sleep(450);

      const btn2 = this.findThinkButton();
      const after = btn2 && btn2.getAttribute('aria-pressed');
      if (after === 'true') {
        return { status: 'success', from: '默认模式', to: '思考' };
      }
      return { status: 'error', reason: `点击后 aria-pressed=${after}，未切换到 true` };
    },
  };

  // ---------- Z.ai：切换 GLM-5.1 + 开启搜索/高级搜索 ----------
  const zaiHandler = {
    id: 'zai',
    label: 'Z.ai',
    targetLabel: 'GLM-5.1 + 高级搜索',
    rerunOnRouteChange: true,
    rerunOnDomChange: true,
    match: () => /^https:\/\/chat\.z\.ai\//.test(location.href),

    findModelButton() {
      return document.querySelector('button.modelSelectorButton[aria-haspopup="menu"]')
        || document.querySelector('button[id^="model-selector-"][aria-haspopup="menu"]')
        || document.querySelector('button[aria-label*="模型"][aria-haspopup="menu"]');
    },

    findModelOption(label) {
      const buttons = document.querySelectorAll('button[aria-label="model-item"],button');
      for (const btn of buttons) {
        if (!isVisibleElement(btn)) continue;
        const text = (btn.innerText || btn.textContent || '').replace(/\s+/g, ' ').trim();
        if (text.includes(label) && !btn.classList.contains('modelSelectorButton')) return btn;
      }
      return null;
    },

    async ensureModel() {
      const trigger = this.findModelButton();
      if (!trigger) return { status: 'pending', reason: '未找到模型选择按钮' };

      const current = (trigger.innerText || trigger.textContent || '').replace(/\s+/g, ' ').trim();
      if (current.includes('GLM-5.1')) return { status: 'noop', reason: '当前已是 GLM-5.1' };

      pressEscape();
      await sleep(120);
      nativeClick(trigger);

      let option = null;
      let expanded = trigger.getAttribute('aria-expanded') === 'true';
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        expanded = expanded || trigger.getAttribute('aria-expanded') === 'true';
        option = this.findModelOption('GLM-5.1');
        if (option) break;
        await sleep(300);
      }
      if (!option) {
        pressEscape();
        const reason = expanded
          ? '模型菜单已展开，但未找到 GLM-5.1 选项（可能账号暂无权限）'
          : '点击模型按钮后菜单未展开（页面可能拦截了脚本点击）';
        return { status: 'error', reason };
      }

      nativeClick(option);
      await sleep(800);

      const after = this.findModelButton();
      const afterText = after && (after.innerText || after.textContent || '').replace(/\s+/g, ' ').trim();
      if (afterText && afterText.includes('GLM-5.1')) {
        return { status: 'success', from: current || '当前模型', to: 'GLM-5.1' };
      }
      return { status: 'error', reason: `已点击 GLM-5.1，但当前模型仍显示为「${afterText || '未知'}」` };
    },

    findSearchButton() {
      return document.querySelector('.messageInputContainer button[data-active]')
        || document.querySelector('button[data-active]');
    },

    findAdvancedSearchSwitch() {
      for (const sw of document.querySelectorAll('button[data-switch-root]')) {
        const tip = sw.closest('[data-tooltip-content]');
        const text = tip && (tip.innerText || tip.textContent || '');
        if (text && (/高级搜索|Advanced Search/.test(text))) return sw;
      }
      return null;
    },

    async ensureAdvancedSearch() {
      const search = this.findSearchButton();
      if (!search) return { status: 'pending', reason: '未找到搜索按钮' };

      if (search.getAttribute('data-active') !== 'true') {
        simulateClick(search);
        await sleep(500);
      } else {
        simulateHover(search);
        await sleep(300);
      }

      let sw = this.findAdvancedSearchSwitch();
      const deadline = Date.now() + 4000;
      while (!sw && Date.now() < deadline) {
        simulateHover(search);
        await sleep(350);
        sw = this.findAdvancedSearchSwitch();
      }
      if (!sw) return { status: 'error', reason: '已开启搜索，但未找到高级搜索开关' };

      if (sw.getAttribute('data-state') === 'checked' || sw.getAttribute('aria-checked') === 'true') {
        return { status: 'noop', reason: '高级搜索已开启' };
      }

      simulateClick(sw);
      await sleep(500);

      const sw2 = this.findAdvancedSearchSwitch();
      if (sw2 && (sw2.getAttribute('data-state') === 'checked' || sw2.getAttribute('aria-checked') === 'true')) {
        return { status: 'success', to: '高级搜索' };
      }
      return { status: 'error', reason: '已点击高级搜索开关，但未观察到 checked 状态' };
    },

    async run() {
      const model = await this.ensureModel();
      const advancedSearch = await this.ensureAdvancedSearch();

      const results = [model, advancedSearch];
      const pending = results.find((r) => r.status === 'pending');
      if (pending) return pending;

      const failed = results.find((r) => r.status === 'error');
      if (failed) return failed;

      if (results.some((r) => r.status === 'success')) {
        return { status: 'success', from: model.from, to: 'GLM-5.1 + 高级搜索' };
      }
      return { status: 'noop', reason: 'GLM-5.1 与高级搜索均已开启' };
    },
  };

  const HANDLERS = [doubaoHandler, deepseekHandler, qianwenHandler, zaiHandler];

  // ============================================================
  // 调度
  // ============================================================
  const MAX_RETRIES = 30;
  const RETRY_INTERVAL = 1000;
  const ROUTE_DELAY = 2000;

  let switching = false;
  let attemptCount = 0;
  let settledForUrl = '';
  let domAttemptScheduled = false;

  function pickHandler() {
    return HANDLERS.find((h) => h.match()) || null;
  }

  async function attempt() {
    if (switching) return;
    const handler = pickHandler();
    if (!handler) return;
    if (settledForUrl === location.href) return;

    switching = true;
    let result;
    try {
      result = await handler.run();
    } catch (err) {
      result = { status: 'error', reason: String((err && err.message) || err) };
    } finally {
      switching = false;
    }

    if (result.status === 'pending') {
      attemptCount++;
      if (attemptCount >= MAX_RETRIES) {
        toast('error', `${handler.label} 切换失败`, '页面元素未找到，已超时放弃（可能 DOM 结构已变更）');
        warn(handler.id, 'pending timed out');
        attemptCount = 0;
        settledForUrl = location.href;
      } else {
        setTimeout(attempt, RETRY_INTERVAL);
      }
      return;
    }

    attemptCount = 0;
    settledForUrl = location.href;

    if (result.status === 'skip') {
      log(handler.id, 'skip', result.reason || '');
      return;
    }

    if (result.status === 'success') {
      const desc = result.from ? `从「${result.from}」切换为「${result.to}」` : `已切换到「${result.to}」`;
      toast('success', `${handler.label} 切换成功`, desc);
      log(handler.id, 'success', result);
    } else if (result.status === 'noop') {
      toast('info', `${handler.label} 无需切换`, result.reason || '');
      log(handler.id, 'noop', result.reason);
    } else {
      toast('error', `${handler.label} 切换失败`, result.reason || '未知原因');
      warn(handler.id, 'error', result.reason);
    }
  }

  function trigger(delay) {
    settledForUrl = '';
    attemptCount = 0;
    setTimeout(attempt, delay || 0);
  }

  function triggerFromDom(delay) {
    if (domAttemptScheduled || switching || settledForUrl === location.href) return;
    domAttemptScheduled = true;
    setTimeout(() => {
      domAttemptScheduled = false;
      attempt();
    }, delay || 120);
  }

  function watchRouteChanges() {
    let lastUrl = location.href;

    const obs = new MutationObserver(() => {
      const h = pickHandler();
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (h && h.rerunOnRouteChange) {
          log('route change →', location.href);
          trigger(ROUTE_DELAY);
        }
      } else if (h && h.rerunOnDomChange) {
        triggerFromDom(120);
      }
    });
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });

    const wrap = (k) => {
      const orig = history[k];
      history[k] = function (...args) {
        const r = orig.apply(this, args);
        const h = pickHandler();
        if (h && h.rerunOnRouteChange) trigger(ROUTE_DELAY);
        return r;
      };
    };
    wrap('pushState');
    wrap('replaceState');

    window.addEventListener('popstate', () => {
      const h = pickHandler();
      if (h && h.rerunOnRouteChange) trigger(ROUTE_DELAY);
    });
  }

  // ============================================================
  // 跨 AI 转发：捕获用户问题 → 用户气泡下放跳转按钮 + 右下角浮动面板兜底
  // ============================================================
  // 每条配置 = {
  //   id, label, url（转发到此站时的目标 URL）, test（判断当前页是否是此站）,
  //   userBubble?  -- 已逆向过 DOM 的站点写明用户气泡 CSS 选择器；设置了就跳过通用启发式
  //   excludeContent? -- 从气泡 innerText 中剔除的子元素 CSS 选择器（如 hover 才出现的"复制入框"按钮）
  // }
  const FORWARD_TARGETS = [
    { id: 'chatgpt',  label: 'ChatGPT',   url: 'https://chatgpt.com/',
      test: (u) => /^https:\/\/chatgpt\.com\//.test(u) },
    { id: 'claude',   label: 'Claude',    url: 'https://claude.ai/new',
      test: (u) => /^https:\/\/claude\.ai\//.test(u) },
    { id: 'gemini',   label: 'Gemini',    url: 'https://gemini.google.com/app',
      test: (u) => /^https:\/\/gemini\.google\.com\//.test(u) },
    { id: 'copilot',  label: 'GitHub Copilot', url: 'https://github.com/copilot',
      test: (u) => /^https:\/\/github\.com\/copilot(?:[/?#]|$)/.test(u),
      // GitHub 会在 Copilot 页面加载早期清掉 hash，改用 query 参数传递待填问题
      useQueryParam: true,
      userBubble: findCopilotUserMessages },
    { id: 'chatglm',  label: '智谱',      url: 'https://chatglm.cn/main/alltoolsdetail?lang=zh',
      test: (u) => /^https:\/\/chatglm\.cn\//.test(u),
      // 智谱用户消息左对齐、有用户名头部，无 bg/radius，启发式抓不到；
      // .copy-btn 是 hover 才出现的"复制入框"按钮，需要从文本中剔除
      userBubble: '.conversation.question .question-text-style',
      excludeContent: '.copy-btn' },
    { id: 'kimi',     label: 'Kimi',      url: 'https://www.kimi.com/',
      test: (u) => /^https:\/\/(www\.)?kimi\.com\//.test(u),
      // Kimi 用户气泡左对齐式：.segment-user 是行容器，.user-content 是纯文本子节点；
      // 同级的 .segment-user-actions（编辑/复制/分享）不在 .user-content 内，不污染文本
      userBubble: '.segment-user .user-content' },
    { id: 'zai',      label: 'Z.ai',      url: 'https://chat.z.ai/',
      test: (u) => /^https:\/\/chat\.z\.ai\//.test(u),
      // Z.ai 用户消息正文容器 class 为 chat-user；底部操作按钮在 .buttons 中，需剔除
      userBubble: '.chat-user',
      excludeContent: '.buttons,button' },
    { id: 'deepseek', label: 'DeepSeek',  url: 'https://chat.deepseek.com/',
      test: (u) => /^https:\/\/chat\.deepseek\.com\//.test(u) },
    { id: 'qianwen',  label: '千问',      url: 'https://www.qianwen.com/',
      test: (u) => /^https:\/\/(www\.)?qianwen\.com\//.test(u),
      // 千问用户气泡是 .message-card-wrap.question 下的 .question-text-card
      // （shape rgb(235,245,255) + radius 16），同站 .answer-common-card 是 AI 回复
      userBubble: '.message-card-wrap.question .question-text-card' },
    { id: 'qwen',     label: 'Qwen',      url: 'https://chat.qwen.ai/',
      test: (u) => /^https:\/\/chat\.qwen\.ai\//.test(u) },
    { id: 'doubao',   label: '豆包',      url: 'https://www.doubao.com/chat/',
      test: (u) => /^https:\/\/www\.doubao\.com\//.test(u),
      userBubble: '.bg-g-send-msg-bubble-bg' },
    { id: 'yuanbao',  label: '元宝',      url: 'https://yuanbao.tencent.com/chat/',
      test: (u) => /^https:\/\/yuanbao\.tencent\.com\//.test(u),
      // 元宝用户气泡是右对齐的 .agent-chat__bubble--human（全宽 wrapper），
      // 内部的真实彩色气泡 .agent-chat__bubble__content 太窄时会被启发式漏过；
      // 直接选这个 wrapper，插入位置在 .agent-chat__list__item__content 里
      userBubble: '.agent-chat__bubble--human' },
  ];

  function pickForwardSite() {
    return FORWARD_TARGETS.find((t) => t.test(location.href)) || null;
  }

  const FORWARD_CSS = `
    .__aem-forward-row{display:inline-flex !important;gap:6px !important;align-items:center !important;justify-content:flex-end !important;pointer-events:auto !important;position:relative !important;z-index:1 !important}
    .__aem-forward-row-host{display:flex !important;justify-content:flex-end !important;width:100% !important;margin:6px 0 !important;align-self:flex-end !important}
    .__aem-forward-btn{cursor:pointer !important;font-size:12px !important;line-height:1.5 !important;padding:3px 10px !important;border-radius:12px !important;
      border:1px solid #2563eb !important;background:#eff6ff !important;color:#1d4ed8 !important;display:inline-flex !important;align-items:center !important;gap:4px !important;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif !important;transition:background .15s,color .15s !important}
    .__aem-forward-btn:hover{background:#2563eb !important;color:#fff !important}

    .__aem-forward-menu{display:none !important;position:fixed !important;
      min-width:160px !important;background:#fff !important;color:#1f2937 !important;
      border:1px solid #d4d4d8 !important;border-radius:8px !important;padding:4px !important;
      box-shadow:0 6px 18px rgba(0,0,0,.18) !important;z-index:2147483647 !important;
      flex-direction:column !important;gap:1px !important;max-height:60vh !important;overflow:auto !important}
    .__aem-forward-menu.__aem-visible{display:flex !important}
    .__aem-forward-menu-item{display:block !important;padding:6px 12px !important;
      background:transparent !important;border:none !important;color:inherit !important;
      cursor:pointer !important;text-align:left !important;border-radius:4px !important;
      font-size:13px !important;line-height:1.4 !important;font-family:inherit !important;width:100% !important}
    .__aem-forward-menu-item:hover{background:#f1f5f9 !important}

    @media (prefers-color-scheme: dark){
      .__aem-forward-btn{background:#1e3a8a !important;color:#dbeafe !important;border-color:#3b82f6 !important}
      .__aem-forward-btn:hover{background:#2563eb !important;color:#fff !important}
      .__aem-forward-menu{background:#1f2937 !important;color:#f4f4f5 !important;border-color:#374151 !important}
      .__aem-forward-menu-item:hover{background:#374151 !important}
    }
  `;

  function ensureForwardCss() {
    if (document.getElementById('__aem-forward-style')) return;
    const style = document.createElement('style');
    style.id = '__aem-forward-style';
    style.textContent = FORWARD_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function openForwardTarget(target, question) {
    const encoded = encodeURIComponent(question);
    const url = target.useQueryParam
      ? target.url + (target.url.includes('?') ? '&' : '?') + '__aem_q=' + encoded
      : target.url + '#__aem_q=' + encoded;
    log('forward → open', target.id, url.slice(0, 80) + '...');
    window.open(url, '_blank', 'noopener');
  }

  function buildForwardRow(question, currentId) {
    const targets = FORWARD_TARGETS.filter((t) => t.id !== currentId);
    if (targets.length === 0) return null;

    const row = document.createElement('div');
    row.className = '__aem-forward-row';
    row.dataset.aemForwardRow = '1';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = '__aem-forward-btn';
    trigger.textContent = `↗ 问问别的AI`;
    trigger.title = '在新标签页打开目标 AI 并自动填入此问题';

    // 菜单 portal 到 body 用 position:fixed 渲染，避免被某些站点（如 DeepSeek）
    // 祖先元素的 stacking context 截断；不靠 z-index 硬刚
    const menu = document.createElement('div');
    menu.className = '__aem-forward-menu';

    for (const t of targets) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = '__aem-forward-menu-item';
      item.textContent = t.label;
      item.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openForwardTarget(t, question);
        hideForwardMenu(menu);
      });
      menu.appendChild(item);
    }

    trigger.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (menu.classList.contains('__aem-visible')) {
        hideForwardMenu(menu);
      } else {
        showForwardMenu(menu, trigger);
      }
    });

    row.appendChild(trigger);
    // menu 不放在 row 里，showForwardMenu 时再 portal 到 body
    return row;
  }

  function showForwardMenu(menu, trigger) {
    // 关闭其他打开的菜单
    document.querySelectorAll('.__aem-forward-menu.__aem-visible').forEach((m) => {
      if (m !== menu) m.classList.remove('__aem-visible');
    });
    if (menu.parentElement !== document.body) {
      document.body.appendChild(menu);
    }
    positionForwardMenu(menu, trigger);
    menu.classList.add('__aem-visible');
  }

  function hideForwardMenu(menu) {
    menu.classList.remove('__aem-visible');
  }

  function positionForwardMenu(menu, trigger) {
    const r = trigger.getBoundingClientRect();
    // 先临时显示以测量真实尺寸
    const prevVis = menu.style.visibility;
    menu.style.visibility = 'hidden';
    menu.classList.add('__aem-visible');
    menu.style.left = '0px';
    menu.style.top = '0px';
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
    const mr = menu.getBoundingClientRect();
    const menuH = mr.height || 280;
    const menuW = mr.width || 160;
    menu.classList.remove('__aem-visible');
    menu.style.visibility = prevVis;

    // 上下方向：底部空间不够就向上
    let top;
    if (r.bottom + 4 + menuH < window.innerHeight) {
      top = r.bottom + 4;
    } else {
      top = Math.max(8, r.top - 4 - menuH);
    }
    // 水平：menu 右边和 trigger 右边对齐，受视口边界限制
    let left = Math.max(8, Math.min(window.innerWidth - menuW - 8, r.right - menuW));
    menu.style.top = top + 'px';
    menu.style.left = left + 'px';
    menu.style.right = 'auto';
    menu.style.bottom = 'auto';
  }

  let globalMenuCloseInstalled = false;
  function installGlobalMenuClose() {
    if (globalMenuCloseInstalled) return;
    globalMenuCloseInstalled = true;
    const closeAll = () => document.querySelectorAll('.__aem-forward-menu.__aem-visible').forEach((m) => m.classList.remove('__aem-visible'));
    document.addEventListener('click', (ev) => {
      if (ev.target && ev.target.closest && ev.target.closest('.__aem-forward-menu, .__aem-forward-btn')) return;
      closeAll();
    }, true);
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') closeAll();
    }, true);
    // 滚动 / 缩放后位置失效，干脆关菜单
    document.addEventListener('scroll', closeAll, true);
    window.addEventListener('resize', closeAll);
  }

  function findVisibleInput() {
    const cands = [];
    for (const c of [
      ...document.querySelectorAll('textarea'),
      ...document.querySelectorAll('[contenteditable="true"]'),
    ]) {
      if (!isVisibleElement(c)) continue;
      const r = c.getBoundingClientRect();
      if (r.width < 80 || r.height < 16) continue;
      if (r.bottom < 0 || r.top > window.innerHeight) continue;
      cands.push({ el: c, r });
    }
    if (cands.length === 0) return null;
    // 偏好：靠底部（聊天框通常在底部）；若 bottom 接近则取面积更大者
    cands.sort((a, b) => {
      const diff = b.r.bottom - a.r.bottom;
      if (Math.abs(diff) > 40) return diff;
      return (b.r.width * b.r.height) - (a.r.width * a.r.height);
    });
    return cands[0].el;
  }

  // ---- 结构性识别用户气泡 ----
  // 启发式：元素同时有背景色 + 圆角（典型气泡视觉），且子树相对父容器明显右对齐
  // 不依赖任何站点 class，跨豆包 / DeepSeek 通用

  function hasBubbleStyle(el) {
    if (!el || !el.tagName) return false;
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor || '';
    const hasBg = bg && bg !== 'transparent' && !/rgba?\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(bg);
    const hasRadius = parseFloat(cs.borderRadius) >= 6;
    return hasBg && hasRadius; // 同时满足，缩小误判面
  }

  function isRightAlignedRelative(el) {
    const r = el.getBoundingClientRect();
    if (r.width < 30) return false;
    let p = el.parentElement;
    for (let i = 0; i < 6 && p && p !== document.body; i++) {
      const pr = p.getBoundingClientRect();
      if (pr.width >= r.width + 60) {
        const rightGap = pr.right - r.right;
        const leftGap = r.left - pr.left;
        return leftGap > rightGap + 40;
      }
      p = p.parentElement;
    }
    return false;
  }

  function findOutermostStyledBubble(el) {
    let cur = el;
    while (cur.parentElement && hasBubbleStyle(cur.parentElement) && isRightAlignedRelative(cur.parentElement)) {
      cur = cur.parentElement;
    }
    return cur;
  }

  function isHorizontalFlex(el) {
    if (!el || !el.tagName) return false;
    const cs = getComputedStyle(el);
    if (!cs.display || !cs.display.includes('flex')) return false;
    const dir = cs.flexDirection || 'row';
    return dir === 'row' || dir === 'row-reverse';
  }

  function isExcluded(el) {
    if (!el) return true;
    if (el.tagName === 'BUTTON' || el.closest('button')) return true;
    if (el.getAttribute && el.getAttribute('role') === 'button') return true;
    if (el.closest('.__aem-toast-container')) return true;
    if (el.closest('.__aem-forward-row,.__aem-forward-menu')) return true; // 自家注入的 DOM
    if (el.closest('[data-aem-forward-row]')) return true;
    if (el.closest('textarea,[contenteditable="true"]')) return true;
    if (el.closest('header,nav,aside,footer')) return true;
    // 已挂的气泡"内部"（descendants）跳过，但气泡本身不跳过——
    // 站点 re-render 时 React 会卸掉我们的 wrapper 但保留 bubble DOM 元素，
    // 这时必须允许重新评估这个 bubble，否则按钮就消失了不会再回来
    if (el.parentElement && el.parentElement.closest('[data-aem-bubble]')) return true;
    return false;
  }

  function getTargetById(id) {
    return FORWARD_TARGETS.find((t) => t.id === id) || null;
  }

  function extractBubbleText(bubble, excludeSelector) {
    if (excludeSelector) {
      // 显式剔除：手工游走文本节点，跳过 excludeSelector 匹配的子树与隐藏元素
      // 必要场景：智谱的 .copy-btn（hover 才出现的"复制入框"）在某些时序下会被
      // innerText 抓到，从而把按钮文字而非用户问题转发出去
      const excluded = new Set(bubble.querySelectorAll(excludeSelector));
      function walk(node) {
        if (node.nodeType === 3) return node.nodeValue || '';
        if (node.nodeType !== 1) return '';
        if (excluded.has(node)) return '';
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return '';
        if (isA11yOnlyElement(node)) return '';
        const cs = getComputedStyle(node);
        if (cs.display === 'none' || cs.visibility === 'hidden') return '';
        let out = '';
        for (const child of node.childNodes) out += walk(child);
        return out;
      }
      return walk(bubble).replace(/\s+/g, ' ').trim();
    }
    return extractBubbleTextDefault(bubble);
  }

  function extractBubbleTextDefault(bubble) {
    return (bubble.innerText || '').replace(/ /g, ' ').trim();
  }

  function isA11yOnlyElement(el) {
    if (!el || !el.tagName) return false;
    if (el.getAttribute('aria-hidden') === 'true') return true;
    const cls = (el.className || '').toString();
    if (/\b(sr-only|visually-hidden|screen-reader|sr_only)\b/i.test(cls)) return true;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return (cs.position === 'absolute' || cs.position === 'fixed')
      && r.width <= 2
      && r.height <= 2
      && cs.overflow === 'hidden';
  }

  function extractCopilotCandidateText(el) {
    return extractBubbleText(el, '.__aem-forward-row-host,.__aem-forward-row,.__aem-forward-menu,[data-aem-forward-row]')
      .replace(/^↗\s*问问别的AI\s*/gm, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractCopilotForwardText(bubble) {
    let text = extractCopilotCandidateText(bubble);
    const said = text.match(/^You said:\s*(.+)$/i);
    if (said) {
      text = said[1].trim();

      // Copilot can expose both an accessibility label and the visible bubble text.
      // Depending on layout, innerText may become "You said: <q> <q>" or
      // "You said: <q><q>"; keep one copy when the duplicated half is non-trivial.
      const spaced = text.match(/^(.+)\s+\1$/);
      if (spaced) text = spaced[1].trim();
      else if (text.length >= 4 && text.length % 2 === 0) {
        const half = text.slice(0, text.length / 2);
        if (half.length >= 2 && half + half === text) text = half;
      }
    }

    return text;
  }

  function findCopilotUserMessages() {
    const input = document.querySelector('textarea[placeholder="Ask Copilot"]');
    const inputRect = input && input.getBoundingClientRect();
    const candidates = [];
    const seenText = new Set();
    const seenBubble = new WeakSet();

    for (const el of document.querySelectorAll('div,section,article,p,span')) {
      if (isExcluded(el)) continue;
      if (!isVisibleElement(el)) continue;
      const text = extractCopilotCandidateText(el);
      if (!text || text.length < 2 || text.length > 8000) continue;
      if (seenText.has(text)) continue;
      if (/^(Copilot|Documentation|Changelog|Sign in|Ask Copilot|Send now)$/i.test(text)) continue;
      if (el.querySelector('textarea,input,[contenteditable="true"],button')) continue;
      if (el.querySelectorAll('a').length > 2) continue;

      const r = el.getBoundingClientRect();
      if (r.width < 16 || r.height < 14) continue;
      if (inputRect && r.top > inputRect.top - 20) continue;
      if (r.right < window.innerWidth * 0.55 || r.right > window.innerWidth * 0.98) continue;

      const bubble = findCopilotBubbleFromTextNode(el);
      if (!bubble || seenBubble.has(bubble)) continue;
      seenText.add(text);
      seenBubble.add(bubble);
      candidates.push(bubble);
    }

    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const aScore = (ar.width * ar.height) + (isRightAlignedRelative(a) ? 1000000 : 0);
      const bScore = (br.width * br.height) + (isRightAlignedRelative(b) ? 1000000 : 0);
      return bScore - aScore;
    });

    const unique = [];
    for (const bubble of candidates) {
      if (unique.some((kept) => kept.contains(bubble))) continue;
      const innerIndex = unique.findIndex((kept) => bubble.contains(kept));
      if (innerIndex >= 0) unique[innerIndex] = bubble;
      else unique.push(bubble);
    }

    unique.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      const aScore = (isRightAlignedRelative(a) ? 1000 : 0) + ar.top;
      const bScore = (isRightAlignedRelative(b) ? 1000 : 0) + br.top;
      return bScore - aScore;
    });
    return unique;
  }

  function findCopilotBubbleFromTextNode(el) {
    let cur = el;
    let best = null;
    let bestScore = -Infinity;
    for (let i = 0; i < 7 && cur && cur !== document.body; i++, cur = cur.parentElement) {
      if (!isVisibleElement(cur)) continue;
      if (cur.querySelector('textarea,input,[contenteditable="true"],button')) continue;

      const r = cur.getBoundingClientRect();
      if (r.width < 16 || r.width > window.innerWidth * 0.55) continue;
      if (r.height < 14 || r.height > window.innerHeight * 0.3) continue;
      if (r.left < window.innerWidth * 0.25 || r.right < window.innerWidth * 0.55 || r.right > window.innerWidth * 0.98) continue;

      const styled = hasBubbleStyle(cur);
      const aligned = isRightAlignedRelative(cur);
      const visuallyRight = r.left > window.innerWidth * 0.62;
      if (!styled && !aligned && !visuallyRight) continue;

      const area = r.width * r.height;
      const score = (styled ? 2000 : 0) + (aligned ? 1000 : 0) + (area / 10000);
      if (score > bestScore) {
        bestScore = score;
        best = cur;
      }
    }
    return best && hasBubbleStyle(best) ? findOutermostStyledBubble(best) : best;
  }

  // 扫描状态
  let lastForwardUrl = '';
  const MAX_PER_SCAN = 8; // 单次扫描挂载上限，纯粹用于限制每帧工作量

  function cleanupForwardRows() {
    document.querySelectorAll('[data-aem-forward-row]').forEach((el) => el.remove());
    document.querySelectorAll('[data-aem-bubble]').forEach((el) => { delete el.dataset.aemBubble; });
    // portal 到 body 的菜单也要清掉，避免路由切换后留下孤儿元素
    document.querySelectorAll('.__aem-forward-menu').forEach((m) => m.remove());
  }

  // 尝试给一个已识别的气泡挂转发按钮；返回 'attached' / 'skip'
  // 关键：dedupe 仅靠"我们的 wrapper 是否仍在插入点位置"，不靠 attachedBubbles /
  // data-aem-bubble 等内存标记。原因是站点（ChatGPT / Qwen / 豆包）开始流式输出
  // 时会 re-render 聊天容器：React 保留 bubble DOM 但卸掉我们这个"非受控"子节点
  // wrapper，标记此时仍残留，会让 dedupe 误判"已挂过"，导致按钮永久消失。
  function tryAttachToBubble(bubble, currentId, target, scanState) {
    if (!bubble) return 'skip';
    if (target && target.id === 'copilot') {
      let p = bubble;
      for (let i = 0; i < 5 && p && p !== document.body; i++, p = p.parentElement) {
        if (p.querySelector && p.querySelector('[data-aem-forward-row]')) return 'skip';
      }
    }

    if (target && target.appendInsideBubble) {
      const existing = bubble.querySelector(':scope > [data-aem-forward-row]');
      if (existing) {
        bubble.dataset.aemBubble = '1';
        return 'skip';
      }

      const text = target && target.id === 'copilot'
        ? extractCopilotForwardText(bubble)
        : extractBubbleText(bubble, target && target.excludeContent);
      if (!text || text.length < 2 || text.length > 8000) return 'skip';

      const row = buildForwardRow(text, currentId);
      if (!row) return 'skip';

      const wrapper = document.createElement('div');
      wrapper.className = '__aem-forward-row-host';
      wrapper.dataset.aemForwardRow = '1';
      wrapper.appendChild(row);
      delete row.dataset.aemForwardRow;
      bubble.appendChild(wrapper);
      bubble.dataset.aemBubble = '1';
      scanState.attached++;
      return 'attached';
    }

    const directHost = bubble.parentElement;
    if (!directHost) return 'skip';

    // 单元素横向 flex wrapper（如豆包 <div class="flex justify-end">）升级到祖父
    let insertHost = directHost;
    let insertAfter = bubble;
    if (isHorizontalFlex(directHost) && directHost.parentElement && directHost.children.length <= 2) {
      insertHost = directHost.parentElement;
      insertAfter = directHost;
    }
    if (isHorizontalFlex(insertHost)) return 'skip';

    // 唯一 dedupe：插入点的 nextElementSibling 是不是我们的 wrapper
    const existingNext = insertAfter.nextElementSibling;
    if (existingNext && existingNext.dataset && existingNext.dataset.aemForwardRow === '1') {
      // 已挂着，顺手在 bubble 上打个标记给 isExcluded 用于剪枝子树扫描
      bubble.dataset.aemBubble = '1';
      return 'skip';
    }

    const text = target && target.id === 'copilot'
      ? extractCopilotForwardText(bubble)
      : extractBubbleText(bubble, target && target.excludeContent);
    if (!text || text.length < 2 || text.length > 8000) return 'skip';

    const row = buildForwardRow(text, currentId);
    if (!row) return 'skip';

    const wrapper = document.createElement('div');
    wrapper.className = '__aem-forward-row-host';
    wrapper.dataset.aemForwardRow = '1';
    wrapper.appendChild(row);
    delete row.dataset.aemForwardRow;

    if (insertAfter.nextSibling) insertHost.insertBefore(wrapper, insertAfter.nextSibling);
    else insertHost.appendChild(wrapper);

    bubble.dataset.aemBubble = '1'; // 仅用于 isExcluded 剪枝，不再用于 dedupe
    scanState.attached++;
    return 'attached';
  }

  function scanAndAttach(currentId) {
    if (location.href !== lastForwardUrl) {
      lastForwardUrl = location.href;
      cleanupForwardRows();
    }

    const target = getTargetById(currentId);
    const scanState = { attached: 0 };
    const capReached = () => scanState.attached >= MAX_PER_SCAN;

    if (target && typeof target.userBubble === 'function') {
      const bubbles = target.userBubble();
      for (const b of bubbles) {
        if (capReached()) break;
        tryAttachToBubble(b, currentId, target, scanState);
      }
    } else if (target && target.userBubble) {
      // 站点专属：用确定的选择器，跳过启发式
      const bubbles = document.querySelectorAll(target.userBubble);
      for (const b of bubbles) {
        if (capReached()) break;
        tryAttachToBubble(b, currentId, target, scanState);
      }
    } else {
      // 通用启发式：bg + radius + 相对父容器明显右对齐
      const all = document.body.querySelectorAll('div,section,article,p,li');
      for (const el of all) {
        if (capReached()) break;
        if (isExcluded(el)) continue;
        if (!hasBubbleStyle(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 80 || r.height < 32) continue;
        if (r.width > window.innerWidth * 0.95) continue;
        if (el.children.length > 80) continue;
        if (!isRightAlignedRelative(el)) continue;
        const bubble = findOutermostStyledBubble(el);
        tryAttachToBubble(bubble, currentId, target, scanState);
      }
    }

    if (scanState.attached > 0) {
      log(`attached forward rows: +${scanState.attached}`);
    }
  }

  let scanScheduled = false;
  function scheduleScan(currentId) {
    if (scanScheduled) return;
    scanScheduled = true;
    requestAnimationFrame(() => {
      scanScheduled = false;
      scanAndAttach(currentId);
    });
  }

  function watchUserBubbles(currentId) {
    const obs = new MutationObserver(() => scheduleScan(currentId));
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    setInterval(() => scanAndAttach(currentId), 2000);
    // 初次进入页面 / 路由切换后，立即扫几次覆盖历史消息渲染时序
    setTimeout(() => scanAndAttach(currentId), 200);
    setTimeout(() => scanAndAttach(currentId), 1000);
    setTimeout(() => scanAndAttach(currentId), 2500);
  }

  // ---- 目标侧：读取 URL 参数并回填输入框 ----
  const FORWARD_HASH_RE = /(?:^#|&)__aem_q=([^&]*)/;
  const FORWARD_PARAM = '__aem_q';

  function readForwardedQuestionFromUrl() {
    const hashMatch = location.hash.match(FORWARD_HASH_RE);
    if (hashMatch) {
      let q;
      try { q = decodeURIComponent(hashMatch[1]); } catch { return null; }
      const newHash = location.hash
        .replace(FORWARD_HASH_RE, '')
        .replace(/^#&/, '#')
        .replace(/^#$/, '');
      return {
        q,
        cleanUrl: location.pathname + location.search + newHash,
      };
    }

    const params = new URLSearchParams(location.search);
    if (!params.has(FORWARD_PARAM)) return null;
    const q = params.get(FORWARD_PARAM) || '';
    params.delete(FORWARD_PARAM);
    const newSearch = params.toString();
    return {
      q,
      cleanUrl: location.pathname + (newSearch ? '?' + newSearch : '') + location.hash,
    };
  }

  function setInputValueViaSetter(el, text) {
    try {
      if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        // 用原生 setter 绕过 React 受控限制；同时派发多种事件，让 Qwen / Kimi
        // 这类靠 keyup / change / beforeinput 触发的"提交按钮启用"逻辑也能感知到
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        el.focus();
        setter.call(el, text);
        el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
        if (el.value !== text) {
          try {
            const dt = new DataTransfer();
            dt.setData('text/plain', text);
            el.dispatchEvent(new ClipboardEvent('paste', {
              bubbles: true, cancelable: true, clipboardData: dt,
            }));
          } catch (e) {
            warn('textarea paste fallback failed', e);
          }
        }
        return true;
      }
      if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
        el.focus();
        const isSlate = el.getAttribute('data-slate-editor') === 'true';

        if (isSlate) {
          // 千问用 Slate.js（data-slate-editor="true"）：DOM 里有文本但 Slate 内部
          // 模型不感知 execCommand，导致提交按钮一直灰。Slate 有专门的 onPaste
          // 处理器从 clipboardData 读文本写入它的模型，所以合成 paste 事件最稳。
          try {
            const dt = new DataTransfer();
            dt.setData('text/plain', text);
            el.dispatchEvent(new ClipboardEvent('paste', {
              bubbles: true, cancelable: true, clipboardData: dt,
            }));
          } catch (e) {
            warn('Slate paste failed, falling back to execCommand', e);
            document.execCommand('insertText', false, text);
          }
        } else {
          // 通用 contenteditable
          const sel = window.getSelection();
          const range = document.createRange();
          range.selectNodeContents(el);
          sel.removeAllRanges();
          sel.addRange(range);
          const ok = document.execCommand('insertText', false, text);
          if (!ok) {
            el.textContent = text;
            el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
          }
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
        return true;
      }
    } catch (e) {
      warn('setInputValue error', e);
    }
    return false;
  }

  function maybeFillForwardedQuestion(currentLabel) {
    const forwarded = readForwardedQuestionFromUrl();
    if (!forwarded) return;
    const q = forwarded.q;
    if (!q) return;

    history.replaceState(null, '', forwarded.cleanUrl);

    let attempts = 0;
    const MAX = 60;
    const tick = () => {
      attempts++;
      const input = findVisibleInput();
      if (input && setInputValueViaSetter(input, q)) {
        toast('info', `${currentLabel} 已自动填入问题`, '检查后即可发送');
        return;
      }
      if (attempts >= MAX) {
        toast('error', `${currentLabel} 自动填入失败`, '未找到可见输入框（DOM 结构可能已变更）');
        return;
      }
      setTimeout(tick, 300);
    };
    setTimeout(tick, 500);
  }

  // ============================================================
  // 启动
  // ============================================================
  const handler = pickHandler();        // 可选：自动切深度思考 / 专家模式
  const fwdSite = pickForwardSite();    // 可选：跨 AI 转发

  if (!handler && !fwdSite) {
    log('no match for current URL:', location.href);
    return;
  }

  if (fwdSite) {
    log('forward site:', fwdSite.id);
    ensureForwardCss();
    installGlobalMenuClose();
    watchUserBubbles(fwdSite.id);
    maybeFillForwardedQuestion(fwdSite.label);
  }

  if (handler) {
    log('expert-mode handler:', handler.id);
    trigger(0);
  }

  watchRouteChanges();
})();
