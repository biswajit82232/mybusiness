import { useEffect } from "react";

/** Prompts before tab close/refresh while `pendingWritesRef` indicates in-flight persistence. */
export function useBeforeUnloadWhenPendingWrites(pendingWritesRef) {
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (pendingWritesRef.current <= 0) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [pendingWritesRef]);
}
