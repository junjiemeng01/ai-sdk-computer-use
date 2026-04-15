"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { MessageSquareText, Monitor, PanelLeft, X } from "lucide-react";
import { toast } from "sonner";
import type { UIMessage } from "ai";

import { ChatPanel } from "@/components/chat-panel";
import { AISDKLogo } from "@/components/icons";
import { DeployButton } from "@/components/project-info";
import { SessionSidebar } from "@/components/session-sidebar";
import { ToolCallDetail } from "@/components/tool-call-detail";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { VncViewer } from "@/components/vnc-viewer";
import { buildEventStore, deriveEvents } from "@/lib/agent-events";
import { getDesktopURL } from "@/lib/sandbox/utils";
import type { AgentEvent, Session } from "@/lib/types";
import { useScrollToBottom } from "@/lib/use-scroll-to-bottom";
import { ABORTED, createId } from "@/lib/utils";

const STORAGE_KEY = "agent-sessions-v2";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function sendKillDesktopBeacon(sandboxId: string) {
  navigator.sendBeacon(
    `/api/kill-desktop?sandboxId=${encodeURIComponent(sandboxId)}`,
  );
}

function getDesktopIssueMessage(error: unknown): string {
  const fallback =
    error instanceof Error && error.message.trim()
      ? error.message.trim()
      : "Unable to initialize the desktop. Check sandbox access and try again.";
  const record = isRecord(error) ? error : null;
  const text = typeof record?.text === "string" ? record.text : "";
  const response = isRecord(record?.response) ? record.response : null;
  const status = typeof response?.status === "number" ? response.status : null;
  const combined = `${fallback}\n${text}`.toLowerCase();

  if (
    status === 429 ||
    combined.includes("status code 429") ||
    combined.includes("rate_limited")
  ) {
    return "Vercel Sandbox rate limit reached. Wait about 10 minutes and try again.";
  }

  if (status === 401 || status === 403) {
    return "Unable to initialize the desktop. Check your Vercel Sandbox credentials and project access.";
  }

  return fallback;
}

function makeSession(name: string): Session {
  return {
    id: createId("session"),
    name,
    createdAt: Date.now(),
    messages: [],
    events: [],
    sandboxId: null,
  };
}

function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isRecord)
      .map((session, index) => ({
        id:
          typeof session.id === "string" && session.id
            ? session.id
            : createId("session"),
        name:
          typeof session.name === "string" && session.name.trim()
            ? session.name
            : `Session ${index + 1}`,
        createdAt:
          typeof session.createdAt === "number" ? session.createdAt : Date.now(),
        messages: Array.isArray(session.messages)
          ? (session.messages as UIMessage[])
          : [],
        events: Array.isArray(session.events)
          ? (session.events as AgentEvent[])
          : [],
        sandboxId: typeof session.sandboxId === "string" ? session.sandboxId : null,
      }))
      .sort((left, right) => right.createdAt - left.createdAt);
  } catch {
    return [];
  }
}

function saveSessions(sessions: Session[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // ignore persistence failures
  }
}

