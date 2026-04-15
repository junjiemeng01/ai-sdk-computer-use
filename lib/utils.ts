import { UIMessage } from "ai";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const ABORTED = "User aborted";

export function createId(prefix = "id"): string {
  const cryptoApi =
    typeof globalThis !== "undefined" && "crypto" in globalThis
      ? globalThis.crypto
      : undefined;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);

    // Generate an RFC 4122 v4-compatible identifier when randomUUID is unavailable.
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));

    return [
      hex.slice(0, 4).join(""),
      hex.slice(4, 6).join(""),
      hex.slice(6, 8).join(""),
      hex.slice(8, 10).join(""),
      hex.slice(10, 16).join(""),
    ].join("-");
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export const prunedMessages = (messages: UIMessage[]): UIMessage[] => {
  if (messages.at(-1)?.role === "assistant") {
    return messages;
  }

  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (
        part.type !== "tool-invocation" ||
        part.toolInvocation.toolName !== "computer" ||
        part.toolInvocation.state !== "result"
      ) {
        return part;
      }

      const args =
        typeof part.toolInvocation.args === "object" &&
        part.toolInvocation.args !== null
          ? part.toolInvocation.args
          : null;

      if (!args || args.action !== "screenshot") {
        return part;
      }

      return {
        ...part,
        toolInvocation: {
          ...part.toolInvocation,
          result: {
            type: "text",
            text: "Image redacted to save input tokens",
          },
        },
      };
    }),
  }));
};
