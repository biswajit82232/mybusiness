import { calcGST, splitGST, multiplyMoney, sumMoney } from './money.js';

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}
import { getNextCreditNoteNumber } from './invoiceNumber.js';

/** Map app sale record to credit-note builder input. */
export function saleToCreditNoteInvoice(sale) {
  if (!sale) return null;
  const lines = Array.isArray(sale.lineItems) ? sale.lineItems : [];
  const addr = [
    sale.customerAddress,
    sale.customerCity,
    sale.customerState,
    sale.customerPincode,
  ]
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .join(', ');
  return {
    id: sale.id,
    invoiceNumber: sale.invoiceNo,
    invoiceDate: sale.date,
    partyName: sale.customerName || '',
    partyGSTIN: sale.customerGstin || '',
    partyAddress: addr,
    items: lines.map((li) => ({
      id: li.id,
      description: li.item || '',
      hsnCode: li.hsn || '',
      quantity: num(li.qty),
      unitPricePaise: num(li.salePrice),
      gstRatePercent: num(li.gstRate) || 18,
    })),
    status: sale.status || 'confirmed',
    grandTotalPaise: num(sale.totalSale),
  };
}

/**
 * Create a credit note object from an original invoice.
 * itemsToReturn: array of { itemId, quantity } — which items and how many
 */
export function buildCreditNote({
  originalInvoice,
  itemsToReturn,
  reason,
  reasonNote,
  creditNoteNumber,
  isInterState = false,
}) {
  const sourceItems = originalInvoice.items || [];

  const cnItems = sourceItems
    .map((origItem) => {
      const returnInfo = itemsToReturn?.find((r) => r.itemId === origItem.id);
      const returnQty = itemsToReturn
        ? returnInfo?.quantity || 0
        : origItem.quantity;

      if (returnQty === 0) return null;

      const unitPrice = origItem.unitPricePaise;
      const taxable = multiplyMoney(unitPrice, returnQty);
      const gst = calcGST(taxable, origItem.gstRatePercent || 18);
      const { cgst, sgst, igst } = splitGST(gst, isInterState);

      return {
        originalItemId: origItem.id,
        description: origItem.description,
        hsnCode: origItem.hsnCode || '',
        quantity: returnQty,
        unitPricePaise: unitPrice,
        taxableAmountPaise: -taxable,
        gstRatePercent: origItem.gstRatePercent || 18,
        gstAmountPaise: -gst,
        cgstPaise: -cgst,
        sgstPaise: -sgst,
        igstPaise: -igst,
        totalPaise: -(taxable + gst),
      };
    })
    .filter(Boolean);

  if (cnItems.length === 0) {
    throw new Error('No items selected for return.');
  }

  const subtotal = sumMoney(cnItems.map((i) => i.taxableAmountPaise));
  const totalGST = sumMoney(cnItems.map((i) => i.gstAmountPaise));
  const totalCGST = sumMoney(cnItems.map((i) => i.cgstPaise));
  const totalSGST = sumMoney(cnItems.map((i) => i.sgstPaise));
  const totalIGST = sumMoney(cnItems.map((i) => i.igstPaise));
  const grandTotal = subtotal + totalGST;

  return {
    id: `CN-${Date.now()}`,
    creditNoteNumber,
    creditNoteDate: new Date().toISOString().split('T')[0],
    status: 'issued',

    originalInvoiceId: originalInvoice.id,
    originalInvoiceNumber: originalInvoice.invoiceNumber,

    reason,
    reasonNote: reasonNote || '',

    partyName: originalInvoice.partyName || '',
    partyGSTIN: originalInvoice.partyGSTIN || '',
    partyAddress: originalInvoice.partyAddress || '',

    items: cnItems,

    subtotalPaise: subtotal,
    totalGSTPaise: totalGST,
    cgstPaise: totalCGST,
    sgstPaise: totalSGST,
    igstPaise: totalIGST,
    grandTotalPaise: grandTotal,

    restoresInventory: reason === 'return',
    createdAt: new Date().toISOString(),
    issuedAt: new Date().toISOString(),
  };
}

/** Build credit note from app sale + return selections. */
export function buildCreditNoteFromSale({
  sale,
  itemsToReturn,
  reason,
  reasonNote,
  existingCreditNotes,
  isInterState = false,
}) {
  const originalInvoice = saleToCreditNoteInvoice(sale);
  const creditNoteNumber = getNextCreditNoteNumber(existingCreditNotes, sale.date);
  return buildCreditNote({
    originalInvoice,
    itemsToReturn,
    reason,
    reasonNote,
    creditNoteNumber,
    isInterState,
  });
}

/**
 * Apply a credit note to app data.
 * Updates original invoice status, inventory (if return), and creditNotes list.
 */
export function applyCreditNote(data, creditNote) {
  const updatedInvoices = (data.sales || []).map((inv) => {
    if (inv.id !== creditNote.originalInvoiceId) return inv;
    return {
      ...inv,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      creditNoteId: creditNote.id,
      creditNoteNumber: creditNote.creditNoteNumber,
    };
  });

  let updatedInventory = data.inventoryEntries || [];
  if (creditNote.restoresInventory) {
    const branches = data.settings?.branches;
    const branchId = branches?.[0]?.id || '';
    for (const returnedItem of creditNote.items) {
      const itemName = String(returnedItem.description || '').trim();
      if (!itemName) continue;
      updatedInventory = [
        {
          id: `inv-cn-${creditNote.id}-${returnedItem.originalItemId}`,
          date: creditNote.creditNoteDate,
          item: itemName,
          type: 'in',
          qty: returnedItem.quantity,
          qtyIn: returnedItem.quantity,
          costPerUnit: returnedItem.unitPricePaise,
          salesPrice: 0,
          note: `Credit note return · ${creditNote.creditNoteNumber}`,
          bankAccountId: '',
          branchId,
          saleId: '',
        },
        ...updatedInventory,
      ];
    }
  }

  const updatedCreditNotes = [...(data.creditNotes || []), creditNote];

  return {
    ...data,
    sales: updatedInvoices,
    inventoryEntries: updatedInventory,
    creditNotes: updatedCreditNotes,
  };
}
