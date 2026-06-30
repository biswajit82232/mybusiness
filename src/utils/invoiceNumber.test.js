import { describe, test, expect } from 'vitest';
import { getCurrentFY, getNextInvoiceNumber, findInvoiceGaps } from './invoiceNumber';

describe('invoice numbering', () => {
  test('getCurrentFY — April is start of new FY', () => {
    expect(getCurrentFY(new Date('2024-04-01'))).toBe('2425');
    expect(getCurrentFY(new Date('2024-03-31'))).toBe('2324');
    expect(getCurrentFY(new Date('2025-01-15'))).toBe('2425');
    expect(getCurrentFY(new Date('2025-04-01'))).toBe('2526');
  });

  test('getNextInvoiceNumber — first invoice of FY', () => {
    const result = getNextInvoiceNumber([], new Date('2024-06-01'));
    expect(result).toBe('BPH/2425/0001');
  });

  test('getNextInvoiceNumber — increments correctly', () => {
    const existing = [
      { invoiceNumber: 'BPH/2425/0001', status: 'confirmed' },
      { invoiceNumber: 'BPH/2425/0002', status: 'confirmed' },
    ];
    const result = getNextInvoiceNumber(existing, new Date('2024-08-01'));
    expect(result).toBe('BPH/2425/0003');
  });

  test('getNextInvoiceNumber — ignores other FY invoices', () => {
    const existing = [
      { invoiceNumber: 'BPH/2324/0099', status: 'confirmed' },
    ];
    const result = getNextInvoiceNumber(existing, new Date('2024-06-01'));
    expect(result).toBe('BPH/2425/0001');
  });

  test('findInvoiceGaps — detects missing numbers', () => {
    const invoices = [
      { invoiceNumber: 'BPH/2425/0001' },
      { invoiceNumber: 'BPH/2425/0002' },
      { invoiceNumber: 'BPH/2425/0004' },
    ];
    const gaps = findInvoiceGaps(invoices, '2425');
    expect(gaps).toEqual([3]);
  });

  test('findInvoiceGaps — no gaps returns empty array', () => {
    const invoices = [
      { invoiceNumber: 'BPH/2425/0001' },
      { invoiceNumber: 'BPH/2425/0002' },
      { invoiceNumber: 'BPH/2425/0003' },
    ];
    expect(findInvoiceGaps(invoices, '2425')).toEqual([]);
  });
});
