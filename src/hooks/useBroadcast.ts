import { useEffect } from "react";
import type { Broadcast } from "@/messaging/contracts";
import { onBroadcast } from "@/messaging/client";

export function useBroadcast(handler: (msg: Broadcast) => void): void {
  useEffect(() => {
    return onBroadcast(handler);
    // intentionally re-bind on every render so closures see latest state;
    // handler should be wrapped in useCallback at the call site if needed.
  });
}
