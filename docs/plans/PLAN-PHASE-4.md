# Phase 4：设置 + 数据管理 + 收尾

**目标：** 完成设置面板、数据导入导出、空状态引导，收尾 v1 全部功能。

---

## 任务清单

### 4.1 SettingsPanel 组件

替换 App.tsx 中现有的设置占位面板（L146-156）和左下角临时主题按钮（L135-142）。

**实现：**

- 齿轮图标点击打开下拉面板（已有 `showSettings` 状态和 `handleSettingsClick`）
- 面板内容三个区域：主题切换、数据管理、关于信息
- 主题切换：三个 Segment 按钮（自动 / 浅色 / 深色），当前选中高亮
- 点击面板外区域关闭（已有遮罩层逻辑）
- 关于区域：显示 `SubTracker v1.0`

**改动文件：** `components.tsx`（新增 SettingsPanel 组件）、`App.tsx`（替换占位、删除临时按钮、传递 props）

**测试：** tsc + Playwright（面板打开/关闭、主题切换三档循环）

**验收标准：**
- 齿轮点击弹出面板，再点外部关闭
- 三个主题按钮切换正常，当前选中项有视觉区分
- 删除左下角临时主题按钮

---

### 4.2 JSON 导出

在 SettingsPanel 中添加「导出数据」按钮。

**实现：**

- 点击后生成 JSON 文件，结构：`{ version: "1.0", exportedAt: ISO时间, subscriptions: [...], categories: [...] }`
- `categories` 仅包含用户自定义分类（与 localStorage 一致）
- 触发浏览器下载，文件名 `subtracker-export-YYYY-MM-DD.json`
- 导出函数写在 `utils.ts`

**改动文件：** `utils.ts`（导出函数）、`components.tsx`（按钮 + 调用）、`types.ts`（如需导出数据结构类型）

**测试：** tsc + vitest（导出函数生成正确 JSON 结构）+ Playwright（点击后下载文件、文件内容校验）

**验收标准：**
- 点击后浏览器下载 JSON 文件
- 文件名格式正确
- JSON 结构包含 version、exportedAt、subscriptions、categories 四个字段

---

### 4.3 JSON 导入

在 SettingsPanel 中添加「导入数据」按钮。

**实现：**

- 点击打开文件选择器（`<input type="file" accept=".json">`）
- 读取文件后弹出确认对话框：「将替换当前所有数据，是否继续？」（复用 ConfirmDialog）
- 确认后覆盖 subscriptions 和 categories，刷新页面状态
- 导入校验：检查 JSON 格式、必要字段（version、subscriptions 数组），异常时 alert 提示
- 解析/校验函数写在 `utils.ts`

**改动文件：** `utils.ts`（解析校验函数）、`components.tsx`（按钮 + 文件选择 + 确认流程）、`App.tsx`（传递 import handler）

**测试：** tsc + vitest（校验函数：合法 JSON / 缺字段 / 非 JSON）+ Playwright（导出 → 清空 → 导入 → 数据恢复）

**验收标准：**
- 选择合法 JSON 后弹出确认，确认后数据被替换
- 取消则不做任何操作
- 非法文件（非 JSON、缺字段）给出错误提示
- 导出 → 导入 闭环验证：数据完全恢复

---

### 4.4 空状态引导

无订阅时 Dashboard 和订阅列表显示引导页面。

**实现：**

- Dashboard 空状态：替换当前的"暂无数据"文案，改为引导性文案 + 引导用户点击 FAB 添加
- 订阅列表空状态：无生效中/已取消订阅时显示对应引导
- 视觉：居中显示、适当留白，文案简洁不啰嗦

**改动文件：** `components.tsx`（DashboardView、SubscriptionsView 内部调整）

**测试：** Playwright（无订阅时截图验证空状态 → 添加一条后空状态消失）

**验收标准：**
- 无订阅时 Dashboard 显示引导文案
- 无订阅时订阅列表显示引导文案
- 添加第一条订阅后自动切换为正常视图

---

### 4.5 响应式适配 + 视觉打磨

**检查项：**

- 移动端（375px）：单列布局无溢出、表单可用、文字不截断
- 桌面端（960px+）：统计卡片并排、内容区居中
- 暗色/浅色模式下 SettingsPanel 视觉一致
- 金额数字加粗加大
- 辅助信息（日期、周期）降低对比度
- 间距、圆角、字号层级合理

**测试：** Playwright（375px 和 960px 两个视口截图对比）

**验收标准：**
- 375px 无水平溢出
- 960px 统计卡片并排、设置面板位置合理
- 两种主题下视觉一致性良好

---

## 实施顺序

```
4.1 SettingsPanel → 4.2 导出 → 4.3 导入 → 4.4 空状态 → 4.5 视觉打磨
```

4.1-4.3 串行（后者依赖前者的面板容器），4.4 和 4.5 相对独立但放最后做收尾。

---

## 测试计划

| # | 场景 | 预期 | 方式 | 结果 |
|---|------|------|------|------|
| 1 | 设置面板打开/关闭 | 齿轮点击打开，外部点击关闭 | Playwright | |
| 2 | 主题三档切换 | auto → light → dark 循环，页面样式切换 | Playwright | |
| 3 | 导出 JSON | 点击后下载文件，内容结构正确 | vitest + Playwright | |
| 4 | 导入合法 JSON | 确认后数据覆盖，UI 更新 | vitest + Playwright | |
| 5 | 导入非法文件 | 提示错误，数据不变 | vitest | |
| 6 | 导出 → 导入闭环 | 导出 → 清数据 → 导入 → 数据恢复 | Playwright | |
| 7 | 空状态引导（Dashboard） | 无订阅时显示引导文案 | Playwright | |
| 8 | 空状态引导（订阅列表） | 无订阅时显示引导文案 | Playwright | |
| 9 | 移动端布局（375px） | 无溢出，单列堆叠 | Playwright 截图 | |
| 10 | 桌面端布局（960px） | 卡片并排，面板位置正确 | Playwright 截图 | |
| 11 | 临时主题按钮已移除 | 左下角无按钮 | Playwright | |
