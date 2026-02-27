# REVIEW-001: 代码质量审查

> 审查范围：`src/` 全部源码（types.ts, constants.ts, utils.ts, App.tsx, components.tsx, main.tsx）
> 审查日期：2026-02-28

## 状态说明

- ⏳ 待修复
- ✅ 已修复
- ⏭️ 推迟 / 不修

---

## 高优先级

### R-001 `todayString()` 及多处日期格式化有时区陷阱 ✅

**位置**：`utils.ts`
**问题**：`toISOString().split('T')[0]` 在 UTC+8 凌晨 0\~8 点返回前一天日期。
**修复**：`todayString()` 和 `calculateNextBillDate` 的 return 统一改用 `toLocalDateString()`。

### R-002 `handleUpdate` 里 `nextBillDate` 可能不一致 ✅

**位置**：`App.tsx`
**问题**：检测到 amount/cycle/startDate 变化时只重算了 `billingHistory`，没有重算 `nextBillDate`。
**修复**：在变化分支里同时调用 `calculateNextBillDate` 重算 `nextBillDate`。

---

## 中优先级

### R-003 `parseImportData` 校验太弱 ✅

**位置**：`utils.ts`
**问题**：只校验 version 和 subscriptions 存在，缺字段的数据会注入 state 导致白屏。
**修复**：遍历校验每条 subscription 的 id, name, amount, currency, startDate, billingHistory。

### R-004 设置面板导出/导入图标 ⏭️

**位置**：`components/settings.tsx`
**结论**：原始图标语义是数据流方向（导出↑送出、导入↓收入），而非文件操作方向。原设计无误，已还原。

### R-005 `UpcomingList` 日期解析方式不一致 ✅

**位置**：`components/dashboard.tsx`
**问题**：`new Date("YYYY-MM-DD")` 跨浏览器解析不一致。
**修复**：改用项目内 `parseLocalDate()`。

---

## 低优先级

### R-006 `monthsMap` 重复定义 3 次 ✅

**位置**：`utils.ts` / `constants.ts`
**问题**：3 个函数各自定义了相同的 monthsMap。
**修复**：提取为 `constants.ts` 的 `CYCLE_MONTHS` 常量，3 处统一引用。

### R-007 `components.tsx` 961 行过于臃肿 ✅

**位置**：`src/components.tsx` → `src/components/`
**问题**：单文件塞了 19 个组件。
**修复**：拆分为 7 个文件：
- `icons.tsx` — 6 个图标组件
- `layout.tsx` — Header, TabBar, FAB
- `common.tsx` — ConfirmDialog
- `settings.tsx` — SettingsPanel
- `dashboard.tsx` — MiniPie, ExpandedPieSection, StatsCard, UpcomingList, DashboardView
- `subscriptions.tsx` — SubscriptionCard, SubscriptionsView
- `drawer.tsx` — SubscriptionDrawer
- `index.ts` — 统一重导出，App.tsx 导入路径不变

### R-008 SubscriptionDrawer 状态过多 ✅

**位置**：`components/drawer.tsx`
**问题**：11 个 useState，reset 逻辑手动逐个 set。
**修复**：表单字段合并为 `DrawerForm` 对象 + `updateForm()` helper，reset 只需一行 `setForm(...)`. UI 状态（showNewCategory 等）保留独立 useState。

### R-009 ID 生成方式 ✅

**位置**：`App.tsx`
**问题**：`Date.now().toString(36) + Math.random()` 理论上可能重复。
**修复**：改用 `crypto.randomUUID()`。

### R-010 缺少 ErrorBoundary ✅

**位置**：`src/ErrorBoundary.tsx` + `main.tsx`
**问题**：localStorage 数据损坏时白屏，用户无法自救。
**修复**：添加顶层 ErrorBoundary，捕获渲染错误后显示"清除数据并重置"按钮。

---

## 修复记录

| 编号 | 修复日期 | 备注 |
|------|----------|------|
| R-001 ~ R-010 | 2026-02-28 | 一次性全部修复，tsc + vitest 验证通过 |
