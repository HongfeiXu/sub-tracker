# Phase 1：项目搭建 + 基础骨架

**目标：** 从零搭建项目，跑通技术栈，实现应用外壳和主题切换。

---

## 任务清单

### 1.1 初始化 Vite 项目

- 使用 `npm create vite@latest` 创建 React + TypeScript 项目
- 安装依赖：`@tailwindcss/vite`、`tailwindcss`
- 配置 `vite.config.ts`：添加 `@tailwindcss/vite` 插件
- 配置 `index.css`：`@import "tailwindcss"` + 自定义暗色 variant
- 配置 `tsconfig.json`：strict 模式
- 验证 `npm run dev` 可启动，页面可访问

**验收标准：**
- `npm run dev` 启动无报错
- 页面显示 Tailwind 样式生效（如一个带 Tailwind class 的测试元素）
- TypeScript 编译无错误

### 1.2 定义 TypeScript 类型

在 `src/App.tsx` 顶部定义所有核心类型：

- `Currency`：`'CNY' | 'USD'`
- `BillingCycle`：`'monthly' | 'quarterly' | 'yearly' | 'custom'`
- `SubscriptionStatus`：`'active' | 'cancelled'`
- `ThemeMode`：`'auto' | 'light' | 'dark'`
- `Subscription`：完整字段（参照 ARCHITECTURE.md 3.1）
- `Category`：`{ name: string; color: string }`
- `TabView`：`'dashboard' | 'subscriptions'`

**验收标准：**
- 所有类型无 `any` / `unknown`
- 类型可被后续代码引用，无编译错误

### 1.3 实现 localStorage 工具函数

- `loadFromStorage<T>(key: string, fallback: T): T`
- `saveToStorage<T>(key: string, value: T): void`
- 使用 ARCHITECTURE.md 5.2 定义的 key 常量：`STORAGE_KEYS.SUBSCRIPTIONS`、`STORAGE_KEYS.CATEGORIES`、`STORAGE_KEYS.THEME`

**验收标准：**
- 写入后读取返回相同数据
- key 不存在时返回 fallback 值
- 非法 JSON 时返回 fallback 值（不崩溃）

### 1.4 实现主题管理

- 从 localStorage 读取主题偏好，默认 `auto`
- `auto` 模式：监听 `window.matchMedia('(prefers-color-scheme: dark)')` 变化
- 在 `<html>` 根元素上添加/移除 `dark` class
- 主题切换时保存到 localStorage
- Tailwind v4 暗色 variant 配置：`@custom-variant dark (&:where(.dark, .dark *))`

**验收标准：**
- 切换主题后页面配色立即变化
- `auto` 模式下跟随系统设置
- 刷新页面后主题偏好保持

### 1.5 搭建应用外壳

实现以下组件（均在 `src/App.tsx` 中）：

- **Header**：左侧显示"SubTracker"标题，右侧齿轮图标（点击暂无操作）
- **TabBar**：两个 Tab（"总览" / "订阅列表"），点击切换，当前选中项高亮
- **FAB**：右下角悬浮"+"按钮，固定定位，点击暂无操作
- **内容区**：根据当前 Tab 显示占位文本（"Dashboard 占位" / "Subscriptions 占位"）

**验收标准：**
- Header 固定在顶部，显示标题和齿轮图标
- TabBar 可切换，选中态有视觉区分
- FAB 悬浮在右下角，不随页面滚动
- 内容区根据 Tab 切换显示不同占位文本

### 1.6 应用色彩体系

参照 PRD 5.3 色彩体系，在 CSS 中定义设计 token：

**暗色模式：**
- 页面背景 #0A0A0B / 卡片背景 #1A1A2E / 主文字 #FFFFFF / 次要文字 #9CA3AF / 分割线 #2D2D3A / 强调色 #5B9EF4

**浅色模式：**
- 页面背景 #F5F5F7 / 卡片背景 #FFFFFF / 主文字 #1A1A1A / 次要文字 #6B7280 / 分割线 #E5E7EB / 强调色 #3B82F6

**验收标准：**
- 暗色模式下背景为深色，文字为白色
- 浅色模式下背景为浅灰，文字为深色
- Header、TabBar、FAB、内容区均正确应用对应模式的配色
- 两种模式之间切换，所有元素配色同步变化

### 1.7 基础布局适配

- 移动端优先：内容区 max-width 480px 居中
- 桌面端：max-width 960px 居中
- 底部预留 FAB 按钮空间（padding-bottom）

**验收标准：**
- 375px 宽度下布局正常，无水平溢出
- 960px 以上宽度居中显示，两侧留白

---

## 测试计划

本阶段以手动验证为主：

1. `npm run dev` 启动，访问 localhost 页面正常
2. `npm run build` 构建无报错
3. 切换暗色/浅色/自动三种主题，验证配色变化
4. 刷新页面，主题偏好保持
5. Tab 切换，内容区更新
6. 移动端视口（375px）和桌面端视口（1440px）布局检查
