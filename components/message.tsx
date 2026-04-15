"use client";

import type { Message } from "ai";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import equal from "fast-deep-equal";
import { Streamdown } from "streamdown";

import { cn } from "@/lib/utils";
import { ToolCallCard } from "@/components/tool-call-card";
import type { AgentEvent, ChatStatus } from "@/lib/types";

const PurePreviewMessage = ({
  message,
  isLatestMessage,
  status,
  onSelectToolCall,
  eventLookup,
}: {
  message: Message;
  isLoading: boolean;
  status: ChatStatus;
  isLatestMessage: boolean;
  onSelectToolCall?: (toolCallId: string) => void;
  eventLookup: ReadonlyMap<string, AgentEvent>;
}) => {
  return (
    <AnimatePresence key={message.id}>
      <motion.div
        className="w-full mx-auto px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        key={`message-${message.id}`}
        data-role={message.role}
      >
        <div
          className={cn(
            "flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl",
            "group-data-[role=user]/message:w-fit",
          )}
        >
          <div className="flex flex-col w-full">
            {message.parts?.map((part, i) => {
              switch (part.type) {
                case "text":
                  return (
                    <motion.div
                      initial={{ y: 5, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      key={`message-${message.id}-part-${i}`}
                      className="flex flex-row gap-2 items-start w-full pb-4"
                    >
                      <div
                        className={cn("flex flex-col gap-4", {
                          "bg-secondary text-secondary-foreground px-3 py-2 rounded-xl":
                            message.role === "user",
                        })}
                      >
                        <Streamdown>{part.text}</Streamdown>
                      </div>
                    </motion.div>
                  );

                case "tool-invocation": {
                  const { toolName, toolCallId, state, args } = part.toolInvocation;
                  const result =
                    state === "result" ? part.toolInvocation.result : undefined;
                  const event = eventLookup.get(toolCallId);

                  if (toolName === "computer" || toolName === "bash") {
                    return (
                      <ToolCallCard
                        key={`message-${message.id}-part-${i}`}
                        toolName={toolName as "computer" | "bash"}
                        toolCallId={toolCallId}
                        args={args}
                        result={result}
                        state={state}
                        isLatestMessage={isLatestMessage}
                        status={status}
                        event={event}
                        motionKey={`message-${message.id}-part-${i}`}
                        onSelect={onSelectToolCall}
                      />
                    );
                  }

                  return (
                    <div key={toolCallId}>
                      <h3>
                        {toolName}: {state}
                      </h3>
                      <pre>{JSON.stringify(args, null, 2)}</pre>
                    </div>
                  );
                }

                default:
                  return null;
              }
            })}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.status !== nextProps.status) return false;
    if (prevProps.message.annotations !== nextProps.message.annotations)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (prevProps.eventLookup !== nextProps.eventLookup) return false;
    if (prevProps.onSelectToolCall !== nextProps.onSelectToolCall) return false;
    return true;
  },
);
