import type { UIMessage } from "ai";

// ---------------------------------------------------------------------------
// Agent event discriminated union
// ---------------------------------------------------------------------------

export type ChatStatus = "error" | "submitted" | "streaming" | "ready";
export type EventStatus = "pending" | "complete" | "error";
export type AgentStatus = "idle" | "thinking" | "executing";
export type Coordinate = [number, number];
export type ComputerActionType =
  | "screenshot"
  | "left_click"
  | "right_click"
  | "double_click"
  | "mouse_move"
  | "type"
  | "key"
  | "scroll"
  | "wait"
  | "left_click_drag";

type BaseEvent = {
  id: string;
  timestamp: number;
  toolCallId: string;
  status: EventStatus;
  duration?: number;
  errorMessage?: string;
};

export type ScreenshotEvent = BaseEvent & {
  type: "screenshot";
  payload: Record<string, never>;
  result?: { data: string };
};

export type ClickEvent = BaseEvent & {
  type: "left_click" | "right_click" | "double_click";
  payload: { coordinate: Coordinate };
};

export type TypeEvent = BaseEvent & {
  type: "type";
  payload: { text: string };
};

export type KeyEvent = BaseEvent & {
  type: "key";
  payload: { text: string };
};

export type ScrollEvent = BaseEvent & {
  type: "scroll";
  payload: { direction: string; amount: number };
};

export type MouseMoveEvent = BaseEvent & {
  type: "mouse_move";
  payload: { coordinate: Coordinate };
};

export type WaitEvent = BaseEvent & {
  type: "wait";
  payload: { duration: number };
};

export type DragEvent = BaseEvent & {
  type: "left_click_drag";
  payload: { start: Coordinate; end: Coordinate };
};

export type BashEvent = BaseEvent & {
  type: "bash";
  payload: { command: string };
  result?: string;
};

export type AgentEvent =
  | ScreenshotEvent
  | ClickEvent
  | TypeEvent
  | KeyEvent
  | ScrollEvent
  | MouseMoveEvent
  | WaitEvent
  | DragEvent
  | BashEvent;

// ---------------------------------------------------------------------------
// Derived event store
// ---------------------------------------------------------------------------

export type EventStore = {
  events: AgentEvent[];
  countsByType: Partial<Record<AgentEvent["type"], number>>;
  agentStatus: AgentStatus;
};

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

export type Session = {
  id: string;
  name: string;
  createdAt: number;
  messages: UIMessage[];
  events: AgentEvent[];
  sandboxId: string | null;
};
