# Phase 3：总览仪表盘

**目标：** 实现 Dashboard 页面，用户打开即可看到支出统计和即将扣款信息。

---

## 任务清单

### 3.1 安装 Recharts

- `npm install recharts`
- 唯一新增依赖，理由：PRD 和架构文档要求环形图，Recharts 是 React 生态轻量图表库

**验收标准：**
- 依赖安装成功，`npm run build` 不报错

### 3.2 支出计算工具函数

在 `src/App.tsx` 的 Utility Functions 区域添加：

- `convertToMonthly(amount, cycle, customDays?)` — 将任意周期金额折算为月度
  - monthly → 原额；quarterly → ÷3；yearly → ÷12；custom → amount ÷ (days / 30)
- `convertToYearly(amount, cycle, customDays?)` — 折算为年度
  - monthly → ×12；quarterly → ×4；yearly → 原额；custom → amount × (365 / days)
- `calcSpendingSummary(subscriptions)` — 返回 `{ CNY: { monthly, yearly }, USD: { monthly, yearly } }`
  - 只统计 active 订阅，按 currency 分组求和
- `calcCategoryBreakdown(subscriptions, period)` — 返回 `{ CNY: Array<{ name, value, color }>, USD: [...] }`
  - 按分类分组，求对应 period 金额之和，附带分类颜色

**验收标准：**
- 月付 ¥48 → 月度 48，年度 576
- 年付 $119.88 → 月度 9.99，年度 119.88
- 自定义 90 天 ¥100 → 月度 ≈33.33，年度 ≈405.56
- 只统计 active 订阅，cancelled 不参与计算

### 3.3 StatsCard 组件

月度/年度统计卡片，各含一个 Recharts 环形图。

- Props：title、amountCNY、amountUSD、chartData（分类占比数组）
- 金额显示：有数据的币种才显示（¥ 在上，$ 在下）
- 环形图：PieChart + innerRadius 实现甜甜圈，中心显示总金额
- 环形按分类着色（每个 Cell 使用分类颜色）
- 无数据时显示空状态文案

**验收标准：**
- 卡片标题正确（月度支出 / 年度支出）
- 只有 CNY 数据时只显示 ¥，只有 USD 时只显示 $，都有时分两行
- 环形图按分类着色，中心显示总金额
- 无订阅时显示空状态

### 3.4 UpcomingList 组件

即将扣款列表。

- 数据源：active 订阅按 nextBillDate 升序排列
- 天数标签：`daysDiff = ceil((nextBillDate - today) / 86400000)`
  - 0 → "今天"；负数 → "已过期"；正数 → "X 天后"
- 每项：左侧品牌色条 + 名称 + 金额 + 天数标签
- 默认只显示 30 天内到期的项，超出折叠
- "查看全部" 按钮展开剩余项
- 无生效中订阅时显示空状态

**验收标准：**
- 列表按 nextBillDate 升序排列
- 天数标签显示正确（"今天"、"3 天后"、"已过期"）
- 超 30 天的项默认不显示，点击"查看全部"展开
- 卡片左侧品牌色条正确

### 3.5 DashboardView 组件 + 集成

- 组装 StatsCard × 2（月度 + 年度）+ UpcomingList
- 移动端：上下堆叠（月度 → 年度 → 即将扣款）
- 桌面端（md: breakpoint）：月度/年度左右并排，即将扣款在下方
- 替换 App.tsx 中 Dashboard 占位内容
- 用 useMemo 缓存统计计算结果

**验收标准：**
- 移动端（375px）三块上下堆叠，无水平溢出
- 桌面端（960px+）月度/年度卡片并排
- 数据变化后（新增/编辑/删除订阅）Dashboard 实时更新

---

## 测试计划（Playwright 自动化）

> FEATURE-001 后年度支出改为 billingHistory 实际记录之和，以下预期值已更新。

| # | 场景 | 预期 | 结果 |
|---|------|------|------|
| 1 | 无订阅时 Dashboard 空状态 | 月度/年度卡片显示"暂无数据"，即将扣款显示"暂无生效中的订阅" | ✅ |
| 2 | 添加月付 ¥48（startDate 2025-12-01）| 月度 ¥48，年度 = 当年 billingHistory 之和 | ✅ 月度 ¥48, 年度 ¥96 |
| 3 | 再添加年付 $119.88（startDate 2025-01-15）| 月度新增 $9.99，年度新增 $119.88 | ✅ |
| 4 | 环形图按分类着色，中心显示总金额 | SVG Cell fill 对应分类颜色，中心 text 有金额 | ✅ |
| 5 | 单币种/双币种显示 | 只有 CNY 时只显示 ¥，添加 USD 后出现 $ | ✅ |
| 6 | 即将扣款按日期升序，天数标签正确 | 列表有序，标签格式正确 | ✅ |
| 7 | 超 30 天的项默认折叠，点击"查看全部"展开 | 默认不显示 >30天项，点击后显示 | ✅ expandedExtra=2 |
| 8 | 取消订阅后月度减少，年度不减少（历史保留）| 月度 CNY 减少，年度 CNY 不变 | ✅ 月度 48→0.83, 年度 96→96 |
| 9 | 移动端上下堆叠，桌面端卡片并排 | 375px 堆叠，960px 并排 | ✅ 335px / 452px+452px |
| 10 | 刷新页面后数据正确 | localStorage 恢复，金额不变 | ✅ |

> Playwright 自动化测试通过 — 2026-02-27，11/11 PASS

### 讨论

紧急程度 （优先讨论）⭐⭐⭐
1. 年度显示的直接是月度x12了，不合理，应该显示到今天为止，实际订阅花费的钱
2. 对于某条订阅，如果我在一月份订阅、二月份取消订阅、三月份又重新订阅，那么你的计算方式是怎么样的？理想的方式是按照我实际订阅的月份去计费，而不是简单的做乘法，但这么做是不是得通盘的重新设计数据结构之类的？

紧急程度（暂缓） ⭐
1. 我希望环形图支持点击放大，在没有点开的时候是按照分类着色，点开之后按照订阅item去着色（同一个订阅item聚合到一块区域、同一类订阅item也聚合到一块区域）
2. 当前只有人名币有环形图，我觉得美元也来个环形图吧（如果有美元订阅的话）），然后也允许单独的点击放大