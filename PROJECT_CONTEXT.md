# SubTracker 项目状态

## 当前状态

- **阶段**: Phase 3 验收完成，准备进入 Phase 4
- **进度**: ~75%
- **待办**: Phase 3 回顾 → 编写 PLAN-PHASE-4.md → 开发 Phase 4

## 已完成阶段

### Phase 1 — 项目搭建 + 基础骨架（2026-02-26）

- Vite + React + TypeScript + Tailwind CSS v4 项目初始化
- 核心类型定义、localStorage 工具、主题管理
- 应用外壳（Header / TabBar / FAB）+ 双色彩体系

### Phase 2 — 订阅管理 CRUD（2026-02-27 验收通过）

- 品牌色映射表 + 模糊匹配（21 个品牌关键词）
- 下次扣款日计算（monthly/quarterly/yearly/custom）
- 分类管理（5 个预设 + 自定义分类 + 颜色自动分配）
- 底部抽屉表单（7 个字段 + 品牌色实时预览 + 扣款日实时计算）
- 订阅列表页（卡片渲染、生效中/已取消筛选、灰度化）
- CRUD 操作（新增/编辑/删除确认/取消/重新激活）
- localStorage 持久化
- Bug 修复：品牌色预览色块、FAB 与抽屉重叠

### Phase 3 — 总览仪表盘（2026-02-27 验收通过）

- 月度/年度支出统计卡片（Recharts 环形图，CNY/USD 分开显示）
- 即将扣款列表（30 天内优先，可展开全部）
- FEATURE-001: billingHistory 实际扣款记录（年度支出基于真实扣款）
- FEATURE-002: 环形图增强（双币种小环形图 + 原地展开按订阅 item 着色）
- 三层测试闭环：tsc + vitest + Playwright
- 响应式布局：移动端堆叠 / 桌面端并排

## 已知问题 / 技术债

- Subscription 新增 billingHistory 字段后不兼容旧数据（Phase 3 起需清 localStorage）
- 单文件 App.tsx 已超 1200 行，Phase 4 后可评估拆分

## 关键决策日志

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-02-26 | JS → TypeScript | 数据模型有明确枚举，类型安全收益大 |
| 2026-02-26 | Tailwind v3 → v4 | CSS-first 配置，减少配置文件 |
| 2026-02-27 | 年度支出改为 billingHistory 实际记录 | 月度×12 不反映真实花费 |
| 2026-02-27 | crypto.randomUUID → Date.now+Math.random | 兼容非 secure context 环境 |
| 2026-02-27 | 引入 vitest + Playwright | 建立自动化测试闭环 |

## 下一步

1. Phase 3 回顾（追加到 docs/RETRO.md）
2. 编写 PLAN-PHASE-4.md（设置面板、导入导出、空状态、响应式适配）
3. 开发 Phase 4
