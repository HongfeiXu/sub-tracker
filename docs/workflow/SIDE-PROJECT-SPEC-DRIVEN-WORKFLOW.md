# Spec 驱动开发工作流

> Side Project 开发流程指南，基于 claude.ai + Claude Code CLI 的协作模式。

---

## 总览

```
阶段 0: 需求探索        → PRD.md
阶段 1: 架构设计        → ARCHITECTURE.md
阶段 2: 开发计划        → PLAN.md
阶段 3: 迭代开发循环     → PLAN-PHASE-{N}.md + ISSUES-PHASE-{N}.md + CHANGELOG.md
贯穿全程:               → PROJECT_CONTEXT.md, CLAUDE.md, RETRO.md
```

---

## 项目目录结构

```
project-root/
├── CLAUDE.md                        # 项目规则 + 代码规范 + 收尾流程（Claude Code 自动读取）
│
├── docs/
│   ├── PRD.md                       # 需求文档
│   ├── ARCHITECTURE.md              # 架构设计（开发过程中如有架构变更需同步更新）
│   ├── SETUP.md                     # 环境搭建说明
│   ├── RETRO.md                     # 阶段回顾（所有阶段追加在同一文件）
│   └── plans/
│       ├── PLAN.md                  # 总体开发计划
│       ├── PLAN-PHASE-1.md          # 第 1 阶段详细计划
│       ├── PLAN-PHASE-2.md          # 第 2 阶段详细计划
│       ├── ISSUES-PHASE-1.md        # 第 1 阶段验收记录（bug + 小 feature）
│       ├── ISSUES-PHASE-2.md        # 第 2 阶段验收记录
│       └── ...
│
├── PROJECT_CONTEXT.md               # 项目状态快照（根目录方便 Claude Code 找到）
├── CHANGELOG.md                     # 变更记录
└── src/
    └── ...
```

---

## 阶段 0：需求探索

**工具：claude.ai 对话**
**产出文档：`docs/PRD.md`**

在 claude.ai 里讨论需求，用结构化模板引导，避免聊散。讨论收敛后，直接让 claude.ai 输出完整的 PRD.md，你复制到项目目录即可。

### PRD.md 应包含

- **项目概述** — 一句话说清楚这是什么
- **目标用户** — 给谁用的
- **核心功能** — 3-5 个必须有的功能，按优先级排序
- **MVP 边界** — 明确 1.0 做什么，**不做什么**（防止范围蔓延）
- **用户流程** — 关键路径的简单描述（用户打开 → 登录 → 创建项目 → ...）
- **非功能需求** — 性能要求、平台支持、离线需求等
- **参考/灵感** — 类似产品、截图、链接

### 完成标志

你读完 PRD.md 觉得"对，就是这个东西"，没有模糊地带。

---

## 阶段 1：架构设计

**工具：claude.ai 对话**
**产出文档：`docs/ARCHITECTURE.md`**

把 PRD.md 内容抛给 claude.ai，讨论技术方案。讨论收敛后，直接让 claude.ai 输出完整的 ARCHITECTURE.md，你复制到项目目录即可。

### ARCHITECTURE.md 应包含

- **技术栈选型** — 语言、框架、数据库、关键第三方库，以及**选型理由**
- **项目目录结构** — 顶层目录约定
- **核心数据模型** — 主要实体及其关系（可以是简单表格或 Mermaid ER 图）
- **模块划分** — 各模块的职责边界和依赖关系
- **关键接口定义** — 模块之间、前后端之间的核心 API 契约
- **技术约束与决策记录** — 比如"为什么用 SQLite 而不是 PostgreSQL"

### 注意事项

ARCHITECTURE.md 是活文档。开发过程中如果发生架构层面的变更（技术栈调整、模块重新划分、数据模型重构等），需要同步更新此文档。阶段收尾规则中已包含此检查项。

### 完成标志

看完架构文档，一个新开发者（或新的 Claude Code session）能理解整个系统怎么搭建的。

---

## 阶段 2：开发计划

**工具：Claude Code CLI**
**输入：PRD.md + ARCHITECTURE.md**
**产出文档：`docs/plans/PLAN.md`**

让 Claude Code 读取 PRD.md 和 ARCHITECTURE.md，生成总体开发计划。

### PLAN.md 应包含

- **阶段拆分** — 把整个项目分成 N 个阶段，每阶段 1-3 天可完成的工作量
- **每阶段概述** — 这个阶段做什么、依赖什么、产出什么
- **阶段间依赖** — 哪些阶段必须串行，哪些可以并行
- **风险标记** — 哪些阶段技术不确定性高，可能需要 spike

### 拆分原则

- 每个阶段结束后应有可运行、可验证的产出
- 前面的阶段优先搭骨架（项目初始化、核心数据模型、基础 CRUD）
- 高风险的技术点尽早验证，不要留到最后

---

## 阶段 3：迭代开发循环

每个阶段包含三个子流程：**开发**、**验收** 和 **回顾**。

### 3a. 开发

**工具：Claude Code CLI**
**产出文档：`docs/plans/PLAN-PHASE-{N}.md`**

