"use client";

import { memo, useRef } from "react";
import { Button } from "@/components/ui/button";

interface VncViewerProps {
  streamUrl: string | null;
  isInitializing: boolean;
  errorMessage?: string | null;
  onRefresh: () => void;
}

const PureVncViewer = ({
  streamUrl,
  isInitializing,
  errorMessage,
  onRefresh,
}: VncViewerProps) => {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  return (
    <div className="relative h-full bg-black flex items-center justify-center">
      {streamUrl ? (
        <>
          <iframe
            src={streamUrl}
            title="AI agent desktop stream"
            className="w-full h-full"
            style={{ transformOrigin: "center", width: "100%", height: "100%" }}
            allow="autoplay"
          />
          <Button
            onClick={onRefresh}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded text-sm z-10"
            disabled={isInitializing}
          >
            {isInitializing ? "Creating desktop..." : "New desktop"}
          </Button>
        </>
      ) : errorMessage ? (
        <div className="flex max-w-md flex-col items-center gap-3 px-6 text-center text-white">
          <div className="text-base font-semibold">Desktop unavailable</div>
          <p className="text-sm text-zinc-300">{errorMessage}</p>
          <Button
            onClick={onRefresh}
            className="bg-white/10 hover:bg-white/20 text-white"
            disabled={isInitializing}
          >
            Retry desktop
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full text-white">
          {isInitializing ? "Initializing desktop..." : "Loading stream..."}
        </div>
      )}
      {process.env.NODE_ENV !== "production" ? (
        <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[11px] font-mono text-white/80">
          VNC renders: {renderCountRef.current}
        </div>
      ) : null}
    </div>
  );
};

export const VncViewer = memo(
  PureVncViewer,
  (prev, next) =>
    prev.streamUrl === next.streamUrl &&
    prev.isInitializing === next.isInitializing &&
    prev.errorMessage === next.errorMessage,
);

VncViewer.displayName = "VncViewer";
