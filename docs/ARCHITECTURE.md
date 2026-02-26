# SubTracker 架构设计文档

> 版本：v1.0 | 日期：2026-02-26 | 状态：架构评审

---

## 一、技术栈选型

| 项目 | 选择 | 理由 |
|------|------|------|
| 语言 | TypeScript | 类型安全，枚举字段（currency / cycle / status）防拼写错误 |
| 框架 | React（单 .tsx 文件） | 组件化开发，状态管理方便 |
| 样式 | Tailwind CSS v4 | 快速开发，CSS-first 配置，暗色模式内置支持 |
| 图表 | Recharts | 轻量，React 生态，支持环形图 |
| ID 生成 | crypto.randomUUID() | 浏览器原生，无需额外依赖 |
| 数据存储 | localStorage | 纯前端，零依赖 |
| 构建工具 | Vite | 快速 HMR，开箱支持 React + TS + Tailwind |
| 日期处理 | 原生 Date API | 计算简单，不需要 dayjs/moment |

---

## 二、项目目录结构

```
sub-tracker/
├── CLAUDE.md
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── SETUP.md
│   ├── RETRO.md
│   └── plans/
│       ├── PLAN.md
│       └── ...
├── PROJECT_CONTEXT.md
├── CHANGELOG.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html              # 入口 HTML
└── src/
    ├── index.css            # Tailwind CSS 入口（@import "tailwindcss"）
    └── App.tsx              # 单文件 React 应用
```

> 注：v1 采用单 .tsx 文件方案，所有组件、逻辑、样式集中在 `src/App.tsx` 中。后续如需拆分，再调整目录结构。
>
> Tailwind CSS v4 使用 CSS-first 配置，通过 `@import "tailwindcss"` 引入，无需 `tailwind.config.js` 和 `postcss.config.js`。通过 Vite 插件 `@tailwindcss/vite` 集成。

---

## 三、核心数据模型

### 3.1 订阅记录（Subscription）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string (UUID) | 自动 | 唯一标识，自动生成 |
| `name` | string | 是 | 订阅服务名称 |
| `amount` | number | 是 | 金额，精确到分 |
| `currency` | enum | 是 | `CNY` 或 `USD` |
| `cycle` | enum | 是 | `monthly` / `quarterly` / `yearly` / `custom` |
| `customCycleDays` | number | 条件 | 当 cycle 为 custom 时必填，自定义天数 |
| `startDate` | string (ISO) | 是 | 首次订阅日期 |
| `nextBillDate` | string (ISO) | 自动 | 下次扣款日，根据 startDate + cycle 自动计算 |
| `category` | string | 是 | 分类名称 |
| `color` | string (HEX) | 自动 | 卡片颜色，按品牌色自动分配，用户可修改 |
| `status` | enum | 自动 | `active` / `cancelled` |
| `cancelledDate` | string (ISO) | 条件 | 取消日期，标记取消时自动记录 |
| `note` | string | 否 | 备注信息 |
| `createdAt` | string (ISO) | 自动 | 创建时间 |
| `updatedAt` | string (ISO) | 自动 | 最后修改时间 |

### 3.2 分类（Category）

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 分类名称，唯一标识 |
| `color` | string (HEX) | 分类颜色 |

预设分类（内置，不存入 localStorage）：

| 分类名称 | 默认颜色 |
|---------|---------|
| 影音娱乐 | #FF6B8A（粉红） |
| 工具软件 | #5B9EF4（蓝色） |
| 云存储 | #47D4A0（绿色） |
| 会员服务 | #FFB74D（橙色） |
| 其他 | #A78BFA（紫色） |

`subtracker_categories` 仅存储用户自定义的分类。运行时将预设分类与自定义分类合并使用。新分类自动从预设色板中按顺序分配颜色，色板循环复用。

---

## 四、模块划分

### 4.1 组件结构

```
App
├── Header                  # 顶部栏（应用名称 + 设置入口）
├── TabBar                  # Tab 切换（总览 | 订阅列表）
├── DashboardView           # 总览页
│   ├── StatsCard           # 月度/年度统计卡片（含环形图）
│   └── UpcomingList        # 即将扣款列表
├── SubscriptionsView       # 订阅列表页
│   ├── StatusFilter        # 生效中/已取消 筛选
│   └── SubscriptionCard    # 单条订阅卡片
├── SubscriptionDrawer      # 添加/编辑底部抽屉
├── SettingsPanel           # 设置面板
└── FAB                     # 浮动添加按钮
```

### 4.2 核心逻辑模块

| 模块 | 职责 | 依赖 |
|------|------|------|
| 数据持久化 | localStorage 读写，导入导出 | 无 |
| 日期计算 | nextBillDate 推算，天数差计算 | 无 |
| 品牌色匹配 | 名称模糊匹配品牌色映射表 | 无 |
| 支出统计 | 月度/年度折算，分类汇总 | 日期计算 |
| 主题管理 | 主题切换，系统主题监听 | 数据持久化 |

