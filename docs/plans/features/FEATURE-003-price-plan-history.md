# FEATURE-003: 套餐 / 价格变化历史

## Context

当前 `Subscription` 只保存一组 `amount / currency / cycle / startDate`。当同一服务发生真实套餐变化时，例如 Claude Code 从 `$125/month` 变为 `$20/month`，用户只能取消旧订阅并新建新订阅。

这种做法能保留历史金额，但会产生两个问题：

- 订阅列表里同一服务拆成多张卡片，当前状态不清晰。
- 扣款记录无法明确表达“这是同一服务的不同时期价格”。

目标是让一个服务保留为一个订阅条目，同时记录价格 / 周期变化历史。历史流水仍保留每次扣款发生时的真实金额。

---

## 决策

- **一个服务一张订阅卡片**：当前订阅列表只展示最新生效的计费信息。
- **历史记录不可被默认重写**：真实发生过的扣款金额应保留。
- **编辑计费信息时必须区分意图**：
  - 从某次扣款开始变更：用于真实套餐 / 价格变化。
  - 修正整个订阅历史：用于用户录错金额、币种、周期或开始日期。
- **先支持线性价格历史**：同一订阅下按生效日期排列多个 price segment，不做复杂分支。

---

## 第一版范围

### 做

- 为每个订阅增加 `priceHistory`，记录价格 / 币种 / 周期的生效历史。
- 兼容旧数据：无 `priceHistory` 的订阅自动迁移为单段价格历史。
- 编辑计费字段时，让用户选择“从下一次扣款开始生效”或“修正整个订阅历史”。
- 新生成的扣款记录保存当时的金额和币种。
- 历史记录页按扣款记录自身的金额和币种展示。

### 不做

- 不自动合并当前已经拆开的同名订阅，例如两个 Claude。
- 不做复杂的多订阅归并 UI。
- 不在记录页做价格阶段筛选或详情页。
- 不引入第三方状态管理、路由、日期库或虚拟列表库。

---

## 数据结构

新增 `PriceSegment`，并在 `Subscription` 上增加 `priceHistory`：

```typescript
interface PriceSegment {
  id: string
  effectiveDate: string // "YYYY-MM-DD"
  amount: number
  currency: Currency
  cycle: BillingCycle
  customCycleDays?: number
}

interface Subscription {
  // 当前字段保留，作为当前生效计费信息，减少 UI 改动
  amount: number
  currency: Currency
  cycle: BillingCycle
  customCycleDays?: number
  startDate: string

  // 新增：按 effectiveDate 升序排列
  priceHistory: PriceSegment[]
}
```

### 兼容旧数据

导入或启动时，如果订阅没有 `priceHistory`：

```typescript
priceHistory = [{
  id: generateId(),
  effectiveDate: startDate,
  amount,
  currency,
  cycle,
  customCycleDays,
}]
```

现有 `amount / currency / cycle / customCycleDays` 继续表示“当前生效价格”，避免第一版大面积改 UI。

---

## 扣款记录模型

当前 `BillingRecord` 只有：

```typescript
interface BillingRecord {
  date: string
  amount: number
}
```

建议扩展为：

```typescript
interface BillingRecord {
  date: string
  amount: number
  currency?: Currency       // 兼容旧记录；新记录必填
  priceSegmentId?: string
}
```

### 兼容规则

- 旧记录没有 `currency` 时，继续使用订阅当前 `currency`。
- 新生成记录写入当时生效的 `currency` 和 `priceSegmentId`。
- 历史页金额优先用 record 自身的 `amount / currency`，避免订阅当前价格变化后污染旧记录。

---

## 计费生成逻辑

新增工具函数：

### `ensurePriceHistory(sub) -> Subscription`

兼容迁移函数。若订阅没有 `priceHistory`，用当前字段生成单段价格历史。

### `getActivePriceSegment(sub, date) -> PriceSegment`

给定日期，返回该日期生效的 price segment。

规则：

- 取 `effectiveDate <= date` 的最后一段。
- 如果 date 早于第一段，则使用第一段。
- `priceHistory` 进入函数前应已按 `effectiveDate` 升序归一化。

### `generateBillingHistoryFromPriceHistory(sub, endDate) -> BillingRecord[]`

从 `startDate` 到 `endDate` 生成扣款记录：

- 每个周期日期根据当时生效的 segment 判断金额、币种、周期。
- 如果中途价格变化，变化日之后按新 segment 生成。
- 已存在的 billingHistory 不默认覆盖，除非用户选择“修正整个历史”。

### `syncActiveSubscriptionBilling(sub) -> Subscription`

补齐 active 订阅从最后一条记录之后到今天缺失的记录，使用对应日期的 price segment。

同时继续负责把 `nextBillDate` 推进到未来日期。

### `applyPriceChangeFromDate(sub, change) -> Subscription`

用于真实价格变化：

- 追加新的 price segment。
- 保留已有 billingHistory。
- 更新订阅当前计费字段。
- 重算 nextBillDate。

### `rewriteSubscriptionBilling(sub, formData) -> Subscription`

用于修正录错信息：

- 用表单值重建单段 priceHistory。
- 从 startDate 到今天重算 billingHistory。
- 重算 nextBillDate。

---

## 编辑交互

当用户在编辑抽屉里改动以下字段时：

- 金额
- 币种
- 计费周期
- 自定义周期天数
- 起始日期

保存时弹出确认选择：

```text
计费信息发生变化

你想如何处理这次修改？

[从下一次扣款开始生效]
保留已有扣款记录，新价格从指定日期开始。

[修正整个订阅历史]
用于录错信息，会按新规则重算历史扣款。
```

### 从下一次扣款开始生效

