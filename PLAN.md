# AI Agent Dashboard 挑战交付计划 / Delivery Plan

## Summary / 摘要

- 目标是在现有 `ai-sdk-computer-use` 仓库上完成一版可交付的 AI Agent Dashboard，满足题目中的核心要求与附录细则，并补齐 README、部署、演示视频等交付物。
- 实施顺序固定为：先修复当前类型与构建问题，再收敛事件管线与状态模型，再完善双栏 UI 与性能边界，最后完成文档、部署和 demo 材料。
- 继续在当前分支现有改动基础上推进，不回退已存在的 session、event、tool-call UI 雏形；所有方案以“保留现有 streaming 与 VNC 功能”为前提。

## Key Changes / 核心实施项

- **阶段 1：稳定基线 / Stabilize baseline**
  - 先修复当前 `pnpm build` 失败：在 `app/page.tsx` 中对 AI SDK `toolInvocation` 做严格状态收窄，避免在 `partial-call` 上直接访问 `result`。
  - 清理事件链路中的 `any`、`@ts-expect-error` 与宽松对象类型，确保 `messages -> normalized events -> derived store -> UI` 全链路严格类型化。
  - 保持 `/api/chat` 的现有 streaming 行为不变，只补类型、错误处理和工具调用生命周期映射。

- **阶段 2：事件管线 / Event pipeline**
  - 以 `AgentEvent` 作为前端统一事件模型，覆盖：`screenshot`、点击类、`mouse_move`、`type`、`key`、`scroll`、`wait`、`left_click_drag`、`bash`。
  - 每个事件固定包含：`id`、`toolCallId`、`timestamp`、`type`、`payload`、`status`、`duration`；截图和 bash 额外携带强类型结果字段。
  - 新增一个纯函数适配层，将 AI SDK message parts 转成标准事件；在工具调用开始时生成 `pending`，结束时补全 `complete/error` 与 `duration`，中止场景映射为失败或显式终止状态并在 UI 中可见。
  - `EventStore` 只保留派生状态：按时间排序的 `events`、`countsByType`、`agentStatus(idle/thinking/executing)`，不混入 UI 状态。

- **阶段 3：界面与交互 / UI and interaction**
  - 桌面与平板统一使用左右双栏：左侧为 chat + inline tool call + collapsible debug panel，右侧为 VNC + expanded tool detail。
  - 左侧 chat 中每个 tool call 必须展示 `type + status + duration`，并按类型渲染：
    - `screenshot`：聊天流里显示缩略图，点击后右侧显示大图。
    - `bash`：聊天流里显示命令摘要，右侧显示完整命令与输出。
    - 浏览器动作：显示动作类型与坐标/文本/滚动信息。
  - Debug panel 默认折叠，展开后展示 agent status、各 action 计数和事件时间线，用于调试与行为理解。
  - 右侧 detail panel 统一展示所选事件的 meta 信息、payload、结果内容；未选中时展示空态提示。

- **阶段 4：会话与持久化 / Sessions and persistence**
  - 保留并完善多 session：创建、切换、删除、列表展示、`localStorage` 持久化。
  - 每个 session 独立保存 `messages`、`events`、`sandboxId`、`createdAt`、`name`，切换时只切换当前 session，不污染其它 session 状态。
  - 删除 session 时清理对应桌面实例；如果删掉当前 session，则自动切换到剩余第一个 session，若已无 session，则创建一个新的默认 session。

- **阶段 5：性能与响应式 / Performance and responsive**
  - 保证 `VncViewer` 不因聊天消息更新而重渲染：维持独立组件边界、稳定 props、`memo` 比较函数与稳定 refresh handler。
  - 若需要传递事件选择或布局状态，不能让这些状态穿透到 VNC 组件导致额外 render。
  - Mobile bonus 采用明确的 `Chat/Desktop` 切换方案，而不是纯 headless 文案页；手机端至少支持消息发送、session 访问、debug 查看、桌面查看切换与触控可用性。

- **阶段 6：交付物 / Deliverables**
  - README 改为 challenge-ready 版本，第一行固定为 `Author: [Your Full Name]`。
  - README 内容包含：项目概述、架构说明、核心设计决策、环境变量、启动方式、部署步骤、已知限制、演示脚本摘要。
  - 补充交付清单：私有仓库协作者邀请 `lingjiekong`、`ghamry03`、`goldmermaid`、`EnergentAI`；Vercel 部署；5 分钟带声音 demo 视频。
  - Demo 视频脚本固定覆盖：双栏与拖拽、debug panel、输入 “What’s the weather in Dubai?”、session 切换与新建、关键代码设计说明。

## Public Types and Interfaces / 公共类型与接口

- `Session`
  - 持久化 schema 固定为：`id`、`name`、`createdAt`、`messages`、`events`、`sandboxId`。
- `AgentEvent`
  - 使用 discriminated union；禁止 `any`。
  - 各事件 `payload` 必须是精确结构，而不是通用对象。
  - `ScreenshotEvent` 与 `BashEvent` 允许带 typed result，其余事件只保留 typed payload。
- `EventStore`
  - 固定只包含：`events`、`countsByType`、`agentStatus`。
  - UI 展开/选中状态单独管理，不写入 store。
- `/api/chat`
  - 请求结构继续使用 `messages + sandboxId`。
  - 不新增题目未要求的接口；重点是保持 streaming 并改进错误处理与类型安全。

## Test Plan / 测试方案

- **构建与类型**
  - `pnpm build` 必须通过。
  - 不允许新增 `any`；事件和 tool-call 主路径不保留 `@ts-expect-error`。
- **核心功能**
  - 桌面/平板下正确显示双栏、可水平拖拽调整。
  - 点击聊天中的 tool call，右侧 detail panel 正确更新。
  - debug panel 可折叠，展开后展示状态灯、计数、时间线。
- **事件正确性**
  - `screenshot`、点击、输入、按键、滚动、等待、拖拽、bash 都能产生规范事件。
  - `pending -> complete/error` 生命周期正确，`duration` 在完成后稳定。
  - `agentStatus` 能随推理中、执行中、空闲状态变化。
- **会话**
  - 支持新建、切换、删除、刷新后恢复。
  - 各 session 的消息和事件互不串扰。
- **性能**
  - 聊天持续流式更新时，`VncViewer` render 次数不增长；只有 `streamUrl`、初始化状态或显式刷新时才允许重渲染。
- **移动端**
  - 手机视口可正常输入、查看会话、切换到桌面视图，布局不破坏。
- **交付验证**
  - README 首行正确。
  - 部署后生产环境可运行。
  - Demo 视频脚本覆盖题目要求的全部场景。

## Assumptions / 假设与默认决策

- 以当前仓库实际技术栈为准继续开发；附录里的 `E2B` 作为背景说明处理，不替换当前项目中的 Sandbox 实现。
- 计划文件路径默认放在仓库根目录 `plan.md`。
- 当前工作区已有未提交改动，这些改动视为本次挑战的一部分基础，不做回滚。
- 部署平台默认选 `Vercel`，不额外做 Netlify 适配。
- 若题目存在歧义，默认优先满足：类型安全、行为可解释、VNC 稳定、交互清晰、交付完整。
- README 中作者名先使用占位符，真正提交前替换为你的全名。
