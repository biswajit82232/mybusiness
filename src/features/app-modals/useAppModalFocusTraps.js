import { useRef } from "react";
import { useFocusTrap } from "@/shared/hooks/useFocusTrap.js";

/** Refs + focus traps for payment, delete-confirm, import/reset, and generic confirm modals. */
export function useAppModalFocusTraps({ payModal, payPurchaseModal, delConfirm, actionConfirm, simpleConfirm }) {
  const payModalTrapRef = useRef(null);
  const delModalTrapRef = useRef(null);
  const actionConfirmTrapRef = useRef(null);
  const simpleConfirmTrapRef = useRef(null);
  useFocusTrap(payModalTrapRef, !!(payModal || payPurchaseModal));
  useFocusTrap(delModalTrapRef, !!delConfirm);
  useFocusTrap(actionConfirmTrapRef, !!actionConfirm);
  useFocusTrap(simpleConfirmTrapRef, !!simpleConfirm);
  return { payModalTrapRef, delModalTrapRef, actionConfirmTrapRef, simpleConfirmTrapRef };
}
