import type { UIMessage } from "ai";

import type { AgentEvent, EventStore } from "@/lib/types";
import {
  getToolInvocationErrorMessage,
  getToolInvocationStatus,
  isResultInvocation,
  parseBashToolArgs,
  parseComputerToolArgs,
  parseImageToolResult,
} from "@/lib/tool-invocations";

function getDuration(
  isComplete: boolean,
  startedAt: number,
  existingDuration?: number,
): number | undefined {
  if (!isComplete) {
    return existingDuration;
  }

  return existingDuration ?? Math.max(0, Date.now() - startedAt);
}

export function deriveEvents(
  messages: UIMessage[],
  previousEvents: AgentEvent[],
): AgentEvent[] {
  const previousByToolCallId = new Map(
    previousEvents.map((event) => [event.toolCallId, event]),
  );
  const startedAtByToolCallId = new Map(
    previousEvents.map((event) => [event.toolCallId, event.timestamp]),
  );
  const events: AgentEvent[] = [];

  for (const message of messages) {
    for (const part of message.parts ?? []) {
      if (part.type !== "tool-invocation") {
        continue;
      }

      const invocation = part.toolInvocation;
      const previousEvent = previousByToolCallId.get(invocation.toolCallId);
      const timestamp = previousEvent?.timestamp ?? Date.now();

      if (!startedAtByToolCallId.has(invocation.toolCallId)) {
        startedAtByToolCallId.set(invocation.toolCallId, timestamp);
      }

      const startedAt =
        startedAtByToolCallId.get(invocation.toolCallId) ?? timestamp;
      const isComplete = invocation.state === "result";
      const duration = getDuration(isComplete, startedAt, previousEvent?.duration);

      if (invocation.toolName === "computer") {
        const args = parseComputerToolArgs(invocation.args);

        if (!args) {
          continue;
        }

        const errorMessage = isResultInvocation(invocation)
          ? getToolInvocationErrorMessage(invocation.result)
          : undefined;
        const status = getToolInvocationStatus(
          invocation.state,
          isResultInvocation(invocation) ? invocation.result : undefined,
        );

        switch (args.action) {
          case "screenshot": {
            const imageResult = isResultInvocation(invocation)
              ? parseImageToolResult(invocation.result)
              : null;

            events.push({
              id: invocation.toolCallId,
              timestamp,
              toolCallId: invocation.toolCallId,
              status,
              duration,
              type: "screenshot",
              payload: {},
              ...(errorMessage ? { errorMessage } : {}),
              ...(imageResult ? { result: { data: imageResult.data } } : {}),
            });
            break;
          }
          case "left_click":
          case "right_click":
          case "double_click":
            events.push({
              id: invocation.toolCallId,
              timestamp,
              toolCallId: invocation.toolCallId,
              status,
              duration,
              type: args.action,
              payload: { coordinate: args.coordinate },
              ...(errorMessage ? { errorMessage } : {}),
            });
            break;
          case "mouse_move":
            events.push({
              id: invocation.toolCallId,
              timestamp,
              toolCallId: invocation.toolCallId,
              status,
              duration,
              type: "mouse_move",
              payload: { coordinate: args.coordinate },
              ...(errorMessage ? { errorMessage } : {}),
            });
            break;
          case "type":
            events.push({
              id: invocation.toolCallId,
              timestamp,
              toolCallId: invocation.toolCallId,
              status,
              duration,
              type: "type",
              payload: { text: args.text },
              ...(errorMessage ? { errorMessage } : {}),
            });
            break;
          case "key":
            events.push({
              id: invocation.toolCallId,
              timestamp,
              toolCallId: invocation.toolCallId,
              status,
              duration,
              type: "key",
              payload: { text: args.text },
              ...(errorMessage ? { errorMessage } : {}),
            });
            break;
          case "scroll":
            events.push({
              id: invocation.toolCallId,
              timestamp,
              toolCallId: invocation.toolCallId,
              status,
              duration,
              type: "scroll",
              payload: {
                direction: args.scroll_direction,
                amount: args.scroll_amount,
              },
              ...(errorMessage ? { errorMessage } : {}),
            });
            break;
          case "wait":
            events.push({
              id: invocation.toolCallId,
              timestamp,
              toolCallId: invocation.toolCallId,
              status,
              duration,
              type: "wait",
              payload: { duration: args.duration },
              ...(errorMessage ? { errorMessage } : {}),
            });
            break;
          case "left_click_drag":
            events.push({
              id: invocation.toolCallId,
              timestamp,
              toolCallId: invocation.toolCallId,
              status,
              duration,
              type: "left_click_drag",
              payload: {
                start: args.start_coordinate,
                end: args.coordinate,
              },
              ...(errorMessage ? { errorMessage } : {}),
            });
            break;
        }

        continue;
      }

      if (invocation.toolName === "bash") {
        const args = parseBashToolArgs(invocation.args);

        if (!args) {
          continue;
        }

        const result =
          isResultInvocation(invocation) && typeof invocation.result === "string"
            ? invocation.result
            : undefined;
        const errorMessage = isResultInvocation(invocation)
          ? getToolInvocationErrorMessage(invocation.result)
          : undefined;

        events.push({
          id: invocation.toolCallId,
          timestamp,
          toolCallId: invocation.toolCallId,
          status: getToolInvocationStatus(invocation.state, result),
          duration,
          type: "bash",
          payload: { command: args.command },
          ...(errorMessage ? { errorMessage } : {}),
          ...(result !== undefined ? { result } : {}),
        });
      }
    }
  }

  return events;
}

export function buildEventStore(
  events: AgentEvent[],
  isLoading: boolean,
): EventStore {
  const sortedEvents = [...events].sort(
    (left, right) =>
      left.timestamp - right.timestamp || left.toolCallId.localeCompare(right.toolCallId),
  );
  const countsByType: EventStore["countsByType"] = {};

  for (const event of sortedEvents) {
    countsByType[event.type] = (countsByType[event.type] ?? 0) + 1;
  }

  const lastEvent = sortedEvents.at(-1);

  return {
    events: sortedEvents,
    countsByType,
    agentStatus: isLoading
      ? lastEvent?.status === "pending"
        ? "executing"
        : "thinking"
      : "idle",
  };
}
