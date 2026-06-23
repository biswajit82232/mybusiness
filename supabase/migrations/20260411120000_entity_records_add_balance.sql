-- Split cloud sync metadata so Balance can converge independently from Settings.
-- Allows `entity_type='balance'` rows in `entity_records`.

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
    'customerDirectory',
    'vendorDirectory',
    'dismissedAlertIds'
  ));
