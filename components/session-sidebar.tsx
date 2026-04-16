"use client";

import { Plus, Trash2 } from "lucide-react";
import type { Session } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SessionSidebarProps {
  sessions: Session[];
  currentSessionId: string;
  onCreateSession: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  actionVisibility?: "hover" | "always";
  className?: string;
}

function formatDate(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(ts));
}

export function SessionSidebar({
  sessions,
  currentSessionId,
  onCreateSession,
  onSwitchSession,
  onDeleteSession,
  actionVisibility = "hover",
  className,
}: SessionSidebarProps) {
  const handleDelete = (e: React.MouseEvent, session: Session) => {
    e.stopPropagation();
    const hasMessages = session.messages.length > 0;
    if (hasMessages) {
      if (!confirm(`Delete session "${session.name}"? This will kill the desktop and clear all messages.`)) {
        return;
      }
    }
    onDeleteSession(session.id);
  };

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800",
        className,
      )}
    >
      {/* Header */}
      <div className="px-3 py-3 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Sessions</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onCreateSession}
          title="New session"
        >
          <Plus className="w-3 h-3" />
        </Button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto py-1">
        {sessions.map((session) => {
          const isActive = session.id === currentSessionId;
          return (
            <div
              key={session.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors",
                isActive && "bg-zinc-100 dark:bg-zinc-900",
              )}
              onClick={() => onSwitchSession(session.id)}
            >
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    "text-sm truncate",
                    isActive ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400",
                  )}
                >
                  {session.name}
                </div>
                <div className="text-xs text-zinc-400 truncate">
                  {formatDate(session.createdAt)} · {session.messages.length} msg
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-5 w-5 shrink-0 text-zinc-400 hover:text-red-500",
                  actionVisibility === "hover"
                    ? "opacity-0 group-hover:opacity-100"
                    : "opacity-100",
                )}
                onClick={(e) => handleDelete(e, session)}
                title="Delete session"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
