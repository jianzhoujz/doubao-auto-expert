# 🤖 AI Auto Expert Mode

让主流 AI 网页版自动切到「深度思考 / 专家模式」，并在用户消息下方挂一键转发到其他 AI 的按钮。

![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Ready-green?logo=tampermonkey)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 安装

**1. 装 Tampermonkey**

| 浏览器 | 链接 |
|--------|------|
| Chrome / Brave / Arc / 其他 Chromium 系 | [Chrome 应用店](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| Microsoft Edge | [Edge 加载项](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| Firefox | [Firefox 附加组件](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| Safari（付费版） | [Mac App Store](https://apps.apple.com/app/tampermonkey/id1482490089) |
| Edge Android（需 v130+） | 浏览器菜单 → 扩展 → 搜 Tampermonkey |
| Edge iOS（需 v139+） | 浏览器菜单 → 扩展 → 搜 [Stay](https://microsoftedge.microsoft.com/addons/detail/stay-%E4%BE%A7%E8%BE%B9%E6%A0%8F%E5%8C%96%E4%BD%A0%E7%9A%84%E6%B5%8F%E8%A7%88%E5%99%A8/ihnakibhdgjfcconfoohcncbadhjloej) |

**2. 点这里安装脚本**

👉 [**点击安装 / 更新**](https://raw.githubusercontent.com/jianzhoujz/doubao-auto-expert/main/doubao-expert-mode.user.js)

Tampermonkey 会弹出确认页，点「安装」。

**3. 完成。** 打开下表任意一个站点就能用。

---

## 它做什么

- **自动切到深度思考 / 专家模式**：在有该开关的站点上自动点一下，切换完成后右上角 Toast 提示结果。
- **每条用户消息气泡下方挂「↗ 问问别的AI」按钮**：点开下拉菜单选目标 AI，新标签自动打开并把问题回填到输入框。历史消息和切回的老会话也会被识别。

| 站点 | 自动切专家模式 | 跨 AI 转发 |
|------|----------------|------------|
| [ChatGPT](https://chatgpt.com/) | — | ✅ |
| [Claude](https://claude.ai/) | — | ✅ |
| [Gemini](https://gemini.google.com/) | — | ✅ |
| [智谱](https://chatglm.cn/main/alltoolsdetail?lang=zh) | — | ✅ |
| [Kimi](https://www.kimi.com/) | — | ✅ |
| [DeepSeek](https://chat.deepseek.com/) | ✅ → 专家模式 | ✅ |
| [千问](https://www.qianwen.com/) | ✅ → 深度思考 | ✅ |
| [Qwen](https://chat.qwen.ai/) | — | ✅ |
| [豆包](https://www.doubao.com/chat/) | ✅ → 专家 | ✅ |
| [元宝](https://yuanbao.tencent.com/chat/) | — | ✅ |

问题通过 URL hash (`#__aem_q=...`) 传递到目标站点，**不会发到任何服务器**。

> 不支持 Microsoft Copilot：Chrome / Edge 禁止扩展注入到 `copilot.microsoft.com`。

---

## 常见问题

**装完没生效？** 确认 Tampermonkey 扩展和本脚本都开着（脚本行左侧开关亮绿），刷新对应页面。DevTools 控制台搜 `[AutoExpert]` 看日志。

**某条消息下方没出现转发按钮？** 该站点 DOM 结构改了或不在已知的选择器列表里。打开 [Issue](https://github.com/jianzhoujz/doubao-auto-expert/issues) 附 DOM 截图，加个站点专属选择器就行。

**转发后目标 AI 输入框没回填？** 极少数站点把输入框藏在 Shadow DOM 或用了非常见结构（比如富文本编辑器需要走 paste 路径）。右上角会有红色 Toast 提示，欢迎反馈。

**会被站点检测吗？** 不会。脚本不发任何网络请求，纯 DOM 操作，`@grant none`。

---

## 协议

[MIT License](LICENSE)
