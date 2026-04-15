Author: Meng Junjie

# AI Agent Dashboard

A production-style AI agent dashboard built on top of the Vercel `ai-sdk-computer-use` starter. This version restructures the starter into a challenge-ready dashboard with a typed event pipeline, session persistence, inline tool-call visualization, a debug surface, and a responsive desktop/mobile workflow.

## Overview

This project extends the original computer-use demo into a frontend that is easier to debug, easier to reason about, and better aligned with how real operator-style products present agent activity.

The core goal was to keep the original streaming and VNC-based computer-use flow intact while improving:

- information architecture
- state modeling
- session persistence
- inspection/debugging UX
- React render boundaries
- mobile usability

The final UI is organized as:

- desktop and tablet:
  - left panel for chat, inline tool calls, and a collapsible debug panel
  - right panel for the VNC desktop and expanded tool-call details
- phone:
  - explicit `Chat` / `Desktop` switching with a session drawer

## Challenge Coverage

### Implemented requirements

- Two-panel dashboard with horizontal resizing
- Inline tool call visualization inside chat
- Expanded detail view for a selected tool call
- Typed event pipeline with discriminated unions
- Derived event state:
  - ordered event list
  - counts by action type
  - agent status
- Debug panel for event inspection
- Multi-session chat history
- `localStorage` persistence
- `VncViewer` isolated behind a memoized boundary
- TypeScript-first implementation with no new `any`
- Mobile-responsive workflow

### Extra implementation notes

- Desktop initialization failures and Vercel Sandbox rate-limit failures are surfaced in the UI instead of only appearing in the console.
- Tool failures are normalized into the event model with `errorMessage`.
- In development, the VNC panel shows a small `VNC renders: n` badge to help verify render isolation.

## What Changed From the Starter

The original starter is a functional computer-use demo, but its UI and state model are optimized for demonstration rather than inspection.

This implementation adds:

- a dashboard-oriented layout
- a persistent session model
- a typed event normalization layer
- tool-call cards inside the chat transcript
- a dedicated detail panel
- a debug panel for counts and timeline inspection
- responsive layout behavior for tablet and phone
- stronger error visibility around desktop lifecycle issues

## Product Walkthrough

### Desktop and tablet layout

At `md` and above, the app renders a persistent dashboard:

- a fixed session rail on the left
- a horizontally resizable center/right work area
- chat and debug content on the left panel
- VNC plus detail inspection on the right panel

This layout is intended to match the challenge requirement that desktop and tablet viewports both preserve a usable two-panel workflow.

### Mobile layout

Below `md`, the layout switches to an explicit mobile flow:

- `Chat` tab
- `Desktop` tab
- session drawer overlay

This keeps the app usable on a small screen without trying to squeeze the full dashboard into an unreadable stacked layout.

### Tool-call UI

Each tool invocation is rendered inline in the transcript with:

- action type
- current status
- duration
- type-specific summary

Behavior by type:

- `screenshot`
  - thumbnail in the chat
  - full image in the detail panel
- `bash`
  - summarized command inline
  - truncated output preview inline
  - full output in detail
- browser/computer actions
  - typed payload and human-readable summary

### Debug panel

The debug panel is collapsible and shows:

- current agent status
- event counts by action type
- reverse timeline of normalized events
- latest desktop/system issue when present

This is intentionally productized enough for demo/reviewer use, while still being practical during debugging.

## Architecture

### Frontend orchestration

[`app/page.tsx`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/app/page.tsx) is the main coordinator for:

- session selection
- message ownership per session
- sandbox desktop lifecycle
- responsive layout switching
- selected tool-call state
- derived event store creation

This file keeps UI state separate from event-store state:

- session/messages/events/sandbox ownership are persisted
- panel open state and selected detail state remain local UI state

### Typed event pipeline

The typed event model lives in [`lib/types.ts`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/lib/types.ts).

Key public types:

- `Session`
  - `id`
  - `name`
  - `createdAt`
  - `messages`
  - `events`
  - `sandboxId`
