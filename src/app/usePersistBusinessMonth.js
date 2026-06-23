import { useEffect } from "react";
import { persistBusinessMonth } from "@/domain/index.js";

/** Persists global reporting month so Home and Sales stay aligned across visits. */
export function usePersistBusinessMonth(businessMonth) {
  useEffect(() => {
    persistBusinessMonth(businessMonth);
  }, [businessMonth]);
}