export default function Page() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState("");
  const [isInitializing, setIsInitializing] = useState(false);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [desktopIssue, setDesktopIssue] = useState<string | null>(null);
  const [selectedToolCallId, setSelectedToolCallId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"chat" | "desktop">("chat");
  const [isMobileSessionsOpen, setIsMobileSessionsOpen] = useState(false);

  const activeSessionIdRef = useRef("");
  const sessionsRef = useRef<Session[]>([]);
  const [desktopContainerRef, desktopEndRef] = useScrollToBottom();
  const [mobileContainerRef, mobileEndRef] = useScrollToBottom();

  useEffect(() => {
    const loadedSessions = loadSessions();

    if (loadedSessions.length > 0) {
      setSessions(loadedSessions);
      setCurrentSessionId(loadedSessions[0].id);
      return;
    }

    const firstSession = makeSession("Session 1");
    setSessions([firstSession]);
    setCurrentSessionId(firstSession.id);
  }, []);

  useEffect(() => {
    if (sessions.length > 0) {
      saveSessions(sessions);
    }
  }, [sessions]);

  useEffect(() => {
    activeSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  const currentSession =
    sessions.find((session) => session.id === currentSessionId) ?? null;

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop: stopGeneration,
    append,
    setMessages,
  } = useChat({
    api: "/api/chat",
    id: currentSessionId || "bootstrap",
    body: { sandboxId: currentSession?.sandboxId ?? null },
    maxSteps: 30,
    initialMessages: [],
    onError: (error) => {
      console.error(error);
      const description =
        error instanceof Error && error.message
          ? error.message
          : "Please try again later.";
      toast.error("There was an error", {
        description,
        richColors: true,
        position: "top-center",
      });
    },
  });

  const updateSession = useCallback(
    (sessionId: string, updater: (session: Session) => Session) => {
      setSessions((previousSessions) =>
        previousSessions.map((session) =>
          session.id === sessionId ? updater(session) : session,
        ),
      );
    },
    [],
  );

  const initDesktop = useCallback(
    async (sessionId: string, existingSandboxId?: string | null) => {
      if (activeSessionIdRef.current === sessionId) {
        setDesktopIssue(null);
      }

      setIsInitializing(true);

      try {
        const { streamUrl: nextStreamUrl, id } = await getDesktopURL(
          existingSandboxId ?? undefined,
        );

        updateSession(sessionId, (session) => ({ ...session, sandboxId: id }));

        if (activeSessionIdRef.current === sessionId) {
          setDesktopIssue(null);
          setStreamUrl(nextStreamUrl);
        }
      } catch (error) {
        console.error("Failed to initialize desktop:", error);
        const issueMessage = getDesktopIssueMessage(error);
        if (activeSessionIdRef.current === sessionId) {
          setDesktopIssue(issueMessage);
          toast.error("Failed to initialize desktop", {
            description: issueMessage,
            richColors: true,
            position: "top-center",
          });
        }
      } finally {
        if (activeSessionIdRef.current === sessionId) {
          setIsInitializing(false);
        }
      }
    },
    [updateSession],
  );

  useEffect(() => {
    if (!currentSessionId || !currentSession) {
      return;
    }

    setStreamUrl(null);
    void initDesktop(currentSessionId, currentSession.sandboxId);
    // We only want to initialize when the active session changes.
    // Re-running this on every session object update creates sandbox loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId, initDesktop]);

  useEffect(() => {
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const eventName = isIOS || isSafari ? "pagehide" : "beforeunload";

    const killDesktops = () => {
      const sandboxIds = Array.from(
        new Set(
          sessionsRef.current
            .map((session) => session.sandboxId)
            .filter((sandboxId): sandboxId is string => Boolean(sandboxId)),
        ),
      );

      for (const sandboxId of sandboxIds) {
        sendKillDesktopBeacon(sandboxId);
      }
    };

    window.addEventListener(eventName, killDesktops);

    return () => {
      window.removeEventListener(eventName, killDesktops);
    };
  }, []);

  useEffect(() => {
    if (!currentSession) {
      return;
    }

    setMessages(currentSession.messages);
    setDesktopIssue(null);
    setSelectedToolCallId(null);
    setMobileView("chat");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSessionId]);

  useEffect(() => {
    if (!currentSessionId) {
      return;
    }

    updateSession(currentSessionId, (session) => ({ ...session, messages }));
  }, [currentSessionId, messages, updateSession]);

  useEffect(() => {
    if (!currentSessionId) {
      return;
    }

    updateSession(currentSessionId, (session) => ({
      ...session,
      events: deriveEvents(messages, session.events),
    }));
  }, [currentSessionId, messages, updateSession]);

  const isLoading = status !== "ready";
  const events = currentSession?.events;
  const eventStore = useMemo(
    () => buildEventStore(events ?? [], isLoading),
    [events, isLoading],
  );
  const eventLookup = useMemo(
    () =>
      new Map(eventStore.events.map((event) => [event.toolCallId, event] as const)),
    [eventStore.events],
  );
  const selectedEvent = selectedToolCallId
    ? eventLookup.get(selectedToolCallId) ?? null
    : null;

  useEffect(() => {
    if (selectedToolCallId && !selectedEvent) {
      setSelectedToolCallId(null);
    }
  }, [selectedEvent, selectedToolCallId]);

  const stop = useCallback(() => {
    stopGeneration();

    const lastMessage = messages.at(-1);
    const lastPart = lastMessage?.parts.at(-1);

    if (
      lastMessage?.role === "assistant" &&
      lastPart?.type === "tool-invocation"
    ) {
      setMessages((previousMessages) => [
        ...previousMessages.slice(0, -1),
        {
          ...lastMessage,
          parts: [
            ...lastMessage.parts.slice(0, -1),
            {
              ...lastPart,
              toolInvocation: {
                ...lastPart.toolInvocation,
                state: "result",
                result: ABORTED,
              },
            },
          ],
        },
      ]);
    }
  }, [messages, setMessages, stopGeneration]);

  const createSession = useCallback(() => {
    stopGeneration();

    const nextSession = makeSession(`Session ${sessions.length + 1}`);
    setSessions((previousSessions) => [nextSession, ...previousSessions]);
    setCurrentSessionId(nextSession.id);
    setSelectedToolCallId(null);
    setIsMobileSessionsOpen(false);
  }, [sessions.length, stopGeneration]);

  const switchSession = useCallback(
    (sessionId: string) => {
      if (sessionId === currentSessionId) {
        setIsMobileSessionsOpen(false);
        return;
      }

      stopGeneration();
      updateSession(currentSessionId, (session) => ({ ...session, messages }));
      setCurrentSessionId(sessionId);
      setIsMobileSessionsOpen(false);
    },
    [currentSessionId, messages, stopGeneration, updateSession],
  );

  const deleteSession = useCallback(
    (sessionId: string) => {
      const session = sessions.find((candidate) => candidate.id === sessionId);

      if (session?.sandboxId) {
        sendKillDesktopBeacon(session.sandboxId);
      }

      if (sessionId === currentSessionId) {
        stopGeneration();
      }

      setSessions((previousSessions) => {
        const remainingSessions = previousSessions.filter(
          (sessionItem) => sessionItem.id !== sessionId,
        );

        if (remainingSessions.length === 0) {
          const firstSession = makeSession("Session 1");
          setCurrentSessionId(firstSession.id);
          return [firstSession];
        }

        if (sessionId === currentSessionId) {
          setCurrentSessionId(remainingSessions[0].id);
        }

        return remainingSessions;
      });

      setSelectedToolCallId(null);
      setIsMobileSessionsOpen(false);
    },
    [currentSessionId, sessions, stopGeneration],
  );

  const refreshDesktop = useCallback(() => {
    if (!currentSessionId) {
      return;
    }

    setDesktopIssue(null);

    if (currentSession?.sandboxId) {
      sendKillDesktopBeacon(currentSession.sandboxId);
      updateSession(currentSessionId, (session) => ({ ...session, sandboxId: null }));
    }

    setStreamUrl(null);
    void initDesktop(currentSessionId, null);
  }, [currentSession?.sandboxId, currentSessionId, initDesktop, updateSession]);

  const selectToolCall = useCallback((toolCallId: string) => {
    setSelectedToolCallId((previousToolCallId) =>
      previousToolCallId === toolCallId ? null : toolCallId,
    );
  }, []);

  const closeMobileSessions = useCallback(() => {
    setIsMobileSessionsOpen(false);
  }, []);

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="hidden md:flex h-full min-h-0">
        <div className="w-[200px] lg:w-[220px] shrink-0 h-full">
          <SessionSidebar
            sessions={sessions}
            currentSessionId={currentSessionId}
            onCreateSession={createSession}
            onSwitchSession={switchSession}
            onDeleteSession={deleteSession}
          />
        </div>

        <div className="flex-1 min-w-0 h-full overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel defaultSize={36} minSize={28} className="overflow-hidden">
              <ChatPanel
                messages={messages}
                input={input}
                handleInputChange={handleInputChange}
                handleSubmit={handleSubmit}
                status={status}
                isLoading={isLoading}
                isInitializing={isInitializing}
                stop={stop}
                append={append}
                containerRef={desktopContainerRef}
                endRef={desktopEndRef}
                onSelectToolCall={selectToolCall}
                eventStore={eventStore}
                eventLookup={eventLookup}
                systemIssue={desktopIssue}
              />
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={64} minSize={36} className="flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-hidden">
                <VncViewer
                  streamUrl={streamUrl}
                  isInitializing={isInitializing}
                  errorMessage={desktopIssue}
                  onRefresh={refreshDesktop}
                />
              </div>

              <div className="h-72 lg:h-80 shrink-0 border-t border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <ToolCallDetail
                  event={selectedEvent}
                  systemIssue={desktopIssue}
                  onClose={() => setSelectedToolCallId(null)}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>

      <div className="md:hidden flex h-full flex-col">
        <div className="shrink-0 border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3">
            <AISDKLogo />
            <div className="flex items-center gap-2">
              <Button
                variant={mobileView === "chat" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMobileView("chat")}
              >
                <MessageSquareText className="size-4" />
                Chat
              </Button>
              <Button
                variant={mobileView === "desktop" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setMobileView("desktop")}
              >
                <Monitor className="size-4" />
                Desktop
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSessionsOpen(true)}
                title="Open sessions"
              >
                <PanelLeft className="size-4" />
              </Button>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="truncate">
              {currentSession?.name ?? "Loading session"}
            </span>
            <DeployButton />
          </div>
        </div>

        {mobileView === "chat" ? (
          <ChatPanel
            messages={messages}
            input={input}
            handleInputChange={handleInputChange}
            handleSubmit={handleSubmit}
            status={status}
            isLoading={isLoading}
            isInitializing={isInitializing}
            stop={stop}
            append={append}
            containerRef={mobileContainerRef}
            endRef={mobileEndRef}
            onSelectToolCall={selectToolCall}
            eventStore={eventStore}
            eventLookup={eventLookup}
            systemIssue={desktopIssue}
            showHeader={false}
          />
        ) : (
          <div className="flex flex-1 min-h-0 flex-col">
            <div className="flex-1 min-h-0 overflow-hidden">
              <VncViewer
                streamUrl={streamUrl}
                isInitializing={isInitializing}
                errorMessage={desktopIssue}
                onRefresh={refreshDesktop}
              />
            </div>
            <div className="h-72 shrink-0 border-t border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <ToolCallDetail
                event={selectedEvent}
                systemIssue={desktopIssue}
                onClose={() => setSelectedToolCallId(null)}
              />
            </div>
          </div>
        )}

        {isMobileSessionsOpen ? (
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]"
            onClick={closeMobileSessions}
          >
            <div
              className="absolute inset-y-0 left-0 flex w-[88vw] max-w-sm flex-col bg-white dark:bg-zinc-950"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div>
                  <div className="text-sm font-semibold">Sessions</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    Switch chats and revisit stored event history.
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={closeMobileSessions}>
                  <X className="size-4" />
                </Button>
              </div>
              <SessionSidebar
                sessions={sessions}
                currentSessionId={currentSessionId}
                onCreateSession={createSession}
                onSwitchSession={switchSession}
                onDeleteSession={deleteSession}
                actionVisibility="always"
                className="border-r-0"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