- `AgentEvent`
  - discriminated union covering:
    - `screenshot`
    - `left_click`
    - `right_click`
    - `double_click`
    - `mouse_move`
    - `type`
    - `key`
    - `scroll`
    - `wait`
    - `left_click_drag`
    - `bash`
- shared event fields:
  - `id`
  - `timestamp`
  - `toolCallId`
  - `status`
  - `duration`
  - `errorMessage`
- `EventStore`
  - `events`
  - `countsByType`
  - `agentStatus`

The pipeline works in two stages:

1. [`lib/tool-invocations.ts`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/lib/tool-invocations.ts)
   - parses raw AI SDK tool invocations into typed args/results
   - converts best-effort tool failures into displayable error messages
2. [`lib/agent-events.ts`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/lib/agent-events.ts)
   - derives normalized `AgentEvent[]` from streamed messages
   - preserves prior timestamps/durations where possible
   - sorts events before building derived counts/status

This keeps rendering code from depending on raw tool invocation shapes in many places.

### Component structure

Main UI components:

- [`components/chat-panel.tsx`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/components/chat-panel.tsx)
  - chat container, input, suggestions, debug panel
- [`components/message.tsx`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/components/message.tsx)
  - streamed text plus inline tool-call rendering
- [`components/tool-call-card.tsx`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/components/tool-call-card.tsx)
  - compact tool-call visualization
- [`components/tool-call-detail.tsx`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/components/tool-call-detail.tsx)
  - expanded payload/result/error view
- [`components/debug-panel.tsx`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/components/debug-panel.tsx)
  - event counts, agent status, timeline
- [`components/session-sidebar.tsx`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/components/session-sidebar.tsx)
  - create, switch, delete sessions
- [`components/vnc-viewer.tsx`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/components/vnc-viewer.tsx)
  - VNC iframe container and render-isolated desktop surface

### Backend integration

The chat API remains a single endpoint:

- [`app/api/chat/route.ts`](/Users/junjie/Desktop/个人文档/ai-sdk-computer-use/app/api/chat/route.ts)

Request shape:

- `messages`
- `sandboxId`

The route:

- preserves AI SDK streaming behavior
- passes the current sandbox into `computer` and `bash` tools
- prunes screenshot payloads before resend to control token pressure
- attempts desktop cleanup when the request fails

## Key Technical Decisions

### 1. Event pipeline first, UI second

Rather than rendering directly from raw tool invocations everywhere, the UI depends on normalized events. This gives the app:

- consistent status calculation
- a reusable detail/debug model
- cleaner TypeScript boundaries
- easier session persistence

### 2. Session owns both messages and events

Each session persists:

- streamed AI messages
- normalized event history
- its current sandbox id

That means a user can switch sessions without losing the conversation or the event inspection history for that session.

### 3. VNC render isolation

`VncViewer` is memoized and receives a narrow prop surface:

- `streamUrl`
- `isInitializing`
- `errorMessage`
- `onRefresh`

Chat updates, tool-call selection changes, and debug panel toggles do not need to force the VNC viewer to re-render. In development, the render counter badge helps verify this behavior during streaming.

### 4. Error visibility as part of the product surface

Desktop initialization errors are common during development because sandbox credentials, rate limits, or snapshot configuration can fail independently of chat rendering. Instead of leaving those failures in logs only, the app now surfaces them in:

- the VNC panel
- the debug panel
- the empty detail state

This makes the dashboard easier to reason about during demo and debugging.

### 5. Tablet is treated as dashboard, not phone

The challenge explicitly calls out desktop and tablet support, so tablet is grouped with desktop for layout purposes. Phone remains a separate workflow.

## Local Development

### Prerequisites

- Node.js 18+
- `pnpm`
- Anthropic API access
- Vercel Sandbox access

### Install dependencies

```bash
pnpm install
```

### Environment variables

