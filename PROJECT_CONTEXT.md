# SubTracker 项目状态

## 当前状态

- **阶段**: Phase 4 验收完成，v1 全部功能开发完毕
- **进度**: 100%
- **待办**: 无（可进入后续迭代方向）

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

### Phase 3.5 — App.tsx 拆分重构（2026-02-27 验收通过）

- 1380 行 App.tsx 拆为 5 个模块（types / constants / utils / components / App）
- 依赖方向单向，无循环依赖
- 三层测试验证：tsc ✅ / vitest 17/17 ✅ / Playwright 10/10 ✅

### Phase 4 — 设置 + 数据管理 + 收尾（2026-02-27 验收通过）

- 设置面板：主题切换 UI（三档 Segment）、导出/导入、关于信息
- JSON 导出/导入：覆盖模式 + 格式校验 + 确认对话框
- 空状态引导：Dashboard 和订阅列表
- 删除临时主题按钮
- 三层测试验证：tsc ✅ / vitest 22/22 ✅ / Playwright 11/11 ✅

## 已知问题 / 技术债

- Subscription 新增 billingHistory 字段后不兼容旧数据（Phase 3 起需清 localStorage）

## 关键决策日志

| 日期 | 决策 | 理由 |
|------|------|------|
| 2026-02-26 | JS → TypeScript | 数据模型有明确枚举，类型安全收益大 |
| 2026-02-26 | Tailwind v3 → v4 | CSS-first 配置，减少配置文件 |
| 2026-02-27 | 年度支出改为 billingHistory 实际记录 | 月度×12 不反映真实花费 |
| 2026-02-27 | crypto.randomUUID → Date.now+Math.random | 兼容非 secure context 环境 |
| 2026-02-27 | 引入 vitest + Playwright | 建立自动化测试闭环 |

## 下一步

v1 全部功能已完成。后续可参考 PRD 2.3 迭代方向：
- 到期前浏览器通知 / PWA 推送
- 汇率 API 接入
- 常用订阅服务预设模板
- PWA 安装支持
- 数据同步方案
