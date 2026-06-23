import { LS_WELCOME_DONE } from "@/domain/index.js";

export function readWelcomeDismissed() {
  try {
    return localStorage.getItem(LS_WELCOME_DONE) === "1";
  } catch {
    return true;
  }
}
