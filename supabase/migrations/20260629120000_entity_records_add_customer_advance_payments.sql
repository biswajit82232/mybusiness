-- Customer advance payments (Payments In/Out module) — sync as `customerAdvancePayments` entity rows.

ALTER TABLE public.entity_records
  DROP CONSTRAINT IF EXISTS entity_records_entity_type_check;

ALTER TABLE public.entity_records
  ADD CONSTRAINT entity_records_entity_type_check CHECK (entity_type IN (
    'settings',
    'balance',
    'sales',
    'expenses',
    'otherIncomes',
    'recurringExpenses',
    'inventoryEntries',
    'purchases',
    'emiEntries',
    'loansGiven',
    'customerDirectory',
    'customerAdvancePayments',
    'vendorDirectory',
    'dismissedAlertIds',
    'auditEvents',
    'syncConflictQueue'
  ));
