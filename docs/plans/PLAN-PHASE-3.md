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

## 测试计划

手动验证：

- [ ] 无订阅时 Dashboard 显示空状态（统计卡片和即将扣款列表均有提示）
- [ ] 添加一条月付 ¥48 的订阅 → 月度卡片显示 ¥48.00，年度显示 ¥576.00
- [ ] 添加一条年付 $119.88 的订阅 → 月度卡片新增 $9.99，年度新增 $119.88
- [ ] 环形图按分类着色，中心显示总金额
- [ ] 只有 CNY 时卡片只显示 ¥ 行，添加 USD 订阅后出现 $ 行
- [ ] 即将扣款列表按日期升序，天数标签正确
- [ ] 超 30 天的项默认折叠，点击"查看全部"展开
- [ ] 取消一条订阅后，Dashboard 金额相应减少，该订阅从即将扣款列表消失
- [ ] 移动端上下堆叠布局，桌面端卡片并排
- [ ] 刷新页面后 Dashboard 数据正确（从 localStorage 恢复）
