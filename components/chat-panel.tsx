"use client";

import type { UIMessage } from "ai";
import { PreviewMessage } from "@/components/message";
import { Input } from "@/components/input";
import { PromptSuggestions } from "@/components/prompt-suggestions";
import { ProjectInfo } from "@/components/project-info";
import { DebugPanel } from "@/components/debug-panel";
import { AISDKLogo } from "@/components/icons";
import { DeployButton } from "@/components/project-info";
import type { AgentEvent, EventStore, ChatStatus } from "@/lib/types";
import React from "react";

interface ChatPanelProps {
  messages: UIMessage[];
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  status: ChatStatus;
  isLoading: boolean;
  isInitializing: boolean;
  stop: () => void;
  append: (msg: { role: "user"; content: string }) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  endRef: React.RefObject<HTMLDivElement | null>;
  onSelectToolCall?: (toolCallId: string) => void;
  eventStore: EventStore;
  eventLookup: ReadonlyMap<string, AgentEvent>;
  systemIssue?: string | null;
  showHeader?: boolean;
}

export function ChatPanel({
  messages,
  input,
  handleInputChange,
  handleSubmit,
  status,
  isLoading,
  isInitializing,
  stop,
  append,
  containerRef,
  endRef,
  onSelectToolCall,
  eventStore,
  eventLookup,
  systemIssue,
  showHeader = true,
}: ChatPanelProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {showHeader ? (
        <div className="bg-white dark:bg-zinc-950 py-3 px-4 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <AISDKLogo />
          <DeployButton />
        </div>
      ) : null}

      <div
        className="flex-1 space-y-6 py-4 overflow-y-auto px-4"
        ref={containerRef}
      >
        {messages.length === 0 && <ProjectInfo />}
        {messages.map((message, i) => (
          <PreviewMessage
            message={message}
            key={message.id}
            isLoading={isLoading}
            status={status}
            isLatestMessage={i === messages.length - 1}
            onSelectToolCall={onSelectToolCall}
            eventLookup={eventLookup}
          />
        ))}
        <div ref={endRef} className="pb-2" />
      </div>

      {messages.length === 0 && (
        <PromptSuggestions
          disabled={isInitializing}
          submitPrompt={(prompt: string) => append({ role: "user", content: prompt })}
        />
      )}

      <div className="bg-white dark:bg-zinc-950 shrink-0">
        <form onSubmit={handleSubmit} className="p-4">
          <Input
            handleInputChange={handleInputChange}
            input={input}
            isInitializing={isInitializing}
            isLoading={isLoading}
            status={status}
            stop={stop}
          />
        </form>
      </div>

      <DebugPanel eventStore={eventStore} systemIssue={systemIssue} />
    </div>
  );
}