依赖关系：

```
支出统计 → 日期计算
主题管理 → 数据持久化
品牌色匹配（独立）
```

---

## 五、关键逻辑实现

### 5.1 状态管理

使用 React useState + useReducer 管理全局状态，不引入额外状态库。

核心状态：

- `subscriptions`：订阅列表
- `theme`：主题偏好
- `activeTab`：当前 Tab（dashboard / subscriptions）
- `editingId`：当前编辑的订阅 ID（null 表示新建）
- `showSettings`：设置面板是否打开

### 5.2 数据持久化

**localStorage Key 设计：**

| Key | 内容 |
|-----|------|
| `subtracker_subscriptions` | 订阅记录数组（JSON） |
| `subtracker_categories` | 用户自定义分类（JSON） |
| `subtracker_theme` | 主题偏好：`auto` / `light` / `dark` |

**读写策略：**

- 页面加载时从 localStorage 读取数据初始化状态
- 每次数据变更后同步写入 localStorage
- 使用 useEffect 监听数据变化自动持久化

### 5.3 下次扣款日计算

- 根据 `startDate` 和 `cycle` 向前推算最近一个未来日期
- 例：startDate 为 2025-01-15，cycle 为 monthly，当前日期 2026-02-24 → nextBillDate 为 2026-03-15
- 当订阅标记为 `cancelled` 时，`nextBillDate` 置空

### 5.4 支出折算

折算公式见 PRD 3.4 业务规则，此处补充实现要点：

- 折算函数接收 `(amount, cycle, customCycleDays?)` 返回 `{ monthly, yearly }`
- 按 `currency` 分组后分别求和，返回 `{ CNY: { monthly, yearly }, USD: { monthly, yearly } }`
- 分类占比基于月度金额计算，按 `currency` 分开生成独立的饼图数据数组
- 边界处理：`customCycleDays` 为 0 或负数时视为无效，不参与统计

### 5.5 品牌色自动匹配

订阅卡片的颜色逻辑：

1. 用户输入订阅名称时，与内置品牌色映射表匹配（模糊匹配）
2. 匹配成功 → 自动填充品牌色（用户可修改）
3. 匹配失败 → 使用分类的默认颜色
4. 用户随时可手动选择/修改颜色

**内置品牌色映射表（v1 初始）：**

| 关键词 | 颜色 |
|-------|------|
| Netflix | #E50914 |
| Spotify | #1DB954 |
| iCloud | #3693F3 |
| Apple | #555555 |
| YouTube | #FF0000 |
| ChatGPT / OpenAI | #10A37F |
| Claude | #D97757 |
| Notion | #000000 |
| GitHub | #24292E |
| Figma | #A259FF |
| Adobe | #FF0000 |
| Bilibili / B站 | #FB7299 |
| 爱奇艺 | #00BE06 |
| 腾讯视频 | #FF6A1E |
| 优酷 | #1EBFFF |
| 网易云音乐 | #C20C0C |
| QQ音乐 | #31C27C |
| 百度网盘 | #06A7FF |
| WPS | #1B6DF1 |
| 微信读书 | #2A8745 |
| 京东 | #E4393C |

此表可后续扩展，不影响核心逻辑。

### 5.6 主题切换实现

- 存储用户选择（`auto` / `light` / `dark`）到 localStorage
- `auto` 模式通过 `window.matchMedia('(prefers-color-scheme: dark)')` 监听系统主题
- 在根元素上切换 `dark` class，利用 Tailwind 的 `dark:` variant 控制样式
- Tailwind v4 中通过 `@custom-variant dark (&:where(.dark, .dark *))` 定义自定义暗色 variant

### 5.7 导入导出格式

导出为单个 JSON 文件，结构如下：

```json
{
  "version": "1.0",
  "exportedAt": "2026-02-24T12:00:00Z",
  "subscriptions": [ ... ],
  "categories": [ ... ]
}
```

导入行为：**覆盖模式**。导入时提示用户"将替换当前所有数据，是否继续？"，确认后清空并写入新数据。

---

## 六、技术约束与决策记录

| 决策 | 理由 |
|------|------|
| TypeScript 而非 JavaScript | 数据模型有明确枚举，TS 类型安全收益大，Vite 零配置支持 |
| 单 .tsx 文件 | v1 功能简单，单文件降低复杂度，避免过早拆分 |
| Tailwind v4 而非 v3 | CSS-first 配置，免去 tailwind.config.js 和 postcss.config.js |
| 不引入路由库 | 只有 2 个 Tab 视图，用状态切换即可 |
| 不引入状态管理库 | useState + useReducer 足够，不需要 Redux / Zustand |
| 不引入日期库 | 日期计算逻辑简单，原生 API 可覆盖 |
| localStorage 而非 IndexedDB | 数据量小（订阅数通常 < 100），localStorage 足够 |
| CNY / USD 不做汇率换算 | v1 分开显示，避免引入汇率 API 依赖 |
