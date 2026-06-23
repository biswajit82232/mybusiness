import { createContext, useContext } from "react";

/** The scrollable `<main className="main-stage">` element — passed to Virtuoso as `customScrollParent` for page-level scrolling. */
export const MainStageScrollParentContext = createContext(null);

export function useMainStageScrollParent() {
  return useContext(MainStageScrollParentContext);
}
