# FEATURE-002: StatsCard 环形图增强 — 双币种 + 原地展开

## Context

合并暂缓 #1（点击放大）和 #2（双币种），改动集中在 `StatsCard` 组件。

---

## 改动文件

只改 `src/App.tsx`（单文件架构）

---

## 方案

### 收起状态（默认）

- 卡片右侧并排小环形图：有 CNY 数据画一个，有 USD 数据画一个（单币种时只画一个）
- 小环形图按**分类**着色（和现在一样）
- 点击小环形图区域触发展开

### 展开状态（原地展开）

- 卡片高度变大，推开下方内容（带 transition 动画）
- 上下堆叠布局，每个币种一个 section：
  - 币种标题分隔线（如 `── ¥ 人民币 ──`）
  - 大环形图，按**订阅 item** 着色（同分类的 item 相邻排列，每个 item 用该订阅的 color）
  - 图例列表：每条订阅名称 + 金额
- 只有一个币种时不显示分隔线
- 底部「收起」按钮，点击收回

### 数据来源

- 月度卡片：每个 active 订阅的 `convertToMonthly` 值
- 年度卡片：每个订阅当年 `billingHistory` 之和（含 cancelled）

### 不改的部分

- 金额数字显示逻辑不变
- 收起状态的分类色块图例不变

## 新增代码

### 类型

```typescript
interface ItemBreakdownItem {
  name: string
  value: number
  color: string
  category: string
}
```

### 工具函数

- `calcMonthlyItemBreakdown(subscriptions, allCategories)` — 按订阅 item 生成月度明细，同分类相邻排列
- `calcYearlyItemBreakdown(subscriptions, allCategories)` — 按订阅 item 生成年度明细（基于 billingHistory）

### 组件

- `MiniPie` — 小环形图（固定 96×96），按分类着色
- `ExpandedPieSection` — 展开区域单币种 section（大环形图 120×120 + 图例列表）
- `StatsCard` — 重写，增加 `expanded` 状态，收起时显示 MiniPie，展开时显示 ExpandedPieSection

## Bug 修复记录

| # | 问题 | 原因 | 修复 |
|---|------|------|------|
| 1 | 分类图例重复（双币种同分类） | chartData 合并后未去重 | 用 Set 去重 |
| 2 | CNY/USD 字号不一致 | USD 在双币种时用了 text-base | 统一为 text-2xl |
| 3 | crypto.randomUUID 报错 | 需要 secure context | 替换为 Date.now+Math.random |

## 测试

### Playwright 自动化

| # | 场景 | 预期 | 结果 |
|---|------|------|------|
| 1 | 只有 CNY 订阅 → 收起状态 | 1 个小环形图 | ✅ |
| 2 | 添加 USD 订阅 → 收起状态 | 2 个小环形图 | ✅ |
| 3 | 点击环形图区域 → 展开 | 卡片出现大环形图 + 图例列表 + 收起按钮 | ✅ |
| 4 | 展开后图例内容正确 | 图例包含订阅名称和金额 | ✅ |
| 5 | 双币种展开 → 两个 section | 两个币种标题 + 两个大环形图 | ✅ |
| 6 | 点击收起 → 恢复收起状态 | 大环形图/图例消失，小环形图恢复 | ✅ |

> Playwright 自动化 6/6 通过 — 2026-02-27

### 人工审查

| # | 审查点 | 结果 |
|---|--------|------|
| A | 展开/收起动画流畅自然 | ✅ |
| B | 展开后布局美观（间距、对齐、配色） | ✅ |
| C | 大环形图按订阅 item 着色，同分类相邻 | ✅ |
| D | 移动端展开后不溢出 | ✅ |
