# FEATURE-001: billingHistory 实际扣款记录

## Context

当前年度支出是 `月度x12` 的纯数学换算，不反映真实花费。改为基于 `billingHistory` 扣款记录统计，让年度支出显示「今年实际花了多少钱」。

不兼容旧数据，清 localStorage 重新开始。

## 决策

- **月度支出**：保持数学换算（ongoing rate），代表「每月要花多少」
- **年度支出**：改为 billingHistory 在当年的实际记录之和
- **重订周期**：从今天开始新周期，不接原 startDate

---

## 改动文件

只改 `src/App.tsx`（单文件架构）

---

## 1. 数据结构

新增 `BillingRecord` 接口，`Subscription` 增加 `billingHistory` 字段：

```typescript
interface BillingRecord {
  date: string   // "YYYY-MM-DD"
  amount: number
}

interface Subscription {
  // ...所有现有字段不变...
  billingHistory: BillingRecord[]  // 新增
}
```

## 2. 新增工具函数

放在 Utility Functions 区域（现有函数附近）：

### `generateBillingDates(startDate, cycle, customDays?, endDate) → string[]`
从 startDate 到 endDate（含两端），按周期生成所有扣款日期。复用现有 `calculateNextBillDate` 的日期推进逻辑。

### `generateBillingHistory(startDate, cycle, customDays?, amount, endDate) → BillingRecord[]`
包装 `generateBillingDates`，每个日期配上 amount。

### `advanceBillingHistory(sub) → { billingHistory, nextBillDate }`
从最后一条记录往后推进到今天，生成缺失的扣款记录。cancelled 订阅不推进。

### `calcYearlyActualSpending(subscriptions) → { CNY: number, USD: number }`
遍历所有订阅（含 cancelled）的 billingHistory，汇总当年记录。

### `calcYearlyCategoryBreakdown(subscriptions, allCategories) → { CNY: [...], USD: [...] }`
按分类汇总当年 billingHistory，给年度环形图用。

## 3. 修改 CRUD 操作

| 操作 | billingHistory 处理 |
|------|-------------------|
| **创建** | 从 startDate 到今天回填所有历史扣款记录 |
| **编辑**（金额/周期/起始日变了） | 重新生成 billingHistory |
| **编辑**（其他字段） | 不动 billingHistory |
| **删除** | 整条数据删除 |
| **取消** | billingHistory 保留不变，不再生成新记录 |
| **重新激活** | 追加今天的扣款记录，nextBillDate 从今天算新周期 |

## 4. App 加载时自动推进

`useEffect` 跑一次，对所有 active 订阅调 `advanceBillingHistory`，补上 app 关闭期间的扣款记录。

## 5. Dashboard 统计改动

```
月度支出 → 不变，用 calcSpendingSummary().monthly（数学换算）
年度支出 → 改用 calcYearlyActualSpending()（实际扣款记录之和）
月度环形图 → 不变，用 calcCategoryBreakdown('monthly')
年度环形图 → 改用 calcYearlyCategoryBreakdown()
```

## 6. 保留的函数

- `convertToMonthly` — 月度卡片仍在用
- `convertToYearly` — 不再被 Dashboard 调用，但保留备用
- `calcSpendingSummary` — 月度部分仍在用
- `calcCategoryBreakdown` — 月度环形图仍在用
- `calculateNextBillDate` — 仍在用

## 7. 实施顺序

1. 加类型 `BillingRecord`，`Subscription` 加 `billingHistory` 字段
2. 加 `generateBillingDates` + `generateBillingHistory`
3. 加 `advanceBillingHistory`
4. 加 `calcYearlyActualSpending` + `calcYearlyCategoryBreakdown`
5. 改 `handleSave`（创建时回填 billingHistory）
6. 改 `handleUpdate`（编辑时重新生成）
7. 改 `handleToggleStatus`（取消不动 / 重订追加记录+新周期）
8. 加 app 加载自动推进 useEffect
9. 改 `DashboardView` 使用新的年度统计
10. 清 localStorage，手动测试

## 自动化测试（vitest）

新增 `src/billing.test.ts`，覆盖以下 case：

### generateBillingDates
- 月付从 2025-12-01 到 2026-02-27 → 生成 [12-01, 01-01, 02-01]
- 年付从 2025-01-15 到 2026-02-27 → 生成 [2025-01-15, 2026-01-15]
- startDate 在未来 → 返回空数组

### generateBillingHistory
- 包装 generateBillingDates，每条记录 amount 正确

### advanceBillingHistory
- active 订阅补齐缺失记录
- cancelled 订阅不推进

### calcYearlyActualSpending
- 月付 ¥48（startDate 去年12月）→ 当年 2 笔 = ¥96
- 年付 $119.88（startDate 去年1月15日）→ 当年 1 笔 = $119.88
- cancelled 订阅的历史记录仍计入年度

### calcYearlyCategoryBreakdown
- 按分类正确汇总当年金额

## Bug 修复记录

| # | 问题 | 原因 | 修复 | 验证 |
|---|------|------|------|------|
| 1 | 反复取消/重新激活同一订阅，年度支出不断增加 | `handleToggleStatus` 激活时无条件追加今天的扣款记录 | 加 `alreadyBilledToday` 检查，同日不重复追加 | ✅ E2E 反复 toggle 3 次后年度不变 |

## E2E 验证（Playwright） — 2026-02-27 全部通过

| # | 场景 | 预期 | 结果 |
|---|------|------|------|
| 1 | 创建月付 ¥48（startDate 2025-12-01）| 月度 ¥48，年度 ¥96（1月+2月两笔）| ✅ 月度 ¥48, 年度 ¥96 |
| 2 | 再创建年付 $119.88（startDate 2025-01-15）| 年度新增 $119.88 | ✅ 年度 $119.88 |
| 3 | 取消 Netflix → 查看年度支出 | 年度 CNY 不减少（仍含已扣金额）| ✅ 年度 CNY = 96（不变）|
| 4 | 重新激活 Netflix → 查看年度支出 | 年度 CNY 增加（追加今天扣款）| ✅ 年度 CNY = 144（+48）|
| 5 | 月度支出仅反映活跃订阅月费率 | 取消后月度减少，重新激活后恢复 | ✅ 取消后 undefined，激活后 ¥48 |
| 6 | 刷新页面后数据正确 | localStorage 恢复，金额不变 | ✅ 月度 CNY=48 USD=9.99，年度 CNY=144 USD=119.88 |
