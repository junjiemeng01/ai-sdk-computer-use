"use client";

import type { AgentEvent } from "@/lib/types";
import type { ComponentType } from "react";
import {
  Camera,
  Clock,
  Keyboard,
  KeyRound,
  MousePointer,
  MousePointerClick,
  ScrollText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ToolCallDetailProps {
  event: AgentEvent | null;
  systemIssue?: string | null;
  onClose: () => void;
}

const typeLabels: Record<AgentEvent["type"], string> = {
  screenshot: "Screenshot",
  left_click: "Left Click",
  right_click: "Right Click",
  double_click: "Double Click",
  type: "Type",
  key: "Key Press",
  scroll: "Scroll",
  mouse_move: "Mouse Move",
  wait: "Wait",
  left_click_drag: "Drag",
  bash: "Bash Command",
};

const TypeIcon: Record<AgentEvent["type"], ComponentType<{ className?: string }>> = {
  screenshot: Camera,
  left_click: MousePointer,
  right_click: MousePointerClick,
  double_click: MousePointerClick,
  type: Keyboard,
  key: KeyRound,
  scroll: ScrollText,
  mouse_move: MousePointer,
  wait: Clock,
  left_click_drag: MousePointer,
  bash: ScrollText,
};

function formatDuration(ms?: number): string {
  if (ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTimestamp(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(ts));
}

export function ToolCallDetail({
  event,
  systemIssue,
  onClose,
}: ToolCallDetailProps) {
  if (!event) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        {systemIssue ? (
          <div className="max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            <div className="font-semibold">Latest desktop issue</div>
            <p className="mt-1">{systemIssue}</p>
          </div>
        ) : (
          <div className="text-center text-sm text-zinc-400">
            Select an inline tool call from the chat to inspect its payload, status,
            and rendered result here.
          </div>
        )}
      </div>
    );
  }

  const Icon = TypeIcon[event.type];
  const label = typeLabels[event.type];

  return (
    <div className="flex flex-col h-full overflow-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-zinc-100 dark:bg-zinc-800 rounded-full">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-sm">{label}</div>
            <div className="text-xs text-zinc-500 font-mono">{event.toolCallId}</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-2">
          <div className="text-zinc-500 mb-1">Status</div>
          <div className={
            event.status === "complete"
              ? "text-green-600 font-medium"
              : event.status === "error"
              ? "text-red-600 font-medium"
              : "text-yellow-600 font-medium"
          }>
            {event.status}
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-2">
          <div className="text-zinc-500 mb-1">Duration</div>
          <div className="font-mono">{formatDuration(event.duration)}</div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900 rounded p-2 col-span-2">
          <div className="text-zinc-500 mb-1">Timestamp</div>
          <div className="font-mono">{formatTimestamp(event.timestamp)}</div>
        </div>
      </div>

      {/* Payload */}
      <div>
        <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Payload</div>
        <pre className="text-xs bg-zinc-50 dark:bg-zinc-900 rounded p-3 overflow-auto max-h-32 font-mono whitespace-pre-wrap">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </div>

      {event.errorMessage ? (
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Error</div>
          <pre className="text-xs rounded border border-red-200 bg-red-50 p-3 overflow-auto max-h-32 font-mono whitespace-pre-wrap text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
            {event.errorMessage}
          </pre>
        </div>
      ) : null}

      {/* Screenshot result */}
      {event.type === "screenshot" && event.result?.data && (
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Result</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${event.result.data}`}
            alt="Screenshot"
            className="w-full rounded-md border border-zinc-200 dark:border-zinc-800"
          />
        </div>
      )}

      {/* Bash result */}
      {event.type === "bash" && event.result && (
        <div>
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">Output</div>
          <pre className="text-xs bg-zinc-50 dark:bg-zinc-900 rounded p-3 overflow-auto max-h-48 font-mono whitespace-pre-wrap">
            {event.result}
          </pre>
        </div>
      )}
    </div>
  );
}
