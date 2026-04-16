"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { EventStore, AgentEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DebugPanelProps {
  eventStore: EventStore;
  systemIssue?: string | null;
}

const statusColors: Record<EventStore["agentStatus"], string> = {
  idle: "bg-zinc-400",
  thinking: "bg-yellow-400 animate-pulse",
  executing: "bg-blue-500 animate-pulse",
};

function formatTs(ts: number): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(ts));
}

const eventTypeOrder: AgentEvent["type"][] = [
  "screenshot",
  "left_click",
  "right_click",
  "double_click",
  "mouse_move",
  "type",
  "key",
  "scroll",
  "wait",
  "left_click_drag",
  "bash",
];

export function DebugPanel({ eventStore, systemIssue }: DebugPanelProps) {
  const [open, setOpen] = useState(false);

  const { events, countsByType, agentStatus } = eventStore;
  const totalEvents = events.length;

  return (
    <div className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">
      {/* Toggle row */}
      <button
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn("inline-block w-2 h-2 rounded-full", statusColors[agentStatus])}
          />
          <span>Debug — {agentStatus}</span>
          <span className="ml-1 text-zinc-400">({totalEvents} events)</span>
        </div>
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {open && (
        <div className="px-4 pb-3 flex flex-col gap-3">
          {systemIssue ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
              <div className="font-semibold uppercase tracking-wide">Latest desktop issue</div>
              <p className="mt-1">{systemIssue}</p>
            </div>
          ) : null}

          {/* Counts by type */}
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
              Event counts
            </div>
            <div className="grid grid-cols-3 gap-1">
              {eventTypeOrder.map((type) => {
                const count = countsByType[type] ?? 0;
                if (count === 0) return null;
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-2 py-1 text-xs font-mono"
                  >
                    <span className="text-zinc-500 truncate">{type}</span>
                    <span className="font-semibold ml-1">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event timeline */}
          <div>
            <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-1">
              Timeline
            </div>
            {events.length === 0 ? (
              <div className="rounded border border-dashed border-zinc-200 bg-white px-3 py-4 text-xs text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900">
                No tool calls yet. Trigger an agent action to populate the event timeline.
              </div>
            ) : (
              <div className="overflow-y-auto max-h-40 rounded border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-zinc-100 dark:bg-zinc-900 sticky top-0">
                    <tr>
                      <th className="text-left px-2 py-1 text-zinc-500 font-medium">Time</th>
                      <th className="text-left px-2 py-1 text-zinc-500 font-medium">Type</th>
                      <th className="text-left px-2 py-1 text-zinc-500 font-medium">Status</th>
                      <th className="text-right px-2 py-1 text-zinc-500 font-medium">ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...events].reverse().map((ev) => (
                      <tr key={ev.id} className="border-t border-zinc-100 dark:border-zinc-800">
                        <td className="px-2 py-1 text-zinc-400">{formatTs(ev.timestamp)}</td>
                        <td className="px-2 py-1">{ev.type}</td>
                        <td
                          className={cn("px-2 py-1", {
                            "text-green-600": ev.status === "complete",
                            "text-red-500": ev.status === "error",
                            "text-yellow-500": ev.status === "pending",
                          })}
                        >
                          {ev.status}
                        </td>
                        <td className="px-2 py-1 text-right text-zinc-400">
                          {ev.duration ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
