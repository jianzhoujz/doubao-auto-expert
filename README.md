# 🤖 Doubao Auto Expert Mode

**一键告别手动切换 —— 让豆包始终以最强姿态为你服务。**

![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Ready-green?logo=tampermonkey)
![License](https://img.shields.io/badge/License-MIT-blue)
![Chrome](https://img.shields.io/badge/Chrome-Supported-brightgreen?logo=googlechrome)
![Edge](https://img.shields.io/badge/Edge-Supported-brightgreen?logo=microsoftedge)
![Firefox](https://img.shields.io/badge/Firefox-Supported-brightgreen?logo=firefox)

---

## 为什么需要这个脚本？

[豆包](https://www.doubao.com)是字节跳动推出的 AI 助手，网页版提供了「快速」「思考」「专家」三种对话模式。然而每次打开页面、新建对话、甚至切换对话时，豆包都会默认回到**快速模式** —— 这意味着你每天要重复几十次相同的手动切换操作，才能获得最高质量的回答。

**Doubao Auto Expert Mode** 彻底解决了这个痛点。安装后，脚本会在页面加载时自动检测当前模式，如果不是「专家」，则静默、无感地完成切换。你只需要像往常一样打开豆包，剩下的交给脚本。

## 核心特性

🎯 **全自动切换** —— 页面加载完成后，自动将对话模式从「快速」或「思考」切换为「专家」，全程无需手动操作。

🔄 **SPA 深度适配** —— 豆包是单页应用（SPA），新建对话和切换对话不会触发页面刷新。脚本通过监听 `pushState`、`replaceState`、`popstate` 以及 DOM 变化，确保在任何页面导航场景下都能正确触发切换。

🖱️ **原生级事件模拟** —— 豆包的 UI 基于 Radix UI 构建，普通的 `.click()` 无法触发菜单。脚本通过完整模拟 `pointerdown → mousedown → pointerup → mouseup → click` 事件链，实现与真实用户操作一致的点击行为。

⏱️ **智能重试机制** —— 页面加载速度受网络影响，脚本采用最多 30 次、每秒一次的轮询策略，确保即使在慢速网络下也能可靠完成切换。

🛡️ **安全无侵入** —— 不修改任何页面数据，不发送任何网络请求，不需要任何额外权限（`@grant none`）。纯粹的 DOM 操作，干净透明。

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
| **Edge iOS** | 内置扩展商店（菜单 → 扩展 → 搜索 Stay，需 Edge v139+） |

> 💡 **提示**：如果你无法访问 Chrome 网上应用店，也可以从 [Tampermonkey 官网](https://www.tampermonkey.net/) 获取离线安装包。
>
> 📱 **移动端说明**：Edge Android 和 iOS 版支持的 UserScript 插件不同——Android 端可直接安装 Tampermonkey，iOS 端则通过 Stay 插件来管理用户脚本。Stay 兼容油猴脚本格式，安装本脚本后即可正常使用。

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

安装完成后，无需任何额外配置。打开 [豆包](https://www.doubao.com/chat/) 即可——你会发现对话模式已经自动切换到「专家」了。

新建对话、切换历史对话，脚本都会自动帮你搞定。

## 工作原理

```
页面加载 / 路由变化
        │
        ▼
  检测模式切换按钮 ──── 未找到 ──→ 等待重试（最多 30s）
        │
      找到了
        │
        ▼
  当前模式 == 专家？ ──── 是 ──→ 无需操作 ✓
        │
       否
        │
        ▼
  模拟点击打开下拉菜单
        │
        ▼
  找到「专家」选项并点击
        │
        ▼
    切换完成 ✓
```

## 常见问题

**Q: 安装后没有生效？**

请确认 Tampermonkey 扩展已启用，且脚本处于开启状态（Tampermonkey 面板中脚本左侧的开关为绿色）。刷新豆包页面后重试。

**Q: 切换时有明显的菜单闪烁？**

这是正常现象。脚本通过模拟点击操作完成切换，菜单会短暂弹出后自动关闭，通常在页面加载的前 1-2 秒内完成，不影响后续使用。

**Q: 我想切换为其他模式怎么办？**

可以修改脚本顶部的 `TARGET_MODE` 变量，将 `'专家'` 改为 `'快速'` 或 `'思考'` 即可。

**Q: 豆包更新后脚本失效了？**

由于脚本依赖页面 DOM 结构，豆包的前端更新可能导致选择器失效。如果遇到此问题，欢迎 [提交 Issue](https://github.com/jianzhoujz/doubao-auto-expert/issues)，我会尽快适配更新。

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


