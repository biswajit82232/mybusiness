-- Client sync includes entity type `purchases` (procurement / payables source).

ALTER TABLE public.entity_records
  DROP CONSTRAINT IF EXISTS entity_records_entity_type_check;

ALTER TABLE public.entity_records
  ADD CONSTRAINT entity_records_entity_type_check CHECK (entity_type IN (
    'settings',
    'sales',
    'expenses',
    'otherIncomes',
    'recurringExpenses',
    'inventoryEntries',
    'purchases',
    'emiEntries',
    'customerDirectory',
    'dismissedAlertIds'
  ));
