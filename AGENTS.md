# SubTracker

个人订阅费用记录工具，纯前端 Web App，TypeScript + React + Tailwind CSS v4 + Vite。

## 常用命令

- `npm run dev` — 启动开发服务器
- `npm run build` — 构建生产版本
- `npm run preview` — 预览构建产物

## 项目规则

- commit message 格式：`type(scope): description`，type 包括 feat / fix / docs / refactor / style / chore
- 代码按 `types.ts → constants.ts → utils.ts → components.tsx → App.tsx` 分模块，依赖方向单向
- 数据仅存 localStorage，不引入任何后端服务
- 不引入额外的状态管理库、路由库、日期库
- 新增第三方依赖前需说明理由

## 代码规范

- 命名：变量和函数用 camelCase，组件用 PascalCase
- 样式：优先使用 Tailwind class，避免手写 CSS（除 Tailwind 指令外）
- 组件：函数组件 + Hooks，不使用 class 组件
- 状态：useState / useReducer 管理，状态提升到 App 组件
- 类型：不使用 `any` 或 `unknown`，所有数据结构必须有明确类型定义
- 注释：只在复杂业务逻辑处注释，组件和函数命名应自解释

## 测试

三层测试闭环，开发计划（plan）中按需标注每层覆盖哪些改动：

- **tsc**（`npm run build`）— 类型检查
- **vitest**（`npx vitest run`）— 纯函数单元测试，文件放 `src/*.test.ts`
- **Playwright**（写临时 mjs 脚本跑）— 浏览器级验证：console 日志、截图、E2E 操作

规则：
- 新增/改动纯函数时，必须有对应 vitest 用例
- UI 交互或集成验证用 Playwright，脚本跑完即删除
- tsconfig.app.json 已排除 `src/**/*.test.ts` 和 `src/**/*.test.tsx`

## 协作规范

- 阶段回顾（RETRO.md）内容必须先问用户，不要自行编写
- 明确的事情直接做，需要确认的直接问，不要反复确认显而易见的事

## 关键文档

- 需求文档：`docs/PRD.md`
- 架构设计：`docs/ARCHITECTURE.md`
- 开发计划：`docs/plans/PLAN.md`
- 项目状态：`PROJECT_CONTEXT.md`
- 阶段回顾：`docs/RETRO.md`（开新阶段前先回顾之前的教训）
- 开发工作流：`docs/workflow/SIDE-PROJECT-SPEC-DRIVEN-WORKFLOW.md`（文档结构与阶段流程的依据）

## 阶段收尾规则

当用户说"Phase N 验收完成"时，执行以下操作：
1. 读取 docs/plans/ISSUES-PHASE-{N}.md
2. 将所有 ⏳ 推迟的条目追加到目标阶段的 PLAN-PHASE-{X}.md 中
   - 如果目标阶段计划还没创建，追加到 PLAN.md 对应阶段的概述里
3. 检查本阶段是否有架构层面的变更，如有则同步更新 docs/ARCHITECTURE.md
4. 更新 CHANGELOG.md，追加本阶段的变更记录
5. 更新 PROJECT_CONTEXT.md 的当前状态
