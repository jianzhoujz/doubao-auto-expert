# 🤖 AI Auto Expert Mode

**一键告别手动切换 —— 让主流 AI 助手始终以最强姿态为你服务。**

![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Ready-green?logo=tampermonkey)
![License](https://img.shields.io/badge/License-MIT-blue)
![Chrome](https://img.shields.io/badge/Chrome-Supported-brightgreen?logo=googlechrome)
![Edge](https://img.shields.io/badge/Edge-Supported-brightgreen?logo=microsoftedge)
![Firefox](https://img.shields.io/badge/Firefox-Supported-brightgreen?logo=firefox)

---

## 为什么需要这个脚本？

这个脚本一次解决两个 AI 网页版的高频痛点：

1. **自动切换深度思考 / 专家模式** —— 豆包 / DeepSeek / 千问默认都是「快速 / 普通模式」，响应快但答得浅，每次新建对话、刷新、切会话都得再手动点一遍。脚本一次性把它自动化。
2. **一键跨 AI 转发问题** —— 觉得 A 答得不好想看看 B、C 怎么答时，以前要复制问题 → 新开标签 → 粘贴 → 发送。装上脚本后，每条用户消息下方都会出现一个「↗ 转发到其他 AI」下拉按钮，点一下即在新标签打开目标 AI 并自动回填问题，省去复制粘贴的全部步骤。

**覆盖站点：**

| 站点 | 自动切换深度思考 / 专家模式 | 跨 AI 转发 |
|------|------------------------------|-----------|
| [ChatGPT](https://chatgpt.com/) | — | ✅ |
| [Claude](https://claude.ai/) | — | ✅ |
| [Gemini](https://gemini.google.com/) | — | ✅ |
| [智谱](https://chatglm.cn/main/alltoolsdetail?lang=zh) | — | ✅ |
| [Kimi](https://www.kimi.com/) | — | ✅ |
| [DeepSeek](https://chat.deepseek.com/) | ✅ 快速模式 → 专家模式 | ✅ |
| [千问](https://www.qianwen.com/) | ✅ 默认 → 深度思考 | ✅ |
| [Qwen](https://chat.qwen.ai/) | — | ✅ |
| [豆包](https://www.doubao.com/chat/) | ✅ 快速 / 思考 → 专家 | ✅ |
| [元宝](https://yuanbao.tencent.com/chat/) | — | ✅ |

> 💡 暂不支持 Microsoft Copilot：Edge / Chrome 出于安全策略禁止扩展和用户脚本注入到 `copilot.microsoft.com`（微软自家域名属于受保护域），Tampermonkey 无法在该域名运行，自动切换和跨 AI 转发都无法启用。后续浏览器策略放开会重新评估。

每次自动切换完成后，右上角会弹出一个轻量 Toast 提示：
- ✅ **绿色 = 切换成功**：显示从哪个模式切到了哪个模式
- 🔵 **蓝色 = 无需切换**：说明当前已是目标模式
- 🔴 **红色 = 切换失败**：附带原因，方便排查（DOM 变更 / 选项找不到 / 状态识别失败 等）

跨 AI 转发是被动 UI，无 Toast；按钮就挂在每条用户消息气泡下方，点击展开下拉菜单选目标 AI。

## 核心特性

🎯 **多站点统一调度** —— 单脚本覆盖豆包、DeepSeek、千问，按 URL 自动路由到对应处理器，新增站点只需扩展一个 handler。

🔔 **结果可感知** —— 不再是黑盒。每次执行都会通过 Toast 告诉你：切了 / 没切 / 没切的原因，遇到失败也能第一时间发现。

🔄 **SPA 深度适配** —— 这些站点都是单页应用，新建/切换对话不会刷新页面。脚本通过监听 `pushState`、`replaceState`、`popstate` 与 DOM 变化，在任何导航场景下都能正确触发。豆包 / DeepSeek 这类「每次会话都重置」的站点会重新切换；千问这类「toggle 跨会话保持」的站点只在首次加载执行，避免误把已开启的深度思考点关。

🖱️ **原生级事件模拟** —— 豆包等基于 Radix UI 的 UI 框架对普通 `.click()` 不响应。脚本完整模拟 `pointerdown → mousedown → pointerup → mouseup → click` 事件链，与真实用户操作一致。

🧠 **稳健的状态识别** —— 不同站点用不同信号判定当前模式：豆包看 trigger 按钮文本、DeepSeek 比较 pill 文字颜色（选中色偏蓝）、千问读 `aria-pressed`。每个 handler 都经过浏览器实测，避免误点击。

⏱️ **智能重试** —— 页面加载速度受网络影响，脚本采用最多 30 次、每秒一次的轮询策略，确保慢网下也能可靠完成切换；超时后会给出明确的失败 Toast。

🛡️ **安全无侵入** —— 不修改页面数据，不发送任何网络请求，不需要额外权限（`@grant none`）。纯 DOM 操作，干净透明。

↗ **跨 AI 一键转发** —— 用户消息气泡下方注入下拉按钮，点击即在新标签打开目标 AI；问题通过 URL hash 传递（不经过任何服务器），目标侧自动回填到输入框，textarea 与 contenteditable 都兼容。

🤖 **结构性气泡识别** —— 转发按钮不依赖捕获你"按下回车"的瞬间，而是按"有背景色或圆角 + 相对父容器明显右对齐"扫描整页，因此**历史消息和切回的老会话**也会被自动挂上按钮，跨站点通用，无需为每个 AI 单独写选择器。

## 快速开始

### 第一步：安装浏览器扩展

脚本运行在 **Tampermonkey**（篡改猴）上，请先根据你的浏览器安装对应扩展：

| 浏览器 | 安装地址 |
|--------|---------|
| **Google Chrome** | [Chrome 网上应用店](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) |
| **Microsoft Edge** | [Edge 加载项商店](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd) |
| **Firefox** | [Firefox 附加组件商店](https://addons.mozilla.org/firefox/addon/tampermonkey/) |
| **Safari** | [Mac App Store（付费版）](https://apps.apple.com/app/tampermonkey/id1482490089) |
| **Edge Android** | 内置扩展商店（菜单 → 扩展 → 搜索 [Tampermonkey](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)，需 Edge v130+） |
| **Edge iOS** | 内置扩展商店（菜单 → 扩展 → 搜索 [Stay](https://microsoftedge.microsoft.com/addons/detail/stay-%E4%BE%A7%E8%BE%B9%E6%A0%8F%E5%8C%96%E4%BD%A0%E7%9A%84%E6%B5%8F%E8%A7%88%E5%99%A8/ihnakibhdgjfcconfoohcncbadhjloej)，需 Edge v139+） |

> 💡 **提示**：如果你无法访问 Chrome 网上应用店，也可以从 [Tampermonkey 官网](https://www.tampermonkey.net/) 获取离线安装包。
>
> 📱 **移动端说明**：Edge Android 和 iOS 版支持的 UserScript 插件不同——Android 端可直接安装 Tampermonkey，iOS 端则通过 [Stay](https://microsoftedge.microsoft.com/addons/detail/stay-%E4%BE%A7%E8%BE%B9%E6%A0%8F%E5%8C%96%E4%BD%A0%E7%9A%84%E6%B5%8F%E8%A7%88%E5%99%A8/ihnakibhdgjfcconfoohcncbadhjloej) 插件来管理用户脚本。Stay 兼容油猴脚本格式，安装本脚本后即可正常使用。

### 第二步：安装脚本

**方式一：一键安装（推荐）**

点击下方链接，Tampermonkey 会自动弹出安装界面：

> [📦 点击安装脚本](https://raw.githubusercontent.com/jianzhoujz/doubao-auto-expert/main/doubao-expert-mode.user.js)

**方式二：手动安装**

1. 点击浏览器右上角的 Tampermonkey 图标，选择「添加新脚本」。
2. 删除编辑器中的默认内容。
3. 将本仓库中 [`doubao-expert-mode.user.js`](./doubao-expert-mode.user.js) 的完整代码复制粘贴到编辑器中。
4. 按下 `Ctrl + S`（Mac 为 `Cmd + S`）保存。

### 第三步：使用

安装完成后，无需任何额外配置。打开下面任意一个站点，脚本会自动接管：

- [ChatGPT](https://chatgpt.com/)
- [Claude](https://claude.ai/)
- [Gemini](https://gemini.google.com/)
- [智谱](https://chatglm.cn/main/alltoolsdetail?lang=zh)
- [Kimi](https://www.kimi.com/)
- [DeepSeek](https://chat.deepseek.com/)
- [千问](https://www.qianwen.com/)
- [Qwen](https://chat.qwen.ai/)
- [豆包](https://www.doubao.com/chat/)
- [元宝](https://yuanbao.tencent.com/chat/)

豆包 / DeepSeek / 千问 上脚本会自动切到专家 / 深度思考模式（右上角 Toast 提示）；全部 10 个站点都会在每条用户消息气泡下方挂上「↗ 转发到其他 AI」下拉按钮，点击即可一键跳转到其他 AI 并自动回填问题。新建对话 / 切换历史对话 / 滚动加载老消息都会重新扫描。

## 工作原理

```
页面加载 / SPA 路由变化
          │
          ▼
   按 URL 选择对应站点的 handler
          │
          ▼
   检测目标按钮（最多重试 30s）
          │
   ┌──────┼──────┐
   │      │      │
 下拉菜单 pill   toggle
 (豆包)  选择    按钮
         (DS)  (千问)
   │      │      │
   ▼      ▼      ▼
 文本=   颜色=  aria-pressed=
 专家?   蓝色?  true?
   │      │      │
   └──────┼──────┘
          │
          └─→ 是 ─→ Toast「无需切换」（蓝色）
          │
          ▼
   模拟点击执行切换
          │
          ▼
   ┌──成功──→ Toast「已切换」（绿色）
   └──失败──→ Toast「切换失败 + 原因」（红色）
```

## 常见问题

**Q: 安装后没有生效？**

请确认 Tampermonkey 扩展已启用，且脚本处于开启状态（Tampermonkey 面板中脚本左侧的开关为绿色）。刷新对应站点的页面后重试。如果右上角连 Toast 都没有，打开 DevTools 控制台搜索 `[AutoExpert]` 查看日志。

**Q: 切换时有明显的菜单闪烁？**

这是正常现象。脚本通过模拟点击操作完成切换，菜单会短暂弹出后自动关闭，通常在页面加载的前 1-2 秒内完成。

**Q: 我想切换为其他模式怎么办？**

每个站点对应一个 handler 对象（`doubaoHandler` / `deepseekHandler` / `qianwenHandler`），改动 `targetLabel` 与 `run()` 中的目标判断即可。

**Q: 站点更新后脚本失效了？**

由于脚本依赖页面 DOM 结构，前端发版可能导致选择器或状态判断失效。失效时 Toast 会显示具体原因（如「未找到选项」「无法识别开关状态」），方便定位。欢迎 [提交 Issue](https://github.com/jianzhoujz/doubao-auto-expert/issues)，附上 Toast 提示文字与控制台 `[AutoExpert]` 日志即可。

**Q: 千问的「深度思考」是否会被误关？**

不会。千问的 handler 配置成只在「首次加载页面」执行，且通过 `aria-pressed === 'true'` 精确判定当前是否已开启；已开启时会显示蓝色 Toast「无需切换」并跳过点击。SPA 路由变化（切换会话）不会重复触发。

**Q: 为什么不支持 Microsoft Copilot？**

Edge / Chrome 出于安全策略禁止扩展和用户脚本注入到 `copilot.microsoft.com`（微软自家域名属于受保护域），Tampermonkey 没法在该域名下执行脚本，因此自动切换和跨 AI 转发都无法启用。后续如果浏览器策略放开会重新评估。

**Q: 转发按钮没有出现在用户消息下方？**

气泡识别有两套路径：一是站点专属 CSS 选择器（豆包 / 智谱已写明），二是"有背景色 + 圆角 + 相对父容器明显右对齐"的通用启发式。如果某站点的用户气泡渲染成居中或全宽无背景的样式，会被通用启发式漏过。可以打开 DevTools 控制台搜 `[AutoExpert]` 看是否有 `attached forward rows` 日志；如果某个站点持续漏识别，请把 DOM 截图发到 Issue 我加进站点专属选择器。

**Q: 转发后目标 AI 的输入框没有自动填入？**

目标侧通过通用 textarea / contenteditable 探测找输入框（优先选靠视口底部 + 面积更大的那个）。如果目标 AI 把输入框放在 Shadow DOM 里或用了其他非常见结构，会找不到，此时右上角会出现红色 Toast 提示「自动填入失败」。问题串以 URL hash (`#__aem_q=…`) 传递，不会发到任何服务器。

## 兼容性

- ✅ Google Chrome（推荐）
- ✅ Microsoft Edge
- ✅ Firefox
- ✅ Safari（需 Tampermonkey 付费版）
- ✅ 其他基于 Chromium 的浏览器（Brave、Arc、Vivaldi 等）
- ✅ Edge Android（通过 Tampermonkey，需 Edge v130+）
- ✅ Edge iOS（通过 Stay 插件，需 Edge v139+）

## 贡献

欢迎通过以下方式参与贡献：

- 🐛 [提交 Bug 报告](https://github.com/jianzhoujz/doubao-auto-expert/issues)
- 💡 [提交功能建议](https://github.com/jianzhoujz/doubao-auto-expert/issues)
- 🔀 Fork 本仓库并提交 Pull Request

## 开源协议

本项目基于 [MIT License](LICENSE) 开源，你可以自由使用、修改和分发。


