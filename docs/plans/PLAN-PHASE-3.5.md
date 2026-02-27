# Phase 3.5：App.tsx 拆分重构

**目标：** 将 1380 行的单文件 `src/App.tsx` 拆分为 5 个模块，降低维护成本，为 Phase 4 开发做准备。

---

## 目标文件结构

```
src/
  types.ts          (~55 行)   — 所有类型定义
  constants.ts      (~55 行)   — 所有常量
  utils.ts          (~330 行)  — 所有工具函数
  components.tsx    (~750 行)  — 所有 UI 组件
  App.tsx           (~180 行)  — App 组件（状态 + handlers + render）
  billing.test.ts   (更新 import 路径)
```

依赖方向严格单向，无循环风险：

```
types.ts → constants.ts → utils.ts → components.tsx → App.tsx
```

---

## 各文件内容

### `types.ts`

- 类型别名：Currency, BillingCycle, SubscriptionStatus, ThemeMode, TabView, SubStatusFilter
- 接口：BillingRecord, Subscription, Category, SpendingSummary, CategoryBreakdownItem, ItemBreakdownItem

### `constants.ts`

- STORAGE_KEYS, DEFAULT_CATEGORIES, COLOR_PALETTE, BRAND_COLORS, CYCLE_LABELS
- 依赖：types.ts

### `utils.ts`

- 存储：loadFromStorage, saveToStorage
- 颜色：matchBrandColor
- 日期/扣款：calculateNextBillDate, toLocalDateString, parseLocalDate, formatDate, todayString, generateBillingDates, generateBillingHistory, advanceBillingHistory
- 分类：getAllCategories, assignCategoryColor
- 金额换算：convertToMonthly, convertToYearly
- 支出统计：calcSpendingSummary, calcCategoryBreakdown, calcYearlyActualSpending, calcYearlyCategoryBreakdown, calcMonthlyItemBreakdown, calcYearlyItemBreakdown
- 主题：getSystemTheme, applyTheme
- 依赖：types.ts, constants.ts

### `components.tsx`

- 图标（模块内部，不导出）：SettingsIcon, PlusIcon, ChevronRightIcon, CloseIcon
- 布局：Header, TabBar, FAB
- 对话框：ConfirmDialog
- 卡片：SubscriptionCard
- 仪表盘子组件（内部）：MiniPie, ExpandedPieSection
- 仪表盘：StatsCard, UpcomingList, DashboardView
- 列表：SubscriptionsView
- 抽屉：SubscriptionDrawer（含 DrawerProps 接口）
- Recharts import 移到这里
- 依赖：types.ts, constants.ts, utils.ts

### `App.tsx`

- 仅保留 App 组件：状态、effects、callbacks、render
- 依赖：types.ts, constants.ts, utils.ts, components.tsx

---

## 实施顺序

每步完成后 `npm run build` 确保不断裂：

1. 创建 `types.ts` — 提取所有类型定义，App.tsx 改为 import
2. 创建 `constants.ts` — 提取所有常量，App.tsx 改为 import
3. 创建 `utils.ts` — 提取所有工具函数，App.tsx 改为 import，删除旧 export 行
4. 创建 `components.tsx` — 提取所有组件，Recharts import 移过来，App.tsx 改为 import
5. 更新 `billing.test.ts` — import 路径改为 ./types, ./constants, ./utils
6. 更新文档 — CLAUDE.md（删除单文件规则）、ARCHITECTURE.md（目录结构 + 模块划分）

---

## 测试计划

| # | 验证项 | 方式 | 测试层级 | 结果 |
|---|--------|------|----------|------|
| 1 | 类型检查通过 | `npm run build` | tsc | ✅ |
| 2 | 单元测试通过（17 个用例） | `npx vitest run` | vitest | ✅ 17/17 |
| 3 | 功能不变（复用 PLAN-PHASE-3 的 10 个 E2E 场景） | Playwright 自动化 | Playwright | ✅ 10/10 |
