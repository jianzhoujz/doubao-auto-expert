// ==UserScript==
// @name         AI 网页版自动切换深度思考 / 专家模式
// @namespace    https://github.com/jianzhoujz/doubao-auto-expert
// @version      2.2.0
// @description  自动将豆包 / DeepSeek / 通义千问的对话模式切换到「深度思考 / 专家」模式；并在用户消息下方放置跳转按钮，一键把当前问题转发到其他 AI 并自动回填输入框
// @author       Jian Zhou
// @homepageURL  https://github.com/jianzhoujz/doubao-auto-expert
// @supportURL   https://github.com/jianzhoujz/doubao-auto-expert/issues
// @updateURL    https://raw.githubusercontent.com/jianzhoujz/doubao-auto-expert/main/doubao-expert-mode.user.js
// @downloadURL  https://raw.githubusercontent.com/jianzhoujz/doubao-auto-expert/main/doubao-expert-mode.user.js
// @match        https://www.doubao.com/chat/*
// @match        https://chat.deepseek.com/*
// @match        https://www.qianwen.com/*
// @match        https://qianwen.com/*
// @grant        none
// @run-at       document-idle
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
      await sleep(500);

      let target = null;
      for (const item of document.querySelectorAll('[role="menuitem"]')) {
        if ((item.textContent || '').includes('专家')) { target = item; break; }
      }
      if (!target) {
        pressEscape();
        return { status: 'error', reason: '已展开下拉菜单，但未找到「专家」选项' };
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

  // ---------- 通义千问：「思考」 toggle 按钮 ----------
  // 实测：<button aria-pressed="false|true">思考</button>，aria-pressed 即为开关状态
  const qianwenHandler = {
    id: 'qianwen',
    label: '通义千问',
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

  const HANDLERS = [doubaoHandler, deepseekHandler, qianwenHandler];

  // ============================================================
  // 调度
  // ============================================================
  const MAX_RETRIES = 30;
  const RETRY_INTERVAL = 1000;
  const ROUTE_DELAY = 1500;

  let switching = false;
  let attemptCount = 0;
  let settledForUrl = '';

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

  function watchRouteChanges() {
    let lastUrl = location.href;

    const obs = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        const h = pickHandler();
        if (h && h.rerunOnRouteChange) {
          log('route change →', location.href);
          trigger(ROUTE_DELAY);
        }
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
  // 跨 AI 转发：在用户气泡下放跳转按钮，目标侧自动回填问题
  // ============================================================
  const FORWARD_TARGETS = [
    { id: 'doubao',   label: '豆包',     url: 'https://www.doubao.com/chat/' },
    { id: 'deepseek', label: 'DeepSeek', url: 'https://chat.deepseek.com/'   },
  ];

  const FORWARD_CSS = `
    .__aem-forward-row{display:flex;gap:6px;margin:6px 0 4px;flex-wrap:wrap;justify-content:flex-end;pointer-events:auto}
    .__aem-forward-btn{cursor:pointer;font-size:12px;line-height:1.5;padding:3px 10px;border-radius:12px;
      border:1px solid rgba(120,120,120,.35);background:rgba(255,255,255,.7);color:#3f3f46;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;
      transition:background .15s,color .15s,border-color .15s}
    .__aem-forward-btn:hover{background:#2563eb;color:#fff;border-color:#2563eb}
    @media (prefers-color-scheme: dark){
      .__aem-forward-btn{background:rgba(40,40,40,.6);color:#e4e4e7;border-color:rgba(200,200,200,.25)}
    }
  `;

  function ensureForwardCss() {
    if (document.getElementById('__aem-forward-style')) return;
    const style = document.createElement('style');
    style.id = '__aem-forward-style';
    style.textContent = FORWARD_CSS;
    (document.head || document.documentElement).appendChild(style);
  }

  function buildForwardRow(question, currentId) {
    const row = document.createElement('div');
    row.className = '__aem-forward-row';
    row.dataset.aemForwardRow = '1';
    let added = 0;
    for (const t of FORWARD_TARGETS) {
      if (t.id === currentId) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = '__aem-forward-btn';
      btn.textContent = `问 ${t.label}`;
      btn.title = `在新标签页打开 ${t.label} 并自动填入此问题`;
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const url = t.url + '#__aem_q=' + encodeURIComponent(question);
        window.open(url, '_blank', 'noopener');
      });
      row.appendChild(btn);
      added++;
    }
    return added > 0 ? row : null;
  }

  // ---- 输入捕获：记录用户刚发送的问题 ----
  const pendingQuestions = []; // FIFO，避免连发被覆盖
  const MAX_PENDING = 8;

  function readInputValue(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return (el.value || '').trim();
    if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
      return (el.innerText || el.textContent || '').trim();
    }
    return '';
  }

  function findVisibleInput() {
    const cands = [
      ...document.querySelectorAll('textarea'),
      ...document.querySelectorAll('[contenteditable="true"]'),
    ];
    for (const c of cands) {
      if (!c.offsetParent) continue;
      const r = c.getBoundingClientRect();
      if (r.width < 80 || r.height < 16) continue;
      return c;
    }
    return null;
  }

  function pushPending(text) {
    if (!text) return;
    if (pendingQuestions[pendingQuestions.length - 1] === text) return;
    pendingQuestions.push(text);
    if (pendingQuestions.length > MAX_PENDING) pendingQuestions.shift();
  }

  function captureInputs() {
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
      const v = readInputValue(e.target);
      if (v) pushPending(v);
    }, true);

    // 点击发送按钮兜底（启发式：aria-label/类名带 send/发送）
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const sendBtn = t.closest('button[aria-label*="发送"], button[aria-label*="Send" i], button[data-testid*="send" i]');
      if (!sendBtn) return;
      const input = findVisibleInput();
      const v = input ? readInputValue(input) : '';
      if (v) pushPending(v);
    }, true);
  }

  // ---- 在用户气泡下注入按钮 ----
  function findExactTextElement(text) {
    // 选「innerText 恰好等于 text、子树最小」的元素：通常就是气泡里的文字容器
    let best = null;
    let bestSize = Infinity;
    const all = document.body.querySelectorAll('div,p,span,pre');
    for (const el of all) {
      if (el.children.length > 30) continue;
      if (el.closest('textarea,[contenteditable="true"]')) continue;
      const t = (el.innerText || '').trim();
      if (t !== text) continue;
      const size = el.getElementsByTagName('*').length;
      if (size < bestSize) { best = el; bestSize = size; }
    }
    return best;
  }

  function findBubbleBlock(el) {
    // 向上找到一个块级父节点（不是 inline）；若再上一层是常见 flex 行容器就停在这里
    let cur = el;
    for (let i = 0; i < 6 && cur.parentElement; i++) {
      const display = getComputedStyle(cur).display;
      if (display && display !== 'inline' && display !== 'contents') {
        const parent = cur.parentElement;
        const pcs = getComputedStyle(parent);
        if (pcs.display.includes('flex') || pcs.display.includes('grid') || parent === document.body) return cur;
      }
      cur = cur.parentElement;
    }
    return cur;
  }

  function tryAttach(currentId) {
    if (pendingQuestions.length === 0) return;
    for (let i = pendingQuestions.length - 1; i >= 0; i--) {
      const q = pendingQuestions[i];
      const textEl = findExactTextElement(q);
      if (!textEl) continue;
      const block = findBubbleBlock(textEl);
      const host = block.parentElement || block;
      // 避免重复挂载：同一 host 内已有按钮行就跳过
      if (host.querySelector(':scope > [data-aem-forward-row]')) {
        pendingQuestions.splice(i, 1);
        continue;
      }
      const row = buildForwardRow(q, currentId);
      if (!row) { pendingQuestions.splice(i, 1); continue; }
      ensureForwardCss();
      if (block.nextSibling) host.insertBefore(row, block.nextSibling);
      else host.appendChild(row);
      pendingQuestions.splice(i, 1);
    }
  }

  function watchForUserBubbles(currentId) {
    const obs = new MutationObserver(() => tryAttach(currentId));
    if (document.body) obs.observe(document.body, { childList: true, subtree: true });
    // 兜底定时：处理动画/异步渲染
    setInterval(() => tryAttach(currentId), 1500);
  }

  // ---- 目标侧：读取 hash 并回填输入框 ----
  const FORWARD_HASH_RE = /(?:^#|&)__aem_q=([^&]*)/;

  function setInputValueViaSetter(el, text) {
    try {
      if (el.tagName === 'TEXTAREA') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(el, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        return true;
      }
      if (el.tagName === 'INPUT') {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, text);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.focus();
        return true;
      }
      if (el.getAttribute && el.getAttribute('contenteditable') === 'true') {
        el.focus();
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('insertText', false, text);
        return true;
      }
    } catch (e) {
      warn('setInputValue error', e);
    }
    return false;
  }

  function maybeFillForwardedQuestion(currentLabel) {
    const m = location.hash.match(FORWARD_HASH_RE);
    if (!m) return;
    let q;
    try { q = decodeURIComponent(m[1]); } catch { return; }
    if (!q) return;

    const newHash = location.hash
      .replace(FORWARD_HASH_RE, '')
      .replace(/^#&/, '#')
      .replace(/^#$/, '');
    history.replaceState(null, '', location.pathname + location.search + newHash);

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
  const handler = pickHandler();
  if (!handler) {
    log('no handler matches current URL:', location.href);
    return;
  }
  log('active handler:', handler.id);

  if (FORWARD_TARGETS.some((t) => t.id === handler.id)) {
    ensureForwardCss();
    captureInputs();
    watchForUserBubbles(handler.id);
    maybeFillForwardedQuestion(handler.label);
  }

  trigger(0);
  watchRouteChanges();
})();
