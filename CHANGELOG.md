# Changelog

## Phase 4 — 2026-02-27

### 完成内容

- 设置面板（SettingsPanel）：齿轮图标点开下拉面板，含主题切换、数据管理、关于信息
- 主题切换 UI：三档 Segment 按钮（自动/浅色/深色），替换临时主题按钮
- JSON 导出：一键下载 `subtracker-export-YYYY-MM-DD.json`
- JSON 导入：文件选择 + 格式校验 + 确认覆盖对话框，非法文件给出错误提示
- 空状态引导：Dashboard 和订阅列表无数据时显示引导文案
- 新增 ExportData 类型定义
- ConfirmDialog 支持自定义确认按钮文案

### 基础设施

- vitest 用例增至 22 个（新增 buildExportData / parseImportData 5 个用例）
- Playwright E2E 11 个场景全部通过

### 破坏性变更

无

### 遗留问题

无

---

## Phase 3.5 — 2026-02-27

### 完成内容

- App.tsx 拆分重构：1380 行单文件拆为 5 个模块
  - `types.ts` — 所有类型定义
  - `constants.ts` — 所有常量
  - `utils.ts` — 所有工具函数
  - `components.tsx` — 所有 UI 组件
  - `App.tsx` — 状态 + handlers + render
- 依赖方向严格单向，无循环依赖
- 更新 billing.test.ts import 路径

### 破坏性变更

无（纯重构，零功能变更）

### 遗留问题

无

---

## Phase 3 — 2026-02-27

### 完成内容

- 月度/年度支出统计卡片（CNY/USD 分开显示）
- 分类占比环形图（Recharts 甜甜圈图，中心显示总金额）
- 即将扣款列表（30 天内优先显示，可展开全部）
- 移动端上下堆叠 / 桌面端并排响应式布局
- 引入 Recharts 图表库

### 功能补丁

- **FEATURE-001**: billingHistory 实际扣款记录 — 年度支出改为基于真实扣款记录统计
  - 新增 BillingRecord 数据结构，Subscription 增加 billingHistory 字段
  - 创建订阅时从 startDate 回填历史扣款记录
  - App 加载时自动推进缺失的扣款记录
  - 取消订阅保留历史，重新激活追加当日记录
- **FEATURE-002**: StatsCard 环形图增强 — 双币种小环形图 + 原地展开按订阅 item 着色

### Bug 修复

- 反复取消/重新激活同日不重复追加扣款记录
- 分类图例去重（双币种同分类时不重复显示）
- CNY/USD 金额字号统一为 text-2xl
- crypto.randomUUID 替换为兼容性更好的 ID 生成方式

### 基础设施

- 引入 vitest 单元测试（17 个用例覆盖 billing 工具函数）
- 引入 Playwright 浏览器级自动化测试
- 建立三层测试闭环（tsc → vitest → Playwright）

### 破坏性变更

- Subscription 新增 billingHistory 字段，不兼容旧 localStorage 数据（需清除重建）

### 遗留问题

无

---

## Phase 2 — 2026-02-27

### 完成内容

- 品牌色映射表 + 模糊匹配（21 个品牌关键词）
- 下次扣款日计算（monthly/quarterly/yearly/custom）
- 分类管理（5 个预设分类 + 自定义分类 + 颜色自动分配）
- 底部抽屉表单（7 个字段 + 品牌色实时预览 + 扣款日实时计算）
- 订阅列表页（卡片渲染、生效中/已取消筛选、灰度化）
- CRUD 操作（新增/编辑/删除确认/取消/重新激活）
- localStorage 持久化

### Bug 修复

- 名称输入框右侧添加色块预览，展示品牌色匹配结果
- 抽屉打开时隐藏 FAB，避免与删除按钮重叠

### 破坏性变更

无

### 遗留问题

无

---

## Phase 1 — 2026-02-26

### 完成内容

- 初始化 Vite + React + TypeScript + Tailwind CSS v4 项目
- 定义核心 TypeScript 类型（Subscription, Category, Currency 等）
- 实现 localStorage 工具函数（带类型安全和异常容错）
- 实现主题管理（auto/light/dark 三档切换，系统主题监听）
- 搭建应用外壳（Header, TabBar, FAB, 设置面板占位）
- 应用双色彩体系（CSS 变量，暗色/浅色模式）

### 破坏性变更

无（首次开发）

### 遗留问题

无