- 新增一个 `PriceSegment`。
- 默认 `effectiveDate = nextBillDate`。
- 第一版先不额外加日期选择器；如需调整生效日，用户可先修改起始日期或后续再加高级入口。
- 更新订阅当前 `amount / currency / cycle / customCycleDays`。
- 不改已有 `billingHistory`。
- 重新计算 `nextBillDate`。

### 修正整个订阅历史

- 用当前表单值替换第一段 `PriceSegment`。
- 重算整个 `billingHistory`。
- 重新计算 `nextBillDate`。

### 只改名称、分类、颜色、备注

- 不弹确认。
- 不改 `priceHistory`。
- 不改 `billingHistory`。

---

## Claude Code 示例

目标数据应类似：

```text
Claude
- 2026-01-20 起：$125 / 月
- 2026-05-20 起：$20 / 月
```

历史记录：

```text
2026-01-20  Claude  $125
2026-02-20  Claude  $125
2026-03-20  Claude  $125
2026-04-20  Claude  $125
2026-05-20  Claude  $20
```

订阅列表：

```text
Claude  $20 / 月  续费日 06-20
```

---

## 记录页影响

- 记录页继续以 `billingHistory` 为唯一数据源。
- 每条记录显示发生时金额和币种。
- 如果同一订阅存在多个 price segment，不需要拆成多个服务。
- 后续可在记录详情里显示“价格阶段：$125/月”之类的辅助信息，第一版不做。

---

## 导入 / 合并策略

对于当前已经拆成多个条目的同名服务，先不自动合并，避免误伤：

- 同名不一定代表同一服务。
- 金额变化也可能是用户真的开了两个并行订阅。

第一版提供手动能力即可：

1. 用户保留当前 active 条目。
2. 用户可在后续“合并到现有订阅”交互中选择旧条目。
3. 系统把旧条目的 billingHistory 合并到 active 条目，并按金额变化生成 price segment。
4. 旧条目标记为已合并或删除。

手动合并属于第二阶段，FEATURE-003 第一版先实现价格历史模型和编辑交互。

---

## 实施切片

### Slice 1：数据模型与迁移

- 增加 `PriceSegment` 类型。
- 扩展 `BillingRecord` 和 `Subscription`。
- 新增 `ensurePriceHistory`。
- 在启动和导入时归一化旧数据。
- Vitest 覆盖旧数据迁移。

### Slice 2：价格历史计费逻辑

- 实现 `getActivePriceSegment`。
- 改造历史生成 / 补齐逻辑，使其使用 price segment。
- 保证 `nextBillDate` 仍按当前计费字段推进。
- Vitest 覆盖 Claude `$125 -> $20` 场景。

### Slice 3：编辑交互

- 抽屉保存时检测计费字段变化。
- 展示选择对话框。
- 分别接入“从下一次扣款开始生效”和“修正整个订阅历史”。
- 用内嵌浏览器验证编辑流程。

### Slice 4：记录页与统计适配

- 历史页优先读取 record 自身 currency。
- 年度统计按 record 自身 currency 汇总。
- 确认旧数据、价格变化数据、取消订阅都能正确显示。

---

## 改动文件

预计改动：

- `src/types.ts`
- `src/utils.ts`
- `src/App.tsx`
- `src/components/drawer.tsx`
- `src/components/history.tsx`
- `src/billing.test.ts`
- `docs/ARCHITECTURE.md`
- `docs/plans/PLAN-PHASE-5.md`

---

## 实施顺序

1. Slice 1：类型扩展 + 旧数据迁移。
2. Slice 2：按 priceHistory 生成 / 补齐扣款记录。
3. Slice 3：编辑抽屉保存时加入处理方式选择。
4. Slice 4：历史页和统计读取 record 自身币种。
5. 文档同步：更新架构和 Phase 5 状态。
6. 验证：build + vitest + 内嵌浏览器；临时 Playwright 脚本按需。

---

## 测试策略

### Vitest

覆盖以下 case：

- 旧订阅无 `priceHistory` 时迁移为单段价格历史。
- 给定日期能找到正确 `PriceSegment`。
- Claude `$125/month -> $20/month` 生成正确历史金额。
- 修正整个历史会重算所有记录。
- 从下一次生效不会改写已有记录。
- active 订阅补齐缺失记录时使用当日生效价格。
- cancelled 订阅不继续补齐未来记录。
- 年度统计按 record 自身 currency 汇总。

### 内嵌浏览器验证

- 编辑 Claude 金额，选择“从下一次扣款开始生效”，订阅列表只显示一条 Claude。
- 记录页仍显示旧月份 `$125`、新月份 `$20`。
- 编辑录错金额，选择“修正整个订阅历史”，历史金额被重算。
- 导入旧数据后页面不崩溃，历史页仍可打开。

### 临时 Playwright 脚本

默认不写。只有在需要可重复导入固定 JSON、清理 localStorage、或做多步自动断言时再写临时 `.mjs` 脚本，跑完删除。

---

## 验收标准

- 旧数据打开后不崩溃，并自动拥有 `priceHistory`。
- 价格变化不会覆盖已有扣款记录。
- 修正历史会按新规则重算已有记录。
- 记录页中同一订阅可显示不同月份不同金额。
- 年度支出统计与记录页金额一致。
- `npm run build` 通过。
- `npx vitest run` 通过。
- 内嵌浏览器验证关键流程通过。

---

## 后续阶段

- 手动合并同名订阅，例如把旧 Claude 合并到当前 Claude。
- 记录详情展示 price segment 信息。
- 记录页筛选：年份、服务、币种、分类。
- 当历史记录数量很大时，再评估是否需要虚拟列表。
