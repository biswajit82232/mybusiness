/**
 * Shared structural documentation for persisted / app state (JSDoc for JS).
 * @module interfaces/entities
 */

/**
 * @typedef {Object} AppSettings
 * @property {number} financialYearStartMonth
 * @property {number} fyYear
 * @property {string} businessName
 * @property {string} [invoicePrefix]
 * @property {string} [billOfSupplyPrefix]
 * @property {number} [invoiceNextNumber]
 * @property {number} [billOfSupplyNextNumber]
 * @property {string[]} [expenseCategories]
 * @property {string[]} [otherIncomeCategories]
 * @property {{ id: string, name: string }[]} [branches]
 * @property {"cash"|"accrual"} [accountingBasis]
 * @property {boolean} [autoStockOutOnSale]
 * @property {boolean} [darkMode] Synced preference when using cloud auth
 */

/**
 * @typedef {Object} CustomerDirectoryRecord
 * @property {string} id
 * @property {string} name
 * @property {string} [email]
 * @property {string} [customerType] Retail | B2B
 */

/**
 * @typedef {Object} SaleRecord
 * @property {string} id
 * @property {string} date
 * @property {"invoice"|"billOfSupply"} [docType]
 * @property {string} [invoiceNo]
 * @property {string} [customerName]
 * @property {number} totalSale
 * @property {number} [discount]
 * @property {number} [additionalCharges]
 * @property {number} totalCost
 * @property {number} received
 * @property {number} outstanding
 * @property {{ id: string, date: string, amount: number, bankAccountId: string }[]} paymentEntries
 */

/**
 * @typedef {Object} ExpenseRecord
 * @property {string} id
 * @property {string} date
 * @property {number} amount
 * @property {string} category
 * @property {string} [bankAccountId]
 */

/**
 * @typedef {Object} InventoryEntry
 * @property {string} id
 * @property {string} date
 * @property {string} item
 * @property {"in"|"out"} type
 * @property {number} qty
 * @property {number} costPerUnit
 * @property {string} [purchaseId]
 * @property {string} [saleId]
 * @property {string} [branchId]
 */

/**
 * @typedef {Object} PurchaseRecord
 * @property {string} id
 * @property {string} date
 * @property {string} supplierName
 * @property {{ item: string, qty: number, costPerUnit: number }[]} lines
 * @property {number} totalAmount
 * @property {number} received
 * @property {number} outstanding
 * @property {{ id: string, date: string, amount: number, bankAccountId: string }[]} paymentEntries
 */

/**
 * @typedef {Object} AppStateShape
 * @property {AppSettings} settings
 * @property {object} balance
 * @property {SaleRecord[]} sales
 * @property {ExpenseRecord[]} expenses
 * @property {object[]} otherIncomes
 * @property {PurchaseRecord[]} purchases
 * @property {InventoryEntry[]} inventoryEntries
 */

export {};
