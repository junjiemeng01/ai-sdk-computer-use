import type { ToolInvocation } from "ai";

import { ABORTED } from "@/lib/utils";
import type {
  ComputerActionType,
  Coordinate,
  EventStatus,
} from "@/lib/types";

type UnknownRecord = Record<string, unknown>;

export type ScreenshotToolArgs = { action: "screenshot" };
export type PointerToolArgs = {
  action: "left_click" | "right_click" | "double_click" | "mouse_move";
  coordinate: Coordinate;
};
export type TextEntryToolArgs = {
  action: "type" | "key";
  text: string;
};
export type ScrollToolArgs = {
  action: "scroll";
  scroll_direction: string;
  scroll_amount: number;
};
export type WaitToolArgs = {
  action: "wait";
  duration: number;
};
export type DragToolArgs = {
  action: "left_click_drag";
  start_coordinate: Coordinate;
  coordinate: Coordinate;
};

export type ComputerToolArgs =
  | ScreenshotToolArgs
  | PointerToolArgs
  | TextEntryToolArgs
  | ScrollToolArgs
  | WaitToolArgs
  | DragToolArgs;

export type BashToolArgs = {
  command: string;
};

export type ImageToolResult = {
  type: "image";
  data: string;
};

export type TextToolResult = {
  type: "text";
  text: string;
};

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === "object" && value !== null ? (value as UnknownRecord) : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asCoordinate(value: unknown): Coordinate | null {
  if (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number"
  ) {
    return [value[0], value[1]];
  }

  return null;
}

export function isResultInvocation(
  invocation: ToolInvocation,
): invocation is Extract<ToolInvocation, { state: "result" }> {
  return invocation.state === "result";
}

export function parseComputerToolArgs(value: unknown): ComputerToolArgs | null {
  const record = asRecord(value);
  const action = asString(record?.action);

  if (!action) {
    return null;
  }

  switch (action as ComputerActionType) {
    case "screenshot":
      return { action: "screenshot" };
    case "left_click":
    case "right_click":
    case "double_click":
    case "mouse_move": {
      const coordinate = asCoordinate(record?.coordinate);

      if (!coordinate) {
        return null;
      }

      if (action === "left_click") {
        return { action: "left_click", coordinate };
      }

      if (action === "right_click") {
        return { action: "right_click", coordinate };
      }

      if (action === "double_click") {
        return { action: "double_click", coordinate };
      }

      return { action: "mouse_move", coordinate };
    }
    case "type":
      return { action: "type", text: asString(record?.text) ?? "" };
    case "key":
      return { action: "key", text: asString(record?.text) ?? "" };
    case "scroll": {
      const scroll_direction = asString(record?.scroll_direction);
      const scroll_amount = asNumber(record?.scroll_amount);

      return scroll_direction !== null && scroll_amount !== null
        ? { action: "scroll", scroll_direction, scroll_amount }
        : null;
    }
    case "wait": {
      const duration = asNumber(record?.duration);
      return duration !== null ? { action: "wait", duration } : null;
    }
    case "left_click_drag": {
      const start_coordinate = asCoordinate(record?.start_coordinate);
      const coordinate = asCoordinate(record?.coordinate);

      return start_coordinate && coordinate
        ? { action: "left_click_drag", start_coordinate, coordinate }
        : null;
    }
    default:
      return null;
  }
}

export function parseBashToolArgs(value: unknown): BashToolArgs | null {
  const record = asRecord(value);
  const command = asString(record?.command);

  return command !== null ? { command } : null;
}

export function parseImageToolResult(value: unknown): ImageToolResult | null {
  const record = asRecord(value);
  const type = asString(record?.type);
  const data = asString(record?.data);

  return type === "image" && data !== null ? { type: "image", data } : null;
}

export function parseTextToolResult(value: unknown): TextToolResult | null {
  const record = asRecord(value);
  const type = asString(record?.type);
  const text = asString(record?.text);

  return type === "text" && text !== null ? { type: "text", text } : null;
}

export function getToolInvocationErrorMessage(
  result: unknown,
): string | undefined {
  if (result === ABORTED) {
    return ABORTED;
  }

  if (typeof result === "string") {
    const normalized = result.trim();

    if (!normalized) {
      return undefined;
    }

    return normalized.startsWith("Error executing command:")
      ? normalized
      : undefined;
  }

  const textResult = parseTextToolResult(result);
  const normalized = textResult?.text.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.toLowerCase().startsWith("error")
    ? normalized
    : undefined;
}

export function describeComputerAction(args: ComputerToolArgs): {
  label: string;
  detail?: string;
} {
  switch (args.action) {
    case "screenshot":
      return { label: "Screenshot" };
    case "left_click":
      return {
        label: "Left click",
        detail: `at (${args.coordinate[0]}, ${args.coordinate[1]})`,
      };
    case "right_click":
      return {
        label: "Right click",
        detail: `at (${args.coordinate[0]}, ${args.coordinate[1]})`,
      };
    case "double_click":
      return {
        label: "Double click",
        detail: `at (${args.coordinate[0]}, ${args.coordinate[1]})`,
      };
    case "mouse_move":
      return {
        label: "Mouse move",
        detail: `to (${args.coordinate[0]}, ${args.coordinate[1]})`,
      };
    case "type":
      return { label: "Type", detail: args.text ? `"${args.text}"` : undefined };
    case "key":
      return { label: "Key press", detail: args.text ? `"${args.text}"` : undefined };
    case "scroll":
      return {
        label: "Scroll",
        detail: `${args.scroll_direction} by ${args.scroll_amount}`,
      };
    case "wait":
      return { label: "Wait", detail: `${args.duration} seconds` };
    case "left_click_drag":
      return {
        label: "Drag",
        detail: `from (${args.start_coordinate[0]}, ${args.start_coordinate[1]}) to (${args.coordinate[0]}, ${args.coordinate[1]})`,
      };
  }
}

export function getToolInvocationStatus(
  state: ToolInvocation["state"],
  result: unknown,
): EventStatus {
  if (state !== "result") {
    return "pending";
  }

  return getToolInvocationErrorMessage(result) ? "error" : "complete";
}

export function summarizeBashCommand(command: string): string {
  const normalized = command.trim();

  if (!normalized) {
    return "(empty command)";
  }

  return normalized.length > 64 ? `${normalized.slice(0, 64)}...` : normalized;
}

export function summarizeBashOutput(
  output: string,
  maxLines = 6,
  maxLength = 280,
): string {
  const normalized = output.trim();

  if (!normalized) {
    return "";
  }

  const lines = normalized.split("\n");
  const lineLimited =
    lines.length > maxLines
      ? `${lines.slice(0, maxLines).join("\n")}\n...`
      : normalized;

  return lineLimited.length > maxLength
    ? `${lineLimited.slice(0, maxLength)}...`
    : lineLimited;
}
