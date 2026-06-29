import { describe, test, expect } from 'vitest';
import { migrateData, validateDataStructure, CURRENT_SCHEMA_VERSION } from './schema';

describe('schema migrations', () => {
  test('v1 data migrates to v2 correctly', () => {
    const v1Data = {
      schemaVersion: 1,
      invoices: [{
        id: 'INV-001',
        grandTotal: 11800.00,
        totalGST: 1800.00,
        cgst: 900.00,
        sgst: 900.00,
        items: [{
          description: 'E-Scooter',
          unitPrice: 10000.00,
          taxableAmount: 10000.00,
          gstAmount: 1800.00,
          total: 11800.00,
        }],
      }],
      products: [{ name: 'E-Scooter', sellingPrice: 10000.00, costPrice: 8500.00 }],
      banking: [{ description: 'Sale receipt', amount: 11800.00 }],
      expenses: [{ description: 'Rent', amount: 5000.00 }],
    };

    const result = migrateData(v1Data);

    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.invoices[0].grandTotalPaise).toBe(1180000);
    expect(result.invoices[0].totalGSTPaise).toBe(180000);
    expect(result.invoices[0].cgstPaise).toBe(90000);
    expect(result.invoices[0].sgstPaise).toBe(90000);
    expect(result.invoices[0].items[0].unitPricePaise).toBe(1000000);
    expect(result.products[0].sellingPricePaise).toBe(1000000);
    expect(result.products[0].costPricePaise).toBe(850000);
    expect(result.banking[0].amountPaise).toBe(1180000);
    expect(result.expenses[0].amountPaise).toBe(500000);

    expect(result.invoices[0].grandTotal).toBeUndefined();
    expect(result.products[0].sellingPrice).toBeUndefined();
    expect(result.banking[0].amount).toBeUndefined();
  });

  test('current version data passes through unchanged', () => {
    const v2Data = {
      schemaVersion: 2,
      invoices: [],
      products: [],
    };
    const result = migrateData(v2Data);
    expect(result).toBe(v2Data);
  });

  test('future version throws clear error', () => {
    const futureData = { schemaVersion: 99 };
    expect(() => migrateData(futureData)).toThrow('newer than app version');
  });

  test('null data returns defaults', () => {
    const result = migrateData(null);
    expect(result.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(Array.isArray(result.invoices)).toBe(true);
  });
});
