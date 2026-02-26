# Changelog

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
