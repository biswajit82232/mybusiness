/**
 * Free servicing schedule: 3 visits at months 1, 2, 3 after each sale (purchase).
 * Completions stored in `servicingCompletions`; slots derived from sales.
 */
import {
  addMonthsStr,
  compareRecordsByRecency,
  compareYmdAsc,
  dateSlash,
  daysDiffFromToday,
  normServicingCompletions,
  todayStr,
  waMessageHref,
} from "./appModel.js";

export const SERVICING_VISIT_NUMBERS = [1, 2, 3];
export const SERVICING_REMINDER_DAYS_BEFORE = 3;

export function servicingSlotId(saleId, serviceNum) {
  return `svc-${String(saleId || "")}-${serviceNum}`;
}

function completionKey(saleId, serviceNum) {
  return `${String(saleId)}-${serviceNum}`;
}

/** Union local + remote completion rows; remote wins when the same visit appears in both. */
export function mergeServicingCompletions(local, remote) {
  const map = new Map();
  for (const c of normServicingCompletions(local)) {
    map.set(completionKey(c.saleId, c.serviceNum), c);
  }
  for (const c of normServicingCompletions(remote)) {
    map.set(completionKey(c.saleId, c.serviceNum), c);
  }
  return [...map.values()];
}

export function isServicingVisitComplete(completions, saleId, serviceNum) {
  const key = completionKey(saleId, serviceNum);
  return (Array.isArray(completions) ? completions : []).some(
    (c) => c && completionKey(c.saleId, c.serviceNum) === key,
  );
}

/** Derive all servicing slots from sales + recorded completions. */
export function deriveServicingSlots(sales, completions, asOfStr = todayStr()) {
  const comp = normServicingCompletions(completions);
  const out = [];
  const asOf = String(asOfStr || todayStr()).slice(0, 10);

  for (const sale of Array.isArray(sales) ? sales : []) {
    if (!sale || typeof sale !== "object" || !sale.id) continue;
    const purchaseDate = String(sale.date || "").slice(0, 10);
    if (!purchaseDate) continue;
    const customerName = String(sale.customerName || "").trim() || "Customer";
    const phone = String(sale.customerNo1 || sale.customerNo2 || "").trim();

    for (const serviceNum of SERVICING_VISIT_NUMBERS) {
      const dueDate = addMonthsStr(purchaseDate, serviceNum);
      const done = isServicingVisitComplete(comp, sale.id, serviceNum);
      const completion = done
        ? comp.find((c) => completionKey(c.saleId, c.serviceNum) === completionKey(sale.id, serviceNum))
        : null;
      let status = "pending";
      if (done) status = "done";
      else {
        const diff = daysDiffFromToday(dueDate);
        if (diff != null && diff < 0) status = "overdue";
        else if (diff === 0) status = "due-today";
        else if (diff != null && diff <= SERVICING_REMINDER_DAYS_BEFORE) status = "due-soon";
      }
      out.push({
        id: servicingSlotId(sale.id, serviceNum),
        saleId: String(sale.id),
        invoiceNo: String(sale.invoiceNo || ""),
        customerName,
        customerNo1: String(sale.customerNo1 || ""),
        customerNo2: String(sale.customerNo2 || ""),
        phone,
        item: String(sale.item || "").trim(),
        purchaseDate,
        serviceNum,
        dueDate,
        completed: done,
        completedDate: completion?.completedDate || "",
        status,
        asOf,
      });
    }
  }

  return out.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const byDue = compareYmdAsc(a.dueDate, b.dueDate);
    if (byDue !== 0) return byDue;
    return compareRecordsByRecency({ date: a.purchaseDate, id: a.saleId }, { date: b.purchaseDate, id: b.saleId });
  });
}

/** Servicing slots for a single sale (visits 1–3). */
export function deriveServicingSlotsForSale(sale, completions, asOfStr = todayStr()) {
  if (!sale || !sale.id) return [];
  return deriveServicingSlots([sale], completions, asOfStr);
}

