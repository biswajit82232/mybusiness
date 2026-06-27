import { startTransition } from "react";

export function runNavTransition(fn) {
  if (typeof fn !== "function") return;
  startTransition(fn);
}