每个阶段进入开发前，先让 Claude Code 编写该阶段的详细计划。

#### PLAN-PHASE-{N}.md 应包含

- **本阶段目标** — 一句话说清楚
- **具体任务清单** — 按执行顺序列出，粒度到单个文件/函数级别
- **验收标准（Acceptance Criteria）** — 每个任务"做完"的定义，尽量可测试
  - 例："`/api/users` GET 返回用户列表，包含 id、name、email 字段，空库返回空数组"
- **测试计划** — 需要哪些测试（单元/集成/手动验证）

### 3b. 验收与修复

**产出文档：`docs/plans/ISSUES-PHASE-{N}.md`**

验收开始时创建，记录该阶段发现的所有 bug 和新增需求。

#### ISSUES-PHASE-{N}.md 格式

```markdown
# Phase {N} 验收记录

## Bug

### BUG-{N}.1: 简短描述
- **状态**: ✅ 已修复 / 🔧 修复中 / ⏳ 推迟到 Phase X
- **描述**: 具体问题
- **修复方案**: 怎么修的（修完后补充）

### BUG-{N}.2: ...

## 小 Feature

### FEAT-{N}.1: 简短描述
- **状态**: ✅ 已完成 / 🔧 进行中 / ⏳ 推迟到 Phase X
- **描述**: 需求说明
- **范围**: 影响哪些模块

### FEAT-{N}.2: ...

## 验收结论

- **通过时间**: YYYY-MM-DD
- **遗留问题**: 列出推迟的条目及目标阶段
```

#### 编号规则

| 类型 | 格式 | 示例 |
|---|---|---|
| Bug | `BUG-{阶段}.{序号}` | `BUG-1.1`, `BUG-2.3` |
| 小 Feature | `FEAT-{阶段}.{序号}` | `FEAT-1.1`, `FEAT-3.2` |

### 3c. 阶段回顾

**产出文档：`docs/RETRO.md`**（追加，不新建）

每个阶段结束时花几分钟回顾，追加到同一个文件中。所有阶段放在一起的好处是方便跨阶段对比，看之前踩的坑后面是否还在踩。

#### RETRO.md 格式

```markdown
# 阶段回顾

## Phase 1 — 2025-02-25

- Claude Code 生成的数据库 migration 顺序不对，需要在 prompt 里明确依赖关系
- 验收标准写得太粗，"用户列表能用"不够，下次写到字段级别
- 这个阶段耗时比预期多 1 天，主要卡在环境配置上

## Phase 2 — 2025-03-02

- ...
```

#### 回顾时可以思考的问题

- 这个阶段实际耗时 vs 预期耗时？差在哪里？
- 哪些 prompt / 指令让 Claude Code 效果好？
- 哪些地方 Claude Code 容易出错，需要更明确的约束？
- 有没有需要补充到 CLAUDE.md 里的新规则？
- 下个阶段的计划需要调整吗？

### 3d. 完整的阶段循环

```
开新阶段前，先扫一眼 docs/RETRO.md 回忆之前的教训
  → 编写 PLAN-PHASE-N.md
  → Claude Code 按计划实现
  → 手动验收 / 测试
  → 发现问题 → 记录到 ISSUES-PHASE-N.md
  → Claude Code 读取 ISSUES 文件，逐个修复
  → 每修复一个，更新状态为 ✅
  → 非必要的小 feature → 标记 ⏳ 推迟，注明推到哪个阶段
  → 所有 Bug 修完，必要 Feature 做完
  → 写验收结论
  → 阶段回顾，追加到 docs/RETRO.md
  → 你说"Phase N 验收完成"，触发收尾操作（见下方规则）
  → 进入下一阶段
```

---

## 阶段收尾规则

Claude Code 没有自动触发机制。通过在 `CLAUDE.md` 中写入以下规则，你只需说一句 **"Phase N 验收完成"**，Claude Code 就会执行收尾流程：

```markdown
## 阶段收尾规则

当用户说"Phase N 验收完成"时，执行以下操作：
1. 读取 docs/plans/ISSUES-PHASE-{N}.md
2. 将所有 ⏳ 推迟的条目追加到目标阶段的 PLAN-PHASE-{X}.md 中
   - 如果目标阶段计划还没创建，追加到 PLAN.md 对应阶段的概述里
3. 检查本阶段是否有架构层面的变更，如有则同步更新 docs/ARCHITECTURE.md
4. 更新 CHANGELOG.md，追加本阶段的变更记录
5. 更新 PROJECT_CONTEXT.md 的当前状态
```

---

## 贯穿全程的文档

### `CLAUDE.md`

放在项目根目录，Claude Code 启动时自动读取。把项目规则、代码规范、收尾流程写在同一个文件里，用 heading 分区。建议结构如下：

