-- Align entity_type CHECK with client ENTITY_TYPES (auditEvents + syncConflictQueue).

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
    'vendorDirectory',
    'dismissedAlertIds',
    'auditEvents',
    'syncConflictQueue'
  ));
