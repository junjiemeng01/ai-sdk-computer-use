"use client";

import { motion } from "motion/react";
import type { ToolInvocation } from "ai";
import {
  Camera,
  CheckCircle,
  CircleSlash,
  Clock,
  Keyboard,
  KeyRound,
  Loader2,
  MousePointer,
  MousePointerClick,
  ScrollText,
  StopCircle,
} from "lucide-react";
import type { ComponentType } from "react";

import { cn } from "@/lib/utils";
import type { AgentEvent, ChatStatus, EventStatus } from "@/lib/types";
import {
  describeComputerAction,
  getToolInvocationErrorMessage,
  getToolInvocationStatus,
  parseBashToolArgs,
  parseComputerToolArgs,
  parseImageToolResult,
  summarizeBashCommand,
  summarizeBashOutput,
} from "@/lib/tool-invocations";

export interface ToolCallCardProps {
  toolName: "computer" | "bash";
  toolCallId: string;
  args: unknown;
  result?: unknown;
  state: ToolInvocation["state"];
  isLatestMessage: boolean;
  status: ChatStatus;
  event?: AgentEvent;
  motionKey: string;
  onSelect?: (toolCallId: string) => void;
}

const statusBadgeStyles: Record<EventStatus, string> = {
  pending:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  complete:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  error: "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300",
};

function formatDuration(duration?: number): string {
  if (duration === undefined) return "Running";
  if (duration < 1000) return `${duration}ms`;
  return `${(duration / 1000).toFixed(1)}s`;
}

function summarizeErrorMessage(message?: string): string | null {
  if (!message) {
    return null;
  }

  return message.length > 160 ? `${message.slice(0, 157)}...` : message;
}

function renderStateIcon(
  displayStatus: EventStatus,
  state: ToolInvocation["state"],
  isLatestMessage: boolean,
  status: ChatStatus,
) {
  if (displayStatus === "pending") {
    return state === "call" || state === "partial-call" ? (
      isLatestMessage && status !== "ready" ? (
        <Loader2 className="animate-spin h-4 w-4 text-zinc-500" />
      ) : (
        <StopCircle className="h-4 w-4 text-amber-500" />
      )
    ) : (
      <Loader2 className="animate-spin h-4 w-4 text-zinc-500" />
    );
  }

  if (displayStatus === "error") {
    return <CircleSlash size={14} className="text-red-500" />;
  }

  return <CheckCircle size={14} className="text-green-600" />;
}

export function ToolCallCard({
  toolName,
  toolCallId,
  args,
  result,
  state,
  isLatestMessage,
  status,
  event,
  motionKey,
  onSelect,
}: ToolCallCardProps) {
  if (toolName === "computer") {
    const parsedArgs = parseComputerToolArgs(args);

    if (!parsedArgs) {
      return null;
    }

    const { label, detail } = describeComputerAction(parsedArgs);
    const displayStatus =
      event?.status ?? getToolInvocationStatus(state, result);
    const displayDuration = event?.duration;
    const errorMessage = summarizeErrorMessage(
      event?.errorMessage ?? getToolInvocationErrorMessage(result),
    );
    const screenshotResult =
      event?.type === "screenshot" && event.result
        ? event.result
        : parseImageToolResult(result);
    let ActionIcon: ComponentType<{ className?: string }> = MousePointer;

    switch (parsedArgs.action) {
      case "screenshot":
        ActionIcon = Camera;
        break;
      case "left_click":
        ActionIcon = MousePointer;
        break;
      case "right_click":
      case "double_click":
        ActionIcon = MousePointerClick;
        break;
      case "mouse_move":
      case "left_click_drag":
        ActionIcon = MousePointer;
        break;
      case "type":
        ActionIcon = Keyboard;
        break;
      case "key":
        ActionIcon = KeyRound;
        break;
      case "wait":
        ActionIcon = Clock;
        break;
      case "scroll":
        ActionIcon = ScrollText;
        break;
    }

    return (
      <motion.div
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={motionKey}
        className={cn(
          "flex flex-col gap-2 p-2 mb-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800",
          onSelect && "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors",
        )}
        onClick={() => onSelect?.(toolCallId)}
      >
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-white dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700">
            <ActionIcon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium font-mono">{label}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  statusBadgeStyles[displayStatus],
                )}
              >
                {displayStatus}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {formatDuration(displayDuration)}
              </span>
            </div>
            {detail ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {detail}
              </p>
            ) : null}
            {errorMessage ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            ) : null}
          </div>
          <div className="w-5 h-5 flex items-center justify-center">
            {renderStateIcon(displayStatus, state, isLatestMessage, status)}
          </div>
        </div>
        {screenshotResult ? (
          <div className="overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${screenshotResult.data}`}
              alt="Screenshot thumbnail"
              className="w-full aspect-[1024/768] rounded-md object-cover"
            />
          </div>
        ) : parsedArgs.action === "screenshot" && displayStatus === "pending" ? (
          <div className="w-full aspect-[1024/768] rounded-md bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
        ) : null}
      </motion.div>
    );
  }

  if (toolName === "bash") {
    const parsedArgs = parseBashToolArgs(args);

    if (!parsedArgs) {
      return null;
    }

    const output =
      typeof result === "string"
        ? result
        : event?.type === "bash"
          ? event.result
          : undefined;
    const displayStatus =
      event?.status ?? getToolInvocationStatus(state, output);

    return (
      <motion.div
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={motionKey}
        className={cn(
          "flex flex-col gap-2 p-2 mb-3 text-sm bg-zinc-50 dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-800",
          onSelect && "cursor-pointer hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors",
        )}
        onClick={() => onSelect?.(toolCallId)}
      >
        {(() => {
          const errorMessage = summarizeErrorMessage(
            event?.errorMessage ?? getToolInvocationErrorMessage(output),
          );
          const outputPreview =
            output && !errorMessage ? summarizeBashOutput(output) : null;

          return (
            <>
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-9 h-9 bg-white dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700">
            <ScrollText className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">Bash command</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                  statusBadgeStyles[displayStatus],
                )}
              >
                {displayStatus}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                {formatDuration(event?.duration)}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 font-mono break-all">
              {summarizeBashCommand(parsedArgs.command)}
            </p>
            {errorMessage ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {errorMessage}
              </p>
            ) : null}
          </div>
          <div className="w-5 h-5 flex items-center justify-center">
            {renderStateIcon(displayStatus, state, isLatestMessage, status)}
          </div>
        </div>
        {outputPreview ? (
          <pre className="max-h-32 overflow-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-white px-3 py-2 text-xs font-mono whitespace-pre-wrap dark:bg-zinc-950">
            {outputPreview}
          </pre>
        ) : null}
            </>
          );
        })()}
      </motion.div>
    );
  }

  return null;
}
