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
  currency?: Currency
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

### `getActivePriceSegment(sub, date) -> PriceSegment`

给定日期，返回该日期生效的 price segment。

### `generateBillingHistoryFromPriceHistory(sub, endDate) -> BillingRecord[]`

从 `startDate` 到 `endDate` 生成扣款记录：

- 每个周期日期根据当时生效的 segment 判断金额、币种、周期。
- 如果中途价格变化，变化日之后按新 segment 生成。
- 已存在的 billingHistory 不默认覆盖，除非用户选择“修正整个历史”。

### `appendMissingBillingRecords(sub, today) -> Subscription`

补齐 active 订阅从最后一条记录之后到今天缺失的记录，使用对应日期的 price segment。

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
- 默认 `effectiveDate = nextBillDate`，允许用户改为具体日期。
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

1. 类型扩展：新增 `PriceSegment`，扩展 `BillingRecord` 和 `Subscription`。
2. 兼容迁移：启动 / 导入时为旧数据补 `priceHistory`。
3. 工具函数：按 `priceHistory` 生成和补齐扣款记录。
4. 编辑交互：计费字段变化时弹出处理方式选择。
5. App handler：分别处理“从下一次生效”和“修正整个历史”。
6. 历史页：读取 record 自身 currency，保证旧金额不被当前订阅污染。
7. 文档同步：更新架构和 Phase 5 状态。
8. 验证：build + vitest + Playwright 浏览器操作。

---

## 自动化测试（vitest）

覆盖以下 case：

- 旧订阅无 `priceHistory` 时迁移为单段价格历史。
- 给定日期能找到正确 `PriceSegment`。
- Claude `$125/month -> $20/month` 生成正确历史金额。
- 修正整个历史会重算所有记录。
- 从下一次生效不会改写已有记录。
- active 订阅补齐缺失记录时使用当日生效价格。
- cancelled 订阅不继续补齐未来记录。

## Playwright 验证

- 编辑 Claude 金额，选择“从下一次扣款开始生效”，订阅列表只显示一条 Claude。
- 记录页仍显示旧月份 `$125`、新月份 `$20`。
- 编辑录错金额，选择“修正整个订阅历史”，历史金额被重算。
- 导入旧数据后页面不崩溃，历史页仍可打开。