Create `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_BASE_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
SANDBOX_SNAPSHOT_ID=snap_xxxxxxxxxxxxx
VERCEL_OIDC_TOKEN=
VERCEL_TOKEN=
VERCEL_TEAM_ID=
VERCEL_PROJECT_ID=
```

Notes:

- `ANTHROPIC_API_KEY` is required for model access.
- `SANDBOX_SNAPSHOT_ID` is required for the desktop environment.
- `NEXT_PUBLIC_APP_URL` is used for `metadataBase` and local metadata resolution.
- For sandbox access, use either:
  - `VERCEL_OIDC_TOKEN`
  - or `VERCEL_TOKEN` + `VERCEL_TEAM_ID` + `VERCEL_PROJECT_ID`

### Start the app

```bash
pnpm dev
```

Then open:

- local browser: `http://localhost:3000`
- same-network phone: `http://<your-lan-ip>:3000`

### Build for production validation

```bash
pnpm build
```

This is the main local check used before submission.

## Recommended Manual Validation

### 1. Desktop and tablet layout

- Open the app at a width `>= 768px`
- Confirm the app shows:
  - session rail
  - left chat/debug panel
  - right VNC/detail panel
- Drag the panel divider and confirm resizing works

### 2. Mobile layout

- Open the app below `768px`
- Confirm:
  - top `Chat` / `Desktop` switch appears
  - session drawer opens
  - chat and desktop are both reachable

### 3. Event pipeline

Run a real task and verify:

- tool calls appear inline in chat
- statuses move from `pending` to `complete` or `error`
- durations stabilize once complete
- debug counts increment correctly
- detail panel shows payload and output

### 4. Error handling

Force or encounter a failure, for example:

- sandbox rate limit
- invalid sandbox credentials
- bash tool failure

Then verify:

- VNC panel shows an actionable error message
- debug panel shows the latest system issue
- tool-call detail shows `errorMessage` when present

### 5. Multi-session behavior

- create a session
- send a prompt
- create another session
- switch back
- refresh the page

Confirm:

- messages and events are restored per session
- sessions do not overwrite each other
- deleting a session removes it cleanly

### 6. VNC render isolation

In development:

1. start `pnpm dev`
2. open the desktop view
3. trigger a streaming task
4. watch the `VNC renders: n` badge

Expected behavior:

- chat-only streaming updates should not continuously increment the VNC render count
- the count may change when:
  - the stream URL changes
  - initialization state changes
  - a desktop error state is set or cleared

## Deployment

### Deploying to Vercel

1. link the project:

```bash
vercel link
```

2. pull environment variables if needed:

```bash
vercel env pull
```

3. confirm the production environment contains:

- `ANTHROPIC_API_KEY`
- `SANDBOX_SNAPSHOT_ID`
- either:
  - `VERCEL_OIDC_TOKEN`
  - or `VERCEL_TOKEN` + `VERCEL_TEAM_ID` + `VERCEL_PROJECT_ID`

4. deploy:

```bash
vercel --prod
```

### Production smoke test

After deployment:

- load the app
- ensure a desktop initializes
- send `What’s the weather in Dubai?`
- confirm tool calls appear
- confirm detail/debug panels work
- confirm session switching still works after refresh


## Known Limitations

- Session history is stored only in `localStorage`; there is no backend sync.
- The desktop VM is ephemeral and tied to sandbox lifecycle.
- Event timestamps and durations are client-derived from streamed tool-call state, not server-side execution telemetry.
- Bash failure detection is best-effort based on returned output text.
- Full end-to-end validation depends on available Vercel Sandbox quota.
- Session renaming is intentionally omitted because it was not required by the challenge.

## Notes

- The appendix mentions E2B as background context, but this implementation keeps the repository’s actual Vercel Sandbox stack instead of swapping providers.
- The project prioritizes preserving starter functionality first, then layering a stronger UI and state model on top.
- If a reviewer interprets ambiguous requirements differently, the implementation intentionally favors:
  - type safety
  - observable agent behavior
  - clear separation of UI and derived state
  - stable VNC rendering behavior
