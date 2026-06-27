import { useEffect } from "react";
import { isPersistLocked } from "@/data/local/persistMutex.js";

/** Prompts before tab close/refresh while persistence or debounced save is in flight. */
export function useBeforeUnloadWhenPendingWrites(pendingWritesRef, persistTimerRef) {
  useEffect(() => {
    const onBeforeUnload = (e) => {
      const debouncePending = !!persistTimerRef?.current;
      if (pendingWritesRef.current <= 0 && !debouncePending && !isPersistLocked()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pendingWritesRef, persistTimerRef]);
}