```markdown
# 项目简介

一句话描述项目是什么。

## 常用命令

- `npm run dev` — 启动开发服务器
- `npm run build` — 构建
- `npm run test` — 运行测试
- `npm run lint` — 代码检查

## 项目规则

- commit message 格式：`type(scope): description`
- 禁止直接修改 config/ 目录下的文件
- 所有 API 接口需要写对应的测试

## 代码规范

- 命名：变量和函数用 camelCase，类用 PascalCase，文件用 kebab-case
- 文件组织：每个文件只导出一个主要模块
- 错误处理：统一使用自定义 AppError 类，禁止裸 throw
- 注释：公共 API 必须写 JSDoc / docstring，内部实现只在复杂逻辑处注释
- import 顺序：第三方库 → 项目内部模块 → 相对路径模块，各组之间空一行
- 测试：测试文件与源文件同名，后缀 .test.ts / .spec.ts

## 阶段收尾规则

当用户说"Phase N 验收完成"时，执行以下操作：
1. 读取 docs/plans/ISSUES-PHASE-{N}.md
2. 将所有 ⏳ 推迟的条目追加到目标阶段的 PLAN-PHASE-{X}.md 中
   - 如果目标阶段计划还没创建，追加到 PLAN.md 对应阶段的概述里
3. 检查本阶段是否有架构层面的变更，如有则同步更新 docs/ARCHITECTURE.md
4. 更新 CHANGELOG.md，追加本阶段的变更记录
5. 更新 PROJECT_CONTEXT.md 的当前状态
```

此文件是活文档。开发过程中发现需要补充的规范（比如阶段回顾中总结出 Claude Code 反复犯的风格错误），应及时追加。

### `PROJECT_CONTEXT.md`

放在项目根目录，作为**项目状态的 single source of truth**，每个阶段结束后更新。

内容：

- **当前状态** — 正在进行哪个阶段，完成百分比
- **已完成阶段摘要** — 每个阶段做了什么，关键产出
- **已知问题 / 技术债** — 当前遗留的问题
- **关键决策日志** — 开发过程中做的重要变更（比如"原计划用 REST，改成了 WebSocket"）
- **下一步** — 接下来要做什么

核心价值：**任何一个新的 Claude Code session，读完这个文件就能接上进度。**

### `docs/SETUP.md`

环境搭建说明，确保新的 Claude Code session 或换机器开发时能快速把项目跑起来。

内容：

- **前置依赖** — 语言版本、运行时版本、数据库等
- **安装步骤** — 逐步命令
- **环境变量配置** — 需要哪些环境变量、如何获取
- **启动命令** — 开发模式、生产模式
- **常见问题** — 已知的环境坑和解决方案

### `docs/RETRO.md`

所有阶段的回顾追加在同一个文件里，方便跨阶段对比。详见 [3c. 阶段回顾](#3c-阶段回顾)。

### `CHANGELOG.md`

每个阶段结束后追加记录：

- 日期
- 完成了什么
- 破坏性变更（如果有）
- 遗留问题

---

## 文档清单一览

| 文档 | 位置 | 产出时机 | 谁写 | 作用 |
|---|---|---|---|---|
| `CLAUDE.md` | 项目根目录 | 项目初始化时，持续补充 | 你 + Claude Code | 项目规则、代码规范、收尾流程 |
| `PRD.md` | `docs/` | 阶段 0 | claude.ai | 需求的完整描述 |
| `ARCHITECTURE.md` | `docs/` | 阶段 1，后续按需更新 | claude.ai，后续 Claude Code 同步 | 技术方案蓝图 |
| `SETUP.md` | `docs/` | 阶段 2（首次开发前） | Claude Code + 你 | 环境搭建说明 |
| `RETRO.md` | `docs/` | 每阶段结束后追加 | 你 + Claude Code | 阶段回顾，跨阶段对比 |
| `PLAN.md` | `docs/plans/` | 阶段 2 | Claude Code | 总体开发计划与阶段拆分 |
| `PLAN-PHASE-{N}.md` | `docs/plans/` | 每阶段开始前 | Claude Code | 单阶段详细任务与验收标准 |
| `ISSUES-PHASE-{N}.md` | `docs/plans/` | 每阶段验收时 | Claude Code + 你 | 验收期间的 bug 和小 feature |
| `PROJECT_CONTEXT.md` | 项目根目录 | 贯穿全程，每阶段更新 | Claude Code + 你 | 项目状态快照，新 session 入口 |
| `CHANGELOG.md` | 项目根目录 | 每阶段结束后 | Claude Code | 变更记录 |

---

## 核心原则

1. **文档是共享记忆** — 每个 Claude Code session 都可能是全新实例，文档体系完整才能无缝接续
2. **先想清楚再动手** — 阶段 0 和 1 不写任何代码，磨刀不误砍柴工
3. **小步交付** — 每个阶段结束都有可验证的产出
4. **验收标准前置** — 写计划时就定义好"做完"的标准，不要事后才想
5. **持续更新上下文** — PROJECT_CONTEXT.md、ARCHITECTURE.md、CLAUDE.md 都是活文档
6. **用约定代替自动化** — 把流程规则写进 CLAUDE.md，用一句话触发而非依赖不存在的自动机制
7. **回顾驱动改进** — 每个阶段结束后回顾，把教训沉淀到规则和规范中