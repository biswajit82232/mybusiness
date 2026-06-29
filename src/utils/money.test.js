import { describe, test, expect } from 'vitest';
import {
  toPaise, toRupees, formatINR, calcGST,
  calcTaxableFromInclusive, splitGST, calcLineTotal,
  roundOff, sumMoney, addMoney, subtractMoney
} from './money';

describe('money utils — paise arithmetic', () => {
  test('toPaise converts correctly', () => {
    expect(toPaise(100)).toBe(10000);
    expect(toPaise(100.5)).toBe(10050);
    expect(toPaise('847.00')).toBe(84700);
    expect(toPaise(0)).toBe(0);
    expect(toPaise(null)).toBe(0);
    expect(toPaise('1,000.50')).toBe(100050);
  });

  test('calcGST is exact with no float error', () => {
    expect(calcGST(10000, 18)).toBe(1800);
    expect(calcGST(84700, 18)).toBe(15246);
    expect(calcGST(100000, 18)).toBe(18000);
    expect(calcGST(333, 18)).toBe(60);
  });

  test('splitGST intra-state', () => {
    const result = splitGST(18000);
    expect(result.cgst).toBe(9000);
    expect(result.sgst).toBe(9000);
    expect(result.igst).toBe(0);
    expect(result.cgst + result.sgst).toBe(18000);
  });

  test('splitGST inter-state', () => {
    const result = splitGST(18000, true);
    expect(result.igst).toBe(18000);
    expect(result.cgst).toBe(0);
    expect(result.sgst).toBe(0);
  });

  test('calcTaxableFromInclusive is correct', () => {
    expect(calcTaxableFromInclusive(118000, 18)).toBe(100000);
  });

  test('calcLineTotal for standard EV sale', () => {
    const result = calcLineTotal(8500000, 1, 12);
    expect(result.taxablePaise).toBe(8500000);
    expect(result.gstPaise).toBe(1020000);
    expect(result.totalPaise).toBe(9520000);
  });

  test('roundOff works correctly', () => {
    expect(roundOff(118050).roundedPaise).toBe(118100);
    expect(roundOff(118040).roundedPaise).toBe(118000);
    expect(roundOff(118000).roundedPaise).toBe(118000);
  });

  test('formatINR displays correctly', () => {
    expect(formatINR(10000)).toBe('₹100.00');
    expect(formatINR(100000)).toBe('₹1,000.00');
    expect(formatINR(0)).toBe('₹0.00');
  });

  test('no float arithmetic errors', () => {
    expect(addMoney(10, 20)).toBe(30);
    expect(calcGST(847, 18)).toBe(152);
  });
});