export function servicingVisitStatusLabel(status, completed) {
  if (completed) return { text: "Done", cls: "s-paid" };
  if (status === "overdue") return { text: "Overdue", cls: "s-overdue" };
  if (status === "due-today") return { text: "Due today", cls: "s-partial" };
  if (status === "due-soon") return { text: "Due soon", cls: "s-partial" };
  return { text: "Scheduled", cls: "s-unpaid" };
}

export function buildServicingWhatsAppMessage(slot, { businessName } = {}) {
  const biz = String(businessName || "").trim();
  const name = slot?.customerName || "Customer";
  const visit = slot?.serviceNum || 1;
  const dueLabel = slot?.dueDate ? dateSlash(slot.dueDate) : "—";
  const diff = daysDiffFromToday(slot?.dueDate);
  const head = biz ? `Reminder from ${biz}:` : "Service reminder:";
  const lines = [
    `Hi ${name},`,
    head,
    "",
    `Your complimentary service visit ${visit} of 3 is scheduled around ${dueLabel}.`,
    slot?.item ? `Product: ${slot.item}` : "",
    slot?.invoiceNo ? `Invoice: ${slot.invoiceNo}` : "",
    "",
  ].filter(Boolean);
  if (diff != null && diff < 0) {
    lines.push(`This visit is overdue — please book at your earliest convenience.`, "");
  } else if (diff === SERVICING_REMINDER_DAYS_BEFORE) {
    lines.push(`Please book your free service in the next ${SERVICING_REMINDER_DAYS_BEFORE} days.`, "");
  } else if (diff === 0) {
    lines.push(`Your free service window is today — please visit or call to schedule.`, "");
  } else {
    lines.push(`Please reply to confirm or reschedule.`, "");
  }
  lines.push("Thank you.");
  return lines.join("\n");
}

export function classifyServicingReminderDiff(diff) {
  if (diff == null || !Number.isFinite(diff)) return null;
  if (diff === SERVICING_REMINDER_DAYS_BEFORE) return "three-days";
  if (diff === 0) return "today";
  if (diff < 0) return "overdue";
  return null;
}

/** Bell alerts for pending servicing visits (T-3, due today, overdue). */
export function buildServicingAlerts(slots, { businessName } = {}) {
  const out = [];
  for (const slot of Array.isArray(slots) ? slots : []) {
    if (!slot || slot.completed) continue;
    const diff = daysDiffFromToday(slot.dueDate);
    const bucket = classifyServicingReminderDiff(diff);
    if (!bucket) continue;
    const waText = buildServicingWhatsAppMessage(slot, { businessName });
    let title = "Free service due soon";
    let pri = -260000;
    let kind = "servicing-due-soon";
    if (bucket === "three-days") {
      title = `Free service in ${SERVICING_REMINDER_DAYS_BEFORE} days`;
      pri = -275000;
      kind = "servicing-due-3d";
    } else if (bucket === "today") {
      title = "Free service due today";
      pri = -340000;
      kind = "servicing-due-today";
    } else if (bucket === "overdue") {
      title = "Free service overdue";
      pri = -290000 - Math.min(Math.abs(diff), 999);
      kind = "servicing-overdue";
    }
    out.push({
      id: `svc-alert-${slot.saleId}-${slot.serviceNum}-${String(slot.dueDate).slice(0, 10)}`,
      kind,
      pri,
      title,
      sub: `${slot.customerName} · Visit ${slot.serviceNum}/3`,
      meta: `${slot.item || "Purchase"} · due ${dateSlash(slot.dueDate)}`,
      saleId: slot.saleId,
      serviceNum: slot.serviceNum,
      servicingSlotId: slot.id,
      dueDate: slot.dueDate,
      waPhone: slot.phone,
      waHref: waMessageHref(slot.phone, waText),
    });
  }
  return out;
}
