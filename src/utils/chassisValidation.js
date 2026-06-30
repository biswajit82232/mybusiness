/**
 * Check if a chassis/serial number is already used in any
 * confirmed invoice or inventory record.
 */
export function isChassisNumberUsed(chassisNumber, data, excludeInvoiceId = null) {
  if (!chassisNumber || chassisNumber.trim() === '') {
    return { used: false, usedIn: null };
  }

  const normalised = chassisNumber.trim().toUpperCase();

  const invoiceMatch = (data.sales || data.invoices || []).find((inv) => {
    if (inv.status === 'cancelled') return false;
    if (inv.status === 'draft') return false;
    if (inv.id === excludeInvoiceId) return false;
    if (!inv.invoiceNo && inv.status !== 'confirmed') return false;
    return (inv.lineItems || inv.items || []).some((item) => {
      const chassis = String(item.chassisNo || item.chassisNumber || '').trim().toUpperCase();
      const serial = String(
        item.serialNumber || item.batterySerialNo || item.motorNo || '',
      ).trim().toUpperCase();
      return chassis === normalised || serial === normalised;
    });
  });

  if (invoiceMatch) {
    return {
      used: true,
      usedIn: {
        type: 'invoice',
        id: invoiceMatch.id,
        number: invoiceMatch.invoiceNo || invoiceMatch.invoiceNumber,
        date: invoiceMatch.date || invoiceMatch.invoiceDate,
        party: invoiceMatch.customerName || invoiceMatch.partyName,
      },
    };
  }

  return { used: false, usedIn: null };
}

/**
 * Validate all chassis/serial numbers in an invoice before saving.
 * Returns array of errors (empty = all good).
 */
export function validateChassisNumbers(invoiceItems, data, excludeInvoiceId = null) {
  const errors = [];
  const seenInThisInvoice = new Set();

  (invoiceItems || []).forEach((item, idx) => {
    const chassis = String(item.chassisNo || item.chassisNumber || '').trim().toUpperCase();
    const serial = String(
      item.serialNumber || item.batterySerialNo || item.motorNo || '',
    ).trim().toUpperCase();

    if (chassis) {
      if (seenInThisInvoice.has(chassis)) {
        errors.push({
          itemIndex: idx,
          field: 'chassisNo',
          message: `Chassis number ${chassis} appears more than once in this invoice.`,
        });
      } else {
        seenInThisInvoice.add(chassis);
        const { used, usedIn } = isChassisNumberUsed(chassis, data, excludeInvoiceId);
        if (used) {
          errors.push({
            itemIndex: idx,
            field: 'chassisNo',
            message: `Chassis ${chassis} was already sold in invoice ${usedIn.number} (${usedIn.party}).`,
          });
        }
      }
    }

    if (serial && serial !== chassis) {
      if (seenInThisInvoice.has(serial)) {
        errors.push({
          itemIndex: idx,
          field: serial === String(item.batterySerialNo || '').trim().toUpperCase()
            ? 'batterySerialNo'
            : 'motorNo',
          message: `Serial number ${serial} appears more than once in this invoice.`,
        });
      } else {
        seenInThisInvoice.add(serial);
        const { used, usedIn } = isChassisNumberUsed(serial, data, excludeInvoiceId);
        if (used) {
          errors.push({
            itemIndex: idx,
            field: serial === String(item.batterySerialNo || '').trim().toUpperCase()
              ? 'batterySerialNo'
              : 'motorNo',
            message: `Serial ${serial} was already used in invoice ${usedIn.number} (${usedIn.party}).`,
          });
        }
      }
    }
  });

  return errors;
}
